import asyncio, sys, json
FILL="""(()=>{const set=(id,v)=>{const e=document.getElementById(id); if(e && String(e.value).trim()===''){ e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }};
set('age','35'); set('deps','yes'); set('filing','married'); set('paysys','WG');
const gs=document.getElementById('paysys').value==='GS'; set('cgrade',gs?'9':'10'); set('cstep',gs?'5':'3');
set('civYears','12'); set('fersCohort','y2014plus'); set('grade','E-6'); set('retsys','legacy'); set('yos','12'); set('priorAD','0'); set('depMonths','0'); set('tspCiv','5'); set('tspMil','5');})()"""
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for name,vp in (('desktop',{'width':1280,'height':900}),('phone',{'width':390,'height':844})):
            pg=await b.new_page(viewport=vp); errs=[]
            pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
            await pg.goto('file://'+sys.argv[1])
            out={'view':name,'byline':await pg.inner_text('.byline')}
            for st,oha,rate in (('PR','1500',None),('GU','2000','25'),('VI','2000','25')):
                await pg.select_option('#state',st); await pg.fill('#oha',oha)
                if rate: await pg.fill('#hourly',rate)
                await pg.fill('#fname','Test'); await pg.fill('#tspCiv','5'); await pg.fill('#tspMil','5'); await pg.check('#ack1'); await pg.check('#ack2'); await pg.evaluate(FILL)
                await pg.click('#go'); await pg.wait_for_timeout(700)
                shown=not await pg.eval_on_selector('#results','e=>e.classList.contains("hide")')
                hints=await pg.eval_on_selector_all('#dstCol .hint, #agrCol .hint','els=>els.map(e=>e.textContent).filter(t=>/Puerto Rico|Guam|Virgin/.test(t))')
                tax=await pg.eval_on_selector_all('#dstCol .brow, #agrCol .brow','els=>els.filter(e=>/Federal \\+ State Income Tax/.test(e.textContent)).map(e=>e.querySelector(".val")?.textContent)')
                head=(await pg.inner_text('#headline')).split('\n')[1:3]
                bad=await pg.evaluate('document.body.innerText.match(/NaN|undefined|Infinity|—|–/g)')
                of=await pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
                out[st]={'shown':shown,'income_tax_rows(dst,agr)':tax,'hints':hints[:2],'verdict':head,'bad':bad,'overflow':of}
            out['errors']=errs; print(json.dumps(out,indent=1)); await pg.close()
        await b.close()
asyncio.run(run())
