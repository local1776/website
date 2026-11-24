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
            await pg.goto('file://'+SRC); out={'view':name}
            hid=lambda: pg.eval_on_selector('#commWrap','e=>e.classList.contains("hide")')
            res=lambda: pg.eval_on_selector('#results','e=>e.classList.contains("hide")')
            out['box_hidden_at_start']=await hid()
            await pg.fill('#age','40'); await pg.select_option('#deps','yes'); await pg.select_option('#filing','married'); await pg.select_option('#state','LA')
            opts=await pg.eval_on_selector_all('#mha option','els=>els.map(e=>[e.value,e.textContent])')
            await pg.select_option('#mha',[x for x in opts if 'New Orleans' in x[1]][0][0])
            await pg.select_option('#paysys','GS'); await pg.select_option('#cgrade','11'); await pg.select_option('#cstep','6')
            await pg.fill('#civYears','14'); await pg.select_option('#fersCohort','pre2013'); await pg.fill('#tspCiv','5')
            await pg.select_option('#grade','E-7'); out['box_hidden_enlisted']=await hid()
            await pg.select_option('#retsys','legacy'); await pg.fill('#yos','20'); await pg.fill('#priorAD','14'); await pg.fill('#depMonths','12'); await pg.fill('#tspMil','5')
            await pg.check('#ack1'); await pg.check('#ack2'); await pg.click('#go'); await pg.wait_for_timeout(700)
            out['enlisted_runs_without_box']=not await res()
            await pg.select_option('#grade','W-3'); out['box_hidden_warrant']=await hid()
            await pg.select_option('#grade','O-3'); out['box_shown_officer']=(not await hid()) and not await pg.eval_on_selector('#enlWrap','e=>e.classList.contains("hide")')
            await pg.click('#go'); await pg.wait_for_timeout(300)
            out['officer_blank_refused']=await res(); out['msg1']=(await pg.inner_text('#formMsg')).replace('\n',' | ')[:230]
            await pg.fill('#enlAD','8'); await pg.fill('#commAD','2'); await pg.click('#go'); await pg.wait_for_timeout(300)
            out['officer_too_many_refused']=await res(); out['msg2']=(await pg.inner_text('#formMsg')).replace('\n',' | ')[:330]
            await pg.fill('#enlAD','12'); await pg.fill('#commAD','2'); await pg.click('#go'); await pg.wait_for_timeout(800)
            out['soft']=(await pg.inner_text('#softNote')).replace('\n',' | ')[:330]
            out['officer_runs']=not await res()
            head=(await pg.inner_text('#headline')).replace('\n',' | '); k=head.find('The AGR figure is a best case'); out['best_case']=head[k:k+330]
            real=(await pg.inner_text('#reality')).replace('\n',' | '); k=real.find('AGR: 20 years'); out['reality']=real[k:k+260]
            ret=(await pg.inner_text('#retRows')).replace('\n',' | '); k=ret.find('Military Retirement'); out['ret']=ret[k:k+200]
            el=await pg.query_selector('#commWrap'); await el.screenshot(path=f'{OUT}/officer_{name}_box.png')
            out['bad']=await pg.evaluate('document.body.innerText.match(/NaN|undefined|Infinity|—|–/g)'); out['overflow']=await pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth'); out['errors']=errs
            print(json.dumps(out,indent=1)); await pg.close()
        await b.close()
asyncio.run(run())
