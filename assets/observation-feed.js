(() => {
  const screen=document.querySelector('.channel-screen'),list=document.querySelector('[data-feed-list]');if(!screen||!list)return;
  let source,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,note=0,latest=null;
  const button=document.querySelector('[data-feed-pause]');
  const time=()=>new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  function entry(label,content){const li=document.createElement('li'),tag=document.createElement('time'),text=document.createElement('span');tag.textContent=label;text.textContent=content;li.append(tag,text);list.append(li);while(list.children.length>4)list.firstChild.remove();}
  function snapshot(detail){latest=detail;if(paused)return;const stamp=time();
    if(detail.simulation){entry(stamp,'SİMÜLASYON / Kaynak ölçümü değildir.');return;}
    if(Number.isFinite(detail.value)){entry(stamp,`Kaynak kaydı: ${detail.value.toLocaleString('tr-TR',{maximumFractionDigits:3})} ${detail.unit||''} · ${detail.scope||source?.scope||''}`);entry('KAYIT ZAMANI',detail.observedAt?new Date(detail.observedAt).toLocaleString('tr-TR'):'Kaynak zamanı bulunamadı.');}
    else entry(stamp,detail.reason||'Kaynak kaydı bekleniyor. Veri olmadığı için bir sonuç üretilmiyor.');
  }
  window.addEventListener('alarm-state',event=>snapshot(event.detail));
  button.addEventListener('click',()=>{paused=!paused;button.textContent=paused?'Akışı başlat':'Akışı durdur';button.setAttribute('aria-pressed',String(paused));if(!paused&&latest)snapshot(latest);});
  async function init(){try{const r=await fetch('data/sources.json',{credentials:'omit'});if(!r.ok)throw new Error();const all=await r.json();source=all[screen.dataset.channel];
    const a=document.querySelector('[data-feed-source]');a.textContent=source.source+' ↗';a.href=source.url;document.querySelector('[data-feed-license]').textContent=source.license;
    entry('KAPSAM',source.scope);entry('GÖSTERGE',source.metric);entry('KAYNAK NOTU',source.notes[note++]);
  }catch{entry('KAYNAK','Kaynak kataloğu yüklenemedi.');}}
  setInterval(()=>{document.querySelector('[data-feed-clock]').textContent=time();if(paused||document.hidden||!source)return;entry('KAYNAK NOTU',source.notes[note++%source.notes.length]);},18000);
  button.textContent=paused?'Akışı başlat':'Akışı durdur';button.setAttribute('aria-pressed',String(paused));document.querySelector('[data-feed-clock]').textContent=time();init();
})();
