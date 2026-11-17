(() => {
  'use strict';
  const links = [...document.querySelectorAll('a[data-lightbox]')];
  if (!links.length) return;
  const dialog = document.createElement('dialog'); dialog.className = 'lightbox-dialog'; dialog.setAttribute('aria-label','Artwork image viewer');
  const image = document.createElement('img'); const caption = document.createElement('p'); caption.className='lightbox-caption';
  function button(text, label, name) { const b=document.createElement('button'); b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.className=name;dialog.append(b);return b; }
  const close=button('×','Close image viewer','lightbox-close');const prev=button('←','Previous image','lightbox-prev');const next=button('→','Next image','lightbox-next');dialog.append(image,caption);document.body.append(dialog);
  let group=[],index=0,trigger=null;
  function update() { const a=group[index]; const url=new URL(a.href,location.href);if(url.origin!==location.origin || !/\.(jpg|jpeg|png|webp)$/i.test(url.pathname))return;image.src=url.href;image.alt=a.querySelector('img')?.alt || 'Artwork by Dilara Altınkepçe Arslan';caption.textContent=`${image.alt} · ${index+1} / ${group.length}`;prev.hidden=next.hidden=group.length<2; }
  function step(n) {index=(index+n+group.length)%group.length;update();}
  links.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();trigger=a;group=links.filter(x=>x.dataset.lightbox===a.dataset.lightbox);index=group.indexOf(a);update();dialog.showModal();document.documentElement.style.overflow='hidden';}));
  close.addEventListener('click',()=>dialog.close());prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{document.documentElement.style.overflow='';image.removeAttribute('src');trigger?.focus();});
  dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();step(1);}if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}});
  let touchX=0;image.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].screenX;},{passive:true});image.addEventListener('touchend',e=>{const delta=e.changedTouches[0].screenX-touchX;if(Math.abs(delta)>60)step(delta<0?1:-1);},{passive:true});
})();
