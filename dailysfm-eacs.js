/* DailySFM ↔ EACS cloud bridge
 * Browser-side publishable key only. All records are protected with Supabase RLS.
 * The original B+K project is not referenced or contacted by this adapter.
 */
(() => {
  'use strict';
  const PROJECT_URL = 'https://gibsgwfuvuxfgicpvybm.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_hSQ_KrXAJjOYpZuCW8Q_0Q_2tZVC_g6';
  const DATA_KEY = 'dailysfm-original-offline-v1';
  const OWNER_KEY = 'dailysfm-eacs-local-owner-v1';
  const WORKSPACE_KEY = 'original-dpm';
  const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024 - 256;
  const banner = document.getElementById('dpmOfflineNotice');
  if (!banner) return;

  // The original intrusive bottom ribbon is now gone.
  // Account and saving live quietly in the existing cockpit sidebar.
  banner.style.display = 'none';
  banner.hidden = true;
  const status = document.createElement('span');
  status.id = 'eacsSyncStatus';
  status.textContent = 'EACS · Sitzung wird geprüft …';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const action = document.createElement('button');
  action.id = 'eacsAccount';
  action.type = 'button';
  action.textContent = 'Konto';
  const syncButton = document.createElement('button');
  syncButton.id = 'eacsSave';
  syncButton.type = 'button';
  syncButton.textContent = 'Speichern';
  syncButton.hidden = true;
  const nativeControls=document.createElement('div');
  nativeControls.id='eacsNativeControls';
  nativeControls.className='eacs-native-controls';
  const controls=document.createElement('div');
  controls.className='eacs-native-actions';
  controls.append(action,syncButton);
  nativeControls.append(status,controls);
  (document.querySelector('.side-foot')||document.querySelector('#appRoot .side')||document.body).append(nativeControls);
  const loading=document.createElement('div');
  loading.id='eacsGateLoading';
  loading.setAttribute('role','status');
  loading.textContent='DailySFM · EACS-Anmeldung wird geprüft …';
  loading.style.cssText='position:fixed;inset:0;z-index:2147483590;background:#0b1721;color:#e6f6f3;display:grid;place-items:center;font:600 17px system-ui';
  document.body.append(loading);

  const state = {client:null, user:null, ready:false, fetching:false, writeChain:Promise.resolve(), timer:null};
  const show = (message, problem=false) => {
    status.textContent = message;
    status.style.color = problem ? '#ffb8aa' : '#a7dacf';
  };
  const backup = (raw, reason) => {
    if (!raw) return;
    try {
      localStorage.setItem('dailysfm-backup-' + reason + '-' +
        new Date().toISOString().replace(/[^\d]/g,''), raw);
    } catch(e) { console.warn('Unable to keep local backup',e); }
  };
  const readSnapshot = () => {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !Array.isArray(value.rows)) {
      throw new Error('Das lokale KPI-Datenformat ist ungültig.');
    }
    return value;
  };
  const setAccount = user => {
    state.user = user;
    state.ready = !!user;
    action.textContent = user ? '✓ EACS Konto' : 'EACS anmelden';
    syncButton.hidden = !user;
  };
  const saveSnapshot = async snapshot => {
    if (!state.user || !state.ready || !state.client) return;
    const raw = JSON.stringify(snapshot);
    if (new TextEncoder().encode(raw).length > MAX_SNAPSHOT_BYTES) {
      show('Datenbestand zu groß: zuerst exportieren', true);
      return;
    }
    show('EACS · Speichern …');
    const {error} = await state.client.from('dailysfm_workspaces').upsert({
      user_id: state.user.id, workspace_key: WORKSPACE_KEY, snapshot
    }, {onConflict:'user_id,workspace_key'});
    if (error) throw error;
    show('EACS · Gespeichert ✓');
  };
  const queueSave = (now=false) => {
    if (!state.ready || !state.user || state.fetching) return;
    clearTimeout(state.timer);
    show('EACS · Nicht gespeichert …');
    state.timer = setTimeout(() => {
      state.writeChain = state.writeChain.catch(()=>{}).then(async () => {
        try {const value = readSnapshot(); if(value) await saveSnapshot(value);}
        catch(error) {console.error('DailySFM EACS save:',error);show('EACS · Speichern fehlgeschlagen: ' + error.message, true);}
      });
    }, now ? 0 : 1000);
  };
  const oldSave = window.onStateSaved;
  window.onStateSaved = function() {
    if (typeof oldSave === 'function') {
      try {oldSave.apply(this, arguments);} catch(error) {console.warn('Legacy save hook:',error);}
    }
    queueSave();
  };
  syncButton.addEventListener('click', () => queueSave(true));

  const loadFromEacs = async user => {
    state.fetching = true;
    state.ready = false;
    show('EACS · Lade Ihre Daten …');
    const {data,error} = await state.client.from('dailysfm_workspaces')
      .select('snapshot,updated_at')
      .eq('user_id',user.id)
      .eq('workspace_key',WORKSPACE_KEY)
      .maybeSingle();
    if (error) throw error;

    const priorOwner = localStorage.getItem(OWNER_KEY);
    const local = localStorage.getItem(DATA_KEY);
    if (data?.snapshot) {
      if (!Array.isArray(data.snapshot.rows)) throw new Error('Ungültiges Cloud-Datenformat.');
      const remote = JSON.stringify(data.snapshot);
      if (priorOwner !== user.id || local !== remote) {
        if (local && priorOwner !== user.id) backup(local,'before-cloud-login');
        if (local && priorOwner === user.id) backup(local,'before-cloud-restore');
        localStorage.setItem(OWNER_KEY,user.id);
        localStorage.setItem(DATA_KEY,remote);
        location.reload();
        return;
      }
      show('EACS · Synchronisiert ✓');
    } else {
      if (priorOwner !== user.id) {
        // Never silently import fictional demo measurements into an actual cloud workspace.
        backup(local,'before-new-eacs-workspace');
        localStorage.setItem(OWNER_KEY,user.id);
        localStorage.removeItem(DATA_KEY);
        location.reload();
        return;
      }
      show('EACS · Neues, leeres Konto. Erste Änderung wird gespeichert.');
    }
    state.fetching = false;
    state.ready = true;
  };
  const enterUser = async user => {
    setAccount(user);
    document.getElementById('eacsGate')?.remove();
    document.getElementById('eacsGateLoading')?.remove();
    try {await loadFromEacs(user);}
    catch(error) {
      state.ready = false;
      state.fetching = false;
      console.error('DailySFM EACS load:',error);
      show('EACS-Verbindung fehlgeschlagen: ' + error.message,true);
    }
  };

  const openDialog = (required=false) => {
    document.getElementById('eacsGate')?.remove();
    const cover = document.createElement('div');
    if(required) cover.id='eacsGate';
    cover.style.cssText = 'position:fixed;inset:0;background:linear-gradient(140deg,#07131df1,#0b2935f2);backdrop-filter:blur(5px);z-index:2147483600;display:grid;place-items:center;padding:18px';
    const pane = document.createElement('section');
    pane.style.cssText = 'background:#142530;color:#f0f8fa;border:1px solid #335766;border-radius:16px;max-width:480px;width:100%;padding:30px;font:14px/1.65 system-ui;box-shadow:0 18px 50px #0006';
    const heading = document.createElement('h2');
    heading.textContent = state.user ? 'DailySFM · Mein Konto' : 'Willkommen bei DailySFM';
    heading.style.margin = '0 0 12px';
    pane.append(heading);
    const info = document.createElement('p');
    info.textContent = 'Bitte melden Sie sich an, um Ihr Shopfloor-Board, Ihre KPI-Daten und Verbesserungsprojekte sicher in EACS zu öffnen. Kein neues Passwort nötig: Anmeldelink per E-Mail anfordern.';
    pane.append(info);
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:10px;margin-top:16px';
    const close = document.createElement('button');
    close.type='button'; close.textContent='Schließen';
    close.style.cssText = 'padding:10px 14px;border:1px solid #ced6db;border-radius:8px;background:#f1f5f6;cursor:pointer';
    close.onclick = () => {if(!required)cover.remove()};
    if(required)close.hidden=true;
    const msg = document.createElement('p');
    msg.setAttribute('role','status');
    msg.style.cssText='font:12px/1.5 system-ui;color:#9a4719;min-height:18px';
    if (state.user) {
      const signed = document.createElement('p');
      signed.textContent = 'Angemeldet: ' + (state.user.email || state.user.id);
      const out = document.createElement('button');
      out.type='button';out.textContent='Abmelden';
      out.style.cssText='padding:10px;border-radius:8px;background:#b43f35;border:0;color:white;cursor:pointer';
      out.onclick = async () => {
        out.disabled = true;
        const {error} = await state.client.auth.signOut();
        if(error) {msg.textContent=error.message;out.disabled=false;return;}
        clearTimeout(state.timer);
        localStorage.removeItem(OWNER_KEY);
        localStorage.removeItem(DATA_KEY);
        cover.remove();
        location.reload();
      };
      pane.append(signed,msg);
      buttons.append(close,out);
    } else {
      // Passwordless option for people who administer Supabase using Google.
      // This sends a link to the user's own mailbox; it does NOT impersonate them.
      const magicForm = document.createElement('form');
      magicForm.style.cssText = 'display:grid;gap:9px;margin:14px 0';
      const magicLabel = document.createElement('label');
      magicLabel.textContent = 'Anmeldung ohne Passwort';
      magicLabel.style.fontWeight = '700';
      const magicEmail = document.createElement('input');
      magicEmail.type = 'email';
      magicEmail.required = true;
      magicEmail.placeholder = 'Ihre Gmail-Adresse';
      magicEmail.autocomplete = 'email';
      magicEmail.style.cssText = 'padding:10px;border:1px solid #cad8df;border-radius:8px;width:100%';
      const magicButton = document.createElement('button');
      magicButton.type = 'submit';
      magicButton.textContent = 'Anmeldelink per E-Mail senden';
      magicButton.style.cssText = 'padding:11px;border:0;border-radius:8px;background:#0a756b;color:white;font-weight:700;cursor:pointer';
      const magicStatus = document.createElement('p');
      magicStatus.setAttribute('role','status');
      magicStatus.style.cssText = 'font-size:12px;margin:3px 0;color:#8b4b17';
      magicForm.append(magicLabel, magicEmail, magicButton, magicStatus);
      magicForm.addEventListener('submit', async event => {
        event.preventDefault();
        magicButton.disabled = true;
        magicStatus.textContent = 'Anmeldelink wird angefordert …';
        try {
          const {error} = await state.client.auth.signInWithOtp({
            email: magicEmail.value.trim(),
            options: {emailRedirectTo: location.origin + location.pathname}
          });
          if (error) throw error;
          magicStatus.textContent = 'E-Mail prüfen und den Anmeldelink öffnen. Falls die Rückleitung nicht klappt, in EACS die URL als Auth Redirect URL freigeben.';
        } catch (error) {
          magicStatus.textContent = 'EACS: ' + (error?.message || String(error));
        } finally {
          magicButton.disabled = false;
        }
      });
      pane.append(magicForm);
      const advanced = document.createElement('details');
      const advancedSummary = document.createElement('summary');
      advancedSummary.textContent = 'Weitere Anmeldeoptionen (E-Mail / Passwort)';
      advancedSummary.style.cssText = 'cursor:pointer;margin:12px 0;color:#486275';
      advanced.append(advancedSummary);
      const form = document.createElement('form');
      form.style.cssText='display:grid;gap:12px';
      const email=document.createElement('input');
      email.type='email';email.required=true;email.placeholder='E-Mail-Adresse';email.autocomplete='email';
      const password=document.createElement('input');
      password.type='password';password.required=true;password.minLength=6;
      password.placeholder='Passwort (min. 6 Zeichen)';password.autocomplete='current-password';
      const mode=document.createElement('select');
      for(const [value,label] of [['login','Anmelden'],['register','Neues EACS-Konto erstellen']]) {
        const opt=document.createElement('option');opt.value=value;opt.textContent=label;mode.append(opt);
      }
      const submit=document.createElement('button');
      submit.type='submit';submit.textContent='Fortfahren';
      submit.style.cssText='padding:11px;border:0;border-radius:8px;background:#0a756b;color:white;font-weight:700;cursor:pointer';
      form.append(email,password,mode,submit,msg);
      form.onsubmit = async event => {
        event.preventDefault();
        submit.disabled=true;msg.textContent='';
        try {
          const response=mode.value==='register'
            ? await state.client.auth.signUp({email:email.value.trim(),password:password.value})
            : await state.client.auth.signInWithPassword({email:email.value.trim(),password:password.value});
          if(response.error) throw response.error;
          if(!response.data?.session?.user){
            msg.textContent='Bestätigen Sie gegebenenfalls die E-Mail und melden Sie sich danach hier an. ';
            return;
          }
          cover.remove();
          await enterUser(response.data.session.user);
        } catch(error) {
          msg.textContent='EACS: '+(error?.message||String(error));
        } finally {submit.disabled=false;}
      };
      advanced.append(form);
      pane.append(advanced);
      buttons.append(close);
    }
    pane.append(buttons);
    cover.append(pane);
    cover.addEventListener('click',event=>{if(!required&&event.target===cover)cover.remove()});
    document.body.append(cover);
    if (!state.user) pane.querySelector('input')?.focus();
  };
  action.addEventListener('click',()=>openDialog(false));

  try {
    if(!window.supabase?.createClient)throw new Error('Supabase JS SDK nicht geladen.');
    state.client=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    window.DailySFMEacs = {client:state.client,requestSave:()=>queueSave(true)};
    state.client.auth.getSession().then(async ({data,error})=>{
      if(error)throw error;
      if(data?.session?.user) await enterUser(data.session.user);
      else {setAccount(null);show('Nicht angemeldet');document.getElementById('eacsGateLoading')?.remove();openDialog(true);}
    }).catch(error=>{console.error('DailySFM EACS auth:',error);show('EACS Auth nicht erreichbar: '+error.message,true);document.getElementById('eacsGateLoading')?.remove();openDialog(true);});
  } catch(error) {console.error(error);show('EACS nicht erreichbar: '+error.message,true);action.disabled=true;document.getElementById('eacsGateLoading')?.remove();}
})();
