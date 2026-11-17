(() => {
  const viewport=document.querySelector('[data-register-viewport]'),button=document.querySelector('[data-scroll-pause]');
  if(!viewport||!button)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,previous=0,position=0,restUntil=0,manualUntil=0;
  function render(){button.textContent=paused?'Akışı başlat':'Akışı durdur';button.setAttribute('aria-pressed',String(paused));}
  button.addEventListener('click',()=>{paused=!paused;position=viewport.scrollTop;render();});
  // Reading by hand temporarily stops automatic motion rather than fighting it.
  for(const event of ['wheel','touchstart','pointerdown','keydown'])viewport.addEventListener(event,()=>manualUntil=performance.now()+18000,{passive:true});
  viewport.addEventListener('scroll',()=>{if(performance.now()<manualUntil)position=viewport.scrollTop;},{passive:true});
  reduced.addEventListener('change',()=>{paused=reduced.matches;render();});
  function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.08);previous=now;if(paused||document.hidden||now<manualUntil||now<restUntil)return;
    const max=viewport.scrollHeight-viewport.clientHeight;if(max<=0)return;
    position+=dt*13;viewport.scrollTop=position;
    if(position>=max){restUntil=now+20000;position=0;setTimeout(()=>{if(!paused&&performance.now()>=manualUntil)viewport.scrollTop=0;},20000);}
  }
  render();requestAnimationFrame(frame);
})();
