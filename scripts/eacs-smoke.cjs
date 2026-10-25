// Browser-level EACS integration test with mocked responses. No production writes.
const { chromium } = require('playwright');
const USER_ID = '11111111-1111-4111-8111-111111111111';
const fakeSDK = '(' + function fakeSDK(){
  const user = {id:'11111111-1111-4111-8111-111111111111',email:'dailysfm-test@example.invalid'};
  const client = {
    auth: {
      getSession: async () => ({data:{session:{user}},error:null}),
      signInWithPassword: async () => ({data:{session:{user}},error:null}),
      signUp: async () => ({data:{session:{user}},error:null}),
      signOut: async () => ({error:null})
    },
    from: table => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({data:null,error:null}),
        order: async () => ({data:[],error:null}),
        upsert: async obj => {
          window.__eacsSaved = {table,object:JSON.parse(JSON.stringify(obj))};
          return {error:null};
        },
        delete: () => ({eq:async()=>({error:null})}),
      };
      return chain;
    }
  };
  window.supabase = {createClient: (url,key) => {
    window.__eacsConfig = {url,key};
    return client;
  }};
}.toString() + ')();';
(async () => {
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:920}});
  await context.addInitScript(id=>{
    localStorage.setItem('dailysfm-eacs-local-owner-v1',id);
  }, USER_ID);
  await context.route('**/supabase.js', async route=>{
    await route.fulfill({status:200,contentType:'application/javascript',body:fakeSDK});
  });
  const page=await context.newPage();
  const errors=[],bkRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('fwkmgzwmfoyotnstybcq'))bkRequests.push(r.url())});

  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#eacsAccount').waitFor({timeout:15000});
  await page.waitForFunction(()=>document.getElementById('eacsSyncStatus').textContent.includes('EACS · Neues'),{timeout:12000});
  const main=await page.evaluate(()=>{
    const raw=localStorage.getItem('dailysfm-original-offline-v1');
    let data=raw?JSON.parse(raw):{rows:[]};
    data.rows.push({date:'2026-10-25',shifts:{},note:'QA isolated'});
    localStorage.setItem('dailysfm-original-offline-v1',JSON.stringify(data));
    window.onStateSaved();
    return {
      title:document.title,
      clientUrl:window.__eacsConfig?.url,
      status:document.getElementById('eacsSyncStatus')?.textContent,
      account:document.getElementById('eacsAccount')?.textContent,
      marker:localStorage.getItem('dailysfm-eacs-local-owner-v1')
    };
  });
  await page.waitForFunction(()=>window.__eacsSaved?.table==='dailysfm_workspaces',{timeout:9000});
  const persisted=await page.evaluate(()=>window.__eacsSaved);
  if (!main.clientUrl?.includes('gibsgwfuvuxfgicpvybm') ||
      persisted.object?.snapshot?.rows?.at(-1)?.note!=='QA isolated' ||
      persisted.object?.user_id!==USER_ID || errors.length || bkRequests.length) {
    throw new Error('KPI cloud wiring failed: '+JSON.stringify({main,persisted,errors,bkRequests}));
  }
  console.log('PASS EACS KPI save:',persisted.table,'user:',persisted.object.user_id);

  await page.goto('http://127.0.0.1:8765/six-sigma.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('mode-pill')?.textContent==='CLOUD',{timeout:13000});
  await page.locator('[data-action="sample-project"]').click();
  await page.waitForFunction(()=>window.__eacsSaved?.table==='sigma_projects',{timeout:12000});
  const sigma=await page.evaluate(()=>({
    cloud:document.getElementById('mode-pill')?.textContent,
    project:window.__eacsSaved?.object?.title,
    hasData:Array.isArray(window.__eacsSaved?.object?.dataset?.rows),
    authButtonEnabled:!document.getElementById('auth-btn')?.disabled,
    eacs:window.__eacsConfig?.url
  }));
  if(sigma.cloud!=='CLOUD'||!sigma.project||!sigma.hasData||!sigma.authButtonEnabled||
     !sigma.eacs?.includes('gibsgwfuvuxfgicpvybm')||errors.length||bkRequests.length){
    throw new Error('Six Sigma EACS cloud test failed: '+JSON.stringify({sigma,errors,bkRequests}));
  }
  console.log('PASS EACS Six Sigma cloud project:',sigma.project);
  console.log('PASS no requests to B+K and no JavaScript exceptions');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
