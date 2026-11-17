import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { MarchingCubes } from './vendor/MarchingCubes.js';

// ALARM / 2076 — a procedural sculptural study. No external model or tracking.
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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
host.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label', '2076 grifon heykeli. Sürükleyerek 360 derece inceleyin.');
renderer.domElement.setAttribute('role', 'img');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#101b19');
scene.fog = new THREE.FogExp2('#15211e', .027);
const camera = new THREE.PerspectiveCamera(36, 1, .1, 180);
const home = new THREE.Vector3(-8.7, 4.5, 10.4);
camera.position.copy(home);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.55, 0);
controls.enableDamping = true; controls.dampingFactor = .06;
controls.minDistance = 7; controls.maxDistance = 19;
controls.minPolarAngle = .45; controls.maxPolarAngle = Math.PI / 2.08;
controls.enablePan = false; controls.rotateSpeed = .42;
controls.autoRotateSpeed = .2;
const hemi = new THREE.HemisphereLight('#e6ebdf', '#35372b', 2.3); scene.add(hemi);
const key = new THREE.DirectionalLight('#fff1cc', 4.5);
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
  const ctx = c.getContext('2d'); ctx.fillStyle = '#b9ae91'; ctx.fillRect(0, 0, 512, 512);
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
const ivory = new THREE.MeshPhysicalMaterial({color:'#e6d7b4', roughness:.48, metalness:.12, bumpMap:texture, bumpScale:.022, clearcoat:.18, clearcoatRoughness:.7});
const gold = new THREE.MeshStandardMaterial({color:'#bba36e', metalness:.65, roughness:.45});
const vein = new THREE.LineBasicMaterial({color:'#d3c494', transparent:true, opacity:.47});
const dark = new THREE.MeshStandardMaterial({color:'#1f2925', roughness:.96, bumpMap:texture, bumpScale:.07});
const griffin = new THREE.Group(); scene.add(griffin);
function ellipsoid(parent, position, scale, material = ivory) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), material);
  m.position.set(...position); m.scale.set(...scale); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function line(parent, points, material = vein) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), material); parent.add(l); return l;
}
function tube(parent, points, radius, material = ivory) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 12, false), material);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
// Blended volumes merge the torso and limbs into a continuous carved form.
const volumes = [
  [0,2.48,0,1.55,.59,.48],[-1.03,2.52,0,.62,.75,.56],[1.02,2.5,0,.65,.65,.5],
  [-1.0,1.95,.39,.22,.58,.21],[-1.0,1.14,.4,.135,.65,.14],[-1.03,.49,.43,.14,.44,.15],[-1.17,.17,.45,.28,.15,.22],
  [-.78,1.95,-.39,.22,.57,.21],[-.79,1.14,-.4,.135,.66,.14],[-.83,.49,-.43,.14,.44,.15],[-.96,.17,-.45,.28,.15,.22],
  [1.02,2.05,.37,.34,.52,.26],[1.25,1.59,.4,.22,.35,.19],[1.09,1.1,.4,.14,.43,.14],[1.17,.52,.4,.13,.38,.14],[1.0,.17,.44,.28,.15,.22],
  [1.0,2.05,-.37,.34,.52,.26],[1.21,1.59,-.4,.22,.35,.19],[1.01,1.1,-.4,.14,.43,.14],[1.09,.52,-.4,.13,.38,.14],[.92,.17,-.44,.28,.15,.22],
  [-1.3,2.93,0,.42,.7,.38],[-1.42,3.35,0,.31,.52,.3]
];
const mc = new MarchingCubes(62, ivory, false, false, 160000);
mc.isolation = .55;
const res = mc.resolution;
for (let z = 0; z < res; z++) for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
  const px = (x / res * 2 - 1) * 3.7, py = (y / res * 2 - 1) * 3.7 + 2.3, pz = (z / res * 2 - 1) * 3.7;
  let f = 0;
  for (const v of volumes) {
    const q = ((px-v[0])/v[3])**2 + ((py-v[1])/v[4])**2 + ((pz-v[2])/v[5])**2;
    if (q < 16) f += Math.exp(-q * .8);
  }
  mc.field[x + y * res + z * res * res] = f;
}
mc.update();
mc.scale.setScalar(3.7); mc.position.y = 2.3; mc.castShadow = true; mc.receiveShadow = true; griffin.add(mc);
// Fine inlaid seams are part of the sculpture, not a diagnostic UI overlay.
for (const z of [-.4,.4]) for (let j = 0; j < 3; j++) {
  line(griffin,[[-1.25+j*.08,.19,z+.06],[-1.16+j*.08,.27,z+.08],[-1.04+j*.06,.3,z+.06]],vein);
  line(griffin,[[.78+j*.08,.19,z+.06],[.88+j*.08,.27,z+.08],[1.02+j*.06,.3,z+.06]],vein);
}
const head = new THREE.Group(); head.position.set(-1.42,3.42,0); griffin.add(head);
ellipsoid(head,[-.1,.35,0],[.43,.45,.32]);
ellipsoid(head,[-.4,.24,0],[.34,.24,.25]);
// A tapering raven beak, with a separately carved lower mandible.
function beak(parent, y, length, radius) {
  const g = new THREE.ConeGeometry(radius, length, 32);
  const m = new THREE.Mesh(g, ivory); m.rotation.z = Math.PI / 2 + .16;
  m.position.set(-.69, y, 0); m.scale.z = .77; m.castShadow = true; parent.add(m);
}
beak(head,.23,.82,.19); beak(head,.1,.71,.105);
for (const side of [-1,1]) {
  ellipsoid(head,[-.25,.43,side*.275],[.18,.15,.06],ivory);
  ellipsoid(head,[-.29,.435,side*.322],[.085,.077,.025],gold);
  ellipsoid(head,[-.31,.44,side*.345],[.027,.046,.012],new THREE.MeshPhysicalMaterial({color:'#20382b',roughness:.12,metalness:.5}));
  for (let i=0;i<11;i++) {
    const a=i/11*Math.PI*1.4;
    line(head,[[-.05,.6-i*.025,side*.28],[.17,.4-i*.045,side*.31],[.12,.06-i*.018,side*.24]]);
  }
}
const wings = [];
for (const side of [-1,1]) {
  const pivot = new THREE.Group(); pivot.position.set(-.55,2.85,side*.28); griffin.add(pivot); wings.push(pivot);
  const positions=[], indices=[], normals=[];
  const nu=32,nv=14;
  function wp(t,u) {
    const width = Math.sin(Math.PI*t)**.75 * .61;
    return new THREE.Vector3(2.25*t + width*u*.72, 2.55*t - width*u*.42, side*(.09 + 1.05*t + width*u*.5));
  }
  for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)positions.push(...wp(i/nu,j/nv*2-1).toArray());
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*(nv+1)+j,b=a+nv+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  const membrane = new THREE.MeshPhysicalMaterial({color:'#dbcda5',metalness:.17,roughness:.48,transparent:true,opacity:.73,side:THREE.DoubleSide,depthWrite:false});
  const surface = new THREE.Mesh(g,membrane); surface.castShadow=true;pivot.add(surface);
  for(const u of [-1,1]){const points=[];for(let i=0;i<=32;i++)points.push(wp(i/32,u).toArray());tube(pivot,points,.021,gold);}
  for(let j=0;j<9;j++){const points=[];for(let i=0;i<=24;i++){const t=i/24;points.push(wp(t,(j/8*2-1)*Math.sin(t*Math.PI/2)).toArray());}line(pivot,points);}
  for(let i=3;i<30;i+=2){const points=[];for(let j=0;j<=12;j++)points.push(wp(i/32,j/12*2-1).toArray());line(pivot,points);}
}
const tail = new THREE.Group(); tail.position.set(1.24,2.58,0); griffin.add(tail);
const tailCurve = new THREE.CatmullRomCurve3([[0,0,0],[.8,.2,0],[1.4,.66,.05],[2.05,1.23,.12],[2.55,1.9,.13]].map(p=>new THREE.Vector3(...p)));
// Varying cross-section gives the tail its long, reptilian taper.
const frames=tailCurve.computeFrenetFrames(60,false), tp=[],ti=[];
for(let i=0;i<=60;i++)for(let j=0;j<12;j++){
  const t=i/60,a=j/12*Math.PI*2,r=.25*(1-t)+.012,p=tailCurve.getPoint(t);
  p.addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);tp.push(...p.toArray());
}
for(let i=0;i<60;i++)for(let j=0;j<12;j++){const a=i*12+j,b=i*12+(j+1)%12,c=a+12,d=b+12;ti.push(a,c,b,b,c,d);}
const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(tp,3));tg.setIndex(ti);tg.computeVertexNormals();const tm=new THREE.Mesh(tg,ivory);tm.castShadow=true;tail.add(tm);
for(let i=1;i<19;i++){
  const t=i/20,p=tailCurve.getPoint(t),tangent=tailCurve.getTangent(t);
  for(const side of [0,-1,1]){
    const outward=new THREE.Vector3(-tangent.y,.8,side*.8).normalize();
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.09*(1-t)+.025,.35*(1-t)+.12,9),ivory);
    spike.position.copy(p).addScaledVector(outward,.19*(1-t)+.12);
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),outward);spike.castShadow=true;tail.add(spike);
  }
}
for(let j=0;j<6;j++){
  const pts=[];for(let i=0;i<=40;i++){const t=i/40,p=tailCurve.getPoint(t),a=j/6*Math.PI*2,r=.25*(1-t)+.015;p.y+=Math.cos(a)*r;p.z+=Math.sin(a)*r;pts.push(p.toArray());}line(tail,pts);
}

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
const ground=new THREE.Mesh(groundG,new THREE.MeshStandardMaterial({color:'#30362c',roughness:1,bumpMap:texture,bumpScale:.13}));ground.receiveShadow=true;scene.add(ground);
for(let i=0;i<22;i++){
  const angle=random()*Math.PI*2,d=13+random()*25,h=1.8+random()*6;
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.4+random()*.4,.7,h,7),dark);
  pillar.position.set(Math.cos(angle)*d,h/2-.4,Math.sin(angle)*d);pillar.rotation.z=(random()-.5)*.28;scene.add(pillar);
}
const dustG=new THREE.BufferGeometry(),dustP=new Float32Array(600*3),dustOriginal=[];
for(let i=0;i<600;i++){dustP[i*3]=(random()-.5)*35;dustP[i*3+1]=random()*10;dustP[i*3+2]=(random()-.5)*30;dustOriginal.push(dustP[i*3]);}
dustG.setAttribute('position',new THREE.BufferAttribute(dustP,3));
const dust=new THREE.Points(dustG,new THREE.PointsMaterial({color:'#d3c7a0',size:.025,transparent:true,opacity:.35,depthWrite:false}));scene.add(dust);
document.querySelector('[data-scene-poster]').hidden=true;
document.querySelector('[data-scene-loading]').hidden=true;
document.querySelector('[data-camera-home]').addEventListener('click',()=>{camera.position.copy(home);controls.target.set(0,2.55,0);controls.autoRotate=false;document.querySelector('[data-orbit]').setAttribute('aria-pressed','false');});
document.querySelector('[data-orbit]').addEventListener('click',e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));});
let last=0,elapsed=0;
function frame(now){requestAnimationFrame(frame);if(document.hidden||now-last<1000/30)return;const dt=Math.min((now-last)/1000,.1);last=now;elapsed+=dt;
  if(!reduced.matches){head.rotation.y=Math.sin(elapsed*.16)*.035;head.rotation.z=Math.sin(elapsed*.24)*.009;wings.forEach((w,i)=>w.rotation.x=Math.sin(elapsed*.42+i*.5)*.016);tail.rotation.y=Math.sin(elapsed*.25)*.032;griffin.scale.y=1+Math.sin(elapsed*.65)*.0015;
    for(let i=0;i<600;i++)dustP[i*3]=((dustOriginal[i]+elapsed*.12+18)%36)-18;dustG.attributes.position.needsUpdate=true;}
  controls.update(dt);renderer.render(scene,camera);
}
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{renderer.dispose();controls.dispose();});
