const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const D=JSON.parse(html.match(/<script id="calcdata" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const ctx={module:{exports:{}}}; vm.createContext(ctx); vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.module.exports; const f=n=>'$'+Math.round(n).toLocaleString();
const mha=Object.keys(D.mhaLabels).find(k=>/New Orleans/i.test(D.mhaLabels[k]));
const base={grade:'E-6',yos:12,age:35,priorAD:0,state:'LA',oha:null,locPct:17.06,mha,wageArea:'061',paysys:'WG',cgrade:10,cstep:3,civYears:12,deps:'yes',filing:'married',retsys:'legacy',fersCohort:'y2014plus',tspCiv:5,tspMil:5,hourlyOverride:39.05,mode:'dst'};
const P=[['Base profile',base],['Same, BRS',{...base,retsys:'brs'}],['Same, single, no dependents',{...base,deps:'no',filing:'single'}],['E-7, 18 yrs, age 42, 8 prior active',{...base,grade:'E-7',yos:18,age:42,priorAD:8,civYears:10}],['E-5, 6 yrs, age 26, WG-8',{...base,grade:'E-5',yos:6,age:26,civYears:3,cgrade:8,hourlyOverride:0}],['Age 45, 6 prior active (AGR 20 lands after MRA)',{...base,age:45,yos:22,priorAD:6,civYears:18,fersCohort:'pre2013'}],['Age 50, no prior active (AGR 20 out of reach)',{...base,age:50,yos:28,civYears:22,fersCohort:'pre2013'}]];
for(const [n,p] of P){ const L=E.lifetime(D,p), T=E.lifetime(D,{...p,mode:'t5'}); const r=E.retirement(D,{...p,cola:0});
  const pkgD=r.techLifetime+r.fersSuppLife+r.techTsp.gov+r.techTspGrowth+r.ssTech-r.civHealthLife, pkgA=r.agrLifetime+r.agrTsp.gov+r.agrTspGrowth+r.ssAgr-r.agrHealthLife; // v1.3 package
  if(Math.abs(pkgD-L.civRet)>1||Math.abs(pkgA-L.agrRet)>1) console.log('MISMATCH with retirement card',n);
  for(const v of Object.values(L)) if(!isFinite(v)) console.log('NON-FINITE',n);
  console.log(n.padEnd(48),'| tech',f(L.civWork),'+',f(L.civRet),'=',f(L.civAll),'| T5',f(T.civAll),'| AGR',f(L.agrWork),'+',f(L.agrRet),'=',f(L.agrAll),'| all-in edge',f(L.civAll-L.agrAll),'| ret-only',f(L.civRet-L.agrRet),'| yrs',L.cy,'/',L.agrWorkYrs); }
