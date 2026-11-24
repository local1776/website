import asyncio, sys, json
from playwright.async_api import async_playwright
SRC=sys.argv[1]; OUT=sys.argv[2]
async def run():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for name,vp in (('desktop',{'width':1280,'height':900}),('phone',{'width':390,'height':844})):
            pg=await b.new_page(viewport=vp); errs=[]
            pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
            await pg.goto('file://'+SRC)
            await pg.fill('#fname','Mike'); await pg.fill('#age','50'); await pg.select_option('#deps','yes'); await pg.select_option('#filing','married'); await pg.select_option('#state','LA')
            opts=await pg.eval_on_selector_all('#mha option','els=>els.map(e=>[e.value,e.textContent])')
            await pg.select_option('#mha',[x for x in opts if 'New Orleans' in x[1]][0][0])
            await pg.select_option('#paysys','WG'); await pg.select_option('#cgrade','10'); await pg.select_option('#cstep','5')
            await pg.fill('#civYears','26'); await pg.select_option('#fersCohort','pre2013'); await pg.fill('#tspCiv','5')
            await pg.select_option('#grade','E-6'); await pg.select_option('#retsys','legacy'); await pg.fill('#yos','30'); await pg.fill('#priorAD','5.1'); await pg.fill('#depMonths','24'); await pg.fill('#tspMil','5')
            await pg.check('#ack1'); await pg.check('#ack2'); await pg.click('#go'); await pg.wait_for_timeout(900)
            head=(await pg.inner_text('#headline')).replace('\n',' | ')
            ret=(await pg.inner_text('#retRows')).replace('\n',' | ')
            k=ret.find('Military Retirement')
            el=await pg.query_selector('#headline'); await el.screenshot(path=f'{OUT}/older_{name}_headline.png')
            print(json.dumps({'view':name,'head':head[:1250],'ret':ret[k:k+260],'bad':await pg.evaluate('document.body.innerText.match(/NaN|undefined|Infinity|—|–/g)'),'overflow':await pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth'),'errors':errs},indent=1))
            await pg.close()
        await b.close()
asyncio.run(run())
