# Reform page tools (moved here Nov 22 2026)

The Reform page itself is `site/apps/reform.html` (content + scripts) and `site/apps/reform.css` (its own styles). The build
wraps it in the site's header and footer at /reform. Edit those two files — not the old `local1776/reform` repo, which only
forwards to www.local1776.org/reform after launch (`tools/forwarders.mjs`).

- `handouts/build.py` — the four one-page PDF handouts (QR codes now point at www.local1776.org/reform). Needs `npm install`
  in `handouts/` (fonts) and Python with `segno`, `pypdf`, `playwright`. Run:
  `HANDOUT_LOGO=<logo.png> CHROME=<chrome.exe> python build.py`, then copy the PDFs to `site/files/reform/` and the page
  previews (`ho1.png`…`ho4.png`) to `site/img/reform/`.
- `tools/` — old one-off checks from the Nov 12 2026 update (they expect the old `/home/claude/` paths); kept as a record.
- The old source parts (`source/site/src/…`) had fallen behind the live page and were NOT brought over; they are in
  `backup/sister-sites/reform/` with the repo's history.
