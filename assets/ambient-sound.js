// An original, quiet wind/drone soundscape, synthesized locally after a gesture.
(() => {
  const button=document.querySelector('[data-sound]'),volume=document.querySelector('[data-volume]');
  if(!button)return;
  let context,master,enabled=false;
  function setup(){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');
    context=new Audio();master=context.createGain();master.gain.value=0;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-22;limiter.knee.value=18;limiter.ratio.value=5;master.connect(limiter);limiter.connect(context.destination);
    const length=context.sampleRate*12,buffer=context.createBuffer(2,length,context.sampleRate);
    for(let c=0;c<2;c++){const d=buffer.getChannelData(c);let smooth=0;for(let i=0;i<length;i++){smooth=(smooth+(Math.random()*2-1)*.035)/1.035;d[i]=smooth*4;}}
    const wind=context.createBufferSource();wind.buffer=buffer;wind.loop=true;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=520;filter.Q.value=.5;
    const windGain=context.createGain();windGain.gain.value=.26;wind.connect(filter);filter.connect(windGain);windGain.connect(master);wind.start();
    const gust=context.createOscillator(),gustGain=context.createGain();gust.frequency.value=.037;gustGain.gain.value=160;gust.connect(gustGain);gustGain.connect(filter.frequency);gust.start();
    for(const [frequency,gain]of [[55,.055],[82.41,.022],[110.13,.012]]){const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=frequency;g.gain.value=gain;o.connect(g);g.connect(master);o.start();}
    const air=context.createOscillator(),airGain=context.createGain();air.frequency.value=439.7;airGain.gain.value=.002;air.connect(airGain);airGain.connect(master);air.start();
  }
  function level(){if(!master)return;const target=enabled&&!document.hidden?Number(volume?.value||.25):0;master.gain.setTargetAtTime(target,context.currentTime,.9);}
  button.addEventListener('click',async()=>{try{if(!context)setup();await context.resume();enabled=!enabled;button.textContent=enabled?'Sound off':'Sound on';button.setAttribute('aria-pressed',String(enabled));level();}catch{document.querySelector('[data-display-message]').textContent='Audio is unavailable on this device.';}});
  volume?.addEventListener('input',level);document.addEventListener('visibilitychange',level);
  window.addEventListener('pagehide',()=>context?.close());
})();
