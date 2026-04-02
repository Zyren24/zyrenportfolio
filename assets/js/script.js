const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const siteHeader = document.querySelector('.site-header');
const progressBar = document.getElementById('scroll-progress-bar');
const navLinks = document.querySelectorAll('.site-nav a');
const panels = Array.from(document.querySelectorAll('main .section.panel'));
const heroPhoto = document.querySelector('.hero-photo');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const activateNavById = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
  });
};

const updateProgress = () => {
  if (!progressBar) {
    return;
  }

  const maxScrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScrollable > 0 ? (window.scrollY / maxScrollable) * 100 : 0;
  progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
};

const updateHeaderState = () => {
  if (!siteHeader) {
    return;
  }

  siteHeader.classList.toggle('scrolled', window.scrollY > 12);
};

const updateParallax = () => {
  if (prefersReducedMotion || !heroPhoto) {
    return;
  }

  const shift = Math.min(window.scrollY * 0.06, 18);
  heroPhoto.style.transform = `translateY(${shift}px)`;
};

const syncActiveSectionByScroll = () => {
  if (!panels.length) {
    return;
  }

  const headerOffset = siteHeader ? siteHeader.offsetHeight + 24 : 100;
  let activeId = panels[0].id;

  panels.forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    if (rect.top <= headerOffset && rect.bottom > headerOffset) {
      activeId = panel.id;
    }
  });

  activateNavById(activeId);
};

const handlePageScroll = () => {
  updateHeaderState();
  updateProgress();
  updateParallax();
  syncActiveSectionByScroll();
};

const setupRevealChildren = () => {
  const revealChildSelector = 'h2, h3, p, li, .btn, .social-link, .project-tag, .project-meta, .card, .project-card, .quick-stats li, .hero-photo-frame, .hero-key-skills-title, .hero-key-skills .skill-tag, .experience .project-screenshots img, .certificates .certificate-item';

  panels.forEach((panel) => {
    const revealChildren = panel.querySelectorAll(revealChildSelector);
    revealChildren.forEach((child) => {
      child.classList.add('reveal-child');
    });
  });
};

const setupGSAPAnimations = () => {
  if (typeof gsap === 'undefined') {
    return;
  }

  panels.forEach((panel) => {
    const revealChildren = panel.querySelectorAll('.reveal-child');
    if (!revealChildren.length) {
      return;
    }

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.from(revealChildren, {
        opacity: 0,
        y: 14,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: panel,
          start: 'top 78%',
          once: true,
        },
      });
      return;
    }

    gsap.from(revealChildren, {
      opacity: 0,
      y: 14,
      duration: 0.55,
      stagger: 0.08,
      ease: 'power2.out',
    });
  });
};

const setupEducationHoverCards = () => {
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!supportsHover) {
    return;
  }

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
    card.addEventListener('mouseenter', () => applyActiveState(card));
    card.addEventListener('mouseleave', resetState);
  });
};

const setupProjectHoverPreview = () => {
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!supportsHover) {
    return;
  }

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
    link.addEventListener('click', () => {
      if (siteNav) {
        siteNav.classList.remove('open');
      }

      if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
};

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

setupRevealChildren();
setupGSAPAnimations();
setupNavClicks();
setupEducationHoverCards();
setupProjectHoverPreview();

window.addEventListener('scroll', handlePageScroll, { passive: true });
window.addEventListener('resize', handlePageScroll);
handlePageScroll();

const yearNode = document.getElementById('year');
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}
