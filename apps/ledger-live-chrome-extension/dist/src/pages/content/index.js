const u="modulepreload",m=function(o){return"/"+o},i={},d=function(r,s,f){return!s||s.length===0?r():Promise.all(s.map(e=>{if(e=m(e),e in i)return;i[e]=!0;const n=e.endsWith(".css"),c=n?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${e}"]${c}`))return;const t=document.createElement("link");if(t.rel=n?"stylesheet":u,n||(t.as="script",t.crossOrigin=""),t.href=e,document.head.appendChild(t),n)return new Promise((l,a)=>{t.addEventListener("load",l),t.addEventListener("error",()=>a(new Error(`Unable to preload CSS for ${e}`)))})})).then(()=>r())};console.log("content loaded");d(()=>{(r=>import(r))("../../../assets/js/index.7caeb323.js")},[]);
