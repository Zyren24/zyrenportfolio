/* ─────────────────────────────────────────────────────────────
   Portfolio Script
   - Full-page panel navigation (desktop)
   - GSAP staggered reveal animations
   - Education hover cards
   - Image lightbox (click-to-open)
   - Scroll progress bar
   - Mobile hamburger menu
────────────────────────────────────────────────────────────── */

// ── Constants ────────────────────────────────────────────────
const PANEL_TRANSITION_MS  = 720;
const REVEAL_DURATION_S    = 0.5;
const REVEAL_STAGGER_S     = 0.075;
const REQUIRED_EDGE_SCROLLS = 2;
const EDGE_SCROLL_RESET_MS  = 1600;

// ── DOM References ───────────────────────────────────────────
const menuToggle   = document.querySelector('.menu-toggle');
const siteNav      = document.querySelector('.site-nav');
const siteHeader   = document.querySelector('.site-header');
const progressBar  = document.getElementById('scroll-progress-bar');
const dotsContainer = document.getElementById('fp-dots');
const panels       = Array.from(document.querySelectorAll('main .section.panel'));
const heroPhoto    = document.querySelector('.hero-photo');
const root         = document.documentElement;

// ── Feature detection ────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobileLayout = () => window.matchMedia('(max-width: 900px)').matches;

// ── State ────────────────────────────────────────────────────
let activeIndex      = 0;
let isAnimating      = false;
let panelModeEnabled = false;
let touchStartY      = 0;

let edgeScrollIntent = { panelIndex: -1, direction: 0, count: 0, at: 0 };

// ── Edge scroll helpers ──────────────────────────────────────
const resetEdgeScrollIntent = () => {
  edgeScrollIntent = { panelIndex: -1, direction: 0, count: 0, at: 0 };
};

const registerEdgeScrollIntent = (direction) => {
  const now = Date.now();
  const same =
    edgeScrollIntent.panelIndex === activeIndex &&
    edgeScrollIntent.direction === direction &&
    now - edgeScrollIntent.at <= EDGE_SCROLL_RESET_MS;

  if (!same) {
    edgeScrollIntent.panelIndex = activeIndex;
    edgeScrollIntent.direction  = direction;
    edgeScrollIntent.count      = 0;
  }

  edgeScrollIntent.count += 1;
  edgeScrollIntent.at = now;
  return edgeScrollIntent.count;
};

// ── Nav highlight ────────────────────────────────────────────
const navLinks = document.querySelectorAll('.site-nav a');

const activateNavById = (id) => {
  navLinks.forEach((link) =>
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`)
  );
};

// ── Progress bar ─────────────────────────────────────────────
const updateProgress = () => {
  if (!progressBar) return;
  const pct = panels.length <= 1 ? 0 : (activeIndex / (panels.length - 1)) * 100;
  progressBar.style.width = `${pct}%`;
};

// ── Dot nav ──────────────────────────────────────────────────
const updateDots = () => {
  if (!dotsContainer) return;
  dotsContainer.querySelectorAll('.fp-dot').forEach((dot, i) =>
    dot.classList.toggle('is-active', i === activeIndex)
  );
};

// ── Panel transforms ─────────────────────────────────────────
const setPanelTransforms = () => {
  panels.forEach((panel, i) => {
    const offset = (i - activeIndex) * 100;
    panel.style.transform = `translateY(${offset}%) scale(${i === activeIndex ? 1 : 0.975})`;
    panel.classList.toggle('is-active',   i === activeIndex);
    panel.classList.toggle('is-neighbor', Math.abs(i - activeIndex) === 1);
    if (i !== activeIndex) panel.scrollTo({ top: 0, behavior: 'auto' });
  });
};

// ── Header scrolled state ────────────────────────────────────
const updateHeaderState = () => {
  if (!siteHeader) return;
  const panel = panels[activeIndex];
  const scrolled = activeIndex > 0 || (panel && panel.scrollTop > 12);
  siteHeader.classList.toggle('scrolled', scrolled);
};

// ── Section fit centering ────────────────────────────────────
const updateSectionFitClasses = () => {
  panels.forEach((panel) => {
    panel.classList.toggle('fits-viewport', panel.scrollHeight <= panel.clientHeight + 8);
  });
};

// ── Reveal sync ─────────────────────────────────────────────
const syncRevealVisibility = () => {
  panels.forEach((panel, i) => {
    const isActive = i === activeIndex;
    panel.querySelectorAll('.reveal-child').forEach((child) => {
      child.classList.toggle('reveal-visible', isActive);
      if (isActive) {
        child.style.opacity   = '1';
        child.style.transform = 'none';
      }
    });
  });
};

// ── Navigate to panel ────────────────────────────────────────
const goToPanel = (nextIndex, immediate = false) => {
  const clamped = Math.max(0, Math.min(nextIndex, panels.length - 1));
  if (clamped === activeIndex && !immediate) return;

  activeIndex = clamped;
  setPanelTransforms();

  const activePanel = panels[activeIndex];
  if (activePanel) activePanel.scrollTo({ top: 0, behavior: 'auto' });
  if (activePanel?.id) activateNavById(activePanel.id);

  updateDots();
  updateProgress();
  updateHeaderState();
  syncRevealVisibility();

  // Restart GSAP timeline for newly active panel
  if (window.panelTimelines?.[activeIndex]) {
    window.panelTimelines[activeIndex].restart();
  }

  if (!immediate) {
    resetEdgeScrollIntent();
    isAnimating = true;
    setTimeout(() => { isAnimating = false; }, prefersReducedMotion ? 0 : PANEL_TRANSITION_MS);
  }
};

// ── Scroll boundary helpers ───────────────────────────────────
const atBottom = (panel) => panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 4;
const atTop    = (panel) => panel.scrollTop <= 2;

// ── Wheel handler ────────────────────────────────────────────
const handleWheel = (event) => {
  if (!panelModeEnabled || isMobileLayout() || isAnimating || !panels.length) return;

  const panel  = panels[activeIndex];
  const delta  = event.deltaY;
  const longPanel = panel?.id === 'projects' || panel?.id === 'journey' || panel?.id === 'certificates';

  if (Math.abs(delta) < 5) return;

  if (longPanel) {
    const movingDown = delta > 0;
    if (movingDown && atBottom(panel) && activeIndex < panels.length - 1) {
      event.preventDefault();
      if (registerEdgeScrollIntent(1) >= REQUIRED_EDGE_SCROLLS) { resetEdgeScrollIntent(); goToPanel(activeIndex + 1); }
      return;
    }
    if (!movingDown && atTop(panel) && activeIndex > 0) {
      event.preventDefault();
      if (registerEdgeScrollIntent(-1) >= REQUIRED_EDGE_SCROLLS) { resetEdgeScrollIntent(); goToPanel(activeIndex - 1); }
      return;
    }
    resetEdgeScrollIntent();
    event.preventDefault();
    panel.scrollBy({ top: delta, behavior: 'smooth' });
    return;
  }

  if (delta > 0 && atBottom(panel) && activeIndex < panels.length - 1) {
    event.preventDefault();
    goToPanel(activeIndex + 1);
    return;
  }
  if (delta < 0 && atTop(panel) && activeIndex > 0) {
    event.preventDefault();
    goToPanel(activeIndex - 1);
  }
};

// ── Touch handlers ───────────────────────────────────────────
const handleTouchStart = (event) => {
  if (isMobileLayout()) return;
  touchStartY = event.changedTouches[0].clientY;
};

const handleTouchEnd = (event) => {
  if (!panelModeEnabled || isMobileLayout() || isAnimating || !panels.length) return;
  const panel = panels[activeIndex];
  const delta = touchStartY - event.changedTouches[0].clientY;
  if (Math.abs(delta) < 42) return;
  if (delta > 0 && atBottom(panel) && activeIndex < panels.length - 1) { goToPanel(activeIndex + 1); return; }
  if (delta < 0 && atTop(panel)    && activeIndex > 0)                  { goToPanel(activeIndex - 1); }
};

// ── Keyboard handler ─────────────────────────────────────────
const handleKeyboard = (event) => {
  if (!panelModeEnabled || isMobileLayout() || isAnimating || !panels.length) return;
  const panel = panels[activeIndex];
  if (['PageDown','ArrowDown'].includes(event.key) && atBottom(panel) && activeIndex < panels.length - 1) {
    event.preventDefault(); goToPanel(activeIndex + 1);
  }
  if (['PageUp','ArrowUp'].includes(event.key)   && atTop(panel)    && activeIndex > 0) {
    event.preventDefault(); goToPanel(activeIndex - 1);
  }
};

// ── GSAP Animations ──────────────────────────────────────────
const setupRevealChildren = () => {
  const revealSel = 'h2, h3, p, li, .btn, .social-link, .project-tag, .card, .project-card, .quick-stats li, .hero-photo-frame, .hero-key-skills-title, .hero-key-skills .skill-tag, .experience .project-screenshots img, .certificates .certificate-item';
  const scaleSel  = '.hero-photo-frame, .card, .project-card, .quick-stats li';

  panels.forEach((panel) => {
    panel.querySelectorAll(revealSel).forEach((child) => {
      // Don't double-add
      if (child.classList.contains('reveal-child')) return;
      child.classList.add('reveal-child');
      if (child.matches(scaleSel)) child.classList.add('reveal-scale');
    });
  });
};

const setupGSAPAnimations = () => {
  if (typeof gsap === 'undefined') return;

  window.panelTimelines = {};

  panels.forEach((panel, panelIndex) => {
    const children = panel.querySelectorAll('.reveal-child');
    const tl = gsap.timeline({ paused: true });

    children.forEach((child, i) => {
      tl.fromTo(
        child,
        { opacity: 0, y: 14 },
        {
          opacity: 1, y: 0,
          duration: REVEAL_DURATION_S,
          ease: 'power2.out',
          immediateRender: false,
          clearProps: 'opacity,transform',
        },
        i * REVEAL_STAGGER_S
      );
    });

    window.panelTimelines[panelIndex] = tl;
  });
};

// ── Dot nav setup ────────────────────────────────────────────
const setupDots = () => {
  if (!dotsContainer || !panels.length) return;
  dotsContainer.innerHTML = '';
  panels.forEach((panel, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'fp-dot';
    dot.setAttribute('aria-label', `Go to ${panel.id || `section ${i + 1}`}`);
    dot.addEventListener('click', () => goToPanel(i));
    dotsContainer.appendChild(dot);
  });
};

// ── Parallax on hero photo ───────────────────────────────────
const updateParallax = () => {
  if (prefersReducedMotion || !heroPhoto || !panels[0]) return;
  const shift = Math.min(panels[0].scrollTop * 0.055, 16);
  heroPhoto.style.transform = `translateY(${shift}px)`;
};

// ── Education hover cards ────────────────────────────────────
const setupEducationHoverCards = () => {
  const wrap     = document.querySelector('.focus .cards');
  const eduCards = Array.from(document.querySelectorAll('.focus .edu-card'));
  if (!wrap || !eduCards.length) return;

  const setActive = (card) => {
    wrap.classList.add('is-hovering');
    eduCards.forEach((c) => {
      const active = c === card;
      c.classList.toggle('is-active', active);
      c.style.flex = active ? '2.8 1 0' : '0.7 1 0';
    });
  };

  const reset = () => {
    wrap.classList.remove('is-hovering');
    eduCards.forEach((c) => { c.classList.remove('is-active'); c.style.flex = '1 1 0'; });
  };

  reset();
  eduCards.forEach((card) => {
    card.addEventListener('mouseenter', () => setActive(card));
    card.addEventListener('mouseleave', reset);
    card.addEventListener('focus', () => setActive(card));
    card.addEventListener('blur', reset);
  });
};

// ── Image lightbox ───────────────────────────────────────────
const setupLightbox = () => {
  const lightbox      = document.getElementById('img-lightbox');
  const closeBtn      = document.getElementById('lightbox-close');
  const lightboxImg   = lightbox?.querySelector('img');
  if (!lightbox || !lightboxImg) return;

  const open = (src, alt) => {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('is-visible');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    lightbox.classList.remove('is-visible');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Click on project/ttec/certificate images
  const clickableImgs = Array.from(document.querySelectorAll(
    '.project-screenshots img, .certificate-item img, .ttec-screenshots img'
  ));
  clickableImgs.forEach((img) => {
    img.addEventListener('click', () => open(img.currentSrc || img.src, img.alt));
  });

  // Certificate HSK special case (hover-swap images)
  const hskItem = document.querySelector('.certificate-item-hsk');
  if (hskItem) {
    hskItem.style.cursor = 'zoom-in';
    hskItem.addEventListener('click', () => {
      const src = hskItem.getAttribute('data-preview-hover') || hskItem.getAttribute('data-preview-default');
      const img = hskItem.querySelector('img');
      open(src, img?.alt || '');
    });
  }

  closeBtn?.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
};

// ── Nav hash clicks ──────────────────────────────────────────
const setupNavClicks = () => {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;

      if (href === '#home') {
        if (panelModeEnabled) { event.preventDefault(); goToPanel(0); }
        closeMobileNav();
        return;
      }

      const idx = panels.findIndex((p) => `#${p.id}` === href);
      if (idx < 0 || !panelModeEnabled) return;

      event.preventDefault();
      goToPanel(idx);
      closeMobileNav();
    });
  });
};

// ── Mobile nav helpers ───────────────────────────────────────
const closeMobileNav = () => {
  siteNav?.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
};

// ── Panel mode on/off ────────────────────────────────────────
const shouldEnablePanelMode = () => panels.length > 0 && !isMobileLayout();

const applyPanelModeState = () => {
  const should = shouldEnablePanelMode();
  if (should === panelModeEnabled) return;

  panelModeEnabled = should;
  root.classList.toggle('panels-ready', panelModeEnabled);

  if (panelModeEnabled) {
    goToPanel(Math.min(activeIndex, panels.length - 1), true);
    updateSectionFitClasses();
  } else {
    panels.forEach((p) => {
      p.classList.remove('is-active', 'is-neighbor', 'fits-viewport');
      p.style.transform = '';
    });
  }
};

// ── Panel scroll sync ────────────────────────────────────────
const setupPanelScrollSync = () => {
  panels.forEach((panel) => {
    panel.addEventListener('scroll', () => {
      if (!panel.classList.contains('is-active')) return;
      updateHeaderState();
      updateParallax();
    }, { passive: true });
  });
};

// ── Hamburger ────────────────────────────────────────────────
if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  // Close nav when clicking outside
  document.addEventListener('click', (e) => {
    if (!siteNav.classList.contains('open')) return;
    if (!siteNav.contains(e.target) && e.target !== menuToggle) closeMobileNav();
  });
}

// ── Init ─────────────────────────────────────────────────────
const init = () => {
  try {
    if (!panels.length) return;

    setupRevealChildren();
    setupGSAPAnimations();
    setupDots();
    setupNavClicks();
    setupPanelScrollSync();
    setupEducationHoverCards();
    setupLightbox();
    applyPanelModeState();
    syncRevealVisibility();
    updateHeaderState();
    updateProgress();
    updateDots();

    window.addEventListener('wheel',      handleWheel,      { passive: false, capture: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend',   handleTouchEnd,   { passive: true });
    window.addEventListener('keydown',    handleKeyboard);
    window.addEventListener('resize', () => {
      applyPanelModeState();
      setPanelTransforms();
      updateHeaderState();
      updateProgress();
      updateDots();
      updateSectionFitClasses();
    });

  } catch (err) {
    console.error('Portfolio init error:', err);
    panelModeEnabled = false;
    root.classList.remove('panels-ready');
  }
};

// ── Boot ─────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
