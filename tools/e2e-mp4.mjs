#!/usr/bin/env node
// E2E چهارنفره (0.70.2): ۴ مرورگر واقعی (Playwright) روی سرور واقعی — لابی (ساخت/پیوستن/آماده/شروع) → اقتصاد
// (چوب‌بری، معدن آهن، زرادخانه، سربازخانه، مزرعه) → استخدام و تهاجم → مقایسه هش هر ۱۰۰ تیک بین کلاینت‌ها →
// خروج سه بازیکن و پیروزی آخرین بازمانده. خروجی: گزارش متنی + اسکرین‌شات‌ها. کد خروج ۱ اگر ناهمگامی/خطای صفحه/عدم پیروزی.
//   node tools/e2e-mp4.mjs [--seconds 300] [--out /tmp/mp4] [--port 8083]
import { spawn } from "node:child_process"; import { createRequire } from "node:module"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url)); const root=path.resolve(here,"..");
const require=createRequire(import.meta.url); let pw; for(const p of ["playwright","/opt/node22/lib/node_modules/playwright"]){ try{ pw=require(p); break; }catch{} } if(!pw) throw new Error("playwright not found");
const argv=process.argv.slice(2); const opt=(k,d)=>{const i=argv.indexOf("--"+k); return i<0?d:argv[i+1];};
const port=+opt("port",8083); const srv=spawn("node",["server.mjs"],{cwd:path.join(root,"server"),env:{...process.env,PORT:""+port},stdio:"ignore"});
await new Promise(r=>setTimeout(r,1500));
const S=path.resolve(opt("out","/tmp/arg-e2e-mp4")); fs.mkdirSync(S,{recursive:true}); const RUN_S=+opt("seconds",300);
const b=await pw.chromium.launch({executablePath:"/opt/pw-browsers/chromium",args:["--no-sandbox"]});
const errs=[]; const pages=[]; const ctxs=[]; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); const T0=Date.now(); const ts=()=>`[+${Math.round((Date.now()-T0)/1000)}s]`;
const log=(...a)=>console.log(ts(),...a);
for(let i=0;i<4;i++){
  const ctx=await b.newContext({viewport:{width:1000,height:700}}); const p=await ctx.newPage(); ctxs.push(ctx);
  p.on("pageerror",e=>errs.push(`P${i+1} PAGEERR ${e.message}`)); p.on("console",m=>{if(m.type()==="error")errs.push(`P${i+1} ${m.text()}`)});
  await p.goto(`http://localhost:${port}/?lang=en`); await sleep(300);
  await p.click("[data-go=profile]"); await p.fill("#profileNameInput",`P${i+1}`); await p.dispatchEvent("#profileNameInput","input"); await p.click(".menu-page:not([hidden]) .page-back");
  await p.click("#navMp"); pages.push(p);
}
const h=pages[0];
await h.selectOption("#mpMaxSel","4"); await h.click("#mpCreateBtn"); await sleep(800);
const code=await h.evaluate(()=>window.__slice01.lobby.room.code); log("room",code);
for(const p of pages.slice(1)){ await p.fill("#mpCodeInput",code); await p.click("#mpJoinBtn"); await sleep(400); }
for(const p of pages){ await p.click("#mpReadyBtn"); await sleep(250); }
await h.click("#mpStartBtn"); await sleep(2500);
const info=()=>Promise.all(pages.map(p=>p.evaluate(()=>{const H=window.__slice01,s=H.state,me=H.mp.slot();const own=(o)=>(o.owner==null?0:o.owner)===me;return{slot:me,tick:s.tick,alive:s.mpres.map(x=>x.alive?1:0).join(""),mine:{units:s.units.filter(u=>!u.dead&&own(u)&&u.type!=="lord").length,lord:s.units.some(u=>!u.dead&&own(u)&&u.type==="lord"),blds:s.buildings.filter(own).length,keep:s.buildings.some(b=>b.type==="keep"&&own(b)&&!b.destroyed)},res:Object.fromEntries(["wood","food","gold","stone"].map(k=>[k,Math.round(s.mpres[me].resources[k])])),over:s.mp.over,winner:s.mp.winner,rejected:s.rejected,desync:H.mp.desync()}})));
log("started", JSON.stringify((await info()).map(x=>({slot:x.slot,tick:x.tick,alive:x.alive}))));
// helper executed in page: find valid spots + send
const act=(p,payload)=>p.evaluate(async({want,round,mode})=>{
  const H=window.__slice01,s=H.state,L=H.lobby,me=H.mp.slot();
  const {validate}=await import("/game/construction.js"); const {CONFIG}=await import("/game/config.js");
  const out=[]; const own=(o)=>(o.owner==null?0:o.owner)===me;
  const keep=s.buildings.find(b=>b.type==="keep"&&own(b)); if(!keep) return ["nokeep"];
  const kc=keep.c+2,kr=keep.r+2; const taken=(window.__taken=window.__taken||[]);
  const free=(def,c,r)=>{ for(const t of taken){ if(c<t.c+t.w+1&&t.c<c+def.w+1&&r<t.r+t.h+1&&t.r<r+def.h+1) return false;} return true; };
  for(const key of want){
    const def=CONFIG.BUILDINGS[key]; let done=false;
    for(let rad=3;rad<=(key==='ironmine'?63:14)&&!done;rad++) for(let dc=-rad;dc<=rad&&!done;dc++) for(let dr=-rad;dr<=rad&&!done;dr++){
      if(Math.max(Math.abs(dc),Math.abs(dr))!==rad) continue; const c=kc+dc,r=kr+dr;
      const v=validate(s,H.terrain,CONFIG.GRID_W,CONFIG.GRID_H,c,r,def,me);
      if(v.ok&&free(def,c,r)){ taken.push({c,r,w:def.w,h:def.h}); L.send("place",{type:key,c,r}); out.push(key+"@"+c+","+r); done=true; }
    }
    if(!done) out.push(key+":none");
  }
  return out;
},payload);
for(const p of pages){ await p.evaluate(()=>window.__slice01.lobby.send("tax",{v:"high"})); }
await sleep(500);
const opening=["woodcutter","ironmine","armoury","barracks","farm"]; const later=[0,1,2,3].map(()=>["hut","hut","tower","quarry","woodcutter","tower"]);
for(let i=0;i<4;i++){ for(const k of opening){ log("P"+(i+1),JSON.stringify(await act(pages[i],{want:[k],round:0}))); await sleep(450);} }
await sleep(3000);
log("after opening",JSON.stringify((await info()).map(x=>({b:x.mine.blds,res:x.res,rej:x.rejected}))));
let round=0, over=false; const t0=Date.now();
while((Date.now()-t0)/1000<RUN_S && !over){
  round++;
  for(let i=0;i<4;i++){
    if(later[i].length && round%2===1){ const r=await act(pages[i],{want:[later[i][0]],round}); if(String(r[0]).includes('@')) later[i].shift(); }
    const tgt=(i+1+(round%3))%4; // rotate target
    await pages[i].evaluate(async({round,tgt})=>{const H=window.__slice01,s=H.state,L=H.lobby,me=H.mp.slot();
      const own=(o)=>(o.owner==null?0:o.owner)===me;
      const bar=s.buildings.find(b=>b.type==="barracks"&&own(b)&&!b.destroyed&&!(b.buildLeft>0));
      const keep=s.buildings.find(b=>b.type==="keep"&&own(b)); if(!keep) return;
      if(bar) L.send("hire",{type:["soldier","spearman"][round%2],c:keep.c+4,r:keep.r+4});
      const mine=s.units.filter(u=>!u.dead&&own(u)&&u.type!=="lord");
      const tk=s.buildings.find(b=>b.type==="keep"&&!own(b)&&(b.owner|0)===tgt&&!b.destroyed)||s.buildings.find(b=>b.type==="keep"&&!own(b)&&!b.destroyed);
      if(tk&&mine.length>=3&&round%3===0) L.send("order",{ids:mine.slice(0,32).map(u=>u.id),kind:"attackmove",c:tk.c+1,r:tk.r+1});
    },{round,tgt});
    await sleep(500);
  }
  await sleep(2500);
  if(round%4===0){ const inf=await info(); log(inf.map(x=>`s${x.slot}[t${x.tick} u${x.mine.units} b${x.mine.blds} ${x.alive} g${x.res.gold} f${x.res.food}]`).join(" ")); if(inf.some(x=>x.over)) over=true; }
}
const logs=await Promise.all(pages.map(p=>p.evaluate(()=>window.__slice01.mp.hashLog())));
const m0=new Map(logs[0]); let compared=0,bad=[]; for(let i=1;i<4;i++) for(const [t,hv] of logs[i]) if(m0.has(t)){compared++; if(m0.get(t)!==hv) bad.push([i,t]);}
log("hash logs",logs.map(l=>l.length),"compared",compared,"mismatch",bad.length,bad.slice(0,5));
const fin=await info(); log("final",JSON.stringify(fin.map(x=>({slot:x.slot,tick:x.tick,alive:x.alive,over:x.over,winner:x.winner,desync:x.desync}))));
log("banners",JSON.stringify(await Promise.all(pages.map(p=>p.evaluate(()=>({victory:!document.getElementById("victoryBanner").hidden,defeat:!document.getElementById("defeatBanner").hidden}))))));
await pages[0].screenshot({path:S+"/mp-end.png"});
if(!fin[0].over){ for(const i of [1,2,3]){ await ctxs[i].close(); await sleep(1500);} await sleep(2500);
  log("after others left:",JSON.stringify(await pages[0].evaluate(()=>{const s=window.__slice01.state;return{alive:s.mpres.map(x=>x.alive?1:0).join(""),over:s.mp.over,winner:s.mp.winner,victory:!document.getElementById("victoryBanner").hidden};})));
  await pages[0].screenshot({path:S+"/mp-victory.png"}); }
log("errors",JSON.stringify([...new Set(errs)]));
const won=!fin[0].over ? await pages[0].evaluate(()=>window.__slice01.state.mp.winner===0) : true;
await b.close(); srv.kill();
const ok = bad.length===0 && errs.length===0 && fin.every(x=>!x.desync) && won;
log(ok?"RESULT: PASS":"RESULT: FAIL"); process.exit(ok?0:1);
