import asyncio, sys
FILL="""(()=>{const set=(id,v)=>{const e=document.getElementById(id); if(e && String(e.value).trim()===''){ e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }};
set('age','35'); set('deps','yes'); set('filing','married'); set('paysys','WG');
const gs=document.getElementById('paysys').value==='GS'; set('cgrade',gs?'9':'10'); set('cstep',gs?'5':'3');
set('civYears','12'); set('fersCohort','y2014plus'); set('grade','E-6'); set('retsys','legacy'); set('yos','12'); set('priorAD','0'); set('depMonths','0'); set('tspCiv','5'); set('tspMil','5');})()"""
ST,DUTY=sys.argv[5],sys.argv[6]
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':1280,'height':900})
        await ctx.add_init_script("window.print=()=>{}")
        for src,out in ((sys.argv[1],sys.argv[2]),(sys.argv[3],sys.argv[4])):
            pg=await ctx.new_page()
            await pg.goto('file://'+src)
            await pg.select_option('#state',ST)
            opts=await pg.eval_on_selector_all('#mha option','els=>els.map(e=>[e.value,e.textContent])')
            await pg.select_option('#mha',[o for o in opts if DUTY in o[1]][0][0])
            await pg.fill('#fname','Test'); await pg.fill('#tspCiv','5'); await pg.fill('#tspMil','5')
            await pg.check('#ack1'); await pg.check('#ack2'); await pg.evaluate(FILL); await pg.click('#go'); await pg.wait_for_timeout(600)
            async with pg.expect_popup() as pi:
                await pg.click('#btnPrint')
            w=await pi.value; await w.wait_for_timeout(1200)
            await w.emulate_media(media='print')
            m=await w.evaluate("""()=>{const p1=document.querySelector('#printDoc .pPage.first'); const fp=p1.querySelector('.fineprint'); const kids=[...p1.children].filter(x=>x!==fp);
              const last=kids[kids.length-1].getBoundingClientRect(); const f=fp.getBoundingClientRect(); return {title:document.title, contentBottom:Math.round(last.bottom), fineprintTop:Math.round(f.top), gap_px:Math.round(f.top-last.bottom), page1_px:Math.round(p1.getBoundingClientRect().height), dash:(document.body.innerText.match(/—|–/g)||[]).length};}""")
            await w.pdf(path=out,prefer_css_page_size=True,print_background=True)
            print(out.split('/')[-1],m)
            await pg.close(); await w.close()
        await b.close()
asyncio.run(run())
