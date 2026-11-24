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

/* ---------- Open source list (live from GitHub) ---------- */
(() => {
    const list = document.getElementById('repoList'), status = document.getElementById('repoStatus');
    if (!list) return;                                                  // only the home page has the repo list
    const hidden = new Set(['snapbanane', 'snapbanane.github.io', 'doomstyle', 'airdropreworked']);
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    fetch('https://api.github.com/users/snapbanane/repos?sort=pushed&per_page=100')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(repos => {
            const items = repos.filter(r => !r.fork && !hidden.has(r.name.toLowerCase()))
                               .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
            if (!items.length) { status.textContent = 'No other public repositories right now.'; return; }
            status.remove();
            items.forEach((r, i) => {
                const li = el('li', 'reveal'); li.style.setProperty('--i', i);
                const a = el('a', 'leader'); a.href = r.html_url; a.target = '_blank'; a.rel = 'noreferrer';
                if (r.description) a.title = r.description;
                a.append(el('span', 'name', r.name), el('span', 'dots'),
                         el('span', 't', (r.language || 'Other') + ' · ' + new Date(r.pushed_at).getFullYear()));
                li.appendChild(a); list.appendChild(li);
            });
            requestAnimationFrame(() => requestAnimationFrame(() => list.querySelectorAll('li').forEach(li => {
                const b = li.getBoundingClientRect();
                if (b.top < innerHeight && b.bottom > 0) li.classList.add('in'); else reveal(li);
            })));
        })
        .catch(() => {
            status.textContent = 'GitHub did not respond (possibly rate-limited). ';
            const a = el('a', '', 'Browse all repositories ↗');
            a.href = 'https://github.com/SnapBanane?tab=repositories'; a.target = '_blank'; a.rel = 'noreferrer';
            status.appendChild(a);
        });
})();
