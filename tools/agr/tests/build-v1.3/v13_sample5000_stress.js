// 5,000 random members, nationwide, from a brand-new kid out of tech school to an old salty Technician.
// Usage: node v13_sample5000.js index.html [seed]
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const D=JSON.parse(html.match(/<script id="calcdata" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const ctx={module:{exports:{}}}; vm.createContext(ctx); vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx); const E=ctx.module.exports;
const ctx2={module:{exports:{}}}; vm.createContext(ctx2); vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1].replace('function mraFor(age){','function mraFor(age){ if(globalThis.__MRA) return globalThis.__MRA;'),ctx2); const E2=ctx2.module.exports;
let seed=+(process.argv[3]||1776); const R=()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
const U=(a,b)=>a+(b-a)*R(), pick=a=>a[Math.floor(R()*a.length)], r1=v=>Math.round(v*10)/10;
const wpick=arr=>{ let x=R()*arr.reduce((s,a)=>s+a[1],0); for(const a of arr){ x-=a[1]; if(x<=0) return a[0]; } return arr[arr.length-1][0]; };
const LOCS=[]; for(const mha of Object.keys(D.mhaLabels)){ const st=D.mhaState[mha], info=D.states[st]; if(!info||info.oha||info.manualFws) continue; const wa=(D.mhaDefaults[mha]||{}).fws||info.fwsDefault; if(!D.fws[wa]) continue;
  const loc=(D.mhaDefaults[mha]||{}).loc; const locPct=(typeof loc==='number')?loc:(loc&&D.localityPct[loc]!=null?D.localityPct[loc]:(info.locDefault??17.06)); LOCS.push({mha,st,wa,locPct}); }
const wgStep=y=>y<0.5?1:y<1.5?2:y<2.5?3:y<3.5?4:5, gsStep=y=>Math.min(10,Math.floor(y<=3?1+y:y<=9?4+(y-3)/2:7+(y-9)/3));
const monthsSince2008=Math.floor((Date.now()-new Date('2008-01-28').getTime())/2629800000);
function member(){
  const age=Math.round(U(20,58)), entry=Math.round(U(18,24));
  const yos=Math.max(1,Math.min(38,age-Math.min(entry,age-1)));
  const civYears=r1(Math.max(0.3,Math.min(age-18,yos*U(0.3,1.0))));
  const paysys=wpick([['WG',58],['WL',6],['WS',12],['GS',24]]);
  const cgrade=paysys==='GS'?wpick([[5,6],[6,6],[7,22],[8,6],[9,28],[10,4],[11,18],[12,10]]):paysys==='WS'?wpick([[8,15],[9,25],[10,35],[11,15],[12,10]]):paysys==='WL'?wpick([[8,25],[9,25],[10,50]]):wpick([[5,4],[6,5],[7,8],[8,22],[9,10],[10,33],[11,13],[12,5]]);
  const cstep=paysys==='GS'?gsStep(civYears):wgStep(civYears);
  const kind=(paysys==='GS'&&cgrade>=9&&R()<0.22)?'O':((paysys==='WS'||(paysys==='WG'&&cgrade>=11))&&R()<0.10)?'W':'E';
  let grade;
  if(kind==='O') grade=yos<3?'O-1':yos<5?'O-2':yos<11?'O-3':yos<18?'O-4':'O-5';
  else if(kind==='W') grade=yos<6?'W-1':yos<12?'W-2':yos<19?'W-3':'W-4';
  else { const senior=(paysys==='WS'||cgrade>=11||(paysys==='GS'&&cgrade>=9)); grade=yos<2?'E-3':yos<5?'E-4':yos<9?'E-5':yos<15?(R()<0.2?'E-5':'E-6'):yos<20?(senior&&R()<0.5?'E-7':'E-6'):(senior?(R()<0.25?'E-8':'E-7'):(R()<0.4?'E-7':'E-6')); }
  // prior active duty: Ben's planning formula with spread, plus some members with a prior regular enlistment
  const depYrsPlan=yos*(2/18)*U(0,2.0);
  let priorAD=(yos>=1?U(0.3,0.8):0.2)+yos*(15/365)+depYrsPlan+(R()<0.12?U(3,8):0);
  priorAD=r1(Math.max(0.2,Math.min(priorAD,yos,19.5)));
  const depMonths=Math.round(Math.max(0,Math.min(depYrsPlan*12*U(0.3,1),(priorAD-0.3)*12,monthsSince2008)));
  const joined=2026-Math.ceil(yos); const retsys=joined>=2018?'brs':(joined>=2006&&R()<0.25?'brs':'legacy');
  const hired=2026-civYears; const fersCohort=hired<2013?'pre2013':hired<2014?'y2013':'y2014plus';
  const deps=R()<0.65?'yes':'no', L=pick(LOCS);
  return {grade,yos,age,priorAD,depMonths,state:L.st,oha:null,locPct:L.locPct,mha:L.mha,wageArea:L.wa,paysys,cgrade,cstep,civYears,deps,filing:deps==='yes'?'married':'single',retsys,fersCohort,
    tspCiv:wpick([[5,70],[3,10],[10,15],[0,5]]),tspMil:wpick([[0,40],[5,50],[10,10]]),hourlyOverride:0,mode:'dst'};
}
const N=5000, rows=[]; let bad=0, mism=0, thrown=0;
for(let k=0;k<N;k++){ const inp=member();
  try{ const L=E.lifetime(D,inp), r=E.retirement(D,{...inp,cola:0}), now=E.compute(D,{...inp,cola:0}).now, t20=E.agrTwenty(D,inp);
    if(![L.civAll,L.agrAll,L.civWork,L.agrWork,L.civRet,L.agrRet].every(isFinite)) bad++;
    const pkgD=r.techLifetime+r.fersSuppLife+r.techTsp.gov+r.techTspGrowth+r.ssTech-r.civHealthLife, pkgA=r.agrLifetime+r.agrTsp.gov+r.agrTspGrowth+r.ssAgr-r.agrHealthLife;
    if(Math.abs(pkgD-L.civRet)>1||Math.abs(pkgA-L.agrRet)>1) mism++;
    const half=Math.max(1,Math.round(t20.serve/2)); const C=E.lifetime(D,{...inp,cutYears:half});
    const need=L.agrAll<=L.civAll?101:C.agrAll>=L.civAll?0:Math.ceil(100*(L.civAll-C.agrAll)/(L.agrAll-C.agrAll));
    let edgeSame=L.civAll-L.agrAll; const agrEnd=inp.age+t20.serve, mra=E.mraFor(inp.age);
    if(agrEnd>mra+0.01 && inp.age<60){ ctx2.__MRA=Math.min(60,Math.max(mra,agrEnd)); const L2=E2.lifetime(D,inp); edgeSame=L2.civAll-L.agrAll; ctx2.__MRA=0; }
    const gap=(t20.earned&&agrEnd<mra)?(mra-agrEnd):0; const edgeJob=(L.civAll-L.agrAll)-gap*now.tech.takeHomeCiv; // stress test: the AGR retiree walks straight into a civilian job with the Technician's civilian take-home, until the Technician's retirement age
    rows.push({inp,edgeJob,gap,edgeSame,past:agrEnd>mra+0.01,edge:L.civAll-L.agrAll,ret:L.civRet-L.agrRet,work:L.civWork-L.agrWork,take:now.agr.takeHome-now.tech.takeHome,reach:t20.reachableBy60,cutEdge:L.civAll-C.agrAll,need,civAll:L.civAll});
  }catch(e){ thrown++; if(thrown<4) console.log('THROW',e.message,JSON.stringify(inp)); } }
const pct=(a,fn)=>a.length?Math.round(100*a.filter(fn).length/a.length):0, med=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[s.length>>1]:0;}, k=v=>(v<0?'-':'')+'$'+Math.abs(Math.round(v/1000))+'K';
console.log('members run',rows.length,'| threw',thrown,'| non-finite',bad,'| retirement-card mismatches',mism,'| duty locations used',new Set(rows.map(r=>r.inp.mha)).size,'| states',new Set(rows.map(r=>r.inp.state)).size);
const line=(label,a)=>console.log(label.padEnd(24),'n='+String(a.length).padEnd(5),'| Tech ahead',String(pct(a,r=>r.edge>0)).padStart(3)+'%','| Tech by 100K+',String(pct(a,r=>r.edge>=1e5)).padStart(3)+'%','close',String(pct(a,r=>Math.abs(r.edge)<1e5)).padStart(3)+'%','AGR by 100K+',String(pct(a,r=>r.edge<=-1e5)).padStart(3)+'%','| median',k(med(a.map(r=>r.edge))).padStart(7),'| Tech wins retirement',String(pct(a,r=>r.ret>0)).padStart(3)+'%','| no active-duty ret.',String(pct(a,r=>!r.reach)).padStart(3)+'%','| Tech ahead if cut halfway',String(pct(a,r=>r.cutEdge>0)).padStart(3)+'%');
line('EVERYONE',rows);
for(const [lo,hi] of [[20,24],[25,29],[30,34],[35,39],[40,44],[45,49],[50,58]]) line('age '+lo+' to '+hi,rows.filter(r=>r.inp.age>=lo&&r.inp.age<=hi));
console.log('---'); line('Legacy',rows.filter(r=>r.inp.retsys==='legacy')); line('BRS',rows.filter(r=>r.inp.retsys==='brs'));
for(const ps of ['WG','WL','WS','GS']) line(ps,rows.filter(r=>r.inp.paysys===ps));
line('enlisted',rows.filter(r=>r.inp.grade[0]==='E')); line('warrant',rows.filter(r=>r.inp.grade[0]==='W')); line('officer',rows.filter(r=>r.inp.grade[0]==='O'));
line('with dependents',rows.filter(r=>r.inp.deps==='yes')); line('no dependents',rows.filter(r=>r.inp.deps==='no'));
line('prior active under 3',rows.filter(r=>r.inp.priorAD<3)); line('prior active 3 to 8',rows.filter(r=>r.inp.priorAD>=3&&r.inp.priorAD<8)); line('prior active 8 plus',rows.filter(r=>r.inp.priorAD>=8));
console.log('--- AGR take-home higher today:',pct(rows,r=>r.take>0)+'%','| median AGR take-home lead per year',k(med(rows.map(r=>r.take))));
const ag=rows.filter(r=>r.edge<0); console.log('--- where AGR is ahead in its best case (n='+ag.length+'): Technician still ahead if cut halfway',pct(ag,r=>r.cutEdge>0)+'%','| median odds AGR needs',med(ag.map(r=>r.need))+'%');
const show=r=>`${k(r.edge)} | age ${r.inp.age}, ${r.inp.grade}, ${r.inp.yos} yrs, ${r.inp.paysys}-${r.inp.cgrade}/${r.inp.cstep}, civ ${r.inp.civYears}, prior AD ${r.inp.priorAD}, ${r.inp.retsys}, ${r.inp.deps==='yes'?'family':'single'}, ${D.mhaLabels[r.inp.mha].split(' /')[0]} ${r.inp.state}`;
const s=[...rows].sort((a,b)=>b.edge-a.edge);
console.log('--- biggest Technician leads:'); s.slice(0,3).forEach(r=>console.log('  ',show(r)));
console.log('--- biggest AGR leads:'); s.slice(-3).forEach(r=>console.log('  ',show(r)));
const kid=rows.filter(r=>r.inp.age<=22&&r.inp.yos<=3), salty=rows.filter(r=>r.inp.age>=52&&r.inp.civYears>=22);
console.log('--- new kids (22 and under, 3 yrs or less): n='+kid.length,'Tech ahead',pct(kid,r=>r.edge>0)+'%','median',k(med(kid.map(r=>r.edge))));
console.log('--- old salts (52+, 22+ civilian yrs): n='+salty.length,'Tech ahead',pct(salty,r=>r.edge>0)+'%','median',k(med(salty.map(r=>r.edge))),'| Tech wins retirement',pct(salty,r=>r.ret>0)+'%','| no active-duty retirement',pct(salty,r=>!r.reach)+'%','| Tech ahead if cut halfway',pct(salty,r=>r.cutEdge>0)+'%');

console.log('=== SAME LAST DAY: where the AGR path runs past the Technician\'s retirement age, run the Technician to that same day (never past 60) ===');
const line2=(label,a)=>console.log(label.padEnd(24),'n='+String(a.length).padEnd(5),'| AGR runs longer in',String(pct(a,r=>r.past)).padStart(3)+'%','| Tech ahead: as built',String(pct(a,r=>r.edge>0)).padStart(3)+'%','-> same last day',String(pct(a,r=>r.edgeSame>0)).padStart(3)+'%','| median as built',k(med(a.map(r=>r.edge))).padStart(7),'-> same last day',k(med(a.map(r=>r.edgeSame))).padStart(7),'| AGR by 100K+ same last day',String(pct(a,r=>r.edgeSame<=-1e5)).padStart(3)+'%','close',String(pct(a,r=>Math.abs(r.edgeSame)<1e5)).padStart(3)+'%');
line2('EVERYONE',rows); for(const [lo,hi] of [[35,39],[40,44],[45,49],[50,58]]) line2('age '+lo+' to '+hi,rows.filter(r=>r.inp.age>=lo&&r.inp.age<=hi));
line2('old salts',rows.filter(r=>r.inp.age>=52&&r.inp.civYears>=22)); line2('enlisted 45+',rows.filter(r=>r.inp.age>=45&&r.inp.grade[0]==='E'));

console.log('=== STRESS TEST: AGR retiree at 20 walks straight into a civilian job paying the same take-home as the Technician\'s civilian job, and holds it until the Technician retires ===');
const line3=(label,a)=>console.log(label.padEnd(16),'n='+String(a.length).padEnd(5),'| median gap years',String(Math.round(med(a.map(r=>r.gap))*10)/10).padStart(5),'| Tech ahead: as built',String(pct(a,r=>r.edge>0)).padStart(3)+'%','-> with second job',String(pct(a,r=>r.edgeJob>0)).padStart(3)+'%','| median as built',k(med(a.map(r=>r.edge))).padStart(8),'-> with second job',k(med(a.map(r=>r.edgeJob))).padStart(8),'| Tech by 100K+',String(pct(a,r=>r.edgeJob>=1e5)).padStart(3)+'%','close',String(pct(a,r=>Math.abs(r.edgeJob)<1e5)).padStart(3)+'%','AGR by 100K+',String(pct(a,r=>r.edgeJob<=-1e5)).padStart(3)+'%');
line3('EVERYONE',rows); for(const [lo,hi] of [[20,24],[25,29],[30,34],[35,39],[40,44]]) line3('age '+lo+' to '+hi,rows.filter(r=>r.inp.age>=lo&&r.inp.age<=hi));
