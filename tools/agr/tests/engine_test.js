// Smoke test + baseline for the AGR calculator engine. Usage: node engine_test.js path/to/index.html
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const D=JSON.parse(html.match(/<script id="calcdata" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const eng=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const ctx={module:{exports:{}}}; vm.createContext(ctx); vm.runInContext(eng,ctx);
const E=ctx.module.exports;
const base={grade:'E-6',yos:12,age:35,priorAD:0,state:'LA',oha:null,locPct:17.06,mha:null,wageArea:null,paysys:'WG',cgrade:10,cstep:3,civYears:12,deps:'yes',filing:'married',retsys:'legacy',fersCohort:'y2014plus',tspCiv:5,tspMil:5,hourlyOverride:0,cola:0};
// pick first LA duty location and LA default wage area
const laMha=Object.keys(D.mhaLabels).filter(k=>D.mhaState[k]==='LA');
const S=[
 ['LA WG-10/3 E-6 12yrs legacy married',{state:'LA',mha:laMha.find(k=>/NEW ORLEANS/i.test(D.mhaLabels[k]))||laMha[0],wageArea:D.states.LA.fwsDefault}],
 ['LA same, BRS, single no deps',{state:'LA',mha:laMha[0],wageArea:D.states.LA.fwsDefault,retsys:'brs',deps:'no',filing:'single'}],
 ['TX GS-9/5 E-7 18yrs age 45, 4 prior AD',(()=>{const m=Object.keys(D.mhaLabels).filter(k=>D.mhaState[k]==='TX')[0];return {state:'TX',mha:m,paysys:'GS',cgrade:9,cstep:5,grade:'E-7',yos:18,age:45,priorAD:4,civYears:15,fersCohort:'pre2013'};})()],
 ['CA WS-10/5 O-3 10yrs age 32',(()=>{const m=Object.keys(D.mhaLabels).filter(k=>D.mhaState[k]==='CA')[0];return {state:'CA',mha:m,wageArea:D.states.CA.fwsDefault,paysys:'WS',cgrade:10,cstep:5,grade:'O-3',yos:10,age:32,civYears:6};})()],
 ['PR WG-8/2 E-5 OHA 1500 age 28',{state:'PR',oha:1500,wageArea:(D.states.PR.fws||[])[0]||null,cgrade:8,cstep:2,grade:'E-5',yos:8,age:28,civYears:4,hourlyOverride:D.states.PR.manualFws?22:0}],
 ['GU manual rate $25 E-6',{state:'GU',oha:2000,wageArea:null,hourlyOverride:25}],
 ['Age 58 E-8 30yrs (AGR 20 unreachable)',{state:'LA',mha:laMha[0],wageArea:D.states.LA.fwsDefault,grade:'E-8',yos:30,age:58,civYears:28,fersCohort:'pre2013'}],
];
let bad=0; const out=[];
const walk=(o,p)=>{for(const k in o){const v=o[k]; if(typeof v==='number'){ if(!isFinite(v)){bad++;console.log('  NON-FINITE',p+k);} } else if(v&&typeof v==='object') walk(v,p+k+'.');}};
for(const [name,over] of S){
  for(const mode of ['dst','t5']){
    const inp={...base,...over,mode};
    let r; try{ r=E.compute(D,inp);}catch(e){bad++;console.log('THROW',name,mode,e.message);continue;}
    walk(r,name+' '+mode+': ');
    if(mode==='dst') out.push({scenario:name, mha:inp.mha?D.mhaLabels[inp.mha]:'(OHA)', wa:inp.wageArea,
      techGross:Math.round(r.now.tech.gross), techNet:Math.round(r.now.tech.takeHome), agrGross:Math.round(r.now.agr.gross), agrNet:Math.round(r.now.agr.takeHome),
      yrs:r.cy, careerTechNet:Math.round(r.cFull.tTake), careerAgrNet:Math.round(r.cFull.aTake),
      fers:Math.round(r.ret.fersAnnual), guardPen:Math.round(r.ret.techResAnnual), agrPen:Math.round(r.ret.agrPensionAnnual), agrRetAge:r.ret.agrRetAge,
      techLife:Math.round(r.ret.techLifetime), agrLife:Math.round(r.ret.agrLifetime)});
    else out.push({scenario:name+' [T5]', techGross:Math.round(r.now.tech.gross), techNet:Math.round(r.now.tech.takeHome), careerTechNet:Math.round(r.cFull.tTake), fers:Math.round(r.ret.fersAnnual), guardPen:Math.round(r.ret.techResAnnual), techLife:Math.round(r.ret.techLifetime)});
  }
}
console.log(JSON.stringify(out,null,1));
// data integrity sweeps
let miss=0;
for(const st of D.stateList){ const info=D.states[st.code]; if(!info){console.log('no states entry',st.code);miss++;continue;}
  if(!D.tax.states[st.code]){console.log('no tax entry',st.code);miss++;}
  const mh=Object.keys(D.mhaLabels).filter(k=>D.mhaState[k]===st.code);
  if(!info.oha && !mh.length){console.log('no duty locations',st.code);miss++;}
  for(const f of (info.fws||[])) if(!D.fws[f]){console.log('missing fws',st.code,f);miss++;}
  if(!info.manualFws && !(info.fws||[]).length){console.log('no wage areas',st.code);miss++;}
}
for(const m of Object.keys(D.mhaLabels)){ if(!D.bah[m]){console.log('no BAH for',m);miss++;} }
const grades=Object.keys(D.basicPay);
for(const m of Object.keys(D.bah)){ for(const g of grades){ const r=D.bah[m][g]; if(!r||!(r.with>0)||!(r.without>0)){miss++; if(miss<15)console.log('BAH gap',m,g);} } }
for(const [id,w] of Object.entries(D.fws)){ for(const sys of ['WG','WL','WS']){ const n=sys==='WS'?19:15; for(let g=1;g<=n;g++){ const row=(w[sys]||{})[String(g)]; if(!row||row.length<5||row.some(x=>!(x>0))){miss++; if(miss<25)console.log('FWS gap',id,sys,g);} } } }
console.log('states',D.stateList.length,'duty locations',Object.keys(D.mhaLabels).length,'wage schedules',Object.keys(D.fws).length,'localities',Object.keys(D.localityPct).length);
console.log('RESULT non-finite/throws:',bad,' data gaps:',miss);
