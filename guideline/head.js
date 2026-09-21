/* Runs before first paint: restores the reading direction a person chose on an
   earlier page. The theme is src/theme.js's job, inlined just above this. */
(function(){var r=document.documentElement,d=null;
try{d=localStorage.getItem('nfccool.guideline.dir');}catch(e){}
if(!r.getAttribute('dir')){r.setAttribute('dir',d||'ltr');}})();
