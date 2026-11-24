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
            await pg.fill('#age','38'); await pg.select_option('#state','LA')
            opts=await pg.eval_on_selector_all('#mha option','els=>els.map(e=>[e.value,e.textContent])')
            await pg.select_option('#mha',[x for x in opts if 'New Orleans' in x[1]][0][0])
            await pg.select_option('#paysys','WG'); await pg.select_option('#cgrade','10'); await pg.select_option('#cstep','5')
            await pg.fill('#civYears','12'); await pg.select_option('#grade','E-6'); await pg.fill('#yos','18')
            await pg.fill('#priorAD','3.2'); await pg.fill('#depMonths','24'); await pg.fill('#tspCiv','5'); await pg.fill('#tspMil','5')
            await pg.select_option('#fersCohort','y2014plus'); await pg.select_option('#deps','yes'); await pg.select_option('#filing','married'); await pg.select_option('#retsys','legacy')
            await pg.check('#ack1'); await pg.check('#ack2'); await pg.click('#go'); await pg.wait_for_timeout(900)
            norow=(await pg.inner_text('#retRows')).count('Your Whole TSP')
            await pg.fill('#tspBalCiv','80000'); await pg.fill('#tspBalMil','15000'); await pg.click('#go'); await pg.wait_for_timeout(900)
            rr=(await pg.inner_text('#retRows')).replace('\n',' | '); k=rr.find('Your Whole TSP'); print('TSPROW blank:',norow,'| filled:',rr[k:k+230]); print('KICKER:',(await pg.inner_text('#headline'))[:60].replace('\n',' | '))
            out={'view':name}
            out['headline']=(await pg.inner_text('#headline')).replace('\n',' | ')[:900]
            out['cut']=(await pg.inner_text('#cutBody')).replace('\n',' | ')[:1500]
            out['ret']=(await pg.inner_text('#retRows')).replace('\n',' | ')[:1800]
            for cid in ('headline','cardRetire','cardCut','cardGraph','cardRights','cardRecord'):
                el=await pg.query_selector('#'+cid); await el.screenshot(path=f'{OUT}/mech_{name}_{cid}.png')
            await pg.select_option('#cutSel','4'); await pg.wait_for_timeout(300)
            out['cut4']=(await pg.inner_text('#cutBody')).replace('\n',' | ')[:700]
            out['bad']=await pg.evaluate('document.body.innerText.match(/NaN|undefined|Infinity|—|–/g)')
            out['overflow']=await pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
            out['errors']=errs
            print(json.dumps(out,indent=1))
            await pg.close()
        await b.close()
asyncio.run(run())
