console.log('SCRIPT RUNNING');

const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const siteHeader = document.querySelector('.site-header');
const progressBar = document.getElementById('scroll-progress-bar');
const navLinks = document.querySelectorAll('.site-nav a');
const dotsContainer = document.getElementById('fp-dots');
const panels = Array.from(document.querySelectorAll('main .section.panel'));
const heroPhoto = document.querySelector('.hero-photo');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobileLayout = () => window.matchMedia('(max-width: 900px)').matches;
const PANEL_TRANSITION_MS = 720;
const REVEAL_DURATION_S = 0.55;
const REVEAL_STAGGER_S = 0.08;
const REQUIRED_EDGE_SCROLLS = 2;
const EDGE_SCROLL_RESET_MS = 1500;
const root = document.documentElement;

let activeIndex = 0;
let isAnimating = false;
let panelModeEnabled = false;
let touchStartY = 0;
let edgeScrollIntent = {
  panelIndex: -1,
  direction: 0,
  count: 0,
  at: 0,
};

const resetEdgeScrollIntent = () => {
  edgeScrollIntent = {
    panelIndex: -1,
    direction: 0,
    count: 0,
    at: 0,
  };
};

const registerEdgeScrollIntent = (direction) => {
  const now = Date.now();
  const isSameIntent =
    edgeScrollIntent.panelIndex === activeIndex &&
    edgeScrollIntent.direction === direction &&
    now - edgeScrollIntent.at <= EDGE_SCROLL_RESET_MS;

  if (!isSameIntent) {
    edgeScrollIntent.panelIndex = activeIndex;
    edgeScrollIntent.direction = direction;
    edgeScrollIntent.count = 0;
  }

  edgeScrollIntent.count += 1;
  edgeScrollIntent.at = now;
  return edgeScrollIntent.count;
};

const activateNavById = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
};

const updateProgress = () => {
  if (!progressBar) {
    return;
  }

  const denominator = Math.max(panels.length - 1, 1);
  const progress = (activeIndex / denominator) * 100;
  progressBar.style.width = `${progress}%`;
};

const updateDots = () => {
  if (!dotsContainer) {
    return;
  }

  dotsContainer.querySelectorAll('.fp-dot').forEach((dot, index) => {
    dot.classList.toggle('is-active', index === activeIndex);
  });
};

const setPanelTransforms = () => {
  panels.forEach((panel, index) => {
    const offset = (index - activeIndex) * 100;
    panel.style.transform = `translateY(${offset}%) scale(${index === activeIndex ? 1 : 0.97})`;
    panel.classList.toggle('is-active', index === activeIndex);
    panel.classList.toggle('is-neighbor', Math.abs(index - activeIndex) === 1);

    if (index !== activeIndex) {
      panel.scrollTo({ top: 0, behavior: 'auto' });
    }
  });
};

const updateHeaderState = () => {
  if (!siteHeader) {
    return;
  }

  const currentPanel = panels[activeIndex];
  const panelScroll = currentPanel ? currentPanel.scrollTop : 0;
  siteHeader.classList.toggle('scrolled', activeIndex > 0 || panelScroll > 12);
};

const updateSectionFitClasses = () => {
  panels.forEach((panel) => {
    // Center only if the whole panel content fits in one screen.
    const fitsViewport = panel.scrollHeight <= panel.clientHeight + 8;
    panel.classList.toggle('fits-viewport', fitsViewport);
  });
};

const goToPanel = (nextIndex, immediate = false) => {
  const clamped = Math.max(0, Math.min(nextIndex, panels.length - 1));
  if (clamped === activeIndex && !immediate) {
    return;
  }

  activeIndex = clamped;
  setPanelTransforms();

  const activePanel = panels[activeIndex];
  if (activePanel) {
    activePanel.scrollTo({ top: 0, behavior: 'auto' });
  }

  if (activePanel && activePanel.id) {
    activateNavById(activePanel.id);
  }

  updateDots();
  updateProgress();
  updateHeaderState();

  // Trigger animations for new panel
  if (activePanel && window.panelTimelines) {
    const timeline = window.panelTimelines[activeIndex];
    if (timeline) {
      timeline.restart();
    }
  }

  if (!immediate) {
    resetEdgeScrollIntent();
    isAnimating = true;
    window.setTimeout(() => {
      isAnimating = false;
    }, prefersReducedMotion ? 0 : PANEL_TRANSITION_MS);
  }
};

const canMoveDownFromPanel = (panel) => panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 4;
const canMoveUpFromPanel = (panel) => panel.scrollTop <= 2;

const handleWheel = (event) => {
  if (!panelModeEnabled || isMobileLayout() || isAnimating || !panels.length) {
    return;
  }

  const panel = panels[activeIndex];
  const deltaY = event.deltaY;
  const activePanelId = panel ? panel.id : '';
  const useViewportWheelScroll = activePanelId === 'projects' || activePanelId === 'journey';

  if (Math.abs(deltaY) < 12) {
    return;
  }

  if (useViewportWheelScroll) {
    const movingDown = deltaY > 0;
    const canMoveToNext = movingDown && canMoveDownFromPanel(panel) && activeIndex < panels.length - 1;
    const canMoveToPrev = !movingDown && canMoveUpFromPanel(panel) && activeIndex > 0;

    if (canMoveToNext) {
      event.preventDefault();
      const attempts = registerEdgeScrollIntent(1);
      if (attempts >= REQUIRED_EDGE_SCROLLS) {
        resetEdgeScrollIntent();
        goToPanel(activeIndex + 1);
      }
      return;
    }

    if (canMoveToPrev) {
      event.preventDefault();
      const attempts = registerEdgeScrollIntent(-1);
      if (attempts >= REQUIRED_EDGE_SCROLLS) {
        resetEdgeScrollIntent();
        goToPanel(activeIndex - 1);
      }
      return;
    }

    // Scroll the active section from anywhere on screen for a smoother full-viewport feel.
    resetEdgeScrollIntent();
    event.preventDefault();
    panel.scrollBy({ top: deltaY, behavior: 'smooth' });
    return;
  }

  if (deltaY > 0) {
    if (canMoveDownFromPanel(panel) && activeIndex < panels.length - 1) {
      event.preventDefault();
      goToPanel(activeIndex + 1);
    }
    return;
  }

  if (canMoveUpFromPanel(panel) && activeIndex > 0) {
    event.preventDefault();
    goToPanel(activeIndex - 1);
  }
};

const handleTouchStart = (event) => {
  if (isMobileLayout()) {
    return;
  }

  touchStartY = event.changedTouches[0].clientY;
};

const handleTouchEnd = (event) => {
  if (!panelModeEnabled || isMobileLayout() || isAnimating || !panels.length) {
    return;
  }

  const panel = panels[activeIndex];
  const touchEndY = event.changedTouches[0].clientY;
  const delta = touchStartY - touchEndY;

  if (Math.abs(delta) < 42) {
    return;
  }

  if (delta > 0 && canMoveDownFromPanel(panel) && activeIndex < panels.length - 1) {
    goToPanel(activeIndex + 1);
    return;
  }

  if (delta < 0 && canMoveUpFromPanel(panel) && activeIndex > 0) {
    goToPanel(activeIndex - 1);
  }
};

const handleKeyboard = (event) => {
  if (!panelModeEnabled || isMobileLayout() || isAnimating || !panels.length) {
    return;
  }

  const panel = panels[activeIndex];
  const moveNext = ['PageDown', 'ArrowDown'];
  const movePrev = ['PageUp', 'ArrowUp'];

  if (moveNext.includes(event.key) && canMoveDownFromPanel(panel) && activeIndex < panels.length - 1) {
    event.preventDefault();
    goToPanel(activeIndex + 1);
  }

  if (movePrev.includes(event.key) && canMoveUpFromPanel(panel) && activeIndex > 0) {
    event.preventDefault();
    goToPanel(activeIndex - 1);
  }
};

const setupRevealChildren = () => {
  const revealChildSelector = 'h2, h3, p, li, .btn, .social-link, .project-tag, .project-meta, .card, .project-card, .quick-stats li, .hero-photo-frame, .hero-key-skills-title, .hero-key-skills .skill-tag, .experience .project-screenshots img, .certificates .certificate-item';
  const scaleChildSelector = '.hero-photo-frame, .card, .project-card, .quick-stats li';

  panels.forEach((panel) => {
    const revealChildren = panel.querySelectorAll(revealChildSelector);
    revealChildren.forEach((child) => {
      child.classList.add('reveal-child');
      if (child.matches(scaleChildSelector)) {
        child.classList.add('reveal-scale');
      }
    });
  });
};

const setupGSAPAnimations = () => {
  if (typeof gsap === 'undefined') {
    console.warn('GSAP not loaded');
    return;
  }

  // Create a function to animate reveal children for a panel
  const animatePanelChildren = (panel) => {
    const revealChildren = panel.querySelectorAll('.reveal-child');
    const tl = gsap.timeline();

    revealChildren.forEach((child, index) => {
      tl.from(
        child,
        {
          opacity: 0,
          y: 14,
          duration: REVEAL_DURATION_S,
          ease: 'power2.out',
        },
        index * REVEAL_STAGGER_S
      );
    });

    return tl;
  };

  // Store timelines for each panel
  window.panelTimelines = {};
  panels.forEach((panel, index) => {
    window.panelTimelines[index] = animatePanelChildren(panel);
  });
};

const setupDots = () => {
  if (!dotsContainer || !panels.length) {
    return;
  }

  dotsContainer.innerHTML = '';
  panels.forEach((panel, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'fp-dot';
    dot.setAttribute('aria-label', `Go to ${panel.id || `section ${index + 1}`}`);
    dot.addEventListener('click', () => goToPanel(index));
    dotsContainer.appendChild(dot);
  });
};

const updateParallax = () => {
  if (prefersReducedMotion || !heroPhoto || !panels[0]) {
    return;
  }

  const heroPanel = panels[0];
  const shift = Math.min(heroPanel.scrollTop * 0.06, 18);
  heroPhoto.style.transform = `translateY(${shift}px)`;
};

const setupEducationHoverCards = () => {
  const eduCardsWrap = document.querySelector('.focus .cards');
  const eduCards = Array.from(document.querySelectorAll('.focus .edu-card'));

  if (!eduCardsWrap || !eduCards.length) {
    return;
  }

  const applyActiveState = (activeCard) => {
    eduCardsWrap.classList.add('is-hovering');
    eduCards.forEach((card) => {
      const isActive = card === activeCard;
      card.classList.toggle('is-active', isActive);
      card.style.flex = isActive ? '2.8 1 0' : '0.7 1 0';
    });
  };

  const resetState = () => {
    eduCardsWrap.classList.remove('is-hovering');
    eduCards.forEach((card) => {
      card.classList.remove('is-active');
      card.style.flex = '1 1 0';
    });
  };

  resetState();

  eduCards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      applyActiveState(card);
    });

    card.addEventListener('mouseleave', resetState);
  });
};

const setupProjectHoverPreview = () => {
  const projectImages = Array.from(document.querySelectorAll('.projects .project-screenshots img'));
  const certificateItems = Array.from(document.querySelectorAll('.certificates .certificate-item'));
  if (!projectImages.length && !certificateItems.length) {
    return;
  }

  const HOVER_PREVIEW_DELAY_MS = 260;
  let showTimer = null;

  const preview = document.createElement('div');
  preview.className = 'project-hover-preview';
  preview.setAttribute('aria-hidden', 'true');

  const previewImage = document.createElement('img');
  previewImage.alt = 'Fullscreen project preview';
  preview.appendChild(previewImage);
  document.body.appendChild(preview);

  const showPreview = (img) => {
    if (showTimer) {
      window.clearTimeout(showTimer);
    }

    previewImage.src = img.currentSrc || img.src;
    previewImage.alt = img.alt || 'Fullscreen project preview';
    showTimer = window.setTimeout(() => {
      preview.classList.add('is-visible');
      showTimer = null;
    }, HOVER_PREVIEW_DELAY_MS);
  };

  const hidePreview = () => {
    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }

    preview.classList.remove('is-visible');
  };

  projectImages.forEach((img) => {
    img.addEventListener('mouseenter', () => showPreview(img));
    img.addEventListener('mouseleave', hidePreview);
  });

  certificateItems.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      const hoverSrc = item.getAttribute('data-preview-hover');
      const defaultSrc = item.getAttribute('data-preview-default');
      const directImg = item.querySelector('img');

      if (hoverSrc || defaultSrc) {
        const previewTarget = {
          src: hoverSrc || defaultSrc,
          alt: directImg ? directImg.alt : 'Fullscreen certificate preview',
        };
        showPreview(previewTarget);
        return;
      }

      if (directImg) {
        showPreview(directImg);
      }
    });

    item.addEventListener('mouseleave', hidePreview);
  });
};

const setupNavClicks = () => {
  const hashLinks = document.querySelectorAll('a[href^="#"]');

  hashLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || !targetId.startsWith('#')) {
        return;
      }

      if (targetId === '#home') {
        if (panelModeEnabled) {
          event.preventDefault();
          goToPanel(0);
        }

        if (siteNav) {
          siteNav.classList.remove('open');
        }

        if (menuToggle) {
          menuToggle.setAttribute('aria-expanded', 'false');
        }

        return;
      }

      const targetIndex = panels.findIndex((panel) => `#${panel.id}` === targetId);
      if (targetIndex < 0 || !panelModeEnabled) {
        return;
      }

      event.preventDefault();
      goToPanel(targetIndex);

      if (siteNav) {
        siteNav.classList.remove('open');
      }

      if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
};

const shouldEnablePanelMode = () => panels.length > 0 && !isMobileLayout();

const applyPanelModeState = () => {
  const shouldEnable = shouldEnablePanelMode();
  if (shouldEnable === panelModeEnabled) {
    return;
  }

  panelModeEnabled = shouldEnable;
  root.classList.toggle('panels-ready', panelModeEnabled);

  if (panelModeEnabled) {
    goToPanel(Math.min(activeIndex, panels.length - 1), true);
    updateSectionFitClasses();
    return;
  }

  panels.forEach((panel) => {
    panel.classList.remove('is-active', 'is-neighbor', 'fits-viewport');
    panel.style.transform = '';
  });
};

const logStartupDiagnostics = () => {
  console.log('Panels found:', panels.length);
  console.log('GSAP available:', typeof gsap !== 'undefined' ? 'object' : 'undefined');

  if (!panels.length) {
    console.warn('No panels found. The page will fall back to normal scroll layout.');
  }

  if (typeof gsap === 'undefined') {
    console.warn('GSAP not loaded. Animations will be skipped, but the page should still work.');
  }
};

const setupPanelScrollSync = () => {
  panels.forEach((panel) => {
    panel.addEventListener(
      'scroll',
      () => {
        if (!panel.classList.contains('is-active')) {
          return;
        }

        updateHeaderState();
        updateParallax();
      },
      { passive: true }
    );
  });
};

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

const init = () => {
  try {
    logStartupDiagnostics();

    if (!panels.length) {
      const yearEl = document.getElementById('year');
      if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
      }
      return;
    }

    setupRevealChildren();
    setupGSAPAnimations();
    setupDots();
    setupNavClicks();
    setupPanelScrollSync();
    setupEducationHoverCards();
    setupProjectHoverPreview();
    applyPanelModeState();
    updateHeaderState();
    updateProgress();
    updateDots();

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyboard);
    window.addEventListener('resize', () => {
      applyPanelModeState();
      setPanelTransforms();
      updateHeaderState();
      updateProgress();
      updateDots();
      updateSectionFitClasses();
    });

    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  } catch (error) {
    console.error('Portfolio initialization failed:', error);
    panelModeEnabled = false;
    root.classList.remove('panels-ready');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
