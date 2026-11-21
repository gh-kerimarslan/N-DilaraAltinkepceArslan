import * as THREE from '../assets/vendor/three.module.min.js';
import { OrbitControls } from '../assets/vendor/OrbitControls.js';
import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';
import { createBaseDisplays } from './base-displays-r14.js?v=r14';
import { createHistoryScreen } from './history-screen-r09.js?v=r09a';

const root=document.querySelector('[data-display]'),host=document.querySelector('[data-scene]');
const loading=document.querySelector('[data-scene-loading]'),errorBox=document.querySelector('[data-scene-error]'),poster=document.querySelector('[data-scene-poster]'),status=document.querySelector('[data-model-status]');
const motionButton=document.querySelector('[data-motion]'),qualityButton=document.querySelector('[data-quality]');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const viewerControls=[...document.querySelectorAll('[data-camera-home],[data-base-view],[data-orbit],[data-motion],[data-quality]')];
let renderer,controls,mixer,environment,character,raf=0,last=0,elapsed=0,paused=reduce.matches,lightweight=false,ready=false,disposed=false;
let idleAction=null,panorama=null,environmentMap=null,historyDisplay=null,baseDisplays=null;
const wind={value:0},resources=new Set();
const path=name=>new URL(name,import.meta.url).href;
document.querySelector('[data-retry-scene]').addEventListener('click',()=>location.reload());
function fallback(message){
  ready=false;cancelAnimationFrame(raf);raf=0;host.hidden=true;poster.hidden=false;loading.hidden=true;errorBox.hidden=false;root.dataset.fallback='true';
  errorBox.querySelector('p').textContent=message;status.textContent='Still preview of the latest base scene';viewerControls.forEach(b=>b.disabled=true);
}
try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.append(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Marble griffin in the reoccupied 2076 office plaza. Drag to explore in 360 degrees.');
}catch{
  fallback('3D is unavailable in this browser. The latest base preview is shown.');
}

if(renderer){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#aeb6b4');scene.fog=new THREE.FogExp2('#aeb6b4',.0085);
 let inBase=false;
 const camera=new THREE.PerspectiveCamera(34,1,.08,350);
 // Both exported GLBs already use metres and glTF's Y-up coordinates.
 const home=new THREE.Vector3(8.5,2.9,18),target=new THREE.Vector3(-3,2.8,-3);camera.position.copy(home);
 controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.minDistance=6.3;controls.maxDistance=40;controls.minPolarAngle=.36;controls.maxPolarAngle=Math.PI/2+.025;controls.rotateSpeed=.38;controls.autoRotateSpeed=.14;
 const sky=new THREE.HemisphereLight('#e4e6e3','#857866',1.5);scene.add(sky);
 const sun=new THREE.DirectionalLight('#fff4e5',2.5);sun.position.set(-10,22,9);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:100});sun.shadow.normalBias=.022;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
 const fill=new THREE.DirectionalLight('#e3e7e7',.5);fill.position.set(8,7,4);scene.add(fill);
 const lobbyLight=new THREE.PointLight('#e3debd',45,17,2);lobbyLight.position.set(5.5,4.2,-11);scene.add(lobbyLight);
 const displayLight=new THREE.PointLight('#a0d6ac',14,8,2);displayLight.position.set(4.85,2.8,-12.5);scene.add(displayLight);
 const textureLoader=new THREE.TextureLoader(),loader=new GLTFLoader();
 function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;const baseFov=inBase?48:34;camera.fov=camera.aspect<1.35?Math.min(70,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov)/2)*1.35/camera.aspect))):baseFov;camera.updateProjectionMatrix();}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
 function windMaterial(material){if(resources.has(material))return;resources.add(material);material.onBeforeCompile=shader=>{shader.uniforms.alarmWind=wind;shader.vertexShader='uniform float alarmWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 windWorld=modelMatrix*vec4(transformed,1.0);
 float windWeight=smoothstep(.12,1.8,windWorld.y);
 transformed.x+=sin(alarmWind*.55+windWorld.x*.63)*sin(alarmWind*.33+windWorld.z*.46)*.07*windWeight;
 transformed.z+=sin(alarmWind*.39+windWorld.z*.40)*.025*windWeight;
 `);};material.customProgramCacheKey=()=> 'alarm-r06-foliage';}
 function environmentSetup(model){
  baseDisplays=createBaseDisplays(recent=>{root.dataset.baseRecentRecords=String(recent);});
  model.traverse(object=>{if(!object.isMesh)return;object.castShadow=true;object.receiveShadow=true;const name=object.name;
   if(/ALARM_R14_Channel_/.test(name)){const id=name.split('ALARM_R14_Channel_')[1];object.userData.href=id+'.html';object.material=new THREE.MeshBasicMaterial({map:baseDisplays.billboard,side:THREE.DoubleSide,toneMapped:false});object.castShadow=false;object.receiveShadow=false;}
   if(/ALARM_R14_Interior_Overview/.test(name)){object.userData.href='index.html';object.material=new THREE.MeshBasicMaterial({map:baseDisplays.overview,side:THREE.DoubleSide,toneMapped:false});object.castShadow=false;object.receiveShadow=false;}
   if(/ALARM_R14_Exchange_Sign/.test(name)){object.material=new THREE.MeshBasicMaterial({map:baseDisplays.sign,side:THREE.DoubleSide,toneMapped:false});object.castShadow=false;object.receiveShadow=false;}
   if(/Tablet_(moloch|cheetah|cockroach|raven|gorilla)_Ekran/.test(name)){const id=name.match(/Tablet_(\w+)_Ekran/)[1];object.userData.href=id+'.html';object.userData.channel=id;
    textureLoader.load(path('images/'+id+'-terminal-r04.png'),texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.center.set(.5,.5);texture.rotation=Math.PI;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;object.material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});object.castShadow=false;resources.add(texture);},undefined,()=>{});
   }
   if(/Dikey_Arsiv_Ekrani/.test(name)){
    object.userData.href='history.html';
    historyDisplay=createHistoryScreen((record,offset)=>{root.dataset.historyRecord=String(record);root.dataset.historyOffset=String(offset);});
    historyDisplay.texture.repeat.x=1;historyDisplay.texture.offset.x=0;
    object.material=new THREE.MeshBasicMaterial({map:historyDisplay.texture,side:THREE.DoubleSide,toneMapped:false});object.castShadow=false;
   }
   const mats=Array.isArray(object.material)?object.material:[object.material];
   for(const mat of mats){if(mat.map)mat.map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);if(/Yaprak|Dal/.test(mat.name)||/Egrelti|Sarmasik|Bitki_Sap/.test(name))windMaterial(mat);}
  });
 }
 async function load(){
  try{
   loading.textContent='Preparing the base · 1/2';const space=await loader.loadAsync(path('models/base-r14.glb'));
   if(disposed)return;environment=space.scene;environmentSetup(environment);scene.add(environment);
   loading.textContent='Preparing the griffin · 2/2';const asset=await loader.loadAsync(path('models/griffin-r13.glb'));
   if(disposed)return;character=asset.scene;
   // The matte marble asset preserves the authored rig; its root lowers the feet onto the low slab.
   character.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;object.frustumCulled=false;const mats=Array.isArray(object.material)?object.material:[object.material];for(const mat of mats){if(mat.map)mat.map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);}}});scene.add(character);
   mixer=new THREE.AnimationMixer(character);const idle=asset.animations.find(clip=>/IDLE/i.test(clip.name));
   if(idle){idleAction=mixer.clipAction(idle);idleAction.play();idleAction.paused=paused;}
   root.dataset.sceneVersion='R14';root.dataset.animations=String(asset.animations.length);root.dataset.renderMode='webgl2';
   status.textContent='ALARM 2076 · '+(paused?'Idle movement off':'Idle movement on');loading.hidden=true;poster.hidden=true;ready=true;viewerControls.forEach(b=>b.disabled=false);syncMotion();controls.update();start();
  }catch(err){console.warn('ALARM scene load failed:',err);fallback('The 3D scene could not be loaded. The latest preview is shown. Check your connection and try again.');}
 }
 function syncMotion(){if(idleAction)idleAction.paused=paused;motionButton.textContent=paused?'MOTION: OFF':'MOTION: ON';motionButton.setAttribute('aria-pressed',String(!paused));if(ready)status.textContent='ALARM 2076 · '+(paused?'Idle movement off':'Idle movement on');}
 motionButton.addEventListener('click',()=>{paused=!paused;syncMotion();});reduce.addEventListener('change',()=>{paused=reduce.matches;syncMotion();});
 qualityButton.addEventListener('click',()=>{lightweight=!lightweight;renderer.setPixelRatio(lightweight?Math.min(devicePixelRatio,.85):Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=!lightweight;scene.traverse(object=>{if(object.isMesh){for(const mat of(Array.isArray(object.material)?object.material:[object.material]))mat.needsUpdate=true;}});qualityButton.textContent=lightweight?'QUALITY: LIGHT':'QUALITY: BALANCED';qualityButton.setAttribute('aria-pressed',String(lightweight));resize();});
 document.querySelector('[data-camera-home]').addEventListener('click',()=>{inBase=false;resize();camera.position.copy(home);controls.target.copy(target);controls.minDistance=6.3;controls.maxDistance=40;document.querySelector('[data-base-view]').setAttribute('aria-pressed','false');controls.autoRotate=false;document.querySelector('[data-orbit]').setAttribute('aria-pressed','false');controls.update();});
 document.querySelector('[data-base-view]').addEventListener('click',event=>{controls.autoRotate=false;document.querySelector('[data-orbit]').setAttribute('aria-pressed','false');inBase=true;resize();controls.minDistance=2;controls.maxDistance=10;camera.position.set(5.5,1.8,-7.85);controls.target.set(4.85,2.4,-13);event.currentTarget.setAttribute('aria-pressed','true');controls.update();});
 document.querySelector('[data-orbit]').addEventListener('click',event=>{controls.autoRotate=!controls.autoRotate;event.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));});
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let begin=null;
 renderer.domElement.addEventListener('pointerdown',e=>{begin={x:e.clientX,y:e.clientY};});renderer.domElement.addEventListener('pointercancel',()=>begin=null);
 renderer.domElement.addEventListener('pointerup',e=>{if(!begin||Math.hypot(e.clientX-begin.x,e.clientY-begin.y)>5){begin=null;return;}begin=null;if(!ready)return;const bounds=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects([environment,character],true);const hit=hits.find(h=>h.object.visible&&h.object.isMesh&&(!h.object.material.transparent||h.object.userData.href));
  if(hit?.object.userData.href)location.assign(hit.object.userData.href);
 });
 function frame(now){raf=0;if(disposed||document.hidden||!ready)return;if(!last)last=now;const delta=now-last;if(delta>=1000/30){const dt=Math.min(delta/1000,.1);last=now;if(!paused){elapsed+=dt;mixer?.update(dt);wind.value=elapsed;}historyDisplay?.update(dt,!paused);baseDisplays?.update(dt,!paused);controls.update(dt);camera.position.y=Math.max(1.45,camera.position.y);renderer.render(scene,camera);}raf=requestAnimationFrame(frame);}
 function start(){last=0;if(ready&&!document.hidden&&!disposed&&!raf)raf=requestAnimationFrame(frame);}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else start();});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback('The 3D connection was lost. The scene preview remains available; you can try again.');});
 window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();controls.dispose();historyDisplay?.dispose();baseDisplays?.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();for(const resource of resources)if(resource?.isTexture)resource.dispose();panorama?.dispose();environmentMap?.dispose();renderer.dispose();});
 load();
}
