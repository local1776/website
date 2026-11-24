const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const D=JSON.parse(html.match(/<script id="calcdata" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const ctx={module:{exports:{}}}; vm.createContext(ctx); vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const E=ctx.module.exports; const f=n=>(n<0?'-':'')+'$'+Math.abs(Math.round(n/1000))+'k';
const base={grade:'E-6',yos:12,age:35,priorAD:0,oha:null,locPct:17.06,paysys:'WG',cgrade:10,cstep:3,civYears:12,deps:'yes',filing:'married',retsys:'legacy',fersCohort:'y2014plus',tspCiv:5,tspMil:5,hourlyOverride:0,mode:'dst'};
function run(label,over){ const rows=[];
  for(const mha of Object.keys(D.mhaLabels)){ const st=D.mhaState[mha], info=D.states[st]; if(!info||info.oha) continue; const wa=(D.mhaDefaults[mha]||{}).fws||info.fwsDefault; if(!D.fws[wa]) continue;
    const inp={...base,...over,state:st,mha,wageArea:wa}; const L=E.lifetime(D,inp); const now=E.compute(D,{...inp,cola:0}).now;
    rows.push({mha:D.mhaLabels[mha],st,B:L.civAll-L.agrAll,ret:L.civRet-L.agrRet,take:now.agr.takeHome-now.tech.takeHome}); }
  const n=rows.length, pc=fn=>Math.round(100*rows.filter(fn).length/n)+'%'; const s=rows.map(r=>r.B).sort((a,b)=>a-b);
  console.log(label.padEnd(42),'n='+n,'| tech>=100k',pc(r=>r.B>=1e5),'close',pc(r=>Math.abs(r.B)<1e5),'AGR>=100k',pc(r=>r.B<=-1e5),'| median',f(s[n>>1]),'| tech ahead in retirement',pc(r=>r.ret>0),'| AGR take-home higher today',pc(r=>r.take>0));
  return rows; }
const r1=run('E-6 WG-10/3 age35 12yrs married legacy',{});
run('same, BRS',{retsys:'brs'}); run('same, single no deps',{deps:'no',filing:'single'});
run('E-5 WG-8/3 age28 6yrs married BRS',{grade:'E-5',cgrade:8,age:28,yos:6,civYears:4,retsys:'brs'});
run('E-7 WS-10/4 age37 15yrs 4 priorAD married',{grade:'E-7',paysys:'WS',cgrade:10,cstep:4,age:37,yos:15,priorAD:4,civYears:10});
run('E-6 GS-9/5 age35 12yrs married legacy',{paysys:'GS',cgrade:9,cstep:5});
console.log('Louisiana:',r1.filter(r=>r.st==='LA').sort((a,b)=>b.B-a.B).map(r=>r.mha.split(' /')[0]+' '+f(r.B)).join(' | '));
r1.sort((a,b)=>b.B-a.B); console.log('best:',r1.slice(0,4).map(r=>r.mha+' '+f(r.B)).join(' | ')); console.log('worst:',r1.slice(-3).map(r=>r.mha+' '+f(r.B)).join(' | '));
