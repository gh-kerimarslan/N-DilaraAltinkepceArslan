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
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .92;
host.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label', '2076 grifon heykeli. Sürükleyerek 360 derece inceleyin.');
renderer.domElement.setAttribute('role', 'img');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#080d0b');
scene.fog = new THREE.FogExp2('#101710', .046);
const pmrem=new THREE.PMREMGenerator(renderer);
const studio=new RoomEnvironment();
scene.environment=pmrem.fromScene(studio,.08).texture;
scene.environmentIntensity=.34;
studio.dispose();pmrem.dispose();
const camera = new THREE.PerspectiveCamera(32, 1, .1, 180);
const home = new THREE.Vector3(-6.6, 3.15, 9.6);
camera.position.copy(home);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.65, 0);
controls.enableDamping = true; controls.dampingFactor = .06;
controls.minDistance = 7; controls.maxDistance = 19;
controls.minPolarAngle = .45; controls.maxPolarAngle = Math.PI / 2.08;
controls.enablePan = false; controls.rotateSpeed = .42;
controls.autoRotateSpeed = .2;
const hemi = new THREE.HemisphereLight('#abb8a4', '#17180e', .38); scene.add(hemi);
const key = new THREE.DirectionalLight('#ffe2a1', 4.8);
key.position.set(-5, 9, 2); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -7; key.shadow.camera.right = 7;
key.shadow.camera.top = 8; key.shadow.camera.bottom = -6; key.shadow.normalBias = .025;
key.shadow.bias = -.00015; key.shadow.radius = 3;
scene.add(key);
const rim = new THREE.DirectionalLight('#fff0bf', 7.2); rim.position.set(3, 7, -6); scene.add(rim);
const fill = new THREE.DirectionalLight('#9dafa6', .85); fill.position.set(-3, 3, 8); scene.add(fill);
const lowLight = new THREE.PointLight('#d5a85a', 13, 12, 2); lowLight.position.set(-2, .7, 3); scene.add(lowLight);

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
// Rest-pose coordinates keep the fine inlay attached to the existing animated skin.
// No vertices, bones or clips in the artist's GLB are changed.
function guardianMaterial(geometry) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const extent = bounds.getSize(new THREE.Vector3());
  const material = new THREE.MeshPhysicalMaterial({
    color:'#9e9473', roughness:.4, metalness:.53,
    clearcoat:.28, clearcoatRoughness:.3,
    transmission:.72, thickness:.09, ior:1.28,
    attenuationColor:'#b8a56f', attenuationDistance:1.8,
    side:THREE.DoubleSide
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.inlayMin = {value:bounds.min.clone()};
    shader.uniforms.inlayExtent = {value:extent};
    shader.vertexShader = 'varying vec3 vInlayPosition; varying vec3 vInlayNormal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvInlayPosition = position; vInlayNormal = normal;');
    shader.fragmentShader = `
      uniform vec3 inlayMin;
      uniform vec3 inlayExtent;
      varying vec3 vInlayPosition;
      varying vec3 vInlayNormal;
      float fineLine(float coordinate) {
        float edge = abs(fract(coordinate - .5) - .5);
        float width = max(fwidth(coordinate), .012);
        return 1.0 - smoothstep(.007, .007 + width, edge);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 localP = (vInlayPosition - inlayMin) / max(inlayExtent, vec3(.0001));
      vec3 p = (vInlayPosition - inlayMin) / max(max(inlayExtent.x, inlayExtent.y), inlayExtent.z);
      p += .006 * sin(p.yzx * 34.0 + sin(p.zxy * 18.0));
      vec3 lattice = vec3(fineLine(p.x * 72.0), fineLine(p.y * 72.0), fineLine(p.z * 72.0));
      vec3 weights = abs(normalize(vInlayNormal));
      weights = pow(weights, vec3(4.0)); weights /= max(dot(weights, vec3(1.0)), .0001);
      float inlay = dot(weights, vec3(max(lattice.y,lattice.z), max(lattice.x,lattice.z), max(lattice.x,lattice.y)));
      float membrane = smoothstep(.57, .83, localP.y);
      diffuseColor.rgb *= mix(.82, 1.12, .5 + .5 * sin(p.z * 53.0 + p.y * 24.0));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.69,.52,.23), inlay * .38);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(.28,.19,.065) * inlay * (.22 + .22 * membrane);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment.replace('material.transmission = transmission;', 'material.transmission = transmission * membrane;'));
  };
  material.customProgramCacheKey = () => 'alarm-inlaid-alloy-1';
  return material;
}
const gold = new THREE.MeshStandardMaterial({color:'#b8a16b', metalness:.8, roughness:.36, emissive:'#8a6126', emissiveIntensity:.055});
const dark = new THREE.MeshStandardMaterial({color:'#111710', roughness:.9, bumpMap:texture, bumpScale:.045});
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
  model.traverse(object=>{if(object.isMesh){object.material=guardianMaterial(object.geometry);object.castShadow=true;object.receiveShadow=true;object.frustumCulled=false;object.layers.enable(2);}});
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

// A low observatory floor, with subdued engraved instruments instead of a pedestal.
const floorMaterial = new THREE.MeshPhysicalMaterial({color:'#11120d', metalness:.82, roughness:.5, clearcoat:.12, clearcoatRoughness:.4, bumpMap:texture, bumpScale:.025});
// A small, infrequently refreshed planar reflection keeps the floor grounded.
// Only the guardian and lights enter this pass; terrain and floor never recurse.
const reflectionTarget = new THREE.WebGLRenderTarget(384,384,{depthBuffer:true});
const reflectionCamera = new THREE.PerspectiveCamera();
reflectionCamera.layers.set(2);
for(const light of [hemi,key,rim,fill,lowLight])light.layers.enable(2);
const reflectionMatrix = new THREE.Matrix4();
floorMaterial.onBeforeCompile = shader => {
  shader.uniforms.guardianReflection = {value:reflectionTarget.texture};
  shader.uniforms.reflectionMatrix = {value:reflectionMatrix};
  shader.vertexShader = 'uniform mat4 reflectionMatrix; varying vec4 vFloorReflection;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvFloorReflection = reflectionMatrix * modelMatrix * vec4(transformed,1.0);');
  shader.fragmentShader = 'uniform sampler2D guardianReflection; varying vec4 vFloorReflection;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `
    #include <lights_fragment_end>
    reflectedLight.directDiffuse *= .35;
    reflectedLight.directSpecular *= .22;
    reflectedLight.indirectDiffuse *= .45;
    reflectedLight.indirectSpecular *= .4;
    vec2 reflectionUV = vFloorReflection.xy / vFloorReflection.w * .5 + .5;
    if(vFloorReflection.w > 0.0 && all(greaterThan(reflectionUV,vec2(0.0))) && all(lessThan(reflectionUV,vec2(1.0)))) {
      vec3 reflectionLight = texture2D(guardianReflection,reflectionUV).rgb * .5;
      reflectionLight += texture2D(guardianReflection,reflectionUV + vec2(.003,0.0)).rgb * .25;
      reflectionLight += texture2D(guardianReflection,reflectionUV - vec2(.003,0.0)).rgb * .25;
      reflectedLight.indirectSpecular += reflectionLight * .1;
    }
  `);
};
floorMaterial.customProgramCacheKey = () => 'alarm-observatory-floor-2';
const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.7,4.73,.09,128),floorMaterial);
plinth.position.y=.008;plinth.receiveShadow=true;scene.add(plinth);
for(const radius of [4.12,4.48,4.61]){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.005,4,160),gold);ring.rotation.x=Math.PI/2;ring.position.y=.057;scene.add(ring);
}
for(let i=0;i<96;i++){
  const angle=i/96*Math.PI*2,major=i%8===0;
  const tick=new THREE.Mesh(new THREE.BoxGeometry(.009,.002,major?.19:.065),gold);
  tick.position.set(Math.sin(angle)*4.37,.058,Math.cos(angle)*4.37);tick.rotation.y=angle;scene.add(tick);
}
const groundG=new THREE.PlaneGeometry(160,160,110,110);groundG.rotateX(-Math.PI/2);
const ga=groundG.attributes.position;
for(let i=0;i<ga.count;i++){const x=ga.getX(i),z=ga.getZ(i),d=Math.hypot(x,z);ga.setY(i,-.05+Math.max(0,Math.min(1,(d-5)/15))*(Math.sin(x*.18+z*.09)*.35+Math.sin(z*.3)*.18));}
groundG.computeVertexNormals();
const ground=new THREE.Mesh(groundG,new THREE.MeshStandardMaterial({color:'#131a12',roughness:.84,bumpMap:texture,bumpScale:.12}));ground.receiveShadow=true;scene.add(ground);
for(let i=0;i<11;i++){
  const angle=random()*Math.PI*2,d=24+random()*24,h=2.2+random()*5;
  const rockGeometry=new THREE.CylinderGeometry(.4+random()*.4,.7,h,7,5);
  const rockPoints=rockGeometry.attributes.position;
  for(let j=0;j<rockPoints.count;j++){rockPoints.setX(j,rockPoints.getX(j)+(random()-.5)*.22);rockPoints.setZ(j,rockPoints.getZ(j)+(random()-.5)*.22);if(rockPoints.getY(j)>h*.3)rockPoints.setY(j,rockPoints.getY(j)-random()*.65);}
  rockGeometry.computeVertexNormals();
  const pillar=new THREE.Mesh(rockGeometry,dark);
  pillar.position.set(Math.cos(angle)*d,h/2-.4,Math.sin(angle)*d);pillar.rotation.z=(random()-.5)*.28;scene.add(pillar);
}
const dustG=new THREE.BufferGeometry(),dustP=new Float32Array(220*3),dustOriginal=[];
for(let i=0;i<220;i++){dustP[i*3]=(random()-.5)*35;dustP[i*3+1]=random()*10;dustP[i*3+2]=(random()-.5)*30;dustOriginal.push(dustP[i*3]);}
dustG.setAttribute('position',new THREE.BufferAttribute(dustP,3));
const dust=new THREE.Points(dustG,new THREE.PointsMaterial({color:'#c9b886',size:.012,transparent:true,opacity:.16,depthWrite:false}));scene.add(dust);
document.querySelector('[data-camera-home]').addEventListener('click',()=>{camera.position.copy(home);controls.target.set(0,2.65,0);controls.autoRotate=false;document.querySelector('[data-orbit]').setAttribute('aria-pressed','false');});
document.querySelector('[data-orbit]').addEventListener('click',e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.setAttribute('aria-pressed',String(controls.autoRotate));});
let last=0,elapsed=0,frameCount=0;
function frame(now){requestAnimationFrame(frame);if(document.hidden||now-last<1000/30)return;const dt=Math.min((now-last)/1000,.1);last=now;elapsed+=dt;
  if(!reduced.matches){if(mixer)mixer.update(dt);
    for(let i=0;i<220;i++)dustP[i*3]=((dustOriginal[i]+elapsed*.075+18)%36)-18;dustG.attributes.position.needsUpdate=true;}
  controls.update(dt);
  if(frameCount++%5===0){
    const planeY=.053;
    reflectionCamera.copy(camera,false);reflectionCamera.layers.set(2);
    reflectionCamera.position.y=2*planeY-camera.position.y;
    reflectionCamera.up.set(0,-1,0);
    reflectionCamera.lookAt(controls.target.x,2*planeY-controls.target.y,controls.target.z);
    reflectionCamera.updateMatrixWorld();
    reflectionMatrix.multiplyMatrices(reflectionCamera.projectionMatrix,reflectionCamera.matrixWorldInverse);
    renderer.setRenderTarget(reflectionTarget);renderer.render(scene,reflectionCamera);renderer.setRenderTarget(null);
  }
  renderer.render(scene,camera);
}
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{reflectionTarget.dispose();renderer.dispose();controls.dispose();});
