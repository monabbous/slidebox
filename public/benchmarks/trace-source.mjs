import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));const output=join(root,'public','benchmarks');mkdirSync(join(output,'traces'),{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});const context=await browser.newContext({viewport:{width:1920,height:1440},deviceScaleFactor:1,colorScheme:'dark',reducedMotion:'no-preference'});
const keeper=await context.newPage();const results=[];
try{
 for(const variant of ['slidebox','edge','translate','grid-track','native'])for(const hint of variant==='native'?[false]:[false,true]){
  const page=await context.newPage();await page.goto('http://127.0.0.1:8080/benchmarks/lab.html');await page.bringToFront();
  await page.evaluate(spec=>window.configure(spec),{variant,count:2000,hint});await page.waitForTimeout(350);await page.evaluate(()=>window.runTrial());await page.waitForTimeout(250);
  const cdp=await context.newCDPSession(page);const ended=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
  await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline.frame,toplevel',transferMode:'ReturnAsStream'});
  await page.evaluate(()=>window.runTrial());await cdp.send('Tracing.end');const {stream}=await ended;let text='';
  for(;;){const chunk=await cdp.send('IO.read',{handle:stream});text+=chunk.base64Encoded?Buffer.from(chunk.data,'base64').toString():chunk.data;if(chunk.eof)break}await cdp.send('IO.close',{handle:stream});
  const trace=JSON.parse(text);const mainThreads=new Set(trace.traceEvents.filter(e=>e.ph==='M'&&e.name==='thread_name'&&e.args?.name==='CrRendererMain').map(e=>`${e.pid}:${e.tid}`));
  const events=trace.traceEvents.filter(e=>e.ph==='X'&&(!mainThreads.size||mainThreads.has(`${e.pid}:${e.tid}`)));
  const types={};for(const name of ['Layout','UpdateLayoutTree','RecalculateStyles','PrePaint','Paint']){const selected=events.filter(e=>e.name===name);types[name]={count:selected.length,inclusiveMs:selected.reduce((s,e)=>s+(e.dur??0)/1000,0),maxMs:Math.max(0,...selected.map(e=>(e.dur??0)/1000))}}
  const file=`${variant}-${hint?'hint':'auto'}.json.gz`;writeFileSync(join(output,'traces',file),gzipSync(text));results.push({variant,count:2000,hint,trace:'traces/'+file,mainThreadFilter:mainThreads.size?'CrRendererMain':'metadata unavailable; all threads',events:types});console.log(`${variant}, hint=${hint}: Paint ${types.Paint.inclusiveMs.toFixed(2)}ms / ${types.Paint.count} events`);await page.close();
 }
}finally{writeFileSync(join(output,'diagnostics.json'),JSON.stringify({warning:'Separate traced diagnostic runs; instrumentation overhead means these paint durations must not be mixed into the primary untraced FPS sample. Inclusive event times are not GPU raster/presentation times.',browser:browser.version(),headless:false,viewport:{width:1920,height:1440},runs:results},null,2));await browser.close()}
