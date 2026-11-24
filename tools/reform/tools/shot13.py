import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
        errs=[]
        for name,w,h,sf in (("d",1280,900,1),("m",390,844,2)):
            ctx=await b.new_context(viewport={"width":w,"height":h},device_scale_factor=sf)
            pg=await ctx.new_page()
            pg.on("pageerror",lambda e:errs.append(str(e)))
            pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
            await pg.goto("file:///home/claude/cbpage/index.html#congress")
            await pg.wait_for_timeout(700)
            el=await pg.query_selector("#handouts")
            await el.scroll_into_view_if_needed()
            await el.screenshot(path=f"/tmp/ho_{name}.png")
            await pg.click('.ho-view[data-ho="2"]')
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=f"/tmp/ho_{name}_lb.png")
            if name=="m":
                await pg.click("#lbI"); await pg.wait_for_timeout(200)
                await pg.screenshot(path=f"/tmp/ho_{name}_lbz.png")
            await pg.keyboard.press("Escape")
            print(name,"lb hidden:",await pg.eval_on_selector("#lb","e=>e.hidden"), "overflowX:",await pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"))
            # footer link
            await pg.goto("file:///home/claude/cbpage/index.html#summary"); await pg.wait_for_timeout(400)
            await pg.click("footer a[data-scroll]"); await pg.wait_for_timeout(1500)
            print(name,"after footer link hash",await pg.evaluate("location.hash"),"handouts top",await pg.eval_on_selector("#handouts","e=>Math.round(e.getBoundingClientRect().top)"))
            await pg.goto("file:///home/claude/cbpage/index.html#guard"); await pg.wait_for_timeout(500)
            el=await pg.query_selector("#v-guard .ho-act")
            await el.scroll_into_view_if_needed()
            box=await el.bounding_box()
            await pg.screenshot(path=f"/tmp/ho_{name}_guard.png")
            await pg.click('#v-guard .ho-act .ho-view'); await pg.wait_for_timeout(200)
            print(name,"guard lb title:",await pg.inner_text("#lbT"))
            await ctx.close()
        print("errors:",[e for e in errs if "font" not in e.lower() and "ERR_" not in e])
        await b.close()
asyncio.run(main())
