(() => {
  "use strict";

  const CFG = window.SITE_CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const vnd = (n) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

  /* ---------------- Tracking (Meta Pixel / GA4) ---------------- */
  const track = (() => {
    const { metaPixelId, ga4Id } = CFG.tracking || {};
    if (metaPixelId) {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq("init", metaPixelId);
      window.fbq("track", "PageView");
      window.fbq("track", "ViewContent", { content_name: "CF13 Mischa Maisky" });
    }
    if (ga4Id) {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + ga4Id;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", ga4Id);
    }
    return (event, params = {}) => {
      if (window.fbq) {
        const std = { InitiateCheckout: 1, Lead: 1, Contact: 1, AddToCart: 1 };
        window.fbq(std[event] ? "track" : "trackCustom", event, params);
      }
      if (window.gtag) window.gtag("event", event, params);
    };
  })();

  // Keep UTM params for the whole visit so orders can be attributed to ad campaigns.
  const utm = (() => {
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];
    const params = new URLSearchParams(location.search);
    let stored = {};
    try { stored = JSON.parse(sessionStorage.getItem("cf13_utm") || "{}"); } catch (_) {}
    keys.forEach((k) => { if (params.get(k)) stored[k] = params.get(k); });
    try { sessionStorage.setItem("cf13_utm", JSON.stringify(stored)); } catch (_) {}
    return stored;
  })();

  /* ---------------- Contact links ---------------- */
  const { contact } = CFG;
  $$('[data-contact="tel"]').forEach((a) => { a.href = "tel:" + contact.hotline; });
  $$('[data-contact="zalo"]').forEach((a) => { a.href = contact.zalo; });
  $$("[data-contact-label]").forEach((a) => { a.textContent = contact.hotlineLabel; });
  if (contact.email) {
    $$('[data-contact="email"]').forEach((a) => { a.href = "mailto:" + contact.email; a.textContent = contact.email; });
    $$("[data-contact-email-wrap]").forEach((el) => { el.hidden = false; });
  }
  $$("[data-track]").forEach((el) =>
    el.addEventListener("click", () => {
      const name = el.dataset.track;
      track(name === "call" || name === "zalo" ? "Contact" : "cta_click", { placement: name });
    })
  );

  /* ---------------- Nav + sticky CTA ---------------- */
  const nav = $("#nav");
  const sticky = $("#stickyCta");
  const hero = $(".hero");
  const tickets = $("#tickets");
  let heroVisible = true;
  let ticketsVisible = false;
  const syncSticky = () => sticky.classList.toggle("is-visible", !heroVisible && !ticketsVisible);
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; syncSticky(); }, { threshold: 0.15 }).observe(hero);
  new IntersectionObserver(([e]) => { ticketsVisible = e.isIntersecting; syncSticky(); }, { threshold: 0.05 }).observe(tickets);
  const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 24);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  let motionVisible = true;
  const syncMotion = () => hero.classList.toggle('motion-paused', !motionVisible || document.hidden);
  new IntersectionObserver(([entry]) => { motionVisible = entry.isIntersecting; syncMotion(); }).observe(hero);
  document.addEventListener('visibilitychange', syncMotion);

  /* ---------------- Reveal on scroll ---------------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (el.closest(".hero") ? i * 90 : 0) + "ms";
    io.observe(el);
  });

  /* ---------------- Countdown ---------------- */
  const start = new Date(CFG.eventStart).getTime();
  const cd = Object.fromEntries($$("[data-cd]").map((el) => [el.dataset.cd, el]));
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    const diff = Math.max(0, start - Date.now());
    const s = Math.floor(diff / 1000);
    cd.d.textContent = pad(Math.floor(s / 86400));
    cd.h.textContent = pad(Math.floor((s % 86400) / 3600));
    cd.m.textContent = pad(Math.floor((s % 3600) / 60));
    cd.s.textContent = pad(s % 60);
    if (diff === 0) clearInterval(timer);
  };
  const timer = setInterval(tick, 1000);
  tick();

  /* ---------------- Journey carousel ---------------- */
  const journeyTrack = $("#journeyTrack");
  $$("[data-scroll]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const card = journeyTrack.querySelector(".season");
      const step = card ? card.getBoundingClientRect().width + 20 : 300;
      journeyTrack.scrollBy({ left: step * Number(btn.dataset.scroll) * 2, behavior: "smooth" });
    })
  );

  /* Informational seat map; booking continues on Orchestars. */
  const tiers = CFG.tiers;
  const svg = $('#seatmap');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, text) => { const n=document.createElementNS(NS,tag); Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); if(text)n.textContent=text; return n; };
  $('#tierList').innerHTML=tiers.map(t=>`<button type="button" class="tier" data-tier="${t.id}" aria-pressed="false" aria-controls="seatmap"><span class="tier__dot" style="background:${t.color}"></span><span><span class="tier__name">${t.name}</span><span class="tier__area">${t.area}</span></span><span class="tier__price">${vnd(t.price)}</span></button>`).join('');
  $('#legend').innerHTML=tiers.map(t=>`<li><i style="background:${t.color}"></i>${t.name}</li>`).join('');
  svg.setAttribute('viewBox','0 90 640 435');
  svg.setAttribute('aria-label','Sơ đồ tham khảo hai tầng khán phòng');
  function seatTier(row,n){const r=row.label;if(row.floor===2)return ['A','B'].includes(r)&&n>=9?'upper':['AA','BB','CC','A','B','C','D'].includes(r)?'standard':'economy';return ['A','B','C','D','E','F','G'].includes(r)?'vvip':['H','I'].includes(r)?'locked':['T','U'].includes(r)?'premium2':r==='K'||(['L','M'].includes(r)&&n>=13)||(['N','P'].includes(r)&&n>=11)?'vip':'premium1';}
  const floorRows={1:0,2:0};
  window.EVENT_SEAT_ROWS.forEach(row=>{
    const index=floorRows[row.floor]++, radius=row.floor===1?180+index*8:390+index*9;
    let cells=[...row.cells];
    if(row.floor===1&&index<9){cells=cells.filter(Boolean);cells=[...Array(Math.floor((33-cells.length)/2)).fill(null),...cells];}
    if(row.floor===2)cells=Array.from({length:33},(_,i)=>row.cells.find(n=>(n%2?(n-1)/2:33-n/2)===i)||null);
    cells.forEach((n,i)=>{
      if(!n)return;
      const angle=(42+96*(i+(row.floor===1&&index>=9?1:0)+.5)/33)*Math.PI/180;
      const id=seatTier(row,n), tier=tiers.find(t=>t.id===id);
      const dot=el('circle',{cx:320+Math.cos(angle)*radius*(row.floor===1?.95:.82),cy:32+Math.sin(angle)*radius*.94,r:row.floor===1?3.4:3.1,fill:tier?tier.color:'#686868',class:'seat-dot','data-tier':id,'data-location':`Tầng ${row.floor} · Hàng ${row.label} · Ghế ${n}`});
      dot.append(el('title',{},`${dot.dataset.location} · ${tier?tier.name:'Không mở bán'}`));svg.append(dot);
    });
  });
  svg.append(el('text',{x:320,y:170,'text-anchor':'middle',class:'floor-label'},'TẦNG 1'),el('text',{x:320,y:380,'text-anchor':'middle',class:'floor-label'},'TẦNG 2'));
  function selectTier(id, location=''){
    const tier=tiers.find(t=>t.id===id);
    $$('#tierList .tier').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tier===id)));
    $$('.seat-dot').forEach(d=>d.classList.toggle('is-active',d.dataset.tier===id));
    svg.classList.add('has-selection');
    $('#mapSelection').textContent=(tier?`${tier.name} · ${vnd(tier.price)}${tier.invitation?' · Vé mời':''}`:'Không mở bán')+(location?' · '+location:'');
  }
  $$('#tierList .tier').forEach(b=>b.addEventListener('click',()=>selectTier(b.dataset.tier)));
  svg.addEventListener('click',event=>{
    const point=svg.createSVGPoint(); point.x=event.clientX;point.y=event.clientY;
    const local=point.matrixTransform(svg.getScreenCTM().inverse());
    let nearest=null,distance=12;
    $$('.seat-dot').forEach(dot=>{const d=Math.hypot(local.x-Number(dot.getAttribute('cx')),local.y-Number(dot.getAttribute('cy')));if(d<distance){distance=d;nearest=dot;}});
    if(nearest)selectTier(nearest.dataset.tier,nearest.dataset.location);
  });
  selectTier('vip');
})();
