/* Camp Counselor Reunion handbook: navigation state, in-view, lightbox. Vanilla JS, no globals. */
(function(){
  'use strict';
  var d=document;
  d.documentElement.classList.add('js');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NAMES=['A Letter From Your Hosts',"Who's Invited",'Remember Our Magic','Bring Your Gifts','The Shape of the Weekend','Getting Ready','Your Camp Captains','The Practical Bits','Book Now'];
  var $=function(s,r){return (r||d).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))};

  /* ---- in-view: add .is-inview once at 20% visible. Key moments and openers are watched even
     when a fragment forgets data-inview, so every pen mark and badge still draws on. ---- */
  var inviewEls=$$('[data-inview],.key-moment,.opener');
  if(!('IntersectionObserver' in window)||reduce){
    inviewEls.forEach(function(el){el.classList.add('is-inview')});
  }else{
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-inview');io.unobserve(e.target)}});
    },{threshold:0.2});
    inviewEls.forEach(function(el){io.observe(el)});
  }

  /* ---- current chapter: tabs, trail, phone bar, sheet ---- */
  var barCur=$('#barCur');
  var where='cover';
  function setCurrent(n){ /* n = 0 for cover/contents, else 1..9 */
    $$('.tab[data-ch]').forEach(function(t){
      if(+t.dataset.ch===n)t.setAttribute('aria-current','true');else t.removeAttribute('aria-current');
    });
    $$('.trail li').forEach(function(li){
      var c=+li.dataset.ch;
      li.classList.toggle('done',c<n);
      li.classList.toggle('now',c===n);
    });
    $$('.chsheet li').forEach(function(li,i){
      if(i+1===n)li.setAttribute('aria-current','true');else li.removeAttribute('aria-current');
    });
    if(barCur)barCur.textContent=n?(n+'. '+NAMES[n-1]):(where==='cover'?'The cover':'Contents');
  }
  var zones=$$('#cover,#contents,.glance,.chapter');
  if('IntersectionObserver' in window){
    var seen={};
    var co=new IntersectionObserver(function(es){
      es.forEach(function(e){seen[e.target.id]=e.isIntersecting});
      var cur=0;where='cover';
      zones.forEach(function(z){if(seen[z.id]){cur=z.dataset.chapter?+z.dataset.chapter:0;where=z.id==='cover'?'cover':'contents'}});
      setCurrent(cur);
    },{rootMargin:'-42% 0px -52% 0px',threshold:0});
    zones.forEach(function(z){co.observe(z)});
  }
  setCurrent(0);

  /* ---- phone chapters sheet ---- */
  var btn=$('#chBtn'),sheet=$('#chsheet'),lbl=$('#chBtnLabel');
  function toggleSheet(open){
    btn.setAttribute('aria-expanded',String(open));
    sheet.hidden=!open;
    lbl.textContent=open?'Close':'Chapters';
  }
  if(btn&&sheet){
    btn.addEventListener('click',function(){toggleSheet(sheet.hidden)});
    sheet.addEventListener('click',function(e){if(e.target.closest('a'))toggleSheet(false)});
    d.addEventListener('keydown',function(e){if(e.key==='Escape'&&!sheet.hidden){toggleSheet(false);btn.focus()}});
  }

  /* ---- memory collage lightbox ---- */
  var lb=$('#lightbox');
  if(lb&&typeof lb.showModal==='function'){
    var cap=$('#lightbox-cap');
    $$('.memory').forEach(function(m){
      m.addEventListener('click',function(){
        var box=$('.lightbox-img',lb);
        if(m.dataset.full){
          box.innerHTML='';var im=new Image();im.src=m.dataset.full;im.width=+m.dataset.w;im.height=+m.dataset.h;im.alt=m.dataset.alt||'';box.appendChild(im);box.removeAttribute('aria-hidden');
        }else{box.textContent='Photo';box.setAttribute('aria-hidden','true')}
        cap.textContent=m.dataset.caption;lb.showModal()});
    });
    $('#lightbox-x').addEventListener('click',function(){lb.close()});
    lb.addEventListener('click',function(e){if(e.target===lb)lb.close()});
  }
})();
