/* MOFURI. — video-loader.js
 * Lazy-loads <video> elements with data-src-mp4 / data-src-webm attrs
 * via IntersectionObserver. Respects prefers-reduced-motion.
 * Fallback: poster image stays visible on load failure. */
(function(){
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var loadVideo = function(video){
    if(video.dataset.loaded) return;
    video.dataset.loaded = '1';

    var mp4 = video.dataset.srcMp4;
    var webm = video.dataset.srcWebm;

    // Skip actual loading if no sources or reduced motion
    if(reduce || (!mp4 && !webm)){
      // Poster remains visible; do not swap
      return;
    }

    // Insert <source> tags dynamically
    if(webm){
      var s1 = document.createElement('source');
      s1.src = webm;
      s1.type = 'video/webm';
      video.appendChild(s1);
    }
    if(mp4){
      var s2 = document.createElement('source');
      s2.src = mp4;
      s2.type = 'video/mp4';
      video.appendChild(s2);
    }

    video.addEventListener('error', function(){
      // Silent fallback: poster remains
      console.warn('[MOFURI] Video failed to load, keeping poster:', mp4 || webm);
    });

    video.load();
    var playPromise = video.play();
    if(playPromise !== undefined){
      playPromise.catch(function(){
        // Autoplay blocked → poster remains
      });
    }
  };

  if(!('IntersectionObserver' in window)){
    document.querySelectorAll('video[data-src-mp4],video[data-src-webm]').forEach(loadVideo);
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        loadVideo(entry.target);
        io.unobserve(entry.target);
      }
    });
  },{
    rootMargin: '200px 0px',
    threshold: 0.01
  });

  var init = function(){
    document.querySelectorAll('video[data-src-mp4],video[data-src-webm]').forEach(function(video){
      // Hero video loads immediately (already in view)
      if(video.hasAttribute('data-eager')){
        loadVideo(video);
      } else {
        io.observe(video);
      }
    });
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
