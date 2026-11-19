import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

// ALARM / 2076 — the artist’s original rig in a locally rendered environment.
const host = document.querySelector('[data-scene]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch {
  document.querySelector('[data-scene-error]').hidden = false;
  document.querySelector('[data-scene-loading]').hidden = true;
  document.querySelector('[data-orbit]').disabled = true;
  document.querySelector('[data-camera-home]').disabled = true;
  throw new Error('WebGL unavailable: the original artwork reference remains visible.');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
host.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label', '2076 grifon heykeli. Sürükleyerek 360 derece inceleyin.');
renderer.domElement.setAttribute('role', 'img');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#101b19');
scene.fog = new THREE.FogExp2('#15211e', .027);
const pmrem=new THREE.PMREMGenerator(renderer);
const studio=new RoomEnvironment();
scene.environment=pmrem.fromScene(studio,.08).texture;
scene.environmentIntensity=.55;
studio.dispose();pmrem.dispose();
const camera = new THREE.PerspectiveCamera(36, 1, .1, 180);
const home = new THREE.Vector3(-6.8, 3.8, 8.5);
camera.position.copy(home);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.3, 0);
controls.enableDamping = true; controls.dampingFactor = .06;
controls.minDistance = 7; controls.maxDistance = 19;
controls.minPolarAngle = .45; controls.maxPolarAngle = Math.PI / 2.08;
controls.enablePan = false; controls.rotateSpeed = .42;
controls.autoRotateSpeed = .2;
const hemi = new THREE.HemisphereLight('#dce6e0', '#24291f', 1.25); scene.add(hemi);
const key = new THREE.DirectionalLight('#fff1d7', 3.4);
key.position.set(-7, 11, 6); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -7; key.shadow.camera.right = 7;
key.shadow.camera.top = 8; key.shadow.camera.bottom = -6; key.shadow.normalBias = .035;
scene.add(key);
const rim = new THREE.DirectionalLight('#9bb9a7', 3.5); rim.position.set(4, 7, -6); scene.add(rim);
const fill = new THREE.PointLight('#deb785', 25, 18); fill.position.set(-4, 2, 5); scene.add(fill);

let seed = 2076;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
function stoneTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#e1d4b8'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) {
    const shade = 130 + random() * 95;
    ctx.fillStyle = `rgba(${shade},${shade - 5},${shade - 13},${random() * .24})`;
    ctx.fillRect(random() * 512, random() * 512, random() * 3 + .5, random() * 2 + .5);
  }
  for (let i = 0; i < 85; i++) {
    let x = random() * 512, y = random() * 512;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += random() * 32 - 15; y += random() * 32; ctx.lineTo(x, y); }
    ctx.strokeStyle = '#52462c16'; ctx.lineWidth = .5; ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const texture = stoneTexture();
const ivory = new THREE.MeshPhysicalMaterial({color:'#e9e2ca', map:texture, roughness:.38, metalness:.17, bumpMap:texture, bumpScale:.045, clearcoat:.13, clearcoatRoughness:.65,side:THREE.DoubleSide});
const gold = new THREE.MeshStandardMaterial({color:'#bba36e', metalness:.65, roughness:.45});
const vein = new THREE.LineBasicMaterial({color:'#d3c494', transparent:true, opacity:.47});
const dark = new THREE.MeshStandardMaterial({color:'#1f2925', roughness:.96, bumpMap:texture, bumpScale:.07});
// The artist's original rig, optimized from ALARM ANIMATION.fbx. All 16 clips survive.
let mixer;
const sculpture = new THREE.Group();
scene.add(sculpture);
new GLTFLoader().load('models/griffin-original.glb', asset => {
  const model=asset.scene;
  model.rotation.y=-Math.PI/2;
  sculpture.add(model);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
  const scale=7.1/Math.max(size.x,size.y,size.z);
  model.scale.setScalar(scale);
  const normalized=new THREE.Box3().setFromObject(model),center=normalized.getCenter(new THREE.Vector3());
  model.position.set(-center.x,-normalized.min.y+.075,-center.z);
  model.traverse(object=>{if(object.isMesh){if(!object.geometry.attributes.uv){const g=object.geometry,a=g.attributes.position;g.computeBoundingBox();const b=g.boundingBox,uv=new Float32Array(a.count*2);for(let i=0;i<a.count;i++){uv[i*2]=(a.getX(i)-b.min.x)/Math.max(b.max.x-b.min.x,.001);uv[i*2+1]=(a.getY(i)-b.min.y)/Math.max(b.max.y-b.min.y,.001);}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));}object.material=ivory;object.castShadow=true;object.receiveShadow=true;object.frustumCulled=false;}});
  mixer=new THREE.AnimationMixer(model);
  const idle=asset.animations.find(clip=>/IDLE/i.test(clip.name));
  if(idle&&!reduced.matches)mixer.clipAction(idle).play();
  reduced.addEventListener('change',()=>{if(!mixer)return;mixer.timeScale=reduced.matches?0:1;if(idle&&!reduced.matches)mixer.clipAction(idle).play();});
  document.querySelector('[data-scene-poster]').hidden=true;
  document.querySelector('[data-scene-loading]').hidden=true;
  document.querySelector('[data-model-status]').textContent='Özgün ALARM modeli · IDLE';
},undefined,()=>{
  host.hidden=true;
  document.querySelector('[data-scene-error]').hidden=false;
  document.querySelector('[data-scene-error]').textContent='Heykel modeli yüklenemedi. Özgün eserin referans görseli gösteriliyor.';
  document.querySelector('[data-scene-loading]').hidden=true;
});

// Plinth, weathered terrain and distant remains keep attention on the guardian.
const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.65,3.88,.35,96),dark);
plinth.position.y=-.13;plinth.receiveShadow=true;scene.add(plinth);
for(const radius of [3.48,3.58,3.82]){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.009,6,128),gold);ring.rotation.x=Math.PI/2;ring.position.y=.057;scene.add(ring);
}
const groundG=new THREE.PlaneGeometry(160,160,110,110);groundG.rotateX(-Math.PI/2);
const ga=groundG.attributes.position;
for(let i=0;i<ga.count;i++){const x=ga.getX(i),z=ga.getZ(i),d=Math.hypot(x,z);ga.setY(i,-.35+Math.max(0,Math.min(1,(d-4)/10))*(Math.sin(x*.18+z*.09)*.8+Math.sin(z*.3)*.4));}
groundG.computeVertexNormals();
const ground=new THREE.Mesh(groundG,new THREE.MeshStandardMaterial({color:'#252c26',roughness:1,bumpMap:texture,bumpScale:.22}));ground.receiveShadow=true;scene.add(ground);
for(let i=0;i<22;i++){
  const angle=random()*Math.PI*2,d=13+random()*25,h=1.8+random()*6;
  const rockGeometry=new THREE.CylinderGeometry(.4+random()*.4,.7,h,7,5);
  const rockPoints=rockGeometry.attributes.position;
  for(let j=0;j<rockPoints.count;j++){rockPoints.setX(j,rockPoints.getX(j)+(random()-.5)*.22);rockPoints.setZ(j,rockPoints.getZ(j)+(random()-.5)*.22);if(rockPoints.getY(j)>h*.3)rockPoints.setY(j,rockPoints.getY(j)-random()*.65);}
  rockGeometry.computeVertexNormals();
  const pillar=new THREE.Mesh(rockGeometry,dark);
  pillar.position.set(Math.cos(angle)*d,h/2-.4,Math.sin(angle)*d);pillar.rotation.z=(random()-.5)*.28;scene.add(pillar);
}
const dustG=new THREE.BufferGeometry(),dustP=new Float32Array(600*3),dustOriginal=[];
for(let i=0;i<600;i++){dustP[i*3]=(random()-.5)*35;dustP[i*3+1]=random()*10;dustP[i*3+2]=(random()-.5)*30;dustOriginal.push(dustP[i*3]);}
dustG.setAttribute('position',new THREE.BufferAttribute(dustP,3));
const dust=new THREE.Points(dustG,new THREE.PointsMaterial({color:'#d3c7a0',size:.025,transparent:true,opacity:.35,depthWrite:false}));scene.add(dust);
document.querySelector('[data-camera-home]').addEventListener('click',()=>{camera.position.copy(home);controls.target.set(0,2.3,0);controls.autoRotate=false;document.querySelector('[data-orbit]').setAttribute('aria-pressed','false');});
document.querySelector('[data-orbit]').addEventListener('click',e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));});
let last=0,elapsed=0;
function frame(now){requestAnimationFrame(frame);if(document.hidden||now-last<1000/30)return;const dt=Math.min((now-last)/1000,.1);last=now;elapsed+=dt;
  if(!reduced.matches){if(mixer)mixer.update(dt);
    for(let i=0;i<600;i++)dustP[i*3]=((dustOriginal[i]+elapsed*.12+18)%36)-18;dustG.attributes.position.needsUpdate=true;}
  controls.update(dt);renderer.render(scene,camera);
}
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{renderer.dispose();controls.dispose();});
