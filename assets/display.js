(() => {
  const root=document.querySelector('[data-display]'),button=document.querySelector('[data-fullscreen]');
  if(!root||!button)return;
  let wake=null,hideTimer;
  const message=document.querySelector('[data-display-message]');
  async function hold(){if(document.hidden||!document.fullscreenElement)return;try{if(navigator.wakeLock&&!wake){wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>wake=null);}else if(!navigator.wakeLock)message.textContent='Use your device display settings to keep the screen awake.';}catch{message.textContent='Screen wake lock is unavailable. Check the device display settings.';}}
  function active(){root.classList.add('is-active');clearTimeout(hideTimer);hideTimer=setTimeout(()=>root.classList.remove('is-active'),4500);}
  button.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else{await root.requestFullscreen();await hold();}}catch{message.textContent='Fullscreen is unavailable in this browser. The page remains open.';}});
  document.addEventListener('fullscreenchange',()=>{const on=Boolean(document.fullscreenElement);root.classList.toggle('is-presenting',on);button.textContent=on?'Exit fullscreen':'Fullscreen';if(!on){wake?.release();wake=null;}active();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)hold();});
  root.addEventListener('pointermove',active,{passive:true});root.addEventListener('pointerdown',active,{passive:true});root.addEventListener('focusin',active);
})();
