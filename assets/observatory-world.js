import * as THREE from './vendor/three.module.min.js';

// Metres throughout: 1.30 m podium, 1.70–1.80 m visitors, 30 m observatory.
export function createObservatory(scene, { reduced, random, stoneTexture }) {
  const root = new THREE.Group();
  scene.add(root);
  const visitors = [], screens = [], textures = [], distantRidges=[];
  const time = { value: 0 };
  const stone = stoneTexture();
  stone.repeat.set(2.2, 1.2);
  textures.push(stone);
  const concrete = new THREE.MeshStandardMaterial({ color: '#77776a', roughness: .93, map: stone, bumpMap: stone, bumpScale: .055 });
  const edgeStone = new THREE.MeshStandardMaterial({ color: '#505449', roughness: .91, map: stone, bumpMap: stone, bumpScale: .04 });
  const podiumSide = new THREE.MeshStandardMaterial({ color: '#42483e', roughness: .91, map: stone, bumpMap: stone, bumpScale: .065 });
  const floorMaterial = new THREE.MeshPhysicalMaterial({ color: '#62665a', metalness: .08, roughness: .64, clearcoat: .1, map: stone, bumpMap: stone, bumpScale: .028 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#8d805c', metalness: .65, roughness: .48 });
  const black = new THREE.MeshStandardMaterial({ color: '#171e1b', roughness: .7, metalness: .35 });
  // World-space stone grain avoids stretching a small texture around tall columns
  // and the 22-metre circumference of the pedestal.
  for(const material of [concrete,edgeStone,podiumSide]){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vStoneP;varying vec3 vStoneN;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvStoneP=(modelMatrix*vec4(transformed,1.0)).xyz;vStoneN=normalize(mat3(modelMatrix)*normal);');
      shader.fragmentShader='varying vec3 vStoneP;varying vec3 vStoneN;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        #ifdef USE_MAP
          vec3 weights=pow(abs(normalize(vStoneN)),vec3(4.0));weights/=max(dot(weights,vec3(1.0)),.0001);
          vec4 mineral=texture2D(map,vStoneP.yz*.52)*weights.x;
          mineral+=texture2D(map,vStoneP.xz*.52)*weights.y;
          mineral+=texture2D(map,vStoneP.xy*.52)*weights.z;
          diffuseColor*=mineral;
        #endif
      `);
    };
    material.customProgramCacheKey=()=> 'observatory-world-stone-1';
  }
  const mesh = (geometry, material, x=0, y=0, z=0, parent=root) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x,y,z); object.receiveShadow=true; parent.add(object); return object;
  };
  const cylinder = (radius,height,material,x=0,y=0,z=0,segments=64) => mesh(new THREE.CylinderGeometry(radius,radius,height,segments),material,x,y,z);

  const podiumTopMaterial=floorMaterial.clone();
  const podium = mesh(new THREE.CylinderGeometry(3.5,3.56,1.3,128),[podiumSide,podiumTopMaterial,podiumSide],0,.65,0);
  podium.castShadow=true;
  cylinder(3.53,.045,edgeStone,0,1.278,0,128);
  cylinder(3.62,.09,edgeStone,0,.045,0,128);
  const ring = (radius,y,material,width=.009) => {
    const object=mesh(new THREE.TorusGeometry(radius,width,5,160),material,0,y,0);object.rotation.x=Math.PI/2;return object;
  };
  ring(3.3,1.304,bronze,.006);
  ring(4.55,.018,bronze,.008);
  ring(8.6,.018,bronze,.007);

  // Laid stone joints and varied slabs remain actual geometry when circling.
  const slabs = [];
  for(let x=-9;x<=9;x++)for(let z=-9;z<=9;z++){
    const px=x*1.95,pz=z*1.95;
    if(Math.hypot(px,pz)<19.3)slabs.push([px,pz]);
  }
  const paving = new THREE.InstancedMesh(new THREE.BoxGeometry(1.925,.1,1.925),floorMaterial,slabs.length);
  const matrix = new THREE.Matrix4();
  for(let i=0;i<slabs.length;i++){
    const [x,z]=slabs[i];matrix.makeTranslation(x,-.05,z);paving.setMatrixAt(i,matrix);
    paving.setColorAt(i,new THREE.Color().setScalar(.72+random()*.28));
  }
  paving.receiveShadow=true;root.add(paving);
  const subfloor=mesh(new THREE.CircleGeometry(22,96),edgeStone,0,-.105,0);subfloor.rotation.x=-Math.PI/2;

  // Open circular architecture: light and landscape can be seen through every bay.
  const roof=mesh(new THREE.RingGeometry(8.5,16.3,96),concrete,0,8.55,0);roof.rotation.x=Math.PI/2;roof.material=concrete.clone();roof.material.side=THREE.DoubleSide;roof.castShadow=true;
  const outerDrum=mesh(new THREE.CylinderGeometry(15.55,15.55,1.35,96,1,true),concrete,0,7.9,0);outerDrum.material=concrete.clone();outerDrum.material.side=THREE.DoubleSide;
  for(const [radius,y] of [[8.5,8.5],[15.5,7.18],[15.5,8.58]]){
    const rail=ring(radius,y,edgeStone,.15);rail.castShadow=true;
  }
  const bayCount=18;
  for(let i=0;i<bayCount;i++){
    const a=i/bayCount*Math.PI*2;
    const column=mesh(new THREE.BoxGeometry(.62,7.4,.82),concrete,Math.sin(a)*14.7,3.7,Math.cos(a)*14.7);
    column.rotation.y=a;column.castShadow=true;
    const rib=mesh(new THREE.BoxGeometry(.24,.35,7.2),edgeStone,Math.sin(a)*12.1,8.3,Math.cos(a)*12.1);rib.rotation.y=a;rib.castShadow=true;
    const a2=(i+1)/bayCount*Math.PI*2;
    const start=new THREE.Vector3(Math.sin(a)*14.7,4.85,Math.cos(a)*14.7);
    const end=new THREE.Vector3(Math.sin(a2)*14.7,4.85,Math.cos(a2)*14.7);
    const middle=start.clone().lerp(end,.5);middle.y=7.25;
    const curve=new THREE.QuadraticBezierCurve3(start,middle,end);
    const arch=mesh(new THREE.TubeGeometry(curve,24,.26,6,false),concrete);arch.castShadow=true;
    // Restrained integrated architectural lighting, not a futuristic HUD.
    if(i%3===0){
      const strip=mesh(new THREE.BoxGeometry(.026,1.6,.032),new THREE.MeshBasicMaterial({color:'#d5b77a'}),Math.sin(a)*14.22,2.9,Math.cos(a)*14.22);strip.rotation.y=a;
    }
  }

  // Overcast sky with a bright warm break. A seamless procedural dome supports 360°.
  const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    uniforms:{time},
    vertexShader:'varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec3 vSky; uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec3 d=normalize(vSky);float h=max(d.y,0.0);vec2 p=d.xz/(.3+abs(d.y))*2.1+vec2(time*.0006,0.0);
      float clouds=noise(p)*.55+noise(p*2.1)*.27+noise(p*4.3)*.13;
      vec3 col=mix(vec3(.48,.54,.55),vec3(.17,.25,.31),pow(h,.65));col=mix(col,vec3(.7,.7,.65),smoothstep(.36,.72,clouds)*.76);
      float sun=pow(max(dot(d,normalize(vec3(-.7,.7,-.4))),0.0),20.0);col+=vec3(.28,.19,.08)*sun;gl_FragColor=vec4(col,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')
  });
  const sky=mesh(new THREE.SphereGeometry(110,48,24),skyMaterial);sky.renderOrder=-10;sky.receiveShadow=false;

  // Layered ridges give the open bays a landscape with parallax instead of a flat backdrop.
  for(let band=0;band<3;band++){
    const geometry=new THREE.CylinderGeometry(42+band*19,42+band*19,1,144,14,true);
    const positions=geometry.attributes.position,colors=[];
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i),a=Math.atan2(z,x),t=positions.getY(i)+.5;
      const ridge=7+band*4+Math.pow(Math.abs(Math.sin(a*3.0+band*1.3)),2)*10+Math.sin(a*9.0+band)*2.1+Math.sin(a*21.0)*.9;
      positions.setY(i,-4+t*ridge);
      const color=new THREE.Color().setRGB(.23+band*.035,.29+band*.035,.27+band*.045);
      if(t>.93&&ridge>18)color.lerp(new THREE.Color('#c6c9bd'),.5);
      colors.push(color.r,color.g,color.b);
    }
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
    distantRidges.push(mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,flatShading:true})));
  }

  // Sparse, moving atmospheric shafts under the open roof.
  const rayMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{time},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 vUv;uniform float time;void main(){float edge=pow(max(0.0,sin(vUv.x*3.14159)),2.0);float fade=sin(vUv.y*3.14159);float dust=.8+.2*sin(vUv.y*33.0+vUv.x*19.0-time*.12);gl_FragColor=vec4(vec3(1.0,.77,.43),edge*fade*dust*.032);}`});
  for(let i=0;i<3;i++){
    const ray=mesh(new THREE.CylinderGeometry(.4+i*.15,1.05+i*.3,10.5,24,1,true),rayMaterial,-4.5+i*1.3,5.0,-1.4+i*.35);
    ray.rotation.z=-.48;ray.rotation.x=.22;ray.receiveShadow=false;
  }

  // Ferns and grasses use instanced geometry, with anchored tips responding to wind.
  const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(.12,.22,0,.5);leafShape.quadraticCurveTo(-.12,.22,0,0);
  const leafGeometry=new THREE.ShapeGeometry(leafShape,5);
  const leafMaterial=new THREE.MeshStandardMaterial({color:'#314b29',roughness:.92,side:THREE.DoubleSide});
  leafMaterial.onBeforeCompile=shader=>{
    shader.uniforms.observatoryTime=time;
    shader.vertexShader='uniform float observatoryTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(observatoryTime*.9 + position.y*3.0 + instanceMatrix[3].x)*position.y*position.y*.055;');
  };
  const plants=[];
  for(let i=0;i<75;i++){
    const angle=random()*Math.PI*2;
    const radius=i<30?3.65+random()*.7:11.5+random()*3.7;
    const base=new THREE.Vector3(Math.sin(angle)*radius,.015,Math.cos(angle)*radius);
    for(let frond=0;frond<5;frond++){
      const direction=frond/5*Math.PI*2+random();
      const height=.35+random()*.45;
      for(let j=0;j<6;j++)for(const sign of [-1,1]){
        const t=(j+1)/7;
        plants.push({base,direction,height,t,sign});
      }
    }
  }
  const fernMesh=new THREE.InstancedMesh(leafGeometry,leafMaterial,plants.length);
  const dummy=new THREE.Object3D();
  for(let i=0;i<plants.length;i++){
    const {base,direction,height,t,sign}=plants[i];
    dummy.position.copy(base).add(new THREE.Vector3(Math.sin(direction)*t*.45,t*height,Math.cos(direction)*t*.45));
    dummy.rotation.set(-.7-t*.65,direction+sign*.75,sign*.7);
    dummy.scale.setScalar((1-t)*.55+.16);dummy.updateMatrix();fernMesh.setMatrixAt(i,dummy.matrix);
    fernMesh.setColorAt(i,new THREE.Color().setRGB(.65+random()*.3,.72+random()*.25,.55+random()*.25));
  }
  fernMesh.receiveShadow=true;root.add(fernMesh);

  // Rainwater in the perimeter paving, with the cool sky on its surface.
  const waterMaterial=new THREE.MeshPhysicalMaterial({color:'#56685f',roughness:.16,metalness:.48,transparent:true,opacity:.67,clearcoat:1});
  for(let i=0;i<9;i++){
    const a=i*.79,r=7.8+random()*4.5;
    const puddle=mesh(new THREE.CircleGeometry(1,40),waterMaterial,Math.sin(a)*r,.012,Math.cos(a)*r);
    puddle.rotation.x=-Math.PI/2;puddle.rotation.z=random()*Math.PI;puddle.scale.set(.55+random()*.9,.25+random()*.45,1);
  }

  const loader=new THREE.TextureLoader();
  const channels=['moloch','cheetah','cockroach','raven','gorilla'];
  const stationAngles=[-1.55,.7,1.95,3.3,4.35];
  for(let i=0;i<channels.length;i++){
    const a=stationAngles[i],station=new THREE.Group();station.position.set(Math.sin(a)*7.2,0,Math.cos(a)*7.2);station.rotation.y=a+Math.PI;root.add(station);
    mesh(new THREE.BoxGeometry(.45,.055,.38),black,0,.035,0,station);
    mesh(new THREE.BoxGeometry(.075,1.04,.08),black,0,.55,0,station);
    const panel=new THREE.Group();panel.position.y=1.12;panel.rotation.x=-.48;station.add(panel);
    mesh(new THREE.BoxGeometry(.92,.58,.055),black,0,0,0,panel);
    const image=loader.load('images/'+channels[i]+'.webp');image.colorSpace=THREE.SRGBColorSpace;textures.push(image);
    const display=mesh(new THREE.PlaneGeometry(.85,.51),new THREE.MeshBasicMaterial({map:image,toneMapped:false}),0,0,.031,panel);
    display.userData.href=channels[i]+'.html';screens.push(display);
  }
  const archive=new THREE.Group();archive.position.set(-7.6,2.8,-11.8);archive.rotation.y=.35;root.add(archive);
  mesh(new THREE.BoxGeometry(1.12,2.55,.1),black,0,0,0,archive);
  const archiveCanvas=document.createElement('canvas');archiveCanvas.width=256;archiveCanvas.height=640;
  const actx=archiveCanvas.getContext('2d');actx.fillStyle='#101a14';actx.fillRect(0,0,256,640);
  actx.strokeStyle='#7caa7c';actx.lineWidth=1;
  for(let i=0;i<24;i++){actx.globalAlpha=.15+random()*.4;actx.beginPath();actx.moveTo(25,45+i*23);actx.lineTo(60+random()*168,45+i*23);actx.stroke();}
  const archiveTexture=new THREE.CanvasTexture(archiveCanvas);archiveTexture.colorSpace=THREE.SRGBColorSpace;textures.push(archiveTexture);
  const archiveDisplay=mesh(new THREE.PlaneGeometry(1.02,2.45),new THREE.MeshBasicMaterial({map:archiveTexture,toneMapped:false}),0,0,.056,archive);
  archiveDisplay.userData.href='history.html';screens.push(archiveDisplay);

  // Quiet, articulated visitor silhouettes establish scale. Clothing remains dark.
  const coatColors=['#252d2a','#353b36','#34352f','#272e30'];
  function visitor(index,angle,radius,walking,direction=1){
    const group=new THREE.Group();root.add(group);
    const coat=new THREE.MeshStandardMaterial({color:coatColors[index],roughness:.95});
    const trousers=new THREE.MeshStandardMaterial({color:'#222723',roughness:1});
    const skin=new THREE.MeshStandardMaterial({color:'#615647',roughness:.95});
    const hair=new THREE.MeshStandardMaterial({color:index%2?'#302a23':'#45463e',roughness:1});
    const torso=mesh(new THREE.LatheGeometry([new THREE.Vector2(.16,0),new THREE.Vector2(.20,.05),new THREE.Vector2(.18,.45),new THREE.Vector2(.23,.61),new THREE.Vector2(.15,.70)],16),coat,0,.66,0,group);torso.scale.z=.7;torso.castShadow=true;
    const head=new THREE.Group();head.position.set(0,1.48,0);group.add(head);
    const face=mesh(new THREE.SphereGeometry(.12,16,12),skin,0,.09,0,head);face.scale.set(.82,1.17,.9);face.castShadow=true;
    const hairCap=mesh(new THREE.SphereGeometry(.121,16,10,0,Math.PI*2,0,Math.PI*.63),hair,0,.105,-.012,head);hairCap.scale.set(.85,1.17,.93);
    mesh(new THREE.CylinderGeometry(.048,.05,.11,10),skin,0,1.42,0,group);
    const legs=[],arms=[];
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(side*.105,.78,0);group.add(leg);legs.push(leg);
      mesh(new THREE.CapsuleGeometry(.065,.29,4,10),trousers,0,-.18,0,leg).castShadow=true;
      const shin=new THREE.Group();shin.position.y=-.37;leg.add(shin);leg.userData.shin=shin;
      mesh(new THREE.CapsuleGeometry(.05,.29,4,10),trousers,0,-.17,0,shin).castShadow=true;
      const foot=mesh(new THREE.CapsuleGeometry(.053,.12,4,10),black,0,-.35,.055,shin);foot.rotation.x=Math.PI/2;
      const arm=new THREE.Group();arm.position.set(side*.205,1.28,0);group.add(arm);arms.push(arm);
      mesh(new THREE.CapsuleGeometry(.05,.23,4,10),coat,side*.018,-.13,0,arm).castShadow=true;
      const forearm=mesh(new THREE.CapsuleGeometry(.04,.22,4,10),coat,side*.018,-.40,.035,arm);forearm.rotation.x=-.13;
      mesh(new THREE.SphereGeometry(.043,10,8),skin,side*.018,-.55,.055,arm).scale.y=1.3;
    }
    const scale=1.01+index*.025;group.scale.setScalar(scale);
    const item={group,torso,head,legs,arms,angle,radius,walking,direction,phase:index*2.4};visitors.push(item);return item;
  }
  // One discreet, back-turned observer gives the artwork its human scale.
  visitor(0,2.35,6.8,false).backTurned=true;

  const dustGeometry=new THREE.BufferGeometry(),dust=new Float32Array(180*3),original=[];
  for(let i=0;i<180;i++){dust[i*3]=(random()-.5)*20;dust[i*3+1]=random()*8;dust[i*3+2]=(random()-.5)*20;original.push(dust[i*3]);}
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dust,3));
  const points=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:'#e3d6ad',size:.011,transparent:true,opacity:.22,depthWrite:false}));root.add(points);

  function update(elapsed){
    const t=reduced.matches?0:elapsed;time.value=t;
    for(const v of visitors){
      const a=v.angle+(v.walking?t*.035*v.direction:0);
      v.group.position.set(Math.sin(a)*v.radius,0,Math.cos(a)*v.radius);
      v.group.rotation.y=v.backTurned?a:(v.walking?a+Math.PI/2*v.direction:a+Math.PI);
      const gait=v.walking&&!reduced.matches?t*2.65+v.phase:0;
      v.group.position.y=v.walking&&!reduced.matches?Math.abs(Math.sin(gait))*.012:0;
      for(let i=0;i<2;i++){
        const swing=Math.sin(gait+i*Math.PI);
        v.legs[i].rotation.x=v.walking?swing*.29:0;
        v.legs[i].userData.shin.rotation.x=v.walking?Math.max(0,-swing)*.30:0;
        v.arms[i].rotation.x=v.walking?-swing*.17:-.1;
      }
      v.head.rotation.y=Math.sin(t*.12+v.phase)*.1;
      v.torso.scale.x=1+Math.sin(t*.9+v.phase)*.003;
    }
    if(!reduced.matches){for(let i=0;i<180;i++)dust[i*3]=((original[i]+t*.035+10)%20)-10;dustGeometry.attributes.position.needsUpdate=true;}
  }
  update(0);
  return {root,podium,floorMaterial:podiumTopMaterial,screens,update,
    usePanorama(){sky.visible=false;for(const ridge of distantRidges)ridge.visible=false;},
    dispose(){for(const texture of textures)texture.dispose();root.traverse(object=>{object.geometry?.dispose();if(Array.isArray(object.material))object.material.forEach(m=>m.dispose());else object.material?.dispose();});}
  };
}
