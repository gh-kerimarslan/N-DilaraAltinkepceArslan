/* ALARM R04: restrained image-mesh idle; independent of the observation feed. */
(() => {
  'use strict';
  const host=document.querySelector('.specimen-media'),screen=document.querySelector('.terminal-screen');
  if(!host||!screen)return;
  const img=host.querySelector('img'),button=document.querySelector('[data-motion-toggle]');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduce.matches,raf=0,last=0,elapsed=0,gl=null,contextLost=false,draw=null;
  const types={gorilla:0,cheetah:1,moloch:2,raven:3,cockroach:4};
  function sync(){
    const en=document.documentElement.lang==='en';
    screen.dataset.motion=paused?'paused':'playing';
    button.textContent=en?(paused?'MOTION: OFF':'MOTION: ON'):(paused?'HAREKET: KAPALI':'HAREKET: AÇIK');
    button.setAttribute('aria-pressed',String(!paused));
    const label=document.querySelector('[data-idle-label]');
    if(label)label.textContent=en?(paused?'IDLE / PAUSED':'IDLE / ACTIVE'):(paused?'BEKLEME / DURDU':'BEKLEME / AKTİF');
  }
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
  function step(stamp){
    raf=0;if(document.hidden||paused||contextLost)return;
    if(!last)last=stamp;
    const delta=stamp-last;
    if(delta>=33){elapsed+=Math.min(delta,100)/1000;last=stamp;draw?.(elapsed);}
    raf=requestAnimationFrame(step);
  }
  function start(){if(draw&&!paused&&!document.hidden&&!contextLost&&!raf)raf=requestAnimationFrame(step);}
  button.addEventListener('click',()=>{paused=!paused;sync();if(paused)stop();else start();});
  reduce.addEventListener('change',()=>{paused=reduce.matches;sync();if(paused)stop();else start();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  function canvasIdle(){
    // A software mesh keeps localized idle motion available without WebGL.
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas unavailable');
    const source=document.createElement('canvas');source.width=960;source.height=640;
    const paint=source.getContext('2d',{willReadFrequently:true});paint.drawImage(img,0,0,960,640);
    const pixels=paint.getImageData(0,0,960,640),data=pixels.data;
    for(let i=0;i<data.length;i+=4){let l=Math.max(data[i],data[i+1],data[i+2])/255;l=Math.max(0,Math.min(1,(l-.008)/.992));l=l*l*(3-2*l);data[i]=104*l;data[i+1]=255*l;data[i+2]=148*l;data[i+3]=255;}paint.putImageData(pixels,0,0);
    const nx=20,ny=14,kind=types[screen.dataset.channel];
    const zone=(x,y,cx,cy,sx,sy)=>Math.exp(-2*(((x-cx)/sx)**2+((y-cy)/sy)**2));
    const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    function point(x,y,t){const ox=x,oy=y,b=Math.sin(t*.64),q=Math.sin(t*.39+1.8),g=1-smooth((y-.69)/.15),amp=screen.dataset.state==='alarm'?1.5:screen.dataset.state==='watch'?1.25:1;
      if(kind===0){y-=.0055*b*zone(ox,oy,.58,.46,.28,.27)*g*amp;x+=.002*q*zone(ox,oy,.64,.28,.14,.18)*g;}
      if(kind===1){y-=.005*b*zone(ox,oy,.56,.48,.30,.20)*g*amp;x+=.004*q*zone(ox,oy,.18,.64,.17,.20);y+=.004*Math.sin(t*.47)*zone(ox,oy,.16,.62,.16,.16);x+=.0018*Math.sin(t*.25)*zone(ox,oy,.77,.27,.13,.15);}
      if(kind===2){x+=.006*Math.sin(t*.37)*zone(ox,oy,.23,.30,.15,.30);y-=.0035*b*zone(ox,oy,.58,.59,.32,.16)*g;}
      if(kind===3){const turn=.012*Math.sin(t*.31)*zone(ox,oy,.65,.25,.23,.19);x+=-(oy-.40)*turn+.0028*b*zone(ox,oy,.50,.52,.23,.25)*g;y+=(ox-.61)*turn-.003*b*zone(ox,oy,.50,.49,.20,.24)*g;}
      if(kind===4){y+=.004*Math.sin(t*.72)*zone(ox,oy,.39,.36,.25,.15);x+=.0045*Math.sin(t*.91+.7)*zone(ox,oy,.80,.30,.16,.20);y-=.0025*b*zone(ox,oy,.48,.57,.25,.16)*g;}
      return [x*canvas.width,y*canvas.height];
    }
    function triangle(s0,s1,s2,d0,d1,d2){
      const ax=s1[0]-s0[0],ay=s1[1]-s0[1],bx=s2[0]-s0[0],by=s2[1]-s0[1],den=ax*by-bx*ay;
      const ux=d1[0]-d0[0],uy=d1[1]-d0[1],vx=d2[0]-d0[0],vy=d2[1]-d0[1];
      const a=(ux*by-vx*ay)/den,b=(uy*by-vy*ay)/den,c=(vx*ax-ux*bx)/den,d=(vy*ax-uy*bx)/den;
      ctx.save();ctx.beginPath();ctx.moveTo(...d0);ctx.lineTo(...d1);ctx.lineTo(...d2);ctx.closePath();ctx.clip();ctx.setTransform(a,b,c,d,d0[0]-a*s0[0]-c*s0[1],d0[1]-b*s0[0]-d*s0[1]);ctx.drawImage(source,0,0);ctx.restore();
    }
    draw=t=>{const width=Math.max(1,Math.round(Math.min(host.clientWidth,960)));if(canvas.width!==width){canvas.width=width;canvas.height=Math.round(width*2/3);}ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
      const grid=[];for(let y=0;y<=ny;y++){const row=[];for(let x=0;x<=nx;x++)row.push(point(x/nx,y/ny,t));grid.push(row);}
      for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=[x/nx*960,y/ny*640],b=[(x+1)/nx*960,y/ny*640],c=[x/nx*960,(y+1)/ny*640],d=[(x+1)/nx*960,(y+1)/ny*640];triangle(a,b,c,grid[y][x],grid[y][x+1],grid[y+1][x]);triangle(b,d,c,grid[y][x+1],grid[y+1][x+1],grid[y+1][x]);}
    };
    host.append(canvas);draw(0);host.classList.add('is-rendered');host.dataset.renderer='canvas2d';sync();start();new ResizeObserver(()=>draw?.(elapsed)).observe(host);
  }
  function fallback(){host.classList.remove('is-rendered');try{canvasIdle();}catch{host.classList.add('is-fallback');sync();}}
  const vertex=`
    attribute vec2 a_uv;
    varying vec2 v_uv;
    uniform float u_time;
    uniform float u_type;
    uniform float u_level;
    float zone(vec2 p,vec2 center,vec2 spread){vec2 d=(p-center)/spread;return exp(-dot(d,d)*2.0);}
    void main(){
      vec2 p=a_uv;
      float t=u_time;
      float b=sin(t*.64);
      float q=sin(t*.39+1.8);
      float amp=1.0+u_level*.25;
      // All masks fade before contact points; feet stay on the same baseline.
      float grounded=1.0-smoothstep(.69,.84,p.y);
      if(u_type<.5){
        float chest=zone(p,vec2(.58,.46),vec2(.28,.27));
        p.y-=.0055*b*chest*grounded*amp;
        p.x+=.0020*q*zone(p,vec2(.64,.28),vec2(.14,.18))*grounded;
      }else if(u_type<1.5){
        float body=zone(p,vec2(.56,.48),vec2(.30,.20));
        p.y-=.005*b*body*grounded*amp;
        p.x+=.004*q*zone(p,vec2(.18,.64),vec2(.17,.20));
        p.y+=.004*sin(t*.47)*zone(p,vec2(.16,.62),vec2(.16,.16));
        p.x+=.0018*sin(t*.25)*zone(p,vec2(.77,.27),vec2(.13,.15));
      }else if(u_type<2.5){
        p.x+=.006*sin(t*.37)*zone(p,vec2(.23,.30),vec2(.15,.30));
        p.y-=.0035*b*zone(p,vec2(.58,.59),vec2(.32,.16))*grounded;
      }else if(u_type<3.5){
        float h=zone(p,vec2(.65,.25),vec2(.23,.19));
        float turn=.012*sin(t*.31)*h;
        vec2 pivot=vec2(.61,.40);vec2 d=p-pivot;
        p+=vec2(-d.y,d.x)*turn;
        p.x+=.0028*b*zone(p,vec2(.50,.52),vec2(.23,.25))*grounded;
        p.y-=.003*b*zone(p,vec2(.50,.49),vec2(.20,.24))*grounded;
      }else{
        p.y+=.004*sin(t*.72)*zone(p,vec2(.39,.36),vec2(.25,.15));
        p.x+=.0045*sin(t*.91+.7)*zone(p,vec2(.80,.30),vec2(.16,.20));
        p.y-=.0025*b*zone(p,vec2(.48,.57),vec2(.25,.16))*grounded;
      }
      v_uv=a_uv;gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);
    }`;
  const fragment=`
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_image;
    void main(){
      vec3 raw=texture2D(u_image,v_uv).rgb;
      // A shared phosphor maps every source to one hue and luminance response.
      float lum=max(raw.r,max(raw.g,raw.b));
      lum=smoothstep(.008,1.0,lum);
      gl_FragColor=vec4(vec3(.408,1.0,.580)*lum,1.0);
    }`;
  function init(){
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
    try{
      gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power',preserveDrawingBuffer:false});
      if(!gl)throw new Error('WebGL unavailable');
      function shader(kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
      const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Shader link failed');
      gl.useProgram(program);
      const points=[],nx=72,ny=48;
      for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
        const a=x/nx,b=y/ny,c=(x+1)/nx,d=(y+1)/ny;
        points.push(a,b,c,b,a,d,c,b,c,d,a,d);
      }
      const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
      const attr=gl.getAttribLocation(program,'a_uv');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.uniform1i(gl.getUniformLocation(program,'u_image'),0);gl.uniform1f(gl.getUniformLocation(program,'u_type'),types[screen.dataset.channel]);
      const time=gl.getUniformLocation(program,'u_time'),level=gl.getUniformLocation(program,'u_level');
      draw=t=>{if(contextLost)return;const width=Math.max(1,Math.round(Math.min(host.clientWidth*1.5,1536)));const height=Math.round(width*2/3);if(canvas.width!==width){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(time,t);gl.uniform1f(level,screen.dataset.state==='alarm'?2:screen.dataset.state==='watch'?1:0);gl.drawArrays(gl.TRIANGLES,0,points.length/2);};
      host.append(canvas);draw(0);host.classList.add('is-rendered');host.dataset.renderer='webgl';sync();start();
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;stop();fallback();});
      canvas.addEventListener('webglcontextrestored',()=>{canvas.remove();contextLost=false;draw=null;init();});
      new ResizeObserver(()=>draw?.(elapsed)).observe(host);
    }catch{canvas.remove();fallback();}
  }
  sync();if(img.complete&&img.naturalWidth)init();else{img.addEventListener('load',init,{once:true});img.addEventListener('error',fallback,{once:true});}
})();
