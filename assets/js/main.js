const year = document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();
document.querySelectorAll('.js-mail').forEach(a => { const m = ['julius', 'gerhardus.com'].join('@'); a.href = 'mailto:' + m; if (a.textContent.includes('[at]')) a.textContent = m; });

/* ---------- Nav state ---------- */
(() => {
    const nav = document.getElementById('nav');
    const set = () => nav.classList.toggle('scrolled', scrollY > 40);
    addEventListener('scroll', set, { passive: true }); set();
})();

/* ---------- Reveal on scroll ---------- */
const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' })
    : null;
const reveal = el => io ? io.observe(el) : el.classList.add('in');
document.querySelectorAll('.reveal').forEach(reveal);

/* ---------- Hero glow follows the mouse along the arc (desktop only) ---------- */
(() => {
    const hero = document.querySelector('.hero');
    if (!hero || !matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    let a, target, last = 0, raf = 0;                                    // a: angle on the arc's circle in degrees, 0 = top
    const step = now => {
        const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
        a += (target - a) * (1 - Math.exp(-dt * 2.2));                 // damped: ~0.5 s to catch up, never jumpy
        hero.style.setProperty('--a', a.toFixed(3) + 'deg');
        raf = Math.abs(target - a) > .01 ? requestAnimationFrame(step) : 0;
    };
    addEventListener('mousemove', e => {
        const r = 1.7 * Math.max(innerWidth, innerHeight);               // the arc's radius, 170vmax in main.css
        const vmax = Math.max(innerWidth, innerHeight), core = .3 * vmax * .38;   // bright core: 38% of the 30vmax glow (main.css)
        const x = Math.max(core, Math.min(innerWidth - core, e.clientX));  // follow the cursor, but the core stops at the screen edge
        const dx = x - innerWidth / 2;
        target = Math.asin(Math.max(-1, Math.min(1, dx / r))) * 180 / Math.PI;
        if (raf) return;
        if (a === undefined) {                                           // take over from the idle drift where it currently is, so nothing jumps
            a = parseFloat(getComputedStyle(hero, '::before').getPropertyValue('--a')) || 0;
            hero.style.setProperty('--a', a + 'deg'); hero.classList.add('follow');
        }
        last = performance.now(); raf = requestAnimationFrame(step);
    }, { passive: true });
})();
