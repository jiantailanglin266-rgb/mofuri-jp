/* MOFURI. — reveal.js
 * Scroll-linked reveal (blur → sharp, stagger, cinematic)
 * Auto-observes .mfr-reveal and .mfr-reveal--stagger */
(function(){
  'use strict';

  if(!('IntersectionObserver' in window)){
    // Fallback: reveal everything immediately
    document.querySelectorAll('.mfr-reveal').forEach(function(el){
      el.classList.add('is-visible');
    });
    return;
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){
    document.querySelectorAll('.mfr-reveal').forEach(function(el){
      el.classList.add('is-visible');
    });
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  },{
    threshold: 0.15,
    rootMargin: '0px 0px -80px 0px'
  });

  var init = function(){
    document.querySelectorAll('.mfr-reveal').forEach(function(el){
      io.observe(el);
    });
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
