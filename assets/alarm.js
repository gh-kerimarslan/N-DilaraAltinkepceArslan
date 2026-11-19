(() => {
  'use strict';
  const screen=document.querySelector('.channel-screen');
  const languageButton=document.querySelector('[data-language]');
  let language='en';
  const words={en:{unknown:'Awaiting connection',stale:'Data out of date',normal:'Within threshold',watch:'Observation',alarm:'ALARM',live:'Source monitoring',simulation:'SIMULATION',start:'Start presentation',stop:'Exit presentation',demo:'Try a signal',endDemo:'Return to monitoring',normalDemo:'Calm',watchDemo:'Observe',alarmDemo:'Alarm',missing:'The live data service has not been connected. No alarm conclusion is being drawn.',network:'The data service could not be reached. The channel is marked unknown.',demoMessage:'Simulation: this signal is for the artwork preview. It is not a live measurement.',wakeFailed:'Screen stay-awake is unavailable. Check device display settings.',fullscreenFailed:'Fullscreen is unavailable in this browser. The display remains open in the page.',updated:'UPDATED',source:'SOURCE',status:'SIGNAL',metric:'MEASUREMENT',never:'No measurement',units:'Preview signal',clock:'DATA CLOCK',specimen:'SPECIMEN',notConfigured:'Not connected'},tr:{unknown:'Bağlantı bekleniyor',stale:'Veri güncel değil',normal:'Eşik içinde',watch:'İzleniyor',alarm:'ALARM',live:'Kaynak izleme',simulation:'SİMÜLASYON',start:'Sergilemeyi başlat',stop:'Sergilemeden çık',demo:'Sinyali dene',endDemo:'Kaynak izlemeye dön',normalDemo:'Sakin',watchDemo:'İzleme',alarmDemo:'Alarm',missing:'Canlı veri servisi henüz bağlanmadı. Alarm hakkında sonuç üretilmiyor.',network:'Veri servisine ulaşılamıyor. Kanal bilinmiyor olarak işaretlendi.',demoMessage:'Simülasyon: bu sinyal eser önizlemesi içindir. Canlı bir ölçüm değildir.',wakeFailed:'Ekranı açık tutma kullanılamıyor. Cihaz ekran ayarlarını kontrol edin.',fullscreenFailed:'Bu tarayıcıda tam ekran açılamıyor. Görünüm sayfa içinde açık kalıyor.',updated:'GÜNCELLENME',source:'KAYNAK',status:'SİNYAL',metric:'ÖLÇÜM',never:'Ölçüm yok',units:'Örnek sinyal',clock:'VERİ SAATİ',specimen:'KARAKTER',notConfigured:'Bağlı değil'}};
  const t=key=>words[language][key]||key;
  let current={state:'unknown',value:null,observedAt:null,sourceLabel:'',metricLabel:'',maxAgeSeconds:3600},demo=false,demoState='normal',networkError=false,wake=null,inflight=false;
  const text=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value;};
  const displayDate=stamp=>{if(!stamp)return t('never');const date=new Date(stamp);return Number.isNaN(date.valueOf())?t('never'):date.toLocaleString(language==='tr'?'tr-TR':'en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'});};
  function render(){
    document.documentElement.lang=language;
    document.querySelectorAll('[data-en][data-tr]').forEach(el=>el.textContent=el.dataset[language]);
    document.querySelectorAll('[data-label]').forEach(el=>el.textContent=t(el.dataset.label));
    if(languageButton)languageButton.textContent=language==='en'?'TR':'EN';
    if(!screen)return;
    const state=demo?demoState:current.state;screen.dataset.state=state;
    text('[data-state-label]',!demo&&state==='unknown'&&Number.isFinite(current.value)?(language==='tr'?'Kayıt alındı · eşikler bekleniyor':'Record received · thresholds pending'):t(state));text('[data-value]',demo?'—':Number.isFinite(current.value)?current.value.toLocaleString(language==='tr'?'tr-TR':'en-GB',{maximumFractionDigits:3}):'—');
    text('[data-source]',demo?t('simulation'):(current.sourceLabel||t('notConfigured')));text('[data-measurement-label]',demo?t('units'):current.metricLabel||'—');text('[data-updated]',demo?'—':displayDate(current.observedAt));
    text('[data-signal-message]',demo?t('demoMessage'):networkError?t('network'):current.reason||(current.state==='unknown'?t('missing'):''));
    if(screen.classList.contains('terminal-screen')&&language==='en'&&!demo){
      text('[data-measurement-label]',screen.dataset.metricEn||current.metricLabel||'—');
      if(!networkError&&current.reason){const threshold=/eşik/i.test(current.reason)?' Alarm thresholds have not been defined.':'';const age=current.state==='stale'?'The source record is out of date. ':'';text('[data-signal-message]',age+(screen.dataset.noteEn||'A limited source indicator is shown.')+threshold);}
    }
    text('[data-demo-toggle]',t(demo?'endDemo':'demo'));text('[data-presentation]',t(document.fullscreenElement?'stop':'start'));
    document.querySelector('[data-demo-controls]').hidden=!demo;document.querySelector('[data-simulation]').hidden=!demo;text('[data-simulation]',t('simulation'));
    document.querySelectorAll('[data-demo-state]').forEach(button=>button.setAttribute('aria-pressed',String(demoState===button.dataset.demoState)));
    window.dispatchEvent(new CustomEvent('alarm-state',{detail:{channel:screen.dataset.channel,state,simulation:demo,observedAt:demo?null:current.observedAt,value:demo?null:current.value,sourceLabel:current.sourceLabel,unit:current.unit,scope:current.scope,reason:current.reason}}));
  }
  languageButton?.addEventListener('click',()=>{language=language==='en'?'tr':'en';try{localStorage.setItem('alarm-language',language);}catch{}render();});
  if(!screen){render();return;}
  const allowedStates=new Set(['unknown','stale','normal','watch','alarm']);
  function validate(payload){
    const channel=payload?.schemaVersion===1?payload.channels?.[screen.dataset.channel]:null;
    if(!channel || !allowedStates.has(channel.state))throw new Error('Invalid channel');
    const observed=channel.observedAt?Date.parse(channel.observedAt):NaN;
    const maxAge=Number(channel.maxAgeSeconds);const maxAgeSeconds=Number.isFinite(maxAge)&&maxAge>0?Math.min(maxAge,31536000):3600;
    let state=channel.state;const age=(Date.now()-observed)/1000;
    if(['normal','watch','alarm'].includes(state) && (typeof channel.value!=='number' || !Number.isFinite(channel.value)))state='unknown';
    if(state!=='unknown' && (!Number.isFinite(observed)||age < -300))state='unknown';
    else if(state!=='unknown' && age>maxAgeSeconds)state='stale';
    const generated=Date.parse(payload.generatedAt);
    if(state!=='unknown' && (!Number.isFinite(generated) || generated>Date.now()+300000))state='unknown';
    else if(state!=='unknown' && Date.now()-generated>9000000)state='stale';
    // Thresholds may be undefined while an actual source record still becomes old.
    // Treat stale records as stale even when their incoming signal was unknown.
    if(typeof channel.value==='number'&&Number.isFinite(channel.value)&&Number.isFinite(observed)&&age>=0&&Number.isFinite(generated)&&generated<=Date.now()+300000&&(age>maxAgeSeconds||Date.now()-generated>9000000))state='stale';
    return{state,value:typeof channel.value==='number'&&Number.isFinite(channel.value)?channel.value:null,observedAt:Number.isFinite(observed)?channel.observedAt:null,maxAgeSeconds,sourceLabel:String(channel.sourceLabel||'').replace('İngilizce Wikipedia','English Wikipedia').slice(0,160),metricLabel:String(channel.metricLabel||'').slice(0,160),reason:String(channel.reason||'').slice(0,300),unit:String(channel.unit||'').replace('kayıt/dk','records/min').replace('kayıt','records').slice(0,30),scope:String(channel.scope||'').slice(0,160)};
  }
  async function refresh(){
    if(inflight||document.hidden)return;inflight=true;
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
    try{const endpoint=document.querySelector('meta[name=alarm-endpoint]')?.content||'data/status.json';const url=new URL(endpoint,location.href);if(url.origin!==location.origin&&url.protocol!=='https:')throw new Error('HTTPS required');const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:controller.signal,referrerPolicy:'no-referrer'});if(!response.ok)throw new Error('Unavailable');const raw=await response.text();if(raw.length>100000)throw new Error('Oversized status');current=validate(JSON.parse(raw));networkError=false;if(current.value===null&&url.origin!==location.origin){try{const saved=await fetch('data/status.json',{cache:'no-store',credentials:'omit',signal:controller.signal});if(saved.ok){const previous=validate(await saved.json());if(previous.value!==null){current={...previous,reason:'Bu çevrimde kaynak kaydı alınamadı. Son kaydedilen kopya, kendi kayıt zamanı ile gösteriliyor. '+(previous.reason||'')};}}}catch{}}}
    catch{try{const saved=await fetch('data/status.json',{cache:'no-store',credentials:'omit',signal:controller.signal});if(!saved.ok)throw new Error();current=validate(await saved.json());current.reason=(current.reason||'')+' Son kaydedilmiş kaynak kopyası gösteriliyor.';networkError=false;}catch{current={...current,state:'unknown'};networkError=true;}}finally{clearTimeout(timer);inflight=false;if(!demo)render();}
  }
  const present=document.querySelector('[data-presentation]');
  async function acquireWake(){if(!document.fullscreenElement||document.hidden)return;try{if(!wake && navigator.wakeLock){wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>{wake=null;});}else if(!navigator.wakeLock)text('[data-device-message]',t('wakeFailed'));}catch{text('[data-device-message]',t('wakeFailed'));}}
  present.addEventListener('click',async()=>{if(document.fullscreenElement){await document.exitFullscreen();return;}text('[data-device-message]','');try{await screen.requestFullscreen();await acquireWake();}catch{text('[data-device-message]',t('fullscreenFailed'));}render();});
  document.addEventListener('fullscreenchange',()=>{screen.classList.toggle('presentation',Boolean(document.fullscreenElement));if(!document.fullscreenElement){wake?.release();wake=null;}render();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){acquireWake();refresh();}});
  window.addEventListener('online',refresh);window.addEventListener('offline',()=>{networkError=true;current.state='unknown';render();});
  document.querySelector('[data-demo-toggle]').addEventListener('click',()=>{demo=!demo;demoState='normal';render();});
  document.querySelectorAll('[data-demo-state]').forEach(button=>button.addEventListener('click',()=>{demoState=button.dataset.demoState;render();}));
  if(new URLSearchParams(location.search).get('demo')==='1')demo=true;
  render();refresh();setInterval(()=>{if(!document.hidden)refresh();},1200000);
})();
