import * as THREE from '../assets/vendor/three.module.min.js';

const channels = [
 {id:'moloch',name:'MOLOCH',theme:'DROUGHT',part:'TAIL',metric:'Soil moisture / Istanbul',source:'Open-Meteo',unit:'m³/m³'},
 {id:'cheetah',name:'CHEETAH',theme:'RAPID CONSUMPTION',part:'BODY',metric:'Electricity load / Germany',source:'Energy-Charts',unit:'MW'},
 {id:'cockroach',name:'COCKROACH',theme:'RADIATION',part:'WINGS',metric:'One sensor record',source:'Safecast',unit:'CPM'},
 {id:'raven',name:'RAVEN',theme:'IGNORANCE',part:'HEAD',metric:'Wikipedia edits / sample',source:'Wikimedia',unit:'records/min'},
 {id:'gorilla',name:'GORILLA',theme:'HUMAN VALUES',part:'EYES',metric:'Conflict-coded news records',source:'GDELT',unit:'records'}
];

export function createBaseDisplays(onStatus=()=>{}) {
 const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const billboard=make(2560,768),overview=make(1600,800),sign=make(1900,58);
 const textures=[billboard,overview,sign].map(canvas=>{
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;
  t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;
 });
 let disposed=false,tick=0,flow=0,snapshot=null,controller=null,timer=null,inflight=false;
 const animals=new Map();
 const ink='#b2ffc6',dim='#6b9d79',rule='#294e35';
 function text(ctx,value,x,y,size=28,color=ink){ctx.font=`${size}px AlarmPixel, monospace`;ctx.fillStyle=color;ctx.fillText(value,x,y);}
 function record(channel){
  const row=snapshot?.schemaVersion===1?snapshot.channels?.[channel.id]:null;
  const stamp=Date.parse(row?.observedAt),generated=Date.parse(snapshot?.generatedAt),now=Date.now();
  const valid=typeof row?.value==='number'&&Number.isFinite(row.value)&&Number.isFinite(stamp)&&stamp<=now+300000&&Number.isFinite(generated)&&generated<=now+300000;
  if(!valid)return {value:'—',state:'NO SOURCE RECORD',time:'AWAITING RECORD',recent:false};
  const maxAge=Number.isFinite(row.maxAgeSeconds)&&row.maxAgeSeconds>0?Math.min(row.maxAgeSeconds,31536000):3600;
  const stale=(now-stamp)/1000>maxAge||now-generated>9000000||row.state==='stale';
  return {value:row.value.toLocaleString('en-GB',{maximumFractionDigits:3}),state:stale?'ARCHIVED / OUT OF DATE':'SOURCE RECORD',
   time:new Date(stamp).toISOString().replace('T',' ').slice(0,16)+' UTC',recent:!stale};
 }
 function background(ctx,w,h){ctx.fillStyle='#020906';ctx.fillRect(0,0,w,h);ctx.strokeStyle=rule;ctx.lineWidth=2;}
 function draw(){
  const b=billboard.getContext('2d');background(b,2560,768);
  for(let i=0;i<5;i++){
   const ch=channels[i],x=i*512,r=record(ch);
   text(b,'ALARM / '+ch.part,x+24,48,28,dim);text(b,ch.name,x+24,102,47);
   b.strokeRect(x+18,126,476,294);
   const im=animals.get(ch.id);
   if(im){const scale=Math.min(452/im.naturalWidth,270/im.naturalHeight);b.drawImage(im,x+256-im.naturalWidth*scale/2,273-im.naturalHeight*scale/2,im.naturalWidth*scale,im.naturalHeight*scale);}
   text(b,ch.theme,x+24,461,30);text(b,r.value,x+24,521,47);text(b,ch.unit,x+24,558,24,dim);
   text(b,r.state,x+24,607,25,ink);text(b,ch.metric,x+24,647,23,dim);text(b,r.time,x+24,681,23,dim);
   text(b,ch.source,x+24,728,24,dim);
   if(i){b.beginPath();b.moveTo(x,0);b.lineTo(x,768);b.stroke();}
  }
  // Slowly moving source notes are typography, never synthetic measurements.
  b.fillStyle='#b2ffc6';b.fillRect(22+(flow%2480),756,36,2);
  const c=overview.getContext('2d');background(c,1600,800);
  text(c,'ALARM / COMMON OBSERVATION',48,75,53);
  text(c,'2076   /   CLIMATE EXCHANGE',48,123,28,dim);
  c.beginPath();c.moveTo(48,150);c.lineTo(1552,150);c.stroke();
  let recent=0;
  for(let i=0;i<5;i++){
   const ch=channels[i],r=record(ch),y=215+i*97;if(r.recent)recent++;
   text(c,ch.theme,48,y,30);text(c,r.value+' '+ch.unit,650,y,34);
   text(c,r.state,1080,y,27,r.recent?ink:dim);
   text(c,ch.metric+' / '+ch.source,48,y+33,22,dim);text(c,r.time,650,y+33,22,dim);
   c.beginPath();c.moveTo(48,y+51);c.lineTo(1552,y+51);c.stroke();
  }
  text(c,`${recent}/5 RECENT SOURCE RECORDS`,48,749,28);
  text(c,'OBSERVATION ONLY / 5 CHANNELS',920,749,26,dim);
  const s=sign.getContext('2d');s.fillStyle='#535a55';s.fillRect(0,0,1900,58);
  text(s,'C L I M A T E   E X C H A N G E',40,43,40,'#b5b8a8');text(s,'REOCCUPIED / 2076',1390,42,30,'#c0ccba');
  textures.forEach(t=>t.needsUpdate=true);
  onStatus(recent);
 }
 async function refresh(){
  if(disposed||inflight)return;inflight=true;controller=new AbortController();
  const timeout=setTimeout(()=>controller?.abort(),9000);
  const endpoint=document.querySelector('meta[name="alarm-endpoint"]')?.content;
  try{
   const allowed='https://raw.githubusercontent.com/gh-kerimarslan/N-DilaraAltinkepceArslan/alarm-data/alarm/data/status.json';
   const response=await fetch(endpoint===allowed?allowed:new URL('data/status.json',import.meta.url),{credentials:'omit',cache:'no-store',signal:controller.signal,referrerPolicy:'no-referrer'});
   if(!response.ok)throw new Error('Source unavailable');const raw=await response.text();
   if(raw.length>100000)throw new Error('Oversized source');const data=JSON.parse(raw);
   if(data?.schemaVersion!==1||!data.channels)throw new Error('Invalid source');snapshot=data;
  }catch{
   if(disposed)return;
   try{const response=await fetch(new URL('data/status.json',import.meta.url),{credentials:'omit',cache:'no-store',signal:controller.signal});
    if(response.ok){const raw=await response.text();if(raw.length<=100000){const data=JSON.parse(raw);if(data?.schemaVersion===1&&data.channels)snapshot=data;}}
   }catch{}
  }finally{clearTimeout(timeout);inflight=false;if(!disposed)draw();}
 }
 for(const ch of channels){const im=new Image();im.decoding='async';im.onload=()=>{if(!disposed){animals.set(ch.id,im);draw();}};im.src=new URL('images/'+ch.id+'-terminal-r04.png',import.meta.url).href;}
 draw();document.fonts.load('30px AlarmPixel').then(()=>{if(!disposed)draw();}).catch(()=>{});
 refresh();timer=setInterval(()=>{if(!document.hidden)refresh();},1200000);
 return {billboard:textures[0],overview:textures[1],sign:textures[2],
  update(dt,moving){if(disposed)return;if(moving)flow+=dt*38;tick+=dt;if(tick>.5){tick=0;draw();}},
  dispose(){disposed=true;clearInterval(timer);controller?.abort();textures.forEach(t=>t.dispose());animals.clear();}
 };
}
