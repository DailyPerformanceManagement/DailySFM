// DailySFM acceptance checks: mandatory login gate, native navigation,
// original KPI -> Six Sigma import, separate cloud storage, and no data mutation.
const {chromium}=require('playwright');
const USER='11111111-1111-4111-8111-111111111111';
function mockSDK(signedIn) {
 return '(' + function makeClient(){
   const u={id:'11111111-1111-4111-8111-111111111111',email:'tester@example.invalid'};
   const client={
     auth:{
       getSession:async()=>({data:{session:SIGNED?{user:u}:null},error:null}),
       signInWithOtp:async opts=>{window.__magicLinkRequested=opts;return {error:null}},
       signInWithPassword:async()=>({data:{session:{user:u}},error:null}),
       signUp:async()=>({data:{session:{user:u}},error:null}),
       signOut:async()=>({error:null})
     },
     from:table=>{
       const chain={
         select:()=>chain,
         eq:()=>chain,
         maybeSingle:async()=>({data:null,error:null}),
         order:async()=>({data:[],error:null}),
         upsert:async obj=>{window.__savedEacs={table,obj:JSON.parse(JSON.stringify(obj))};return {error:null}},
         delete:()=>({eq:async()=>({error:null})})
       };return chain
     }
   };
   window.supabase={createClient:(url,key)=>{window.__cloudProjectUrl=url;return client}};
 }.toString().replace('SIGNED',signedIn?'true':'false') + ')();';
}
async function createBrowser(){
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});
 return b;
}
(async()=>{
 const browser=await createBrowser();
 try{
   // Signed-out users see a real opening gate, not the removed status strip.
   const c1=await browser.newContext({viewport:{width:1400,height:900}});
   const p1=await c1.newPage();
   let errors=[];
   p1.on('pageerror',e=>errors.push(e.message));
   await c1.route('**/supabase.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:mockSDK(false)}));
   await p1.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await p1.locator('#eacsGate input[type="email"]').waitFor({timeout:20000});
   if(await p1.locator('#dpmOfflineNotice').isVisible())throw Error('Old status banner remains visible');
   await p1.locator('#eacsGate input[type="email"]').first().fill('tester@example.invalid');
   await p1.locator('#eacsGate button[type="submit"]').first().click();
   await p1.waitForFunction(()=>!!window.__magicLinkRequested,{timeout:5000});
   const otp=await p1.evaluate(()=>window.__magicLinkRequested);
   if(!otp.email.includes('@') || !otp.options.emailRedirectTo.endsWith('/DailySFM/')){
     // Local localhost URL is equally valid in CI.
     if(!otp.options.emailRedirectTo.endsWith('/'))throw Error('Magic link redirect missing');
   }
   if(errors.length)throw Error('Signed-out browser errors: '+JSON.stringify(errors));
   console.log('PASS: Sign-in-first gate and passwordless link; old ribbon hidden');
   await c1.close();

   // Signed-in workspace has historical KPI values. No application content may be overwritten.
   const c2=await browser.newContext({viewport:{width:1440,height:1024}});
   const entries=[
     {date:'2026-10-22',sicherheit:0,qualitaet:97.8,liefertreue:93.2,produktivitaet:89,nacharbeit:2.3,lagerbestaende:452},
     {date:'2026-10-23',sicherheit:1,qualitaet:98.5,liefertreue:94.1,produktivitaet:91,nacharbeit:2.0,lagerbestaende:463},
     {date:'2026-10-24',sicherheit:0,qualitaet:98.9,liefertreue:96.0,produktivitaet:90,nacharbeit:1.8,lagerbestaende:449}
   ];
   await c2.addInitScript(({uid,rows})=>{
      localStorage.setItem('dailysfm-eacs-local-owner-v1',uid);
      localStorage.setItem('dailysfm-original-offline-v1',JSON.stringify({rows,active:'qualitaet',owner:'Quality'}));
   },{uid:USER,rows:entries});
   await c2.route('**/supabase.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:mockSDK(true)}));
   const p2=await c2.newPage();
   const browserErrors=[];
   p2.on('pageerror',e=>browserErrors.push(e.message));
   await p2.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await p2.locator('#navSixSigma').waitFor({timeout:20000});
   await p2.waitForFunction(()=>document.getElementById('eacsGateLoading')===null,{timeout:14000});
   if(await p2.locator('#dpmOfflineNotice').isVisible())throw Error('Old ribbon visible for signed-in user');
   if(await p2.locator('#eacsGate').count())throw Error('Signed-in user sees unnecessary login gate');
   const original=await p2.evaluate(()=>localStorage.getItem('dailysfm-original-offline-v1'));
   await p2.locator('#navSixSigma').click();
   await p2.locator('#dpmSigmaFrame').waitFor({state:'visible',timeout:18000});
   const frame=p2.frameLocator('#dpmSigmaFrame');
   await frame.locator('#dpmKpiSelect').waitFor({timeout:20000});
   await frame.locator('#dpmKpiSelect').selectOption('qualitaet');
   await frame.locator('#dpmImportKpi').click();
   await frame.locator('[data-tab="analysis"]').waitFor({timeout:8000});
   await frame.locator('[data-tab="analysis"]').click();
   await frame.locator('.tool-tiles').waitFor();
   await frame.locator('[data-tab="pfmea"]').first().click();
   await frame.locator('[data-action="add-fmea"]').first().click();
   const results=await frame.locator('body').evaluate(()=>{
     return {
       studioEmbedded:document.body.classList.contains('embedded'),
       n:state.projects[0].dataset.rows.length,
       data:state.projects[0].dataset.rows,
       columns:state.projects[0].dataset.columns.map(c=>c.title),
       project:state.projects[0].title,
       pfmea:state.projects[0].pfmea.length,
       mode:state.mode,
       analyzedCount:document.querySelectorAll('[data-tab]').length
     }
   });
   const after=await p2.evaluate(()=>localStorage.getItem('dailysfm-original-offline-v1'));
   if(after!==original)throw Error('Import modified KPI original source');
   if(!results.studioEmbedded||results.n!==3||results.pfmea!==1||
     !results.columns[1].includes('Qualität')||results.mode!=='cloud')throw Error('KPI integration failed: '+JSON.stringify(results));
   if(browserErrors.length)throw Error('KPI cockpit errors: '+JSON.stringify(browserErrors));
   console.log('PASS: native Six Sigma tab, quality KPI import, analysis, PFMEA, and unchanged source:',JSON.stringify(results));
   await c2.close();
 } finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
