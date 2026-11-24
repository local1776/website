import asyncio, sys, json
from playwright.async_api import async_playwright
SRC=sys.argv[1]; OUT=sys.argv[2]; TAG=sys.argv[3]
FILL="""(()=>{const set=(id,v)=>{const e=document.getElementById(id); if(e && String(e.value).trim()===''){ e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }};
set('age','35'); set('deps','yes'); set('filing','married'); set('paysys','WG');
const gs=document.getElementById('paysys').value==='GS'; set('cgrade',gs?'9':'10'); set('cstep',gs?'5':'3');
set('civYears','12'); set('fersCohort','y2014plus'); set('grade','E-6'); set('retsys','legacy'); set('yos','12'); set('priorAD','0'); set('depMonths','0'); set('tspCiv','5'); set('tspMil','5');})()"""
CASES=[('nola','LA','New Orleans'),('shreveport','LA','Shreveport'),('sandiego','CA','San Diego')]
async def run():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for name,vp in (('desktop',{'width':1280,'height':900}),('phone',{'width':390,'height':844})):
            pg=await b.new_page(viewport=vp)
            errs=[]; reqs=[]
            pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
            pg.on('request',lambda r: reqs.append(r.url) if not r.url.startswith(('file:','data:')) else None)
            await pg.goto('file://'+SRC)
            await pg.click('#go'); refused=await pg.eval_on_selector('#results','e=>e.classList.contains("hide")')
            priv=await pg.eval_on_selector('.privacy','e=>({h:e.offsetHeight,clipped:e.scrollWidth>e.clientWidth})')
            res={'view':name,'refused_when_empty':refused,'privacy_bar':priv,'cases':{}}
            for cname,st,duty in CASES:
                await pg.select_option('#paysys','WG'); await pg.select_option('#state',st)
                opts=await pg.eval_on_selector_all('#mha option','els=>els.map(e=>[e.value,e.textContent])')
                o=[x for x in opts if duty in x[1]][0]
                await pg.select_option('#mha',o[0])
                await pg.fill('#fname','Test'); await pg.fill('#tspCiv','5'); await pg.fill('#tspMil','5')
                await pg.evaluate(FILL)
                await pg.check('#ack1'); await pg.check('#ack2')
                await pg.click('#go'); await pg.wait_for_timeout(800)
                head=await pg.inner_text('#headline')
                bad=await pg.evaluate('document.body.innerText.match(/NaN|undefined|Infinity|—|–/g)')
                of=await pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
                wa=await pg.eval_on_selector('#wageArea','e=>e.options[e.selectedIndex]?.textContent')
                el=await pg.query_selector('#headline'); await el.screenshot(path=f'{OUT}/{TAG}_{name}_{cname}_headline.png')
                res['cases'][cname]={'duty':o[1],'wage_area':wa,'headline':head.replace('\n',' | ')[:1500],'bad_text':bad,'overflow_px':of}
                if cname=='nola':
                    await pg.screenshot(path=f'{OUT}/{TAG}_{name}_full.png',full_page=True)
                    for tog in ('#segYr','#carColaOn','#retColaOn','#segMo'):
                        await pg.click(tog); await pg.wait_for_timeout(150)
                    res['cases'][cname]['bad_after_toggles']=await pg.evaluate('document.body.innerText.match(/NaN|undefined|Infinity|—|–/g)')
            # territory + GS path
            await pg.select_option('#paysys','GS'); await pg.select_option('#state','GU'); await pg.fill('#oha','2000'); await pg.evaluate(FILL); await pg.click('#go'); await pg.wait_for_timeout(500)
            res['territory_bad']=await pg.evaluate('document.body.innerText.match(/NaN|undefined|Infinity|—|–/g)')
            res['locality_option']=await pg.eval_on_selector('#locPct','e=>e.options[e.selectedIndex]?.textContent')
            res['errors']=errs; res['network_requests']=reqs
            print(json.dumps(res,indent=1))
            await pg.close()
        await b.close()
asyncio.run(run())
