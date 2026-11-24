const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const D=JSON.parse(html.match(/<script id="calcdata" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const ctx={module:{exports:{}}}; vm.createContext(ctx); vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx); const E=ctx.module.exports;
const ST=['LA','CA','NV','MI','UT','SD','SC','NM','AR'];
const wg=y=>y<0.5?1:y<2?2:y<4?3:y<6?4:5, gs=y=>Math.min(10,Math.floor(y<=3?1+y:y<=9?4+(y-3)/2:7+(y-9)/3));
const mg=(y,top)=>y<6?'E-4':y<10?'E-5':(y<16||top==='E-6')?'E-6':'E-7';
const JOBS=[['WG',8],['WG',10],['WG',11],['GS',7],['GS',9]];
const prior=y=>Math.round(10*((y>=1?0.5:0)+y*(15/365)+y*(2/18)))/10;   // Ben's formula
const A={}; const bump=(k,d,need)=>{A[k]=A[k]||{n:0,t:0,e:[],need:[]}; A[k].n++; if(d>0)A[k].t++; A[k].e.push(d); A[k].need.push(need);};
for(const mha of Object.keys(D.mhaLabels)){ const st=D.mhaState[mha]; if(!ST.includes(st)) continue; const info=D.states[st]; const wa=(D.mhaDefaults[mha]||{}).fws||info.fwsDefault; if(!D.fws[wa]) continue; const loc=(D.mhaDefaults[mha]||{}).loc; const locPct=(loc&&D.localityPct[loc]!=null)?D.localityPct[loc]:(info.locDefault??17.06);
  for(const age of [25,28,30,32,35,38,40,45,50,55]) for(const hire of [23,30]){ if(age<=hire) continue; for(const [ps,cg] of JOBS) for(const deps of ['yes','no']){ const civ=age-hire,yos=age-19;
    const inp={grade:mg(yos,(cg>=11||(ps==='GS'&&cg>=9))?'E-7':'E-6'),yos,age,priorAD:prior(yos),depMonths:Math.round(yos*(2/18)*12),state:st,oha:null,locPct,mha,wageArea:wa,paysys:ps,cgrade:cg,cstep:ps==='GS'?gs(civ):wg(civ),civYears:civ,deps,filing:deps==='yes'?'married':'single',retsys:yos>=9?'legacy':'brs',fersCohort:(2026-civ)<2013?'pre2013':(2026-civ)===2013?'y2013':'y2014plus',tspCiv:5,tspMil:5,hourlyOverride:0,mode:'dst'};
    const L=E.lifetime(D,inp); const half=Math.max(1,Math.floor(L.agrWorkYrs/2)); const C=E.lifetime(D,{...inp,cutYears:half});
    const need=L.agrAll<=L.civAll?101:C.agrAll>=L.civAll?0:Math.round(100*(L.civAll-C.agrAll)/(L.agrAll-C.agrAll));
    bump('all',L.civAll-L.agrAll,need); bump('age '+age,L.civAll-L.agrAll,need); } } }
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
for(const k of Object.keys(A)){ const a=A[k]; const m=med(a.need); console.log(k.padEnd(8),'n='+String(a.n).padEnd(5),'Technician ahead',String(Math.round(100*a.t/a.n)+'%').padStart(4),'| median edge',('$'+Math.round(med(a.e)/1000)+'k').padStart(8),'| odds AGR needs if cut halfway:',m>100?'never ahead':m+'%'); }
