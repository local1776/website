import asyncio, json, sys
from playwright.async_api import async_playwright
NEW=["cbo78","gaotech82","gao14","cna13","eo13203","eo13812","eo13836","lameduck","flra7466","fsip21","blawfsip","usc7101","usc7117","usc7118","usc7119","usc7122","usc7123","usc7513","usc1918","usc39_1209"]
JS = r"""
() => {
  const txt = document.body.innerText;
  const S = window.SOURCES;
  const sups = [...document.querySelectorAll('sup.fn[data-k]')];
  const missing = sups.filter(e => !S[e.getAttribute('data-k')]).map(e => e.getAttribute('data-k'));
  const empty = sups.filter(e => !e.textContent.trim()).length;
  const used = new Set(sups.map(e => e.getAttribute('data-k')));
  const srcList = document.querySelector('#sources') ? document.querySelector('#sources').innerText : '';
  return {
    pendingEls: document.querySelectorAll('.pending').length,
    pendingText: (txt.match(/source[s]? pending/gi)||[]).length,
    draftText: (txt.match(/working draft/gi)||[]).length,
    draftEls: document.querySelectorAll('p.draft').length,
    sups: sups.length, missing, empty,
    newUsed: %s.map(k => [k, used.has(k), S[k] ? S[k]._n : null]),
    holes: document.querySelectorAll('details.hole').length,
    myths: document.querySelectorAll('details.myth').length,
    evCards: document.querySelectorAll('details.ev-card').length,
    sealSlots: [...document.querySelectorAll('span.seal')].filter(e => !e.classList.contains('simg')).length,
    dashed: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).borderTopStyle === 'dashed' && e.offsetWidth > 60 && e.offsetHeight > 40).map(e => e.className).slice(0, 12),
    studies: [...document.querySelectorAll('ul.studies li b')].map(e => e.textContent),
    caption: (document.querySelector('#figAgr') ? document.querySelector('#figAgr').parentElement.querySelector('figcaption').innerText : ''),
    byline: document.querySelector('.byline') ? document.querySelector('.byline').innerText : '',
    footer: document.querySelector('footer').innerText.slice(-120),
    cnaRow: srcList.split('\n').filter(l => /CNA, Report/.test(l)).slice(0,1),
    srcCount: srcList.split('\n').filter(l => l.trim()).length
  };
}
""" % json.dumps(NEW)
async def main(path, tag):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        errs = []
        for name, vp in (("desk", {"width":1280,"height":900}), ("phone", {"width":390,"height":844})):
            pg = await b.new_page(viewport=vp)
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            await pg.goto("file://" + path); await pg.wait_for_timeout(1500)
            if name == "desk":
                r = await pg.evaluate(JS); print(json.dumps(r, indent=1))
            # open the guard section the way a visitor would: use the page's own nav if present
            await pg.evaluate("() => { const a=[...document.querySelectorAll('[data-go],[data-page],nav a,button')].find(e=>/guard/i.test(e.textContent||'')); if(a) a.click(); }")
            await pg.wait_for_timeout(700)
            for sel, nm in (("#figAgr", "caption"), ("ul.studies", "studies"), (".fair", "fair")):
                el = await pg.query_selector(sel)
                if el:
                    try:
                        await el.scroll_into_view_if_needed(timeout=3000); await pg.wait_for_timeout(300)
                        await pg.screenshot(path=f"shots/{tag}_{name}_{nm}.jpg", type="jpeg", quality=88)
                    except Exception as e: print("shot fail", sel, name, str(e)[:80])
            if name == "desk":
                await pg.screenshot(path=f"shots/{tag}_{name}_top.jpg", type="jpeg", quality=85)
            await pg.close()
        print("errors:", errs[:6])
        await b.close()
asyncio.run(main(sys.argv[1], sys.argv[2]))
