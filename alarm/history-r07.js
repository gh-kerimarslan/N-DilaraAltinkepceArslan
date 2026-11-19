(() => {
 'use strict';
 const view=document.querySelector('[data-register-viewport]'),track=document.querySelector('[data-register-track]');
 if(!view||!track)return;
 const pauseButton=document.querySelector('[data-scroll-pause]'),restartButton=document.querySelector('[data-scroll-home]'),speedSelect=document.querySelector('[data-scroll-speed]');
 const mode=document.querySelector('[data-read-mode]'),recordNumber=document.querySelector('[data-record-number]'),records=[...track.querySelectorAll('[data-record]')];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduce.matches,speed=22,position=0,previous=0,raf=0,manualUntil=0,phase='intro',remaining=6,recordTick=0;
 try{const saved=Number(localStorage.getItem('alarm-history-speed-r07'));if([14,22,32].includes(saved))speed=saved;}catch{}
 speedSelect.value=String(speed);
 const maxScroll=()=>Math.max(0,view.scrollHeight-view.clientHeight);
 const displayScale=()=>innerHeight>innerWidth?Math.max(.6,Math.min(2.5,innerWidth/1080)):1;
 function status(){pauseButton.textContent=paused?'RESUME FLOW':'PAUSE FLOW';pauseButton.setAttribute('aria-pressed',String(paused));mode.textContent=paused?'FLOW PAUSED':performance.now()<manualUntil?'MANUAL READING':phase==='end'?'END OF REGISTER':'VERTICAL FLOW';}
 function updateRecord(){const at=view.getBoundingClientRect().top+view.clientHeight*.48;let selected=0;for(const r of records){if(r.getBoundingClientRect().top<=at)selected=Number(r.dataset.record);else break;}recordNumber.textContent=selected?String(selected).padStart(2,'0')+' / 39':'GRIFFIN HISTORY';}
 function stop(){cancelAnimationFrame(raf);raf=0;previous=0;}
 function start(){previous=0;if(!paused&&!document.hidden&&!raf)raf=requestAnimationFrame(frame);}
 function setPaused(value){paused=value;if(phase==='fade'){track.classList.remove('is-looping');phase='end';remaining=20;}if(paused)stop();else start();status();}
 function frame(now){
  raf=0;if(paused||document.hidden)return;
  if(!previous)previous=now;const dt=Math.min((now-previous)/1000,.1);previous=now;
  if(now>=manualUntil){
   if(phase==='intro'){remaining-=dt;if(remaining<=0)phase='scroll';}
   else if(phase==='scroll'){
    const max=maxScroll();if(max>0){position=Math.min(max,position+speed*displayScale()*dt);view.scrollTop=position;if(position>=max-.5){phase='end';remaining=20;status();}}
   }else if(phase==='end'){remaining-=dt;if(remaining<=0){phase='fade';remaining=reduce.matches?0:1.05;track.classList.add('is-looping');}}
   else if(phase==='fade'){remaining-=dt;if(remaining<=0){position=0;view.scrollTop=0;track.classList.remove('is-looping');phase='intro';remaining=5;status();}}
  }
  if(now-recordTick>500){recordTick=now;updateRecord();status();}
  raf=requestAnimationFrame(frame);
 }
 function manual(){manualUntil=performance.now()+18000;position=view.scrollTop;if(phase==='fade'||phase==='end'){phase='scroll';track.classList.remove('is-looping');}status();}
 for(const name of ['wheel','touchstart','pointerdown','keydown'])view.addEventListener(name,manual,{passive:true});
 view.addEventListener('scroll',()=>{if(paused||performance.now()<manualUntil)position=view.scrollTop;updateRecord();},{passive:true});
 pauseButton.addEventListener('click',()=>{position=view.scrollTop;setPaused(!paused);});
 restartButton.addEventListener('click',()=>{position=0;view.scrollTop=0;manualUntil=0;phase='intro';remaining=6;track.classList.remove('is-looping');updateRecord();status();});
 speedSelect.addEventListener('change',()=>{const v=Number(speedSelect.value);speed=[14,22,32].includes(v)?v:22;try{localStorage.setItem('alarm-history-speed-r07',String(speed));}catch{}status();});
 reduce.addEventListener('change',()=>setPaused(reduce.matches));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
 new ResizeObserver(()=>{position=Math.min(position,maxScroll());updateRecord();}).observe(track);
 window.addEventListener('pagehide',stop);
 status();updateRecord();start();
})();
