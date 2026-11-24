# snapbanane.github.io

Personal website of Julius Gerhardus ([@SnapBanane](https://github.com/SnapBanane)), live at [snapbanane.github.io](https://snapbanane.github.io/).

Plain static HTML, CSS and JavaScript served by GitHub Pages. No build step, no tracking, no third-party CDNs.

## Structure

```
index.html              home page
impressum.html          legal notice (§ 5 DDG)
datenschutz.html        privacy policy (DSGVO)
404.html                not-found page (root-absolute URLs: GitHub Pages serves it at any path)
assets/
  css/main.css          all styles (shared by every page)
  js/main.js            nav, scroll reveal, email link, hero glow
  js/arm.js             3D robot arm (ES module, three.js)
  fonts/                self-hosted web fonts (no Google Fonts requests)
  models/robot-arm.glb  robot arm geometry
  vendor/               three.js and helpers (MIT)
favicon.svg, safari-pinned-tab.svg, apple-touch-icon.png, og-image.png, robots.txt, sitemap.xml
googleebfb65dc5f2a80e2.html   Google Search Console verification, keep at root
```

## Run locally

ES modules and `fetch` need a web server, so opening the file directly won't load the arm:

```sh
python -m http.server 8000
# open http://localhost:8000
```

## Privacy

Every asset is served from this site, and the page makes no requests to third parties (the repo list is static HTML on purpose). If you add an external resource (fonts, analytics, embeds, live API calls), update `datenschutz.html` first.
