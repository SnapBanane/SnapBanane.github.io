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

/* ---------- Hero glow follows the mouse (desktop only) ---------- */
(() => {
    const hero = document.querySelector('.hero');
    if (!hero || !matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    let x, target, last = 0, raf = 0;
    const step = now => {
        const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
        x += (target - x) * (1 - Math.exp(-dt * 2.2));                 // damped: ~0.5 s to catch up, never jumpy
        hero.style.setProperty('--sun', x.toFixed(2) + '%');
        raf = Math.abs(target - x) > .05 ? requestAnimationFrame(step) : 0;
    };
    addEventListener('mousemove', e => {
        target = 22 + 56 * e.clientX / innerWidth;                       // keep the glow within the arc's visible width
        if (raf) return;
        if (x === undefined) {                                           // take over from the idle drift where it currently is, so nothing jumps
            x = parseFloat(getComputedStyle(hero, '::before').getPropertyValue('--sun')) || 36;
            hero.style.setProperty('--sun', x + '%'); hero.classList.add('follow');
        }
        last = performance.now(); raf = requestAnimationFrame(step);
    }, { passive: true });
})();
