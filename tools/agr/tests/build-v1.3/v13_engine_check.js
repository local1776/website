const fs=require('fs'), vm=require('vm');
const load=f=>{const html=fs.readFileSync(f,'utf8'); const D=JSON.parse(html.match(/<script id="calcdata" type="application\/json">([\s\S]*?)<\/script>/)[1]); const ctx={module:{exports:{}}}; vm.createContext(ctx); vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx); return {D,E:ctx.module.exports};};
const A=load(process.argv[2]), B=load(process.argv[3]); const f=n=>'$'+Math.round(n).toLocaleString();
const mha=Object.keys(A.D.mhaLabels).find(k=>/New Orleans/i.test(A.D.mhaLabels[k]));
const base={grade:'E-6',yos:12,age:35,priorAD:0,state:'LA',oha:null,locPct:17.06,mha,wageArea:'061',paysys:'WG',cgrade:10,cstep:3,civYears:12,deps:'yes',filing:'married',retsys:'legacy',fersCohort:'y2014plus',tspCiv:5,tspMil:5,hourlyOverride:39.05,mode:'dst'};
const P=[['Base',base],['BRS',{...base,retsys:'brs'}],['Single',{...base,deps:'no',filing:'single'}],['E-7 age 42, 8 prior',{...base,grade:'E-7',yos:18,age:42,priorAD:8,civYears:10}],['E-5 age 26',{...base,grade:'E-5',yos:6,age:26,civYears:3,cgrade:8,hourlyOverride:0}],['Age 45, 6 prior',{...base,age:45,yos:22,priorAD:6,civYears:18,fersCohort:'pre2013'}],['Age 50',{...base,age:50,yos:28,civYears:22,fersCohort:'pre2013'}]];
let bad=0;
for(const [n,p] of P){ for(const mode of ['dst','t5']){ const q={...p,mode}; const a=A.E.lifetime(A.D,q), b=B.E.lifetime(B.D,q), r=B.E.retirement(B.D,{...q,cola:0}), ro=A.E.retirement(A.D,{...q,cola:0});
  if(Math.abs(a.civWork-b.civWork)>1||Math.abs(a.agrWork-b.agrWork)>1){bad++;console.log('WORK MOVED',n,mode);}
  // the retirement side may move only by the pieces added in 1.3
  const dCiv=(b.civRet-a.civRet)-((r.techLifetime-ro.techLifetime)+r.fersSuppLife+r.techTspGrowth+r.ssTech-r.bridgeHealth);
  const dAgr=(b.agrRet-a.agrRet)-(r.agrTspGrowth+r.ssAgr);
  if(Math.abs(dCiv)>1||Math.abs(dAgr)>1||Math.abs(r.agrLifetime-ro.agrLifetime)>1){bad++;console.log('UNEXPLAINED MOVE',n,mode,dCiv,dAgr);}
  for(const v of Object.values(b)) if(!isFinite(v)){bad++;console.log('NON-FINITE',n,mode);}
  if(mode==='dst') console.log(n.padEnd(20),'v1.2 edge',f(a.civAll-a.agrAll).padStart(10),'| v1.3 edge',f(b.civAll-b.agrAll).padStart(10),'| full FERS at MRA:',r.fersImmediate?'yes':'no ','| supp/mo',f(r.fersSuppMonthly),'| SS/mo tech',f(r.ssTechMonthly),'agr',f(r.ssAgrMonthly),'| TSP growth',f(r.techTspGrowth),'/',f(r.agrTspGrowth)); } }
// Ben's mechanic
const m={...base,age:38,yos:18,priorAD:3.2,cstep:5,hourlyOverride:0,depMonths:24};
const L=B.E.lifetime(B.D,m), r=B.E.retirement(B.D,{...m,cola:0}); console.log('\nMechanic best case: tech',f(L.civAll),'agr',f(L.agrAll),'edge to tech',f(L.civAll-L.agrAll),'| AGR years',L.agrWorkYrs,'| Guard pension at',r.resStartAge,'| FERS at',r.fersStartAge);
for(const c of [12,8,6,4]){ const C=B.E.lifetime(B.D,{...m,cutYears:c}); const odds=(L.civAll-C.agrAll)/(L.agrAll-C.agrAll); console.log('  orders cut after',c,'yrs: agr',f(C.agrAll),'| tech ahead by',f(L.civAll-C.agrAll),'| odds needed',L.agrAll>L.civAll?Math.round(odds*100)+'%':'AGR never ahead'); }
console.log('\nRESULT problems:',bad);
