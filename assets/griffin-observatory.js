import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { createObservatory } from './observatory-world.js';

const host=document.querySelector('[data-scene]');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}
catch{
  document.querySelector('[data-scene-error]').hidden=false;
  document.querySelector('[data-scene-loading]').hidden=true;
  document.querySelector('[data-orbit]').disabled=true;
  document.querySelector('[data-camera-home]').disabled=true;
  throw new Error('WebGL unavailable; artwork reference remains visible.');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.96;
host.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','2076 gözlemevindeki grifon. Sürükleyerek çevresini inceleyin.');
renderer.domElement.setAttribute('role','img');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#8e9b96');
scene.fog=new THREE.FogExp2('#89988d',.0075);
const environmentRenderer=new THREE.PMREMGenerator(renderer);
const studio=new RoomEnvironment();
scene.environment=environmentRenderer.fromScene(studio,.12).texture;
scene.environmentIntensity=.3;
studio.dispose();environmentRenderer.dispose();

const camera=new THREE.PerspectiveCamera(36,1,.1,220);
const home=new THREE.Vector3(-7.3,1.85,11.1);
const target=new THREE.Vector3(0,2.85,0);
camera.position.copy(home);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.copy(target);
controls.enableDamping=true;controls.dampingFactor=.065;
controls.minDistance=8.2;controls.maxDistance=25;
controls.minPolarAngle=.52;controls.maxPolarAngle=Math.PI/2+.105;
controls.enablePan=false;controls.rotateSpeed=.4;controls.autoRotateSpeed=.16;

const skyLight=new THREE.HemisphereLight('#d5e2e8','#413f2d',1.45);scene.add(skyLight);
const sun=new THREE.DirectionalLight('#ffe1a3',4.2);
sun.position.set(-10,15,-7);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-11,right:11,top:12,bottom:-10,near:.5,far:55});
sun.shadow.normalBias=.018;sun.shadow.bias=-.00012;sun.shadow.radius=3;scene.add(sun);
const rim=new THREE.DirectionalLight('#fff0d0',1.7);rim.position.set(4,10,-9);scene.add(rim);
const fill=new THREE.DirectionalLight('#c2d8dc',.7);fill.position.set(-4,5,9);scene.add(fill);
const baseLight=new THREE.PointLight('#e4b66b',7,7,2);baseLight.position.set(-2,1.8,3);scene.add(baseLight);

let seed=2076;
function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
function stoneTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const context=canvas.getContext('2d');
  context.fillStyle='#aaa99c';context.fillRect(0,0,1024,1024);
  for(let i=0;i<2500;i++){
    const shade=70+random()*100,r=4+random()*45,x=random()*1024,y=random()*1024;
    const gradient=context.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,`rgba(${shade},${shade+2},${shade-4},.075)`);gradient.addColorStop(1,'transparent');
    context.fillStyle=gradient;context.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<95000;i++){
    const shade=50+random()*160;context.fillStyle=`rgba(${shade},${shade},${shade-5},${.03+random()*.18})`;
    context.fillRect(random()*1024,random()*1024,random()*2.3+.3,random()*2.3+.3);
  }
  for(let i=0;i<32;i++){
    let x=random()*1024,y=random()*1024;context.beginPath();context.moveTo(x,y);
    for(let j=0;j<9;j++){x+=random()*65-32;y+=random()*57;context.lineTo(x,y);}
    context.strokeStyle='#32392a28';context.lineWidth=.4+random()*.8;context.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);return texture;
}

const world=createObservatory(scene,{reduced,random,stoneTexture});
const sculpture=new THREE.Group();scene.add(sculpture);
const pulseTime={value:0};
function marbleMaterial(geometry){
  geometry.computeBoundingBox();const bounds=geometry.boundingBox,extent=bounds.getSize(new THREE.Vector3());
  const material=new THREE.MeshPhysicalMaterial({
    color:'#eeede5',roughness:.66,metalness:.015,clearcoat:0,
    transmission:.56,thickness:.07,ior:1.35,attenuationColor:'#e5e9db',attenuationDistance:3,
    side:THREE.DoubleSide
  });
  material.onBeforeCompile=shader=>{
    shader.uniforms.marbleMin={value:bounds.min.clone()};shader.uniforms.marbleExtent={value:extent};shader.uniforms.guardianTime=pulseTime;
    shader.vertexShader='varying vec3 vMarblePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMarblePosition=position;');
    shader.fragmentShader=`
      uniform vec3 marbleMin;uniform vec3 marbleExtent;uniform float guardianTime;varying vec3 vMarblePosition;
      float mineralHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float mineralNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(mineralHash(i),mineralHash(i+vec3(1,0,0)),f.x),mix(mineralHash(i+vec3(0,1,0)),mineralHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(mineralHash(i+vec3(0,0,1)),mineralHash(i+vec3(1,0,1)),f.x),mix(mineralHash(i+vec3(0,1,1)),mineralHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 localP=(vMarblePosition-marbleMin)/max(marbleExtent,vec3(.0001));
      vec3 p=(vMarblePosition-marbleMin)/max(max(marbleExtent.x,marbleExtent.y),marbleExtent.z);
      float cloud=mineralNoise(p*24.0)+.36*mineralNoise(p*59.0);
      float grain=mineralNoise(p*310.0);
      float vein=1.0-smoothstep(.012,.045,abs(sin(p.y*21.0+p.z*13.0+cloud*7.0)));
      diffuseColor.rgb*=.94+.065*cloud+.025*grain;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.40,.46,.43),vein*.065);
      float membrane=smoothstep(.56,.85,localP.y);
      float nerve=sin(p.y*43.0+p.z*15.0+mineralNoise(p*19.0)*10.0);
      float filament=(1.0-smoothstep(.008,.035,abs(nerve)))*smoothstep(.5,.74,mineralNoise(p*31.0));
      float pulse=pow(.5+.5*sin(p.y*23.0+p.z*8.0-guardianTime*.48),7.0);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.27,.57,.43)*filament*(.12+pulse*.72);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_fragment>',THREE.ShaderChunk.transmission_fragment.replace('material.transmission = transmission;','material.transmission = transmission * membrane;'));
  };
  material.customProgramCacheKey=()=> 'alarm-matte-marble-nerves-1';return material;
}

let mixer;
new GLTFLoader().load('models/griffin-original.glb',asset=>{
  const model=asset.scene;model.rotation.y=-Math.PI/2;sculpture.add(model);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
  model.scale.setScalar(5.2/Math.max(size.x,size.y,size.z));
  const normalized=new THREE.Box3().setFromObject(model),center=normalized.getCenter(new THREE.Vector3());
  model.position.set(-center.x,1.32-normalized.min.y,-center.z);
  model.traverse(object=>{if(object.isMesh){object.material=marbleMaterial(object.geometry);object.castShadow=true;object.receiveShadow=true;object.frustumCulled=false;object.layers.enable(2);}});
  mixer=new THREE.AnimationMixer(model);
  const idle=asset.animations.find(clip=>/IDLE/i.test(clip.name));
  if(idle&&!reduced.matches)mixer.clipAction(idle).play();
  reduced.addEventListener('change',()=>{mixer.timeScale=reduced.matches?0:1;if(idle&&!reduced.matches)mixer.clipAction(idle).play();});
  document.querySelector('[data-scene-poster]').hidden=true;
  document.querySelector('[data-scene-loading]').hidden=true;
  document.querySelector('[data-model-status]').textContent='Gözlemevi · Özgün ALARM modeli · IDLE';
},undefined,()=>{
  host.hidden=true;document.querySelector('[data-scene-error]').hidden=false;
  document.querySelector('[data-scene-error]').textContent='Heykel modeli yüklenemedi. Eserin referans görseli gösteriliyor.';
  document.querySelector('[data-scene-loading]').hidden=true;
});

const reflectionTarget=new THREE.WebGLRenderTarget(384,384,{depthBuffer:true});
const reflectionCamera=new THREE.PerspectiveCamera();reflectionCamera.layers.set(2);
for(const light of [skyLight,sun,rim,fill,baseLight])light.layers.enable(2);
const reflectionMatrix=new THREE.Matrix4();
world.floorMaterial.onBeforeCompile=shader=>{
  shader.uniforms.guardianReflection={value:reflectionTarget.texture};shader.uniforms.reflectionMatrix={value:reflectionMatrix};
  shader.vertexShader='uniform mat4 reflectionMatrix;varying vec4 vFloorReflection;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    vec4 floorPosition=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
      floorPosition=instanceMatrix*floorPosition;
    #endif
    vFloorReflection=reflectionMatrix*modelMatrix*floorPosition;
  `);
  shader.fragmentShader='uniform sampler2D guardianReflection;varying vec4 vFloorReflection;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`
    #include <lights_fragment_end>
    vec2 ruv=vFloorReflection.xy/vFloorReflection.w*.5+.5;
    if(vFloorReflection.w>0.0&&all(greaterThan(ruv,vec2(0)))&&all(lessThan(ruv,vec2(1)))){
      vec3 reflection=texture2D(guardianReflection,ruv).rgb*.5;
      reflection+=texture2D(guardianReflection,ruv+vec2(.004,0)).rgb*.25;
      reflection+=texture2D(guardianReflection,ruv-vec2(.004,0)).rgb*.25;
      reflectedLight.indirectSpecular+=reflection*.055;
    }
  `);
};
world.floorMaterial.customProgramCacheKey=()=> 'alarm-observatory-wet-stone-1';

document.querySelector('[data-camera-home]').addEventListener('click',()=>{
  camera.position.copy(home);controls.target.copy(target);controls.autoRotate=false;
  document.querySelector('[data-orbit]').setAttribute('aria-pressed','false');
});
document.querySelector('[data-orbit]').addEventListener('click',event=>{
  controls.autoRotate=!controls.autoRotate;event.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));
});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart;
renderer.domElement.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};});
renderer.domElement.addEventListener('pointerup',event=>{
  if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5)return;
  const bounds=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
  raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(world.screens)[0];
  if(hit)location.assign(hit.object.userData.href);
});

let last=0,elapsed=0,frames=0;
function frame(now){
  requestAnimationFrame(frame);if(document.hidden||now-last<1000/30)return;
  const dt=Math.min((now-last)/1000,.1);last=now;elapsed+=dt;
  if(!reduced.matches){mixer?.update(dt);pulseTime.value=elapsed;}
  world.update(elapsed);controls.update(dt);camera.position.y=Math.max(1.45,camera.position.y);
  if(frames++%6===0){
    reflectionCamera.copy(camera,false);reflectionCamera.layers.set(2);
    reflectionCamera.position.y=2*1.305-camera.position.y;reflectionCamera.up.set(0,-1,0);
    reflectionCamera.lookAt(controls.target.x,2*1.305-controls.target.y,controls.target.z);reflectionCamera.updateMatrixWorld();
    reflectionMatrix.multiplyMatrices(reflectionCamera.projectionMatrix,reflectionCamera.matrixWorldInverse);
    renderer.setRenderTarget(reflectionTarget);renderer.render(scene,reflectionCamera);renderer.setRenderTarget(null);
  }
  renderer.render(scene,camera);
}
new ResizeObserver(()=>{
  const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
  renderer.setSize(width,height,false);camera.aspect=width/height;
  camera.fov=width/height<1.1?Math.min(76,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(36)/2)*1.1/(width/height)))):36;
  camera.updateProjectionMatrix();
}).observe(host);
requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{world.dispose();reflectionTarget.dispose();controls.dispose();renderer.dispose();});
