/**
 * effects.js v2 — Premium cursor, GSAP scroll reveals, mouse trail, magnetic buttons
 */

// ── Custom Cursor ──
(function initCursor() {
  const ring = document.getElementById('cursor-ring');
  const dot  = document.getElementById('cursor-dot');
  if (!ring || !dot) return;

  let rx = 0, ry = 0, dx = 0, dy = 0;
  let visible = false;

  window.addEventListener('mousemove', (e) => {
    dx = e.clientX; dy = e.clientY;
    dot.style.left  = dx + 'px';
    dot.style.top   = dy + 'px';
    if (!visible) { ring.style.opacity = '1'; dot.style.opacity = '1'; visible = true; }
  });
  window.addEventListener('mouseleave', () => {
    ring.style.opacity = '0'; dot.style.opacity = '0'; visible = false;
  });

  // Smooth ring follow
  function tick() {
    rx += (dx - rx) * 0.12;
    ry += (dy - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(tick);
  }
  tick();
  ring.style.opacity = '0'; dot.style.opacity = '0';

  // Hover effects
  document.querySelectorAll('a,button,.role-card,.quiz-option,.glass-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      ring.style.width = '56px'; ring.style.height = '56px';
      ring.style.borderColor = 'rgba(79,140,255,.9)';
      ring.style.background = 'rgba(79,140,255,.06)';
    });
    el.addEventListener('mouseleave', () => {
      ring.style.width = '34px'; ring.style.height = '34px';
      ring.style.borderColor = 'rgba(79,140,255,.5)';
      ring.style.background = 'transparent';
    });
  });
})();

// ── Mouse Trail Canvas ──
(function initTrail() {
  const canvas = document.getElementById('trail-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  const points = [];
  const MAX = 28;
  let mx = W / 2, my = H / 2;

  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    points.push({ x: mx, y: my, life: 1.0 });
    if (points.length > MAX) points.shift();

    for (let i = 1; i < points.length; i++) {
      const t = points[i], p = points[i - 1];
      const alpha = (i / points.length) * 0.35;
      const w = (i / points.length) * 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = `rgba(79,140,255,${alpha})`;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Glow dot at tip
    if (points.length > 0) {
      const last = points[points.length - 1];
      const g = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 20);
      g.addColorStop(0, 'rgba(79,140,255,0.15)');
      g.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(last.x, last.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
})();

// ── GSAP Scroll Reveal ──
(function initGSAP() {
  if (typeof gsap === 'undefined') return;

  try {
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }
  } catch(e) { console.warn('ScrollTrigger not available'); }

  // Hero elements — CSS handles initial state, GSAP enhances
  try {
    const heroTag   = document.querySelector('.hero-tag');
    const heroH1    = document.querySelector('.hero-h1');
    const heroSub   = document.querySelector('.hero-sub');
    const heroCTAs  = document.querySelector('.hero-ctas');
    const heroBadges= document.querySelector('.hero-badges');

    if (heroTag && heroH1) {
      const tl = gsap.timeline({ delay: 0.15 });
      tl.from(heroTag,     { opacity: 0, y: 24, duration: 0.6, ease: 'power3.out' })
        .from(heroH1,      { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' }, '-=0.3')
        .from(heroSub,     { opacity: 0, y: 24, duration: 0.6, ease: 'power3.out' }, '-=0.4')
        .from(heroCTAs,    { opacity: 0, y: 24, duration: 0.6, ease: 'power3.out' }, '-=0.3')
        .from(heroBadges,  { opacity: 0, y: 20, stagger: 0.12, duration: 0.5, ease: 'power3.out' }, '-=0.3');
    }
  } catch(e) { console.warn('Hero animation error:', e); }

  // Scroll reveals — use IntersectionObserver so elements are NEVER permanently hidden
  // (gsap.from + ScrollTrigger can leave opacity:0 if timing fails)
  try {
    const revealEls = document.querySelectorAll('.gsap-reveal');
    if (revealEls.length && typeof gsap !== 'undefined') {
      // Start hidden only if we're sure GSAP will animate them
      revealEls.forEach((el, i) => {
        gsap.set(el, { opacity: 0, y: 44 });
      });

      const revealObs = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            gsap.to(el, {
              opacity: 1, y: 0, duration: 0.85,
              delay: parseFloat(el.dataset.delay || 0),
              ease: 'power3.out',
              clearProps: 'transform'
            });
            revealObs.unobserve(el);
          }
        });
      }, { threshold: 0.08 });

      revealEls.forEach(el => revealObs.observe(el));
    }

    // Stagger groups
    const staggerEls = document.querySelectorAll('.gsap-stagger');
    if (staggerEls.length && typeof gsap !== 'undefined') {
      staggerEls.forEach(container => {
        const cards = Array.from(container.querySelectorAll(':scope > *'));
        gsap.set(cards, { opacity: 0, y: 44 });

        const obs = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              gsap.to(cards, { opacity: 1, y: 0, stagger: 0.1, duration: 0.7, ease: 'power3.out', clearProps: 'transform' });
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.05 });
        obs.observe(container);
      });
    }

    // Counters
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target = parseInt(el.dataset.counter, 10);
      const suffix = el.dataset.suffix || '';
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            gsap.to({ val: 0 }, {
              val: target, duration: 2.2, ease: 'power2.out',
              onUpdate() { el.textContent = Math.round(this.targets()[0].val).toLocaleString() + suffix; }
            });
            obs.unobserve(el);
          }
        });
      }, { threshold: 0.3 });
      obs.observe(el);
    });

  } catch(e) {
    // Absolute fallback: make everything visible
    console.warn('Scroll reveal error:', e);
    document.querySelectorAll('.gsap-reveal, .gsap-stagger > *').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }
})();

// ── Magnetic Buttons ──
(function initMagnetic() {
  document.querySelectorAll('.btn-neon').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px) scale(1.04)`;
      // Spotlight effect
      const px = ((e.clientX - r.left) / r.width * 100).toFixed(1);
      const py = ((e.clientY - r.top) / r.height * 100).toFixed(1);
      btn.style.setProperty('--mx', px + '%');
      btn.style.setProperty('--my', py + '%');
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();

// ── Navbar scroll glass effect ──
(function initNavbar() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 60) {
      nav.style.background = 'rgba(255,255,255,0.85)';
      nav.style.backdropFilter = 'blur(20px)';
      nav.style.webkitBackdropFilter = 'blur(20px)';
      nav.style.borderBottom = '1px solid rgba(79,140,255,0.12)';
      nav.style.boxShadow = '0 4px 24px rgba(79,140,255,0.08)';
    } else {
      nav.style.background = 'transparent';
      nav.style.backdropFilter = 'none';
      nav.style.borderBottom = '1px solid transparent';
      nav.style.boxShadow = 'none';
    }
    // Hide on scroll down, show on scroll up
    nav.style.transform = (y > lastY && y > 100) ? 'translateY(-100%)' : 'translateY(0)';
    lastY = y;
  }, { passive: true });
})();

// ── Page transition link clicks ──
(function initPageTransition() {
  const overlay = document.getElementById('page-transition');
  if (!overlay || typeof gsap === 'undefined') return;

  document.querySelectorAll('a[href]:not([target])').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http')) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      gsap.to(overlay, {
        scaleX: 1, duration: 0.45, ease: 'power3.inOut',
        onComplete: () => { window.location.href = href; }
      });
    });
  });
  // NOTE: No body opacity animation — text must always be visible
})();
