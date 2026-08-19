/* MOFURI. — main.js
 * Site-wide interactions: header scroll, drawer, current year */
(function(){
  'use strict';

  // Header scroll effect
  var hdr = document.querySelector('.mfr-header');
  if(hdr){
    var handleScroll = function(){
      hdr.classList.toggle('is-scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, {passive:true});
    handleScroll();
  }

  // Mobile drawer
  var burger = document.querySelector('.mfr-burger');
  var drawer = document.querySelector('.mfr-drawer');
  if(burger && drawer){
    var closeDrawer = function(){
      drawer.classList.remove('is-open');
      burger.setAttribute('aria-expanded','false');
      document.body.style.overflow='';
    };
    burger.addEventListener('click', function(){
      var open = drawer.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true':'false');
      document.body.style.overflow = open ? 'hidden':'';
    });
    drawer.addEventListener('click', function(e){
      if(e.target.tagName === 'A') closeDrawer();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });
  }

  // Current year in footer
  var yearEls = document.querySelectorAll('[data-year]');
  var y = new Date().getFullYear();
  yearEls.forEach(function(el){ el.textContent = y; });

})();
