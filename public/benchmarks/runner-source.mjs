import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const home=fileURLToPath(new URL('..',import.meta.url));
const repo=resolve(process.argv[2]??fileURLToPath(new URL('../../../Code/slidebox/',import.meta.url)));
const output=join(home,'public','benchmarks');mkdirSync(output,{recursive:true});
copyFileSync(new URL('lab.html',import.meta.url),join(output,'lab.html'));
copyFileSync(join(repo,'dist/css/slidebox.css'),join(output,'slidebox.css'));
const trials=Number(process.env.BENCH_TRIALS??5);
const browser=await chromium.launch({channel:'chromium',headless:process.env.BENCH_HEADED!=='1'});
const viewport={width:1920,height:1440};
const report={startedAt:new Date().toISOString(),status:'running',method:{viewport,trials,togglesPerTrial:2,counts:[500,2000],animationMs:200,tailDelayMs:20,sample:'rAF intervals overlapping the first 300ms after each actual batch start',fps:'1000 / mean sampled rAF interval; not a presented-frame/GPU FPS counter',longIntervalThresholdMs:25,willChange:'Property-specific hints, configured before warmup; not promotion guarantees',normalization:'Independent technique illustrations; not whole-library/package benchmarks. Same dimensions/colors/duration, transform/grid do not deform.',trace:'Primary trials run without DevTools tracing, screenshots, or video recording. CDP Performance counters sampled at trial boundaries.'},environment:{browser:browser.version(),headless:process.env.BENCH_HEADED!=='1',node:process.version,platform:process.platform,architecture:process.arch,kernel:spawnSync('uname',['-sr'],{encoding:'utf8'}).stdout.trim(),cpu:readFileSync('/proc/cpuinfo','utf8').match(/^model name\s*:\s*(.+)$/m)?.[1],release:JSON.parse(readFileSync(join(repo,'package.json'),'utf8')).version,cssSha256:createHash('sha256').update(readFileSync(join(repo,'dist/css/slidebox.css'))).digest('hex')},runs:[]};
const context=await browser.newContext({viewport,deviceScaleFactor:1,colorScheme:'dark',reducedMotion:'no-preference'});
const setup=await context.newPage();await setup.goto('http://127.0.0.1:8080/benchmarks/lab.html');
report.environment.graphics=await setup.evaluate(()=>{const c=document.createElement('canvas');const gl=c.getContext('webgl');const d=gl?.getExtension('WEBGL_debug_renderer_info');return{devicePixelRatio,hardwareConcurrency:navigator.hardwareConcurrency,renderer:d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):'not available',supportedObservers:PerformanceObserver.supportedEntryTypes}});await setup.goto('about:blank');
const cases=[];for(const variant of ['slidebox','edge','translate','grid-track','native'])for(const count of [500,2000])for(const hint of variant==='native'?[false]:[false,true])cases.push({variant,count,hint});
// Fixed seed makes the varied run order reproducible.
let seed=20261031;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const order=[];for(let trial=1;trial<=trials;trial++){const round=cases.map(c=>({...c,trial}));for(let i=round.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[round[i],round[j]]=[round[j],round[i]]}order.push(...round)}
const warmed=new Set();
function metrics(items){return Object.fromEntries(items.map(m=>[m.name,m.value]))}
try{
 for(const spec of order){
  const page=await context.newPage();await page.goto('http://127.0.0.1:8080/benchmarks/lab.html');await page.bringToFront();
  const geometry=await page.evaluate(s=>window.configure(s),spec);if(!geometry.visible)throw new Error('Controls outside viewport: '+JSON.stringify({spec,geometry}));
  const key=JSON.stringify([spec.variant,spec.count,spec.hint]);
  await page.waitForTimeout(350);
  if(!warmed.has(key)){await page.evaluate(()=>window.runTrial());await page.waitForTimeout(250);warmed.add(key)}
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  const before=metrics((await cdp.send('Performance.getMetrics')).metrics);
  const data=await page.evaluate(()=>window.runTrial());
  const after=metrics((await cdp.send('Performance.getMetrics')).metrics);
  const delta=name=>(after[name]??0)-(before[name]??0);
  const entry={...spec,...data,layoutPasses:delta('LayoutCount'),styleRecalculations:delta('RecalcStyleCount'),layoutMs:delta('LayoutDuration')*1000,styleMs:delta('RecalcStyleDuration')*1000,scriptMs:delta('ScriptDuration')*1000,mainThreadTaskMs:delta('TaskDuration')*1000,jsHeapBytes:after.JSHeapUsedSize};
  report.runs.push(entry);writeFileSync(join(output,'results.json'),JSON.stringify(report,null,2));
  console.log(`${report.runs.length}/${order.length}: ${spec.variant}, ${spec.count}, hint=${spec.hint}, trial=${spec.trial}: rAF ${entry.rafFps.toFixed(1)} fps; layout ${entry.layoutMs.toFixed(1)}ms / ${entry.layoutPasses} passes; CLS ${entry.cls}`);
  await page.close();
 }
 report.status='complete';report.completedAt=new Date().toISOString();
}catch(error){report.status='failed';report.error=String(error);throw error}
finally{writeFileSync(join(output,'results.json'),JSON.stringify(report,null,2));await browser.close()}
