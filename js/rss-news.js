/* MOFURI. — rss-news.js
 * Google News RSS fetcher (Japanese)
 * Populates #mfr-journal-feed with N latest items */
(function(){
  'use strict';

  var CFG = {
    MAX: 3,
    FEEDS: [
      { url:'https://news.google.com/rss/search?q=%E7%8A%AC+%E7%8C%AB+%E5%81%A5%E5%BA%B7&hl=ja&gl=JP&ceid=JP:ja', label:'HEALTH' },
      { url:'https://news.google.com/rss/search?q=%E7%8D%A3%E5%8C%BB%E5%B8%AB+%E3%83%9A%E3%83%83%E3%83%88&hl=ja&gl=JP&ceid=JP:ja', label:'VET' },
      { url:'https://news.google.com/rss/search?q=%E3%83%9A%E3%83%83%E3%83%88+%E6%9C%80%E6%96%B0&hl=ja&gl=JP&ceid=JP:ja', label:'NEWS' }
    ],
    RSS2JSON:'https://api.rss2json.com/v1/api.json?count=5&rss_url='
  };

  var FALLBACK = [
    { title:'犬猫の腸内環境ケアが免疫を左右する', desc:'乳酸菌や食物繊維を意識した食生活が推奨されています。', date:'', label:'HEALTH', link:'#' },
    { title:'獣医師が解説するデンタルケア習慣化のコツ', desc:'毎日のブラッシングが理想。週3回から始めましょう。', date:'', label:'VET', link:'#' },
    { title:'ペット向けサプリメント市場、2026年も拡大傾向', desc:'健康志向の高まりで継続的な成長が見込まれる。', date:'', label:'NEWS', link:'#' }
  ];

  function stripHtml(s){return (s||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim()}
  function fmtDate(s){try{var d=new Date(s);if(isNaN(d.getTime()))return '';return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')}catch(e){return ''}}
  function cleanSummary(t){
    if(!t) return '';
    var s = String(t).replace(/\s+-\s+[^\s]+(?:\s+[^\s]+)*$/,'').replace(/\s+/g,' ').trim();
    if(s.length>90){s = s.slice(0,90) + '…'}
    return s;
  }
  function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

  async function fetchFeed(feed){
    try{
      var r = await fetch(CFG.RSS2JSON + encodeURIComponent(feed.url),{signal:AbortSignal.timeout?AbortSignal.timeout(9000):undefined});
      if(!r.ok) throw new Error('HTTP '+r.status);
      var d = await r.json();
      if(d.status === 'ok' && d.items){
        return d.items.map(function(it){
          var raw = stripHtml(it.title||'');
          var m = raw.match(/^(.+?)\s+-\s+([^-]+?)$/);
          if(m) raw = m[1].trim();
          return {
            title: raw,
            desc: cleanSummary(stripHtml(it.description||it.content||'')),
            date: fmtDate(it.pubDate),
            label: feed.label,
            link: it.link || '#'
          };
        });
      }
    }catch(e){console.warn('[MOFURI RSS] Failed:', feed.label, e.message)}
    return [];
  }

  function render(items){
    var el = document.getElementById('mfr-journal-feed');
    if(!el) return;
    el.innerHTML = items.slice(0, CFG.MAX).map(function(it){
      return '<a class="mfr-journal-item" href="'+esc(it.link)+'" target="_blank" rel="noopener">'
        +'<div class="mfr-journal-item__meta">'
          +'<span class="mfr-journal-item__label">'+esc(it.label)+'</span>'
          +(it.date ? '<span class="mfr-journal-item__date">'+esc(it.date)+'</span>' : '')
        +'</div>'
        +'<h3 class="mfr-journal-item__title">'+esc(it.title)+'</h3>'
        +'<p class="mfr-journal-item__desc">'+esc(it.desc)+'</p>'
        +'<span class="mfr-journal-item__more">READ MORE →</span>'
      +'</a>';
    }).join('');
  }

  async function init(){
    var el = document.getElementById('mfr-journal-feed');
    if(!el) return;
    try{
      var results = await Promise.allSettled(CFG.FEEDS.map(fetchFeed));
      var all = [];
      results.forEach(function(r){if(r.status==='fulfilled') all = all.concat(r.value)});
      all.sort(function(a,b){return new Date(b.date||0) - new Date(a.date||0)});
      // dedupe
      var seen = new Set(), unique = [];
      all.forEach(function(it){var k=(it.title||'').slice(0,50);if(!seen.has(k)){seen.add(k);unique.push(it)}});
      render(unique.length ? unique : FALLBACK);
    }catch(e){
      render(FALLBACK);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
