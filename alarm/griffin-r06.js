import * as THREE from '../assets/vendor/three.module.min.js';
import { OrbitControls } from '../assets/vendor/OrbitControls.js';
import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';

const root=document.querySelector('[data-display]'),host=document.querySelector('[data-scene]');
const loading=document.querySelector('[data-scene-loading]'),errorBox=document.querySelector('[data-scene-error]'),poster=document.querySelector('[data-scene-poster]'),status=document.querySelector('[data-model-status]');
const motionButton=document.querySelector('[data-motion]'),qualityButton=document.querySelector('[data-quality]');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const viewerControls=[...document.querySelectorAll('[data-camera-home],[data-orbit],[data-motion],[data-quality]')];
let renderer,controls,mixer,environment,character,raf=0,last=0,elapsed=0,paused=reduce.matches,lightweight=false,ready=false,disposed=false;
let idleAction=null,panorama=null,environmentMap=null;
const wind={value:0},resources=new Set();
const path=name=>new URL(name,import.meta.url).href;
document.querySelector('[data-retry-scene]').addEventListener('click',()=>location.reload());
function fallback(message){
  ready=false;cancelAnimationFrame(raf);raf=0;host.hidden=true;poster.hidden=false;loading.hidden=true;errorBox.hidden=false;root.dataset.fallback='true';
  errorBox.querySelector('p').textContent=message;status.textContent='Yeni gözlemevi sahnesinin sabit önizlemesi';viewerControls.forEach(b=>b.disabled=true);
}
try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.append(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','2076 gözlemevinde mermer grifon. Sürükleyerek çevresini inceleyin.');
}catch{
  fallback('Bu tarayıcıda 3D açılamadı. Son atmosferli sahnenin önizlemesi gösteriliyor.');
}

if(renderer){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#84918a');scene.fog=new THREE.FogExp2('#9da99f',.004);
 const camera=new THREE.PerspectiveCamera(28,1,.08,350);
 // Both exported GLBs already use metres and glTF's Y-up coordinates.
 const home=new THREE.Vector3(12,2.4,8),target=new THREE.Vector3(0,2.75,0);camera.position.copy(home);
 controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.minDistance=6.3;controls.maxDistance=29;controls.minPolarAngle=.36;controls.maxPolarAngle=Math.PI/2+.025;controls.rotateSpeed=.38;controls.autoRotateSpeed=.14;
 const sky=new THREE.HemisphereLight('#dce6ef','#3f4935',1.25);scene.add(sky);
 const sun=new THREE.DirectionalLight('#ffe1b2',3.6);sun.position.set(-10,22,9);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:60});sun.shadow.normalBias=.022;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
 const fill=new THREE.DirectionalLight('#bfd4ff',.75);fill.position.set(8,7,4);scene.add(fill);
 const front=new THREE.DirectionalLight('#e5eeff',.35);front.position.set(6,5,10);scene.add(front);
 const top=new THREE.DirectionalLight('#dce6ff',.55);top.position.set(0,8,0);scene.add(top);
 const rim=new THREE.DirectionalLight('#ffcf91',1.2);rim.position.set(3.5,7,6);scene.add(rim);
 const textureLoader=new THREE.TextureLoader(),loader=new GLTFLoader();
 function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=camera.aspect<1.35?Math.min(70,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(28)/2)*1.35/camera.aspect))):28;camera.updateProjectionMatrix();}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
 function windMaterial(material){if(resources.has(material))return;resources.add(material);material.onBeforeCompile=shader=>{shader.uniforms.alarmWind=wind;shader.vertexShader='uniform float alarmWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 windWorld=modelMatrix*vec4(transformed,1.0);
 float windWeight=smoothstep(.12,1.8,windWorld.y);
 transformed.x+=sin(alarmWind*.55+windWorld.x*.63)*sin(alarmWind*.33+windWorld.z*.46)*.07*windWeight;
 transformed.z+=sin(alarmWind*.39+windWorld.z*.40)*.025*windWeight;
 `);};material.customProgramCacheKey=()=> 'alarm-r06-foliage';}
 function environmentSetup(model){
  model.traverse(object=>{if(!object.isMesh)return;object.castShadow=true;object.receiveShadow=true;const name=object.name;
   if(/Tablet_(moloch|cheetah|cockroach|raven|gorilla)_Ekran/.test(name)){const id=name.match(/Tablet_(\w+)_Ekran/)[1];object.userData.href=id+'.html';object.userData.channel=id;
    textureLoader.load(path('images/'+id+'-terminal-r04.png'),texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;object.material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});object.castShadow=false;resources.add(texture);},undefined,()=>{});
   }
   if(/Dikey_Arsiv_Ekrani/.test(name))object.userData.href='history.html';
   const mats=Array.isArray(object.material)?object.material:[object.material];
   for(const mat of mats){if(mat.map)mat.map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);if(/Yaprak|Dal/.test(mat.name)||/Egrelti|Sarmasik|Bitki_Sap/.test(name))windMaterial(mat);}
  });
 }
 textureLoader.load(path('images/observatory-panorama-r06.png'),texture=>{
  if(disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;
  panorama=texture;scene.background=texture;scene.backgroundIntensity=.75;scene.backgroundRotation.y=4.141592653589793;
  const gen=new THREE.PMREMGenerator(renderer);environmentMap=gen.fromEquirectangular(texture);scene.environment=environmentMap.texture;scene.environmentIntensity=.65;scene.environmentRotation.y=4.141592653589793;gen.dispose();
 },undefined,()=>{});
 async function load(){
  try{
   loading.textContent='Gözlemevi hazırlanıyor · 1/2';const space=await loader.loadAsync(path('models/observatory-r06.glb'));
   if(disposed)return;environment=space.scene;environmentSetup(environment);scene.add(environment);
   loading.textContent='Grifon hazırlanıyor · 2/2';const asset=await loader.loadAsync(path('models/griffin-r06.glb'));
   if(disposed)return;character=asset.scene;
   // Keep the authored transforms, carved feather surfaces, iris, sclera and wing materials.
   character.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;object.frustumCulled=false;const mats=Array.isArray(object.material)?object.material:[object.material];for(const mat of mats){if(mat.map)mat.map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);}}});scene.add(character);
   mixer=new THREE.AnimationMixer(character);const idle=asset.animations.find(clip=>/IDLE/i.test(clip.name));
   if(idle){idleAction=mixer.clipAction(idle);idleAction.play();idleAction.paused=paused;}
   root.dataset.sceneVersion='R06';root.dataset.animations=String(asset.animations.length);root.dataset.renderMode='webgl2';
   status.textContent='2076 gözlemevi · '+(paused?'Bekleme hareketi kapalı':'Bekleme hareketi açık');loading.hidden=true;poster.hidden=true;ready=true;viewerControls.forEach(b=>b.disabled=false);syncMotion();controls.update();start();
  }catch(err){console.warn('ALARM scene load failed:',err);fallback('3D sahne yüklenemedi. Son atmosferli sahnenin önizlemesi gösteriliyor. Bağlantını kontrol edip yeniden deneyebilirsin.');}
 }
 function syncMotion(){if(idleAction)idleAction.paused=paused;motionButton.textContent=paused?'HAREKET: KAPALI':'HAREKET: AÇIK';motionButton.setAttribute('aria-pressed',String(!paused));if(ready)status.textContent='2076 gözlemevi · '+(paused?'Bekleme hareketi kapalı':'Bekleme hareketi açık');}
 motionButton.addEventListener('click',()=>{paused=!paused;syncMotion();});reduce.addEventListener('change',()=>{paused=reduce.matches;syncMotion();});
 qualityButton.addEventListener('click',()=>{lightweight=!lightweight;renderer.setPixelRatio(lightweight?Math.min(devicePixelRatio,.85):Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=!lightweight;scene.traverse(object=>{if(object.isMesh){for(const mat of(Array.isArray(object.material)?object.material:[object.material]))mat.needsUpdate=true;}});qualityButton.textContent=lightweight?'GÖRÜNTÜ: YALIN':'GÖRÜNTÜ: DENGELİ';qualityButton.setAttribute('aria-pressed',String(lightweight));resize();});
 document.querySelector('[data-camera-home]').addEventListener('click',()=>{camera.position.copy(home);controls.target.copy(target);controls.autoRotate=false;document.querySelector('[data-orbit]').setAttribute('aria-pressed','false');controls.update();});
 document.querySelector('[data-orbit]').addEventListener('click',event=>{controls.autoRotate=!controls.autoRotate;event.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));});
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let begin=null;
 renderer.domElement.addEventListener('pointerdown',e=>{begin={x:e.clientX,y:e.clientY};});renderer.domElement.addEventListener('pointercancel',()=>begin=null);
 renderer.domElement.addEventListener('pointerup',e=>{if(!begin||Math.hypot(e.clientX-begin.x,e.clientY-begin.y)>5){begin=null;return;}begin=null;if(!ready)return;const bounds=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects([environment,character],true);const hit=hits.find(h=>h.object.visible&&h.object.isMesh&&(!h.object.material.transparent||h.object.userData.href));
  if(hit?.object.userData.href)location.assign(hit.object.userData.href);
 });
 function frame(now){raf=0;if(disposed||document.hidden||!ready)return;if(!last)last=now;const delta=now-last;if(delta>=1000/30){const dt=Math.min(delta/1000,.1);last=now;if(!paused){elapsed+=dt;mixer?.update(dt);wind.value=elapsed;}controls.update(dt);camera.position.y=Math.max(1.45,camera.position.y);renderer.render(scene,camera);}raf=requestAnimationFrame(frame);}
 function start(){last=0;if(ready&&!document.hidden&&!disposed&&!raf)raf=requestAnimationFrame(frame);}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else start();});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback('3D görüntü bağlantısı kesildi. Önizleme açık kaldı; yeniden deneyebilirsin.');});
 window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();controls.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();for(const resource of resources)if(resource?.isTexture)resource.dispose();panorama?.dispose();environmentMap?.dispose();renderer.dispose();});
 load();
}
