/* Runs before first paint: restores the theme and direction a person chose on
   an earlier page. A theme the host has already stamped on the root wins. */
(function(){var r=document.documentElement,t=null,d=null;
try{t=localStorage.getItem('nfccool.guideline.theme');d=localStorage.getItem('nfccool.guideline.dir');}catch(e){}
if(!r.getAttribute('data-theme')){r.setAttribute('data-theme',t||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));}
if(!r.getAttribute('dir')){r.setAttribute('dir',d||'ltr');}})();
