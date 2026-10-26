/* DailySFM · contextual Six Sigma workbench adapter.
 * Reads ONLY the signed-in cockpit's same-origin, local KPI measurements.
 * All existing analysis formulas remain in six-sigma.js; no estimates or
 * process capability claims are generated from daily aggregates.
 */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('embedded') !== '1') return;
  document.body.classList.add('embedded');

  const parentContext = () => {
    try {
      if(window.parent === window || window.parent.location.origin !== location.origin) return null;
      return window.parent.DailySFMKpi?.getMeasurements() || null;
    } catch { return null; }
  };
  const intro=document.createElement('section');
  intro.className='dpm-sigma-intro';
  intro.setAttribute('aria-label','Six Sigma Integration');
  intro.innerHTML='<div class="dpm-sigma-intro-top"><div><div class="section-eyebrow">DATENGETRIEBENE VERBESSERUNG · DAILY MANAGEMENT</div><h2>Aus Abweichungen werden überprüfbare Verbesserungen</h2><p>Wählen Sie eine Tageskennzahl, übernehmen Sie vorhandene Messwerte und arbeiten Sie mit DMAIC, Statistik und Prozess-FMEA. Ihre ursprünglichen KPI-Werte werden dabei nicht verändert.</p></div><div class="dpm-sigma-state"><span class="dpm-sigma-dot"></span><span id="dpmSigmaCloud">EACS-Verbindung wird geprüft …</span></div></div><div class="dpm-import-controls"><label>Kennzahl aus Daily Management<select id="dpmKpiSelect" aria-label="Kennzahl auswählen"></select></label><button type="button" class="dpm-import-button" id="dpmImportKpi">+ KPI-Messwerte als neues Analyseprojekt</button></div><p class="dpm-context-note" id="dpmSourceNote">Datenquelle wird geprüft …</p>';
  const coach=document.createElement('div');
  coach.className='dpm-workflow';
  coach.setAttribute('aria-label','DMAIC Arbeitsablauf');
  const phases=[
    ['Define','Problem & Ziel','data'],
    ['Measure','Messdaten prüfen','data'],
    ['Analyze','Statistik & Ursachen','analysis'],
    ['Improve','Maßnahmen / PFMEA','pfmea'],
    ['Control','Ergebnisse absichern','saved']
  ];
  phases.forEach((phase,i)=>{
    const button=document.createElement('button');
    button.type='button';
    button.dataset.phase=phase[0];
    button.dataset.tab=phase[2];
    const heading=document.createElement('strong');
    heading.textContent=(i+1)+'. '+phase[0];
    const detail=document.createElement('span');
    detail.textContent=phase[1];
    button.append(heading,detail);
    button.title='Projektphase '+phase[0]+' · '+phase[1];
    button.onclick=()=>{
      if(!current()){toast('Erstellen Sie ein Projekt oder importieren Sie eine Kennzahl.',true);return}
      if(phase[0]==='Define'){modalProject(true);return}
      state.tab=phase[2];
      if(phase[0]==='Control')state.tool='control';
      else if(phase[0]==='Analyze')state.tool='describe';
      else if(phase[0]==='Improve')state.tool='pfmea';
      render();
      refreshCoach();
    };
    coach.append(button);
  });
  const interpretation=document.createElement('aside');
  interpretation.className='dpm-interpretation';
  interpretation.setAttribute('aria-live','polite');
  interpretation.id='dpmSigmaGuide';
  const main=document.querySelector('.main'),root=document.getElementById('root');
  if(!main || !root)return;
  main.insertBefore(intro,root);
  main.insertBefore(coach,root);
  main.insertBefore(interpretation,root);

  const select=document.getElementById('dpmKpiSelect'),note=document.getElementById('dpmSourceNote'),cloud=document.getElementById('dpmSigmaCloud'),importButton=document.getElementById('dpmImportKpi');
  const examples=[
    {code:'sicherheit',label:'Sicherheit',unit:'Unfälle',family:'count',interpretation:'Zählwert: mit Anzahl der Mitarbeiter oder Stunden als Bezugsgröße arbeiten. Einzelwertregelkarte ist für Unfallhäufigkeit in der Regel nicht die richtige Wahl.'},
    {code:'qualitaet',label:'Qualität',unit:'%',family:'percent',interpretation:'Für eine p-Regelkarte werden geprüfte Stückzahlen und fehlerhafte Stückzahlen pro Tag benötigt; ein Prozentwert allein reicht nicht.'},
    {code:'liefertreue',label:'Liefertreue',unit:'%',family:'percent',interpretation:'Für eine Anteilsanalyse werden pünktliche Lieferungen und Gesamtlieferungen je Tag benötigt.'},
    {code:'produktivitaet',label:'Produktivität',unit:'%',family:'continuous',interpretation:'I-MR nur für chronologisch geordnete, vergleichbare Einzelmessungen; bei Schicht- oder Produktmixwechseln getrennt analysieren.'},
    {code:'nacharbeit',label:'Nacharbeit',unit:'%',family:'percent',interpretation:'Nacharbeitsrate immer zusammen mit der produzierten Gesamtmenge interpretieren; Anteil ohne Basis kann irreführend sein.'},
    {code:'lagerbestaende',label:'Lagerbestand',unit:'Stück',family:'count',interpretation:'Bestandspegel sind keine Defektzählungen; statistische Prozessfähigkeit (Cp/Cpk) setzt spezifizierte kontinuierliche Einzelmessungen voraus.'}
  ];
  const getKpis=()=>parentContext()?.kpis || examples;
  function selectedKpi(){return getKpis().find(k=>k.code===select.value)||getKpis()[0]}
  function loadChoices(){
    const previous=select.value;
    const kpis=getKpis();
    select.replaceChildren();
    for(const item of kpis){
      const option=document.createElement('option');
      option.value=item.code;
      option.textContent=item.label+' · '+item.unit;
      select.append(option);
    }
    if(kpis.some(k=>k.code===previous))select.value=previous;
  }
  function refreshGuide(){
    const k=selectedKpi();
    const p=current();
    interpretation.replaceChildren();
    const heading=document.createElement('b');
    heading.textContent=p?'Interpretationshilfe für die KPI-Daten':'Messsystem & Analysequalität';
    const body=document.createElement('span');
    body.textContent=' '+(k?.interpretation||'Messdefinition und Datenqualität vor der Auswertung prüfen.');
    const caution=document.createElement('span');
    caution.className='warning';
    caution.textContent=' · Korrelation ist keine Ursache. Cp/Cpk nur mit echten kontinuierlichen Rohdaten und gültigen Spezifikationsgrenzen berechnen. Bei PFMEA ist RPN kein Ersatz für die AIAG-VDA Action Priority.';
    interpretation.append(heading,body,caution);
  }
  function refreshCoach(){
    const p=current();
    for(const button of coach.querySelectorAll('button')){
      const active=!!p && p.phase===button.dataset.phase;
      button.dataset.selected=String(active);
      button.disabled=false;
    }
    cloud.textContent=state.mode==='cloud'?'EACS · Projekt geschützt gespeichert':'Browser-Modus · keine Cloud-Synchronisierung';
    const k=selectedKpi();
    const source=parentContext();
    const rows=source?.rows||[];
    const count=rows.filter(r=>Number.isFinite(num(r[k.code]))).length;
    note.textContent=(source?'KPI Cockpit: ':'Ohne direkte Datenquelle: ')+count+' numerische Tageswerte für '+k.label+' verfügbar. Daten sind Tagesaggregate, keine Einzelteil-Messreihen. Es werden keine Ziele, Nenner oder Spezifikationsgrenzen erfunden.';
    importButton.disabled=!source||count===0;
    refreshGuide();
  }
  select.addEventListener('change',refreshCoach);
  importButton.addEventListener('click',()=>{
    const source=parentContext();
    const k=selectedKpi();
    if(!source){toast('Das KPI Cockpit ist nicht erreichbar. Öffnen Sie die integrierte Version.',true);return}
    if(state.mode!=='cloud'){toast('Bitte die EACS-Verbindung prüfen, bevor Sie ein KPI-Projekt übernehmen.',true);return}
    const measured=source.rows.map(r=>({date:r.date,value:num(r[k.code])}))
      .filter(r=>Number.isFinite(r.value)).sort((a,b)=>a.date.localeCompare(b.date));
    if(!measured.length){toast('Keine gespeicherten Messwerte zu dieser Kennzahl vorhanden.',true);return}
    const existing=state.projects.find(p=>p.title.startsWith('KPI · '+k.label+' · ') &&
      p.objective?.includes('Quelle: DailySFM-KPI'));
    if(existing&&!confirm('Es gibt bereits eine Analyse zu dieser KPI. Trotzdem ein neues Projekt aus den aktuellen Tageswerten erstellen?'))return;
    const p=newProject('KPI · '+k.label+' · '+today(),
      'Quelle: DailySFM-KPI ('+k.code+'). '+measured.length+' Tageswerte, Import '+new Date().toLocaleString('de-DE')+'. Daten aggregiert; keine Rohmessung und keine automatisch geprüften Spezifikationsgrenzen.',
      state.user?.email||'');
    const numericTitle=k.label+(k.unit?' ['+k.unit+']':'');
    p.dataset={
      columns:[{id:id(),title:'Datum',type:'text'},{id:id(),title:numericTitle,type:'number'}],
      rows:measured.map(r=>[r.date,r.value])
    };
    p.phase='Measure';
    state.projects.unshift(p);
    state.active=p.id;
    state.tab='data';
    state.tool='describe';
    state.options={};
    scheduleSave(p);
    render();
    refreshCoach();
    toast(measured.length+' KPI-Tageswerte übernommen. Quellwerte wurden nicht verändert.');
  });
  function onInteraction(event){
    const target=event.target.closest('button,[data-colname],[data-coltype],[data-cell],[data-pf]');
    if(target)setTimeout(refreshCoach,30);
  }
  document.addEventListener('click',onInteraction);
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.data?.type!=='dailysfm:kpi-updated')return;
    refreshCoach();
  });
  loadChoices();
  refreshCoach();
  const timer=setInterval(()=>{
    if(!document.body.contains(intro)){clearInterval(timer);return}
    const required=(state.mode==='cloud'?'cloud':'local');
    if(cloud.dataset.mode!==required){cloud.dataset.mode=required;refreshCoach()}
  },1800);
})();
