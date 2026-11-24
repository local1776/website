import asyncio, sys, json
from playwright.async_api import async_playwright
SRC=sys.argv[1]; OUT=sys.argv[2]
async def run():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1280,'height':900}); errs=[]
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
        await pg.goto('file://'+SRC); out={}
        hidden=lambda: pg.eval_on_selector('#results','e=>e.classList.contains("hide")')
        msg=lambda: pg.inner_text('#formMsg')
        await pg.check('#ack1'); await pg.check('#ack2'); await pg.click('#go'); await pg.wait_for_timeout(200)
        out['1_empty']={'results_hidden':await hidden(),'msg':(await msg()).replace('\n',' | ')[:600],'highlighted':await pg.evaluate("document.querySelectorAll('.miss-sel').length")}
        # fill everything, with entries that contradict each other
        await pg.fill('#age','30'); await pg.select_option('#deps','yes'); await pg.select_option('#filing','married'); await pg.select_option('#state','LA')
        opts=await pg.eval_on_selector_all('#mha option','els=>els.map(e=>[e.value,e.textContent])')
        await pg.select_option('#mha',[x for x in opts if 'New Orleans' in x[1]][0][0])
        await pg.select_option('#paysys','WG'); await pg.select_option('#cgrade','10'); await pg.select_option('#cstep','5')
        await pg.fill('#civYears','20'); await pg.select_option('#fersCohort','y2014plus'); await pg.fill('#tspCiv','5')
        await pg.select_option('#grade','E-6'); await pg.select_option('#retsys','legacy'); await pg.fill('#yos','12'); await pg.fill('#priorAD','14'); await pg.fill('#depMonths','300'); await pg.fill('#tspMil','5')
        await pg.click('#go'); await pg.wait_for_timeout(200)
        out['2_nonsense']={'results_hidden':await hidden(),'msg':(await msg()).replace('\n',' | ')[:1500]}
        el=await pg.query_selector('#formMsg'); await el.screenshot(path=f'{OUT}/formmsg_nonsense.png')
        # recent joiner on Legacy
        await pg.fill('#civYears','6'); await pg.fill('#yos','6'); await pg.fill('#priorAD','1'); await pg.fill('#depMonths','0')
        await pg.click('#go'); await pg.wait_for_timeout(200)
        out['3_legacy_2020']={'results_hidden':await hidden(),'msg':(await msg()).replace('\n',' | ')[:400]}
        # fixed: zero prior active shows the heads-up but runs
        await pg.fill('#yos','12'); await pg.fill('#priorAD','0'); await pg.click('#go'); await pg.wait_for_timeout(700)
        out['4_fixed']={'results_hidden':await hidden(),'formMsg_hidden':await pg.eval_on_selector('#formMsg','e=>e.classList.contains("hide")'),'soft':(await pg.inner_text('#softNote'))[:260],'typed_priorAD_still':await pg.input_value('#priorAD')}
        # blank a box after results, then flip a switch: results must go away, not run on a guess
        await pg.fill('#age',''); await pg.click('#segYr'); await pg.wait_for_timeout(300)
        out['5_blank_after']={'results_hidden':await hidden(),'msg':(await msg()).replace('\n',' | ')[:200]}
        await pg.fill('#age','30'); await pg.fill('#priorAD','1.5'); await pg.click('#go'); await pg.wait_for_timeout(700)
        out['6_good']={'results_hidden':await hidden(),'soft_hidden':await pg.eval_on_selector('#softNote','e=>e.classList.contains("hide")'),'bad':await pg.evaluate('document.body.innerText.match(/NaN|undefined|Infinity|—|–/g)')}
        out['errors']=errs
        print(json.dumps(out,indent=1)); await b.close()
asyncio.run(run())
