/* DailySFM native module integration. Keeps the original DPM router intact. */
(() => {
  'use strict';
  const KPI = [
    {code:'sicherheit',label:'Sicherheit',unit:'Unfälle',family:'count',interpretation:'Ereigniszählung: nur mit geeigneter Bezugsgröße sind Raten-/Attributregelkarten sinnvoll.'},
    {code:'qualitaet',label:'Qualität',unit:'%',family:'percent',interpretation:'Prozentwert: für p-Karten benötigt man Gut-/Schlechtteile UND Stichprobengröße je Zeitraum.'},
    {code:'liefertreue',label:'Liefertreue',unit:'%',family:'percent',interpretation:'Für eine p-Karte werden pünktliche und gesamte Lieferungen je Zeitraum benötigt.'},
    {code:'produktivitaet',label:'Produktivität',unit:'%',family:'continuous',interpretation:'Kontinuierliche Messreihe: I-MR nur bei sinnvoller zeitlicher Reihenfolge und unabhängigen Einzelwerten.'},
    {code:'nacharbeit',label:'Nacharbeit',unit:'%',family:'percent',interpretation:'Nacharbeitsquote: zum Vergleichen von Anteilen benötigen Sie die jeweilige Gesamtmenge.'},
    {code:'lagerbestaende',label:'Lagerbestand',unit:'Stück',family:'count',interpretation:'Bestandswerte sind Pegelstände und keine unabhängigen Fehlerzählungen.'}
  ];
  const KEY = 'dailysfm-original-offline-v1';
  window.DailySFMKpi = Object.freeze({
    source:'DPM Original · DailySFM',
    getMeasurements() {
      let data={};
      try {data=JSON.parse(localStorage.getItem(KEY)||'{}')} catch {}
      const valid=Array.isArray(data.rows)?data.rows:[];
      const rows=valid.filter(r=>r && /^\d{4}-\d\d-\d\d$/.test(r.date||''))
        .map(r=>({date:r.date,...Object.fromEntries(KPI.map(k=>[k.code,r[k.code]??null]))}))
        .sort((a,b)=>a.date.localeCompare(b.date));
      return {kpis:KPI.map(k=>({...k})),rows,location:'DailySFM · EACS',source:'KPI Cockpit · gespeicherte Tageswerte',
        notice:'Die KPI-Importfunktion liest nur aktuell gespeicherte Tageswerte. Beispieldaten werden nicht als echte Produktionsmessungen gekennzeichnet.'};
    }
  });
  function mount() {
    const nav=document.querySelector('.nav');
    const host=document.querySelector('.proj-host[data-page="projekte"]');
    const original=document.getElementById('projFrame');
    if (!nav || !host || !original || document.getElementById('navSixSigma')) return false;

    const nativeLink=nav.querySelector('[data-nav="projekte"]');
    const link=document.createElement('a');
    link.id='navSixSigma';
    link.href='#/projekte';
    link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h10M4 19h16M17 9l3 3-3 3"/></svg><span>Six Sigma &amp; PFMEA</span>';
    nativeLink.insertAdjacentElement('afterend',link);

    const tabs=document.createElement('div');
    tabs.className='dpm-module-tabs';
    tabs.id='dpmModuleTabs';
    tabs.innerHTML='<div class="dpm-module-copy"><div class="dpm-module-label">CONTINUOUS IMPROVEMENT · DMAIC</div><h2>Verbesserung &amp; statistische Problemlösung</h2><p>Vom KPI-Signal zur Ursachenanalyse, Maßnahme und Wirksamkeitskontrolle</p></div><div class="dpm-module-switch" role="tablist" aria-label="Verbesserungsarbeitsbereich"><button type="button" id="dpmPortfolioTab" role="tab" aria-selected="true">◇ Verbesserungsprojekte</button><button type="button" id="dpmSigmaTab" role="tab" aria-selected="false">∑ Six Sigma &amp; PFMEA</button></div>';
    host.prepend(tabs);
    const sigma=document.createElement('iframe');
    sigma.id='dpmSigmaFrame';
    sigma.title='Six Sigma und PFMEA · integrierter Arbeitsbereich';
    sigma.loading='lazy';
    sigma.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
    sigma.src='six-sigma.html?embedded=1';
    sigma.hidden=true;
    host.append(sigma);

    let mode='portfolio';
    const portfolioBtn=document.getElementById('dpmPortfolioTab');
    const sigmaBtn=document.getElementById('dpmSigmaTab');
    function syncNav() {
      const onProjects=location.hash.startsWith('#/projekte');
      link.classList.toggle('on',onProjects&&mode==='sigma');
      const a=nav.querySelector('[data-nav="projekte"]');
      if(a)a.classList.toggle('on',onProjects&&mode==='portfolio');
    }
    function setMode(next) {
      mode=next==='sigma'?'sigma':'portfolio';
      original.hidden=mode==='sigma';
      sigma.hidden=mode!=='sigma';
      portfolioBtn.setAttribute('aria-selected',String(mode==='portfolio'));
      sigmaBtn.setAttribute('aria-selected',String(mode==='sigma'));
      host.dataset.module=mode;
      syncNav();
    }
    function open(next) {
      setMode(next);
      if (!location.hash.startsWith('#/projekte'))location.hash='#/projekte';
      // The original DPM router may not fire when the route was already active.
      // Execute it once for the native project host, then restore our subtab.
      if (typeof window['ǀgr']==='function')window['ǀgr']();
      setTimeout(()=>{if(mode==='sigma')setMode('sigma');syncNav();},60);
      requestAnimationFrame(syncNav);
    }
    link.addEventListener('click',e=>{e.preventDefault();open('sigma')});
    nativeLink.addEventListener('click',()=>setMode('portfolio'));
    portfolioBtn.addEventListener('click',()=>open('portfolio'));
    sigmaBtn.addEventListener('click',()=>open('sigma'));
    nav.querySelectorAll('[data-nav]').forEach(a=>{
      if(a!==nativeLink)a.addEventListener('click',()=>requestAnimationFrame(syncNav));
    });
    window.addEventListener('hashchange',()=>setTimeout(syncNav,0));
    host.addEventListener('click',()=>syncNav());
    for (const route of ['analysis','problem']) {
      const head=document.querySelector('header.top[data-page="'+route+'"] .title-card');
      if(!head)continue;
      const shortcut=document.createElement('button');
      shortcut.type='button';
      shortcut.className='dpm-analysis-shortcut';
      shortcut.textContent='∑ Mit Six Sigma vertiefen';
      shortcut.title='Tagesmessungen in ein statistisches Analyseprojekt übernehmen';
      shortcut.addEventListener('click',()=>open('sigma'));
      head.append(shortcut);
    }
    // Refresh the context in the iframe whenever a new KPI value is saved.
    window.addEventListener('storage',e=>{
      if(e.key===KEY)try{sigma.contentWindow?.postMessage({type:'dailysfm:kpi-updated'},location.origin)}catch{}
    });
    setMode('portfolio');
    window.DailySFMModules={openSixSigma:()=>open('sigma'),openPortfolio:()=>open('portfolio')};
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
