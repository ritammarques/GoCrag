// js/app.js — GoCrag SPA v2.1

const CFG = { weatherKey:'OPENWEATHER_API_KEY', mapCenter:[39.4,-8.2], mapZoom:7 };

/* ── State ────────────────────────────────────── */
const State = {
  screen:'loading', user:null,
  weather:{}, conditions:{},
  map:null, clusterGroup:null, userMarker:null,
  userLat:null, userLng:null, theme:'light',
  filters:{ condition:null, rock:null, grade:null, shadow:false, maxDist:50 },
  activeSpot:null, activeSector:null, activeChallenge:null,
  searchQuery:'', searchTab:'spots',
};

/* ── Auth ─────────────────────────────────────── */
const Auth = {
  load(){ try{ State.user=JSON.parse(localStorage.getItem('gc_user')); }catch{} },
  save(){ localStorage.setItem('gc_user',JSON.stringify(State.user)); },
  login(email,pw){
    if(!email||pw.length<6) return {ok:false,err:'Invalid email or password (min. 6 characters).'};
    const stored=localStorage.getItem('gc_reg_'+email);
    if(stored){ const u=JSON.parse(stored); if(u.password!==pw) return {ok:false,err:'Incorrect password.'}; State.user=u; }
    else { State.user={id:'u'+Date.now(),name:email.split('@')[0],email,password:pw,favorites:[],completed:[],joined:new Date().toISOString(),addedSpots:[]}; localStorage.setItem('gc_reg_'+email,JSON.stringify(State.user)); }
    Auth.save(); return {ok:true};
  },
  register(name,email,pw){
    if(!name||!email||pw.length<6) return {ok:false,err:'Fill all fields (password min. 6 characters).'};
    State.user={id:'u'+Date.now(),name,email,password:pw,favorites:[],completed:[],joined:new Date().toISOString(),addedSpots:[]};
    localStorage.setItem('gc_reg_'+email,JSON.stringify(State.user));
    Auth.save(); return {ok:true};
  },
  logout(){ State.user=null; localStorage.removeItem('gc_user'); },
  toggleFav(id){ if(!State.user)return; const f=State.user.favorites,i=f.indexOf(id); if(i===-1)f.push(id);else f.splice(i,1); Auth.save(); return i===-1; },
  isFav(id){ return State.user?.favorites?.includes(id)??false; },
  toggleDone(id){ if(!State.user)return false; const d=State.user.completed,i=d.indexOf(id); if(i===-1)d.push(id);else d.splice(i,1); Auth.save(); return i===-1; },
  isDone(id){ return State.user?.completed?.includes(id)??false; },
};

/* ── Weather ──────────────────────────────────── */
const WX = {
  cache:{},
  async get(lat,lng){
    const k=`${lat.toFixed(2)},${lng.toFixed(2)}`;
    if(this.cache[k]&&Date.now()-this.cache[k].ts<1800000) return this.cache[k].d;
    try{ const s=JSON.parse(localStorage.getItem('wx_'+k)); if(s&&Date.now()-s.ts<3600000) return s.d; }catch{}
    if(CFG.weatherKey==='OPENWEATHER_API_KEY') return this.mock(lat,lng);
    try{
      const r=await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${CFG.weatherKey}&units=metric&lang=en`);
      if(!r.ok) return this.mock(lat,lng);
      const j=await r.json();
      const d={temp:Math.round(j.main.temp),humidity:j.main.humidity,wind:Math.round((j.wind?.speed||0)*3.6),rain:j.rain?.['1h']||0,desc:j.weather[0]?.description||'',icon:j.weather[0]?.icon||'01d'};
      this.cache[k]={d,ts:Date.now()}; try{localStorage.setItem('wx_'+k,JSON.stringify({d,ts:Date.now()}));}catch{} return d;
    }catch{ return this.mock(lat,lng); }
  },
  mock(lat,lng){ const s=Math.abs(Math.round(lat*100+lng*100))%50; return {temp:12+(s%18),humidity:40+(s%45),wind:5+(s%30),rain:s%7===0?2.5:s%4===0?0.4:0,desc:s%7===0?'light rain':'clear sky',icon:s%7===0?'10d':'01d',mock:true}; },
  score(w){
    let s=100; const r=[];
    if(w.rain>2){s-=60;r.push('Heavy rain');}else if(w.rain>0){s-=35;r.push('Light rain');}
    if(w.humidity>85){s-=20;r.push('Very humid');}else if(w.humidity>70){s-=10;}
    if(w.temp<5||w.temp>35){s-=20;r.push(w.temp<5?'Very cold':'Very hot');}else if(w.temp<10||w.temp>30){s-=8;}
    if(w.wind>40){s-=20;r.push('Strong wind');}else if(w.wind>25){s-=10;}
    s=Math.max(0,Math.round(s));
    const st=s>=70?'good':s>=40?'ok':'bad';
    return {score:s,status:st,label:{good:'Good',ok:'Fair',bad:'Poor'}[st],emoji:{good:'☀️',ok:'⛅',bad:'🌧️'}[st],reasons:r.length?r:['Ideal conditions']};
  },
};

/* ── Map ──────────────────────────────────────── */
const MapCtrl = {
  init(){
    if(State.map){State.map.remove();State.map=null;}
    State.map=L.map('map',{zoomControl:true}).setView(CFG.mapCenter,CFG.mapZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a>',maxZoom:19}).addTo(State.map);
    State.clusterGroup=L.markerClusterGroup({disableClusteringAtZoom:13,maxClusterRadius:60,spiderfyOnMaxZoom:true,
      iconCreateFunction(c){return L.divIcon({html:`<div class="mc-outer"><div class="mc-inner">${c.getChildCount()}</div></div>`,className:'',iconSize:[44,44],iconAnchor:[22,22]});}});
    State.clusterGroup.addTo(State.map);
  },
  render(){
    if(!State.clusterGroup)return;
    State.clusterGroup.clearLayers();
    this.filtered().forEach(spot=>{
      const s=State.conditions[spot.id]?.status||'ok';
      const icon=L.divIcon({html:`<div class="spot-pin ${s} ${spot.id===State.activeSpot?'selected':''}"></div>`,className:'',iconSize:[22,22],iconAnchor:[11,11]});
      L.marker([spot.lat,spot.lng],{icon}).bindTooltip(spot.name,{direction:'top',offset:[0,-14]}).on('click',()=>UI.openSpot(spot.id)).addTo(State.clusterGroup);
    });
  },
  filtered(){
    let spots=[...DB.spots];
    // Add user-added spots from localStorage
    try{ const ua=JSON.parse(localStorage.getItem('gc_user_spots')||'[]'); spots=[...spots,...ua]; }catch{}
    const f=State.filters;
    if(f.condition) spots=spots.filter(s=>(State.conditions[s.id]?.status||'ok')===f.condition);
    if(f.rock)      spots=spots.filter(s=>s.rock===f.rock);
    if(f.shadow)    spots=spots.filter(s=>(s.tags||[]).includes('sombra'));
    if(f.maxDist<50&&State.userLat) spots=spots.filter(s=>Geo.dist(State.userLat,State.userLng,s.lat,s.lng)<=f.maxDist);
    return spots;
  },
  setUser(lat,lng){
    if(!State.map)return;
    if(State.userMarker)State.userMarker.remove();
    State.userMarker=L.marker([lat,lng],{icon:L.divIcon({html:'<div class="user-pin"></div>',className:'',iconSize:[16,16],iconAnchor:[8,8]}),zIndexOffset:1000}).bindTooltip('Your position',{direction:'top'}).addTo(State.map);
    State.map.setView([lat,lng],10,{animate:true});
  },
  flyTo(lat,lng,z=14){if(State.map)State.map.flyTo([lat,lng],z,{duration:.8});},
  invalidate(){if(State.map)setTimeout(()=>State.map.invalidateSize(),120);},
};

/* ── Geo ──────────────────────────────────────── */
const Geo={
  dist(a,b,c,d){const R=6371,dL=(c-a)*Math.PI/180,dG=(d-b)*Math.PI/180;const x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));},
  fmt(d){return d<1?`${Math.round(d*1000)} m`:`${d.toFixed(1)} km`;},
  locate(cb){if(!navigator.geolocation)return cb(null);navigator.geolocation.getCurrentPosition(p=>cb(p.coords),()=>cb(null),{timeout:8000});},
};

/* ── Utils ────────────────────────────────────── */
function $(s,ctx=document){return ctx.querySelector(s);}
function $$(s,ctx=document){return[...ctx.querySelectorAll(s)];}
function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
function toast(msg,ms=2200){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),ms);}
function gradeClass(g=''){const n=parseFloat(g.replace(/[^0-9.]/g,''));if(n<=5.5)return'V-easy';if(n<=6.5)return'V-mid';return'V-hard';}
function gradeGrad(g=''){const n=parseFloat(g.replace(/[^0-9.]/g,''));if(n<=5.5)return['#1a5c2e','#0d3318'];if(n<=6.5)return['#7a5010','#4a3008'];return['#7a1820','#4a0e14'];}
function timeAgo(iso){const d=Math.floor((Date.now()-new Date(iso))/1000);if(d<60)return'just now';if(d<3600)return`${Math.floor(d/60)}m ago`;if(d<86400)return`${Math.floor(d/3600)}h ago`;return`${Math.floor(d/86400)}d ago`;}

/* ── Comments ─────────────────────────────────── */
const Comments={
  key(id){return'gc_c_'+id;},
  get(id){try{return JSON.parse(localStorage.getItem(this.key(id)))||[];}catch{return[];}},
  add(id,text,user){const l=this.get(id);l.unshift({id:'c'+Date.now(),text,user:user.name,handle:'@'+user.name.toLowerCase().replace(/\s+/g,'.'),ago:new Date().toISOString()});localStorage.setItem(this.key(id),JSON.stringify(l));return l;},
};

/* ── Uploads ──────────────────────────────────── */
const Uploads={
  key(id){return'gc_u_'+id;},
  get(id){try{return JSON.parse(localStorage.getItem(this.key(id)))||[];}catch{return[];}},
  add(id,item){const l=this.get(id);l.unshift(item);localStorage.setItem(this.key(id),JSON.stringify(l));return l;},
  remove(id,uid){const l=this.get(id).filter(u=>u.id!==uid);localStorage.setItem(this.key(id),JSON.stringify(l));return l;},
};

/* ── Croquis editor ───────────────────────────── */
const Croquis={
  ctx:null, drawing:false, tool:'pen', color:'#1a1a1a', size:4,
  history:[], bgImage:null, targetId:null, onSave:null,
  open(targetId,onSave){
    this.targetId=targetId; this.onSave=onSave; this.bgImage=null;
    document.getElementById('croquis-modal').classList.remove('hidden');
    document.getElementById('croquis-overlay').classList.remove('hidden');
    this.setup();
  },
  close(){
    document.getElementById('croquis-modal').classList.add('hidden');
    document.getElementById('croquis-overlay').classList.add('hidden');
  },
  setup(){
    const canvas=document.getElementById('croquis-canvas');
    const wrap=canvas.parentElement;
    canvas.width=wrap.clientWidth||360; canvas.height=Math.min(wrap.clientHeight||520,520);
    this.ctx=canvas.getContext('2d');
    this.ctx.fillStyle='#f0ede8'; this.ctx.fillRect(0,0,canvas.width,canvas.height);
    if(this.bgImage) this.ctx.drawImage(this.bgImage,0,0,canvas.width,canvas.height);
    this.history=[];
    this._bindCanvas(canvas);
  },
  loadPhoto(){
    const inp=document.createElement('input');inp.type='file';inp.accept='image/*';
    inp.onchange=e=>{
      const f=e.target.files[0]; if(!f)return;
      const r=new FileReader();
      r.onload=()=>{const img=new Image();img.onload=()=>{this.bgImage=img;this.setup();};img.src=r.result;};
      r.readAsDataURL(f);
    };
    inp.click();
  },
  _bindCanvas(canvas){
    const get=(e)=>{const r=canvas.getBoundingClientRect();const p=e.touches?e.touches[0]:e;return{x:(p.clientX-r.left)*(canvas.width/r.width),y:(p.clientY-r.top)*(canvas.height/r.height)};};
    canvas.onmousedown=canvas.ontouchstart=(e)=>{e.preventDefault();this.drawing=true;const p=get(e);this.ctx.beginPath();this.ctx.moveTo(p.x,p.y);this._saveH();};
    canvas.onmousemove=canvas.ontouchmove=(e)=>{e.preventDefault();if(!this.drawing)return;const p=get(e);
      if(this.tool==='eraser'){this.ctx.globalCompositeOperation='destination-out';this.ctx.lineWidth=this.size*3;}
      else{this.ctx.globalCompositeOperation='source-over';this.ctx.strokeStyle=this.color;this.ctx.lineWidth=this.size;}
      this.ctx.lineCap='round';this.ctx.lineJoin='round';this.ctx.lineTo(p.x,p.y);this.ctx.stroke();};
    canvas.onmouseup=canvas.ontouchend=()=>{this.drawing=false;this.ctx.globalCompositeOperation='source-over';};
  },
  _saveH(){const c=document.getElementById('croquis-canvas');this.history.push(c.toDataURL());if(this.history.length>20)this.history.shift();},
  undo(){if(!this.history.length)return;const c=document.getElementById('croquis-canvas');const img=new Image();img.onload=()=>{this.ctx.clearRect(0,0,c.width,c.height);this.ctx.drawImage(img,0,0);};img.src=this.history.pop();},
  clear(){const c=document.getElementById('croquis-canvas');this.ctx.fillStyle='#f0ede8';this.ctx.fillRect(0,0,c.width,c.height);if(this.bgImage)this.ctx.drawImage(this.bgImage,0,0,c.width,c.height);},
  export(){return document.getElementById('croquis-canvas').toDataURL('image/png');},
};

/* ══════════════════════════════════════════════
   UI
══════════════════════════════════════════════ */
const UI={

  show(id){
    $$('.screen').forEach(s=>{if(s.id==='screen-loading')return;s.classList.toggle('hidden',s.id!=='screen-'+id);});
    State.screen=id; this.updateNav();
    if(id==='home'){MapCtrl.invalidate();this.renderGuestBanner();}
    if(id==='search'&&!State.searchQuery)this.renderAllSpots();
  },

  updateNav(){
    const nav=document.getElementById('bottom-nav'),s=State.screen;
    nav.classList.toggle('hidden',['loading','splash','login','register'].includes(s));
    $$('.nav-btn',nav).forEach(btn=>{
      const match=btn.dataset.screen===s;
      btn.classList.toggle('active',match);
      const icon=btn.querySelector('.material-icons');if(!icon)return;
      if(btn.dataset.screen==='favorites') icon.textContent=match?'favorite':'favorite_border';
      if(btn.dataset.screen==='profile') icon.textContent=match?'person':'person_outline';
    });
    // Guest mode: hide favorites, profile, add
    $$('.nav-btn',nav).forEach(btn=>{
      const sc=btn.dataset.screen;
      if(sc==='favorites'||sc==='profile'||sc==='add') btn.classList.toggle('hidden',!State.user);
    });
  },

  /* ── Splash ─────────────────────────────────── */
  initSplash(){
    setTimeout(()=>{document.getElementById('screen-loading').classList.add('hidden');this.show('splash');},1200);
    let slide=0; const ss=document.getElementById('screen-splash');
    const showSlide=(i)=>{$$('.splash-slide',ss).forEach((s,j)=>s.classList.toggle('active',j===i));slide=i;};
    $$('.splash-next',ss).forEach(btn=>btn.onclick=()=>{const slides=$$('.splash-slide',ss);if(slide<slides.length-1)showSlide(slide+1);});
    document.getElementById('splash-login').onclick=()=>this.show('login');
    document.getElementById('splash-register').onclick=()=>this.show('register');
    document.getElementById('splash-explore').onclick=()=>{State.user=null;this.show('home');};
  },

  /* ── Auth ───────────────────────────────────── */
  initLogin(){
    const form=document.getElementById('login-form'),err=document.getElementById('login-error');
    const pwi=document.getElementById('login-password');
    document.getElementById('toggle-pw-login').onclick=()=>{pwi.type=pwi.type==='password'?'text':'password';};
    document.getElementById('login-back').onclick=()=>this.show('splash');
    document.getElementById('go-register').onclick=()=>this.show('register');
    document.getElementById('forgot-link').onclick=()=>toast('✉️ Password reset sent (demo)');
    document.getElementById('login-google').onclick=()=>{const r=Auth.login('demo@gocrag.app','demo123');if(r.ok)this.afterLogin();else toast('⚠️ '+r.err);};
    form.onsubmit=(e)=>{e.preventDefault();const r=Auth.login(document.getElementById('login-email').value.trim(),pwi.value);if(r.ok){err.classList.remove('show');this.afterLogin();}else{err.textContent=r.err;err.classList.add('show');}};
  },
  initRegister(){
    const form=document.getElementById('register-form'),err=document.getElementById('register-error');
    const pwi=document.getElementById('register-password');
    document.getElementById('toggle-pw-reg').onclick=()=>{pwi.type=pwi.type==='password'?'text':'password';};
    document.getElementById('register-back').onclick=()=>this.show('splash');
    document.getElementById('go-login').onclick=()=>this.show('login');
    document.getElementById('register-google').onclick=()=>{const r=Auth.register('Google User','google@gocrag.app','google123');if(r.ok)this.afterLogin();};
    form.onsubmit=(e)=>{e.preventDefault();const r=Auth.register(document.getElementById('register-name').value.trim(),document.getElementById('register-email').value.trim(),pwi.value);if(r.ok){err.classList.remove('show');this.afterLogin();}else{err.textContent=r.err;err.classList.add('show');}};
  },
  afterLogin(){toast(`👋 Welcome, ${State.user.name}!`);this.show('home');this.renderProfile();},

  /* ── Map home ───────────────────────────────── */
  initHome(){
    const inp=document.getElementById('map-search');
    inp.oninput=()=>{
      const q=inp.value.trim().toLowerCase();
      if(!q){MapCtrl.render();return;}
      if(!State.clusterGroup)return;
      State.clusterGroup.clearLayers();
      [...DB.spots,...(()=>{try{return JSON.parse(localStorage.getItem('gc_user_spots')||'[]');}catch{return[];}})()]
        .filter(s=>s.name.toLowerCase().includes(q)||s.location.toLowerCase().includes(q))
        .forEach(spot=>{
          const icon=L.divIcon({html:`<div class="spot-pin ${State.conditions[spot.id]?.status||'ok'}"></div>`,className:'',iconSize:[22,22],iconAnchor:[11,11]});
          L.marker([spot.lat,spot.lng],{icon}).bindTooltip(spot.name,{direction:'top',offset:[0,-14]}).on('click',()=>UI.openSpot(spot.id)).addTo(State.clusterGroup);
        });
    };
    document.getElementById('map-locate').onclick=()=>{
      Geo.locate(c=>{if(!c){toast('❌ Could not get location');return;}State.userLat=c.latitude;State.userLng=c.longitude;MapCtrl.setUser(c.latitude,c.longitude);document.getElementById('map-locate').classList.add('located');toast('📍 Location found');});
    };
    document.getElementById('map-filter-btn').onclick=()=>Filters.open();
    this.renderGuestBanner();
  },
  renderGuestBanner(){
    const b=document.getElementById('map-guest-banner');if(!b)return;
    b.classList.toggle('hidden',!!State.user);
    if(!State.user){$('[data-action="banner-register"]',b).onclick=()=>this.show('register');$('[data-action="banner-login"]',b).onclick=()=>this.show('login');}
  },
  async loadWeather(){
    const allSpots=[...DB.spots,...(()=>{try{return JSON.parse(localStorage.getItem('gc_user_spots')||'[]');}catch{return[];}})()];
    await Promise.all(allSpots.map(async spot=>{const wx=await WX.get(spot.lat,spot.lng);State.weather[spot.id]=wx;State.conditions[spot.id]=WX.score(wx);}));
    MapCtrl.render();if(State.screen==='search')this.renderAllSpots();
  },

  /* ── Search / Explore ───────────────────────── */
  initSearch(){
    const inp=document.getElementById('search-input'),clear=document.getElementById('search-clear');
    inp.oninput=()=>{State.searchQuery=inp.value.trim();clear.classList.toggle('hidden',!State.searchQuery);State.searchQuery?this.renderSearch():this.renderAllSpots();};
    clear.onclick=()=>{inp.value='';State.searchQuery='';clear.classList.add('hidden');this.renderAllSpots();};
    $$('.tab-btn').forEach(btn=>btn.onclick=()=>{$$('.tab-btn').forEach(b=>b.classList.toggle('active',b===btn));State.searchTab=btn.dataset.tab;State.searchQuery?this.renderSearch():this.renderAllSpots();});
    document.getElementById('explore-filter-btn').onclick=()=>Filters.open();
  },
  renderAllSpots(){
    const list=document.getElementById('search-results');
    const spots=MapCtrl.filtered();
    if(!spots.length){list.innerHTML=this.emptyState('🗺','No spots found','Try adjusting your filters or search terms.');return;}
    list.innerHTML=`<div class="card-list">${spots.map(s=>this.spotCardHTML(s)).join('')}</div>`;
    $$('.scard',list).forEach(el=>el.onclick=()=>this.openSpot(el.dataset.id));
  },
  renderSearch(){
    const q=State.searchQuery,tab=State.searchTab,list=document.getElementById('search-results');
    if(!q){this.renderAllSpots();return;}
    const allSpots=[...DB.spots,...(()=>{try{return JSON.parse(localStorage.getItem('gc_user_spots')||'[]');}catch{return[];}})()];
    const r={
      spots:allSpots.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())||s.location.toLowerCase().includes(q.toLowerCase())),
      sectors:DB.sectors.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())),
      challenges:DB.challenges.filter(c=>c.name.toLowerCase().includes(q.toLowerCase())||c.grade.toLowerCase().includes(q.toLowerCase())),
    };
    const items=tab==='spots'?r.spots:tab==='sectors'?r.sectors:r.challenges;
    if(!items.length){list.innerHTML=this.emptyState('🔎','No results',`Nothing found for "${esc(q)}"`);return;}
    if(tab==='spots'){list.innerHTML=`<div class="card-list">${items.map(s=>this.spotCardHTML(s)).join('')}</div>`;$$('.scard',list).forEach(el=>el.onclick=()=>this.openSpot(el.dataset.id));}
    else if(tab==='sectors'){list.innerHTML=`<div class="card-list">${items.map(sec=>`<div class="sector-card" onclick="UI.openSector('${sec.id}')"><div class="sector-card-left"><h4>${esc(sec.name)}</h4><p>${sec.challenges.length} problems</p></div><span class="material-icons sector-card-right" style="color:var(--text3)">chevron_right</span></div>`).join('')}</div>`;}
    else{list.innerHTML=`<div class="card-list">${items.map(ch=>this.chCardHTML(ch)).join('')}</div>`;$$('.chcard',list).forEach(el=>el.onclick=()=>this.openChallenge(el.dataset.id));}
  },
  spotCardHTML(spot){
    const cond=State.conditions[spot.id];
    const dist=State.userLat?Geo.dist(State.userLat,State.userLng,spot.lat,spot.lng):null;
    return`<div class="spot-card scard" data-id="${spot.id}">
      <div class="spot-card-img" style="background-image:url('${esc(spot.cover)}')"></div>
      <div class="spot-card-body">
        <div class="spot-card-name">${esc(spot.name)}</div>
        <div class="spot-card-loc"><span class="material-icons" style="font-size:13px">location_on</span>${esc(spot.location)}${dist?` · ${Geo.fmt(dist)}`:''}</div>
        <div class="spot-card-tags">
          ${cond?`<span class="tag ${cond.status}">${cond.emoji} ${cond.label}</span>`:''}
          <span class="tag rock">${esc(spot.rock)}</span>
          <span class="tag">${esc(spot.grade_min)}–${esc(spot.grade_max)}</span>
        </div>
      </div>
    </div>`;
  },
  chCardHTML(ch){
    const done=Auth.isDone(ch.id);
    return`<div class="challenge-card chcard" data-id="${ch.id}">
      <div class="ch-grade ${gradeClass(ch.grade)}">${esc(ch.grade)}</div>
      <div class="ch-body"><div class="ch-name">${esc(ch.name)}</div><div class="ch-meta"><span>${esc(ch.style)}</span><span>Landing: ${esc(ch.landing)}</span></div></div>
      ${State.user?`<button class="ch-done-btn ${done?'done':''}" data-id="${ch.id}" onclick="event.stopPropagation();UI.toggleDone('${ch.id}',this)">
        <span class="material-icons" style="font-size:16px">${done?'check':'radio_button_unchecked'}</span>
      </button>`:''}
    </div>`;
  },

  /* ── Breadcrumb helper ──────────────────────── */
  breadcrumb(parts){
    // parts = [{label, onclick}]
    return`<div class="breadcrumb">
      ${parts.map((p,i)=>`
        ${i>0?'<span class="material-icons bc-sep">chevron_right</span>':''}
        <button class="bc-item ${i===parts.length-1?'bc-current':''}" onclick="${p.onclick||''}">${esc(p.label)}</button>
      `).join('')}
    </div>`;
  },

  /* ── Detail page header (shared by spot/sector/challenge) ── */
  detailHeader({cover, backFn, favBtn='', shareBtn='', badge='', title, loc, tags}){
    return`
      <div style="position:relative">
        <div style="height:220px;background:var(--bg3);background-image:url('${esc(cover||'')}');background-size:cover;background-position:center">
          <div style="position:absolute;inset:0;background:linear-gradient(to top,var(--bg) 0%,transparent 55%)"></div>
        </div>
        <!-- Sticky action bar — only this sticks -->
        <div class="detail-action-bar">
          <button class="cover-btn" onclick="${backFn}"><span class="material-icons">arrow_back</span></button>
          <div style="display:flex;gap:8px">${favBtn}${shareBtn}</div>
        </div>
        ${badge?`<div style="position:absolute;bottom:16px;right:14px">${badge}</div>`:''}
      </div>
      <div style="padding:12px 16px 0">
        ${title}
        ${loc||''}
        ${tags||''}
      </div>`;
  },

  /* ── Spot detail — single scroll, no tabs ───── */
  openSpot(id){
    State.activeSpot=id;
    const spot=DB.getSpot(id)||(()=>{try{return JSON.parse(localStorage.getItem('gc_user_spots')||'[]').find(s=>s.id===id);}catch{return null;}})();
    if(!spot)return;
    this.show('spot'); MapCtrl.flyTo(spot.lat,spot.lng); this.renderSpot(spot);
  },
  renderSpot(spot){
    const screen=document.getElementById('screen-spot');
    const wx=State.weather[spot.id]||WX.mock(spot.lat,spot.lng);
    const cond=State.conditions[spot.id]||WX.score(wx);
    const dist=State.userLat?Geo.dist(State.userLat,State.userLng,spot.lat,spot.lng):null;
    const isFav=Auth.isFav(spot.id);
    const secs=DB.getSectorsOfSpot(spot.id);
    const comments=Comments.get(spot.id);
    const uploads=Uploads.get(spot.id);

    screen.innerHTML=`
      <div class="scroll-area">
        <!-- Cover -->
        <div style="position:relative">
          <div style="height:220px;background:var(--bg3);background-image:url('${esc(spot.cover||'')}');background-size:cover;background-position:center">
            <div style="position:absolute;inset:0;background:linear-gradient(to top,var(--bg) 0%,transparent 55%)"></div>
          </div>
          <div class="detail-action-bar">
            <button class="cover-btn" onclick="UI.show('home')"><span class="material-icons">arrow_back</span></button>
            <div style="display:flex;gap:8px">
              ${State.user?`<button class="cover-btn fav ${isFav?'active':''}" id="spot-fav-btn" onclick="UI.toggleFav('${spot.id}')"><span class="material-icons">${isFav?'favorite':'favorite_border'}</span></button>`:''}
              <button class="cover-btn" onclick="UI.shareSpot('${spot.id}')"><span class="material-icons">ios_share</span></button>
            </div>
          </div>
          <div style="position:absolute;bottom:16px;right:14px"><span class="tag ${cond.status}">${cond.emoji} ${cond.label}</span></div>
        </div>

        <!-- Title & tags -->
        <div style="padding:14px 16px 0">
          <h1 class="detail-name">${esc(spot.name)}</h1>
          <div class="detail-loc"><span class="material-icons" style="font-size:15px">location_on</span>${esc(spot.location)}${dist?` · ${Geo.fmt(dist)}`:''}</div>
          <div class="detail-tags">
            <span class="tag">${esc(spot.style)}</span>
            <span class="tag rock">🪨 ${esc(spot.rock)}</span>
            <span class="tag">📊 ${esc(spot.grade_min)}–${esc(spot.grade_max)}</span>
            <span class="tag">🚶 ${esc(spot.walk)}</span>
            ${(spot.tags||[]).includes('sombra')?'<span class="tag">🌥 Shade</span>':''}
          </div>
        </div>

        <div class="detail-divider"></div>

        <!-- Conditions -->
        <div style="padding:0 16px">
          <div class="cond-block ${cond.status}">
            <span class="cond-emoji">${cond.emoji}</span>
            <div><div class="cond-label">${cond.label}</div><div class="cond-sub">Score: ${cond.score}/100 · ${cond.reasons.join(', ')}</div></div>
          </div>
          <p class="section-title">Current conditions</p>
          <div class="wx-grid">
            <div class="wx-cell"><div class="wx-icon">🌡</div><div class="wx-val">${wx.temp}°C</div><div class="wx-label">Temp</div></div>
            <div class="wx-cell"><div class="wx-icon">💧</div><div class="wx-val">${wx.humidity}%</div><div class="wx-label">Humidity</div></div>
            <div class="wx-cell"><div class="wx-icon">💨</div><div class="wx-val">${wx.wind}km/h</div><div class="wx-label">Wind</div></div>
            <div class="wx-cell"><div class="wx-icon">🌧</div><div class="wx-val">${wx.rain}mm</div><div class="wx-label">Rain</div></div>
          </div>
          ${wx.mock?'<p style="font-size:11px;color:var(--text3);margin-bottom:16px;text-align:center">⚠️ Add your OpenWeather API key for real data</p>':''}
        </div>

        <div class="detail-divider"></div>

        <!-- About -->
        <div style="padding:0 16px">
          <p class="section-title">About</p>
          <p class="detail-body-text">${esc(spot.desc)}</p>
          <p class="section-title" style="margin-top:16px">How to get there</p>
          <p class="detail-body-text">${esc(spot.access)}</p>
          <div class="info-table" style="margin-top:16px">
            <div class="info-row"><span class="info-key">Rock type</span><span class="info-val">${esc(spot.rock)}</span></div>
            <div class="info-row"><span class="info-key">Grade range</span><span class="info-val">${esc(spot.grade_min)}–${esc(spot.grade_max)}</span></div>
            <div class="info-row"><span class="info-key">Style</span><span class="info-val">${esc(spot.style)}</span></div>
            <div class="info-row"><span class="info-key">Walk-in</span><span class="info-val">${esc(spot.walk)}</span></div>
          </div>
        </div>

        <div class="detail-divider"></div>

        <!-- Sectors -->
        <div style="padding:0 16px">
          <p class="section-title">Sectors (${secs.length})</p>
          <div class="card-list" style="padding:0 0 0 0">
            ${secs.map(sec=>`
              <div class="sector-card" onclick="UI.openSector('${sec.id}')">
                <div class="sector-thumb" style="background-image:url('${esc(spot.cover||'')}')"></div>
                <div class="sector-card-left">
                  <h4>${esc(sec.name)}</h4>
                  <p>${sec.challenges.length} problems · ${esc(sec.desc)}</p>
                </div>
                <span class="material-icons sector-card-right">chevron_right</span>
              </div>`).join('')}
          </div>
        </div>

        <div class="detail-divider"></div>

        <!-- Media & community section -->
        ${this.communitySection(spot.id, uploads, comments)}

        <!-- Bottom padding -->
        <div style="height:24px"></div>
      </div>

      <!-- Fixed CTA -->
      <div class="cta-row">
        <button class="btn-maps" onclick="UI.openMaps(${spot.lat},${spot.lng})">
          <span class="material-icons" style="font-size:18px">map</span> Open in Google Maps
        </button>
        <button class="btn-share" onclick="UI.shareSpot('${spot.id}')"><span class="material-icons">ios_share</span></button>
      </div>
    `;
    this.bindCommunity(spot.id, screen);
  },

  /* ── Sector detail — single scroll, no tabs ── */
  openSector(id){
    State.activeSector=id;
    const sec=DB.getSector(id),spot=DB.getSpot(sec.spot);
    if(!sec||!spot)return;
    this.show('sector'); this.renderSector(sec,spot);
  },
  renderSector(sec,spot){
    const screen=document.getElementById('screen-sector');
    const chs=DB.getChallengesOfSector(sec.id);
    const childComments=chs.flatMap(ch=>Comments.get(ch.id).map(c=>({...c,sourceType:'problem',sourceName:ch.name})));
    const allComments=[...Comments.get(sec.id),...childComments];
    const uploads=Uploads.get(sec.id);

    screen.innerHTML=`
      <div class="scroll-area">
        <!-- Cover (inherited from parent spot) -->
        <div style="position:relative">
          <div style="height:180px;background:var(--bg3);background-image:url('${esc(spot.cover||'')}');background-size:cover;background-position:center">
            <div style="position:absolute;inset:0;background:linear-gradient(to top,var(--bg) 0%,transparent 55%)"></div>
          </div>
          <div class="detail-action-bar">
            <button class="cover-btn" onclick="UI.openSpot('${spot.id}')"><span class="material-icons">arrow_back</span></button>
            <button class="cover-btn" onclick="UI.shareSpot('${spot.id}')"><span class="material-icons">ios_share</span></button>
          </div>
        </div>

        <!-- Breadcrumb -->
        <div style="padding:10px 16px 0">
          ${this.breadcrumb([{label:spot.name,onclick:`UI.openSpot('${spot.id}')`},{label:sec.name}])}
          <h1 class="detail-name" style="margin-top:6px">${esc(sec.name)}</h1>
          <p class="detail-body-text" style="margin-bottom:0">${esc(sec.desc)}</p>
        </div>

        <div class="detail-divider"></div>

        <!-- Problems list -->
        <div style="padding:0 16px">
          <p class="section-title">Problems (${chs.length})</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${chs.length ? chs.map(ch=>this.chCardHTML(ch)).join('') : this.emptyState('🎯','No problems','No problems defined for this sector yet.')}
          </div>
        </div>

        <div class="detail-divider"></div>

        <!-- Community -->
        ${this.communitySection(sec.id, uploads, allComments)}

        <div style="height:24px"></div>
      </div>
    `;
    $$('.chcard',screen).forEach(el=>el.onclick=()=>this.openChallenge(el.dataset.id));
    $$('.ch-done-btn',screen).forEach(btn=>btn.onclick=(e)=>{e.stopPropagation();this.toggleDone(btn.dataset.id,btn);});
    this.bindCommunity(sec.id, screen);
  },

  /* ── Challenge detail — single scroll, no tabs */
  openChallenge(id){
    State.activeChallenge=id;
    const ch=DB.getChallenge(id),sec=DB.getSector(ch.sector),spot=DB.getSpot(ch.spot);
    if(!ch||!sec||!spot)return;
    this.show('challenge'); this.renderChallenge(ch,sec,spot);
  },
  renderChallenge(ch,sec,spot){
    const screen=document.getElementById('screen-challenge');
    const done=Auth.isDone(ch.id);
    const [gc,gcd]=gradeGrad(ch.grade);
    const comments=Comments.get(ch.id);
    const uploads=Uploads.get(ch.id);

    screen.innerHTML=`
      <div class="scroll-area">
        <!-- Gradient cover with grade -->
        <div style="position:relative">
          <div style="height:200px;background:linear-gradient(135deg,${gc},${gcd});position:relative">
            <div style="position:absolute;bottom:16px;left:16px;right:16px">
              <div style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:4px">${esc(spot.name)} › ${esc(sec.name)}</div>
              <div style="display:flex;align-items:flex-end;justify-content:space-between">
                <h1 style="font-size:22px;font-weight:800;color:#fff">${esc(ch.name)}</h1>
                <span style="font-size:44px;font-weight:900;color:rgba(255,255,255,.85);line-height:1">${esc(ch.grade)}</span>
              </div>
            </div>
          </div>
          <div class="detail-action-bar">
            <button class="cover-btn" onclick="UI.openSector('${sec.id}')"><span class="material-icons">arrow_back</span></button>
            <div style="display:flex;gap:8px">
              ${State.user?`<button class="cover-btn ${done?'done-cover-btn':''}" id="done-cover-btn" onclick="UI.toggleDone('${ch.id}',this)" style="${done?'background:rgba(45,154,78,.8)':''}">
                <span class="material-icons">${done?'check_circle':'radio_button_unchecked'}</span>
              </button>`:''}
              <button class="cover-btn" onclick="UI.shareChallenge('${ch.id}')"><span class="material-icons">ios_share</span></button>
            </div>
          </div>
        </div>

        <!-- Breadcrumb -->
        <div style="padding:10px 16px 0">
          ${this.breadcrumb([{label:spot.name,onclick:`UI.openSpot('${spot.id}')`},{label:sec.name,onclick:`UI.openSector('${sec.id}')`},{label:ch.name}])}
        </div>

        <div class="detail-divider"></div>

        <!-- Info -->
        <div style="padding:0 16px">
          <div class="info-table">
            <div class="info-row"><span class="info-key">Grade</span><span class="info-val" style="font-size:16px;font-weight:800">${esc(ch.grade)}</span></div>
            <div class="info-row"><span class="info-key">Style</span><span class="info-val">${esc(ch.style)}</span></div>
            <div class="info-row"><span class="info-key">Landing</span><span class="info-val">${esc(ch.landing)}</span></div>
            <div class="info-row"><span class="info-key">Sector</span><span class="info-val">${esc(sec.name)}</span></div>
          </div>
          <p class="section-title" style="margin-top:16px">Description</p>
          <p class="detail-body-text">${esc(ch.desc)}</p>
          <!-- Go to spot: secondary style, not primary -->
          <button class="btn-secondary-action" onclick="UI.openMaps(${spot.lat},${spot.lng})">
            <span class="material-icons" style="font-size:17px">map</span> Get directions to spot
          </button>
        </div>

        <div class="detail-divider"></div>

        <!-- Community -->
        ${this.communitySection(ch.id, uploads, comments)}

        <div style="height:24px"></div>
      </div>
    `;
    this.bindCommunity(ch.id, screen);
  },

  /* ── Community section (shared) ─────────────── */
  communitySection(targetId, uploads, comments){
    const hasUploads=uploads&&uploads.length>0;
    const hasComments=comments&&comments.length>0;

    const uploadsHTML=hasUploads?`
      <div class="upload-preview-grid">
        ${uploads.map(u=>`
          <div class="upload-preview-item">
            ${u.type==='photo'||u.type==='topo'?`<img src="${u.dataUrl||u.url}" alt="${esc(u.name)}" loading="lazy"/>`
              :`<div class="upload-preview-doc"><span class="material-icons">${u.type==='video'?'videocam':u.type==='pdf'?'picture_as_pdf':'gesture'}</span><span>${esc(u.name)}</span></div>`}
            ${State.user?`<button class="upload-remove" onclick="UI.removeUpload('${targetId}','${u.id}')">✕</button>`:''}
            ${u.sourceType?`<div class="upload-source-tag">from ${esc(u.sourceName||'')}</div>`:''}
          </div>`).join('')}
      </div>`:'';

    const commentsHTML=hasComments?comments.map(c=>`
      <div class="comment-card">
        ${c.sourceType?`<div class="comment-source-tag"><span class="material-icons" style="font-size:11px">subdirectory_arrow_right</span> From ${esc(c.sourceType)}: ${esc(c.sourceName||'')}</div>`:''}
        <div class="comment-top">
          <div class="comment-avatar">${(c.user||'?').charAt(0).toUpperCase()}</div>
          <div class="comment-meta"><h5>${esc(c.user)}</h5><p>${timeAgo(c.ago)}</p></div>
        </div>
        <p class="comment-text">${esc(c.text)}</p>
      </div>`).join(''):`<p style="font-size:13px;color:var(--text3);margin-bottom:12px">No notes yet. Be the first!</p>`;

    if(!State.user){
      return`<div style="padding:0 16px">
        <p class="section-title">Community</p>
        ${uploadsHTML}
        ${commentsHTML}
        <div class="guest-wall">
          <h4>Sign in to contribute</h4>
          <p>Upload photos, videos, topos and share your beta with the community.</p>
          <div class="btns"><button class="b-outline" onclick="UI.show('login')">Sign in</button><button class="b-green" onclick="UI.show('register')">Create account</button></div>
        </div>
      </div>`;
    }

    return`<div style="padding:0 16px">
      <p class="section-title">Add content</p>
      <div class="upload-grid">
        <label class="upload-btn-card"><span class="material-icons">add_photo_alternate</span><span class="lbl">Photo</span><input type="file" accept="image/*" class="hidden" data-utype="photo" data-uid="${targetId}"/></label>
        <label class="upload-btn-card"><span class="material-icons">videocam</span><span class="lbl">Video</span><input type="file" accept="video/*" class="hidden" data-utype="video" data-uid="${targetId}"/></label>
        <label class="upload-btn-card"><span class="material-icons">picture_as_pdf</span><span class="lbl">PDF</span><input type="file" accept=".pdf" class="hidden" data-utype="pdf" data-uid="${targetId}"/></label>
        <div class="upload-btn-card" id="croquis-open-${targetId}"><span class="material-icons">gesture</span><span class="lbl">Topo</span></div>
      </div>
      ${uploadsHTML?`<div class="upload-preview-grid" id="media-preview-${targetId}">${uploads.map(u=>`
        <div class="upload-preview-item">
          ${u.type==='photo'||u.type==='topo'?`<img src="${u.dataUrl||u.url}" alt="${esc(u.name)}" loading="lazy"/>`:`<div class="upload-preview-doc"><span class="material-icons">${u.type==='video'?'videocam':u.type==='pdf'?'picture_as_pdf':'gesture'}</span><span>${esc(u.name)}</span></div>`}
          <button class="upload-remove" onclick="UI.removeUpload('${targetId}','${u.id}')">✕</button>
        </div>`).join('')}</div>`:`<div id="media-preview-${targetId}" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px"></div>`}
      <div class="detail-divider"></div>
      <p class="section-title">Notes & Beta</p>
      <div class="comment-list" id="clist-${targetId}">${commentsHTML}</div>
      <div class="comment-form" id="cform-${targetId}">
        <textarea placeholder="Share beta, conditions, tips…" rows="3"></textarea>
        <button class="btn-comment-secondary">Post note</button>
      </div>
    </div>`;
  },

  bindCommunity(targetId, ctx){
    // File uploads
    $$(`input[data-uid="${targetId}"]`,ctx).forEach(inp=>{
      inp.onchange=async(e)=>{
        const file=e.target.files[0];if(!file)return;
        const utype=inp.dataset.utype;
        const reader=new FileReader();
        reader.onload=()=>{
          const item={id:'u'+Date.now(),type:utype,name:file.name,dataUrl:reader.result,date:new Date().toISOString()};
          Uploads.add(targetId,item);
          this.refreshMediaPreview(targetId,ctx);
          toast('✓ '+file.name+' uploaded');
        };
        reader.readAsDataURL(file); inp.value='';
      };
    });
    // Topo
    const cBtn=ctx.querySelector(`#croquis-open-${targetId}`);
    if(cBtn) cBtn.onclick=()=>{Croquis.open(targetId,(dataUrl)=>{const item={id:'u'+Date.now(),type:'topo',name:'Topo '+new Date().toLocaleDateString(),dataUrl,date:new Date().toISOString()};Uploads.add(targetId,item);this.refreshMediaPreview(targetId,ctx);toast('✓ Topo saved');});};
    // Comment form
    const form=ctx.querySelector(`#cform-${targetId}`);if(!form)return;
    const ta=form.querySelector('textarea');
    form.querySelector('.btn-comment-secondary').onclick=()=>{
      const text=ta.value.trim();if(!text)return;
      Comments.add(targetId,text,State.user);ta.value='';
      const list=ctx.querySelector(`#clist-${targetId}`);
      if(list) list.innerHTML=Comments.get(targetId).map(c=>`<div class="comment-card"><div class="comment-top"><div class="comment-avatar">${c.user.charAt(0).toUpperCase()}</div><div class="comment-meta"><h5>${esc(c.user)}</h5><p>${timeAgo(c.ago)}</p></div></div><p class="comment-text">${esc(c.text)}</p></div>`).join('');
      toast('✓ Note posted');
    };
  },

  refreshMediaPreview(targetId,ctx){
    const prev=ctx.querySelector(`#media-preview-${targetId}`);
    if(!prev)return;
    const items=Uploads.get(targetId);
    prev.innerHTML=items.map(u=>`
      <div class="upload-preview-item">
        ${u.type==='photo'||u.type==='topo'?`<img src="${u.dataUrl||u.url}" alt="${esc(u.name)}" loading="lazy"/>`:`<div class="upload-preview-doc"><span class="material-icons">${u.type==='video'?'videocam':u.type==='pdf'?'picture_as_pdf':'gesture'}</span><span>${esc(u.name)}</span></div>`}
        <button class="upload-remove" onclick="UI.removeUpload('${targetId}','${u.id}')">✕</button>
      </div>`).join('');
  },

  removeUpload(targetId,uid){
    Uploads.remove(targetId,uid);
    // Find the current screen and refresh
    const screens=['screen-spot','screen-sector','screen-challenge'];
    for(const sid of screens){const s=document.getElementById(sid);if(s&&!s.classList.contains('hidden')){this.refreshMediaPreview(targetId,s);break;}}
    toast('Removed');
  },

  /* ── Add spot ───────────────────────────────── */
  renderAddSpot(){
    const screen=document.getElementById('screen-add');
    screen.innerHTML=`
      <div style="display:flex;align-items:center;gap:12px;padding:16px;flex-shrink:0;border-bottom:1px solid var(--border)">
        <button class="cover-btn" style="background:var(--surface2);color:var(--text2)" onclick="UI.show('home')"><span class="material-icons">arrow_back</span></button>
        <h1 style="font-size:18px;font-weight:800">Add a Spot</h1>
      </div>
      <div class="scroll-area" style="padding:16px">
        <form id="add-spot-form">

          <!-- Cover photo -->
          <p class="section-title">Cover photo</p>
          <label class="upload-btn-card" style="width:100%;height:120px;border-radius:var(--radius);margin-bottom:16px;flex-direction:row;gap:12px;justify-content:center">
            <span class="material-icons" style="font-size:32px">add_photo_alternate</span>
            <span style="font-size:14px;font-weight:600;color:var(--text2)">Add a photo of the spot</span>
            <input type="file" accept="image/*" class="hidden" id="add-cover-input"/>
          </label>
          <div id="add-cover-preview" style="margin-bottom:16px;display:none">
            <img id="add-cover-img" style="width:100%;height:140px;object-fit:cover;border-radius:var(--radius)"/>
          </div>

          <p class="section-title">Basic info</p>
          <div class="form-group">
            <label class="form-label">Spot name *</label>
            <input class="form-input add-field" id="add-name" placeholder="e.g. Pedra da Anicha" required/>
          </div>
          <div class="form-group">
            <label class="form-label">Location *</label>
            <input class="form-input add-field" id="add-location" placeholder="e.g. Sintra, Portugal" required/>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input add-field" id="add-desc" rows="3" style="height:auto;padding-top:12px;border-radius:var(--radius-sm)" placeholder="Describe the spot, rock quality, best time to visit…"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">How to get there</label>
            <textarea class="form-input add-field" id="add-access" rows="2" style="height:auto;padding-top:12px;border-radius:var(--radius-sm)" placeholder="Parking, trailhead, directions…"></textarea>
          </div>

          <p class="section-title">Location coordinates</p>
          <p style="font-size:12px;color:var(--text3);margin-bottom:10px">Used to fetch real-time weather conditions.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Latitude *</label>
              <input class="form-input add-field" id="add-lat" type="number" step="0.0001" placeholder="38.7923" required/>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Longitude *</label>
              <input class="form-input add-field" id="add-lng" type="number" step="0.0001" placeholder="-9.3942" required/>
            </div>
          </div>
          <button type="button" class="btn-secondary" style="height:42px;font-size:13px;margin-bottom:16px" onclick="UI.getAddCoords()">
            <span class="material-icons" style="font-size:17px">my_location</span> Use my current location
          </button>

          <p class="section-title">Details</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Rock type</label>
              <select class="form-input add-field" id="add-rock" style="cursor:pointer">
                <option value="Granite">Granite</option>
                <option value="Limestone">Limestone</option>
                <option value="Schist">Schist</option>
                <option value="Sandstone">Sandstone</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Style</label>
              <select class="form-input add-field" id="add-style" style="cursor:pointer">
                <option value="Boulder">Boulder</option>
                <option value="Sport">Sport</option>
                <option value="Trad">Trad</option>
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Min grade</label>
              <input class="form-input add-field" id="add-grade-min" placeholder="4a"/>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Max grade</label>
              <input class="form-input add-field" id="add-grade-max" placeholder="7b"/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Walk-in time</label>
            <input class="form-input add-field" id="add-walk" placeholder="e.g. 10-15 min"/>
          </div>

          <!-- Sectors -->
          <p class="section-title" style="margin-top:8px">Sectors</p>
          <div id="add-sectors-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px"></div>
          <button type="button" class="btn-secondary" style="height:42px;font-size:13px;margin-bottom:16px" onclick="UI.addSectorField()">
            <span class="material-icons" style="font-size:17px">add</span> Add sector
          </button>

          <p id="add-error" style="color:var(--bad);font-size:13px;margin-bottom:12px;display:none"></p>
          <button type="submit" class="btn-primary">Publish spot</button>
          <div style="height:16px"></div>
        </form>
      </div>
    `;

    // Cover preview
    document.getElementById('add-cover-input').onchange=(e)=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();r.onload=()=>{
        document.getElementById('add-cover-img').src=r.result;
        document.getElementById('add-cover-preview').style.display='block';
        screen._coverDataUrl=r.result;
      };r.readAsDataURL(f);
    };

    document.getElementById('add-spot-form').onsubmit=(e)=>{e.preventDefault();this.submitAddSpot(screen);};
  },

  addSectorField(){
    const list=document.getElementById('add-sectors-list');
    const idx=list.children.length;
    const div=document.createElement('div');
    div.className='add-sector-item';
    div.innerHTML=`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:13px;font-weight:600;color:var(--text2)">Sector ${idx+1}</span>
        <button type="button" onclick="this.closest('.add-sector-item').remove()" style="color:var(--bad);font-size:12px;margin-left:auto">Remove</button>
      </div>
      <input class="form-input" placeholder="Sector name" style="margin-bottom:6px" data-sector-name/>
      <input class="form-input" placeholder="Description (optional)" data-sector-desc/>
    `;
    list.appendChild(div);
  },

  getAddCoords(){
    Geo.locate(c=>{
      if(!c){toast('❌ Could not get location');return;}
      document.getElementById('add-lat').value=c.latitude.toFixed(5);
      document.getElementById('add-lng').value=c.longitude.toFixed(5);
      toast('📍 Coordinates filled in');
    });
  },

  submitAddSpot(screen){
    const name=document.getElementById('add-name').value.trim();
    const location=document.getElementById('add-location').value.trim();
    const lat=parseFloat(document.getElementById('add-lat').value);
    const lng=parseFloat(document.getElementById('add-lng').value);
    const errEl=document.getElementById('add-error');
    if(!name||!location||isNaN(lat)||isNaN(lng)){errEl.textContent='Please fill in name, location and coordinates.';errEl.style.display='block';return;}
    errEl.style.display='none';
    const spot={
      id:'user-'+Date.now(),
      name, location, lat, lng,
      desc:document.getElementById('add-desc').value.trim()||'',
      access:document.getElementById('add-access').value.trim()||'',
      rock:document.getElementById('add-rock').value,
      style:document.getElementById('add-style').value,
      grade_min:document.getElementById('add-grade-min').value.trim()||'?',
      grade_max:document.getElementById('add-grade-max').value.trim()||'?',
      walk:document.getElementById('add-walk').value.trim()||'?',
      cover:screen._coverDataUrl||'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80',
      tags:[], sectors:[],
      addedBy:State.user?.id,
    };
    // Save sectors
    const sectorItems=document.querySelectorAll('.add-sector-item');
    const sectors=[];
    sectorItems.forEach((item,i)=>{
      const sname=item.querySelector('[data-sector-name]').value.trim();
      const sdesc=item.querySelector('[data-sector-desc]').value.trim();
      if(sname){
        const sec={id:'user-sec-'+Date.now()+i,spot:spot.id,name:sname,desc:sdesc||'',order:i,challenges:[]};
        sectors.push(sec);
        spot.sectors.push(sec.id);
      }
    });
    // Persist
    const existing=JSON.parse(localStorage.getItem('gc_user_spots')||'[]');
    existing.push(spot);
    localStorage.setItem('gc_user_spots',JSON.stringify(existing));
    // Also save sectors
    const existingSecs=JSON.parse(localStorage.getItem('gc_user_sectors')||'[]');
    localStorage.setItem('gc_user_sectors',JSON.stringify([...existingSecs,...sectors]));
    // Add to DB runtime
    DB.spots.push(spot);
    DB.sectors.push(...sectors);
    // Reload weather for new spot
    WX.get(lat,lng).then(wx=>{State.weather[spot.id]=wx;State.conditions[spot.id]=WX.score(wx);MapCtrl.render();});
    toast('✅ Spot published!');
    this.show('home');
  },

  /* ── Favourites ─────────────────────────────── */
  renderFavorites(){
    const screen=document.getElementById('screen-favorites');
    const favSpots=State.user?[...DB.spots,...(()=>{try{return JSON.parse(localStorage.getItem('gc_user_spots')||'[]');}catch{return[];}})()].filter(s=>State.user.favorites?.includes(s.id)):[];
    screen.innerHTML=`
      <div style="padding:16px 16px 0;flex-shrink:0"><h1 style="font-size:22px;font-weight:800">Favourites</h1></div>
      <div class="scroll-area">
        ${!State.user?this.emptyState('🔒','Sign in required','Sign in to save your favourite spots.','Sign in',"UI.show('login')")
        :favSpots.length===0?this.emptyState('❤️','No favourites yet','Explore the map and save the spots you love.','Explore map',"UI.show('home')")
        :`<div class="card-list">${favSpots.map(s=>this.spotCardHTML(s)).join('')}</div>`}
      </div>`;
    $$('.scard',screen).forEach(el=>el.onclick=()=>this.openSpot(el.dataset.id));
  },

  /* ── Profile ─────────────────────────────────── */
  renderProfile(){
    const screen=document.getElementById('screen-profile');
    if(!State.user){screen.innerHTML=`<div style="padding:24px 16px 0"><h2 style="font-size:22px;font-weight:800">Profile</h2></div><div class="scroll-area">${this.emptyState('👤','Not signed in','Sign in to see your profile.','Sign in',"UI.show('login')")}</div>`;return;}
    const u=State.user;
    const favSpots=[...DB.spots,...(()=>{try{return JSON.parse(localStorage.getItem('gc_user_spots')||'[]');}catch{return[];}})()].filter(s=>u.favorites?.includes(s.id));
    const doneCount=(u.completed||[]).length;
    const achievements=[{icon:'🧗',name:'First Step',desc:'First login',done:true},{icon:'❤️',name:'Explorer',desc:'5 favourites',done:favSpots.length>=5},{icon:'✓',name:'Boulder Baby',desc:'1 problem done',done:doneCount>=1},{icon:'🏆',name:'Crusher',desc:'10 problems done',done:doneCount>=10},{icon:'📍',name:'Local Hero',desc:'Visited 3 spots',done:false},{icon:'🌟',name:'Legendary',desc:'Completed a 7A+',done:false}];
    screen.innerHTML=`
      <div class="scroll-area">
        <div class="profile-header">
          <div style="display:flex;justify-content:flex-end;width:100%;margin-bottom:8px">
            <button onclick="UI.show('settings')" style="font-size:13px;color:var(--text2);display:flex;align-items:center;gap:4px"><span class="material-icons" style="font-size:18px">settings</span> Settings</button>
          </div>
          <div class="profile-avatar">${u.name.charAt(0).toUpperCase()}</div>
          <div class="profile-name">${esc(u.name)}</div>
          <div class="profile-email">${esc(u.email)}</div>
          <div class="profile-since">Member since ${new Date(u.joined).getFullYear()}</div>
          <div class="profile-stats">
            <div class="stat-cell"><div class="stat-num">${favSpots.length}</div><div class="stat-lbl">Favourites</div></div>
            <div class="stat-cell"><div class="stat-num">${achievements.filter(a=>a.done).length}</div><div class="stat-lbl">Achievements</div></div>
            <div class="stat-cell"><div class="stat-num">${doneCount}</div><div class="stat-lbl">Done</div></div>
          </div>
        </div>
        <div class="profile-tabs">
          <button class="profile-tab active" data-ptab="favorites">Favourites</button>
          <button class="profile-tab" data-ptab="achievements">Achievements</button>
        </div>
        <div id="ptab-favorites" class="card-list">${favSpots.length?favSpots.map(s=>this.spotCardHTML(s)).join(''):this.emptyState('❤️','No favourites','Save spots from the map.')}</div>
        <div id="ptab-achievements" class="achievements-grid hidden">${achievements.map(a=>`<div class="achievement-card ${a.done?'':'locked'}"><div class="achievement-icon">${a.icon}</div><div class="achievement-name">${esc(a.name)}</div><div class="achievement-desc">${esc(a.desc)}</div></div>`).join('')}</div>
      </div>`;
    $$('.profile-tab',screen).forEach(btn=>btn.onclick=()=>{$$('.profile-tab',screen).forEach(b=>b.classList.toggle('active',b===btn));document.getElementById('ptab-favorites').classList.toggle('hidden',btn.dataset.ptab!=='favorites');document.getElementById('ptab-achievements').classList.toggle('hidden',btn.dataset.ptab!=='achievements');});
    $$('.scard',screen).forEach(el=>el.onclick=()=>this.openSpot(el.dataset.id));
  },

  /* ── Settings ─────────────────────────────────── */
  renderSettings(){
    const isDark=State.theme==='dark';
    document.getElementById('settings-list').innerHTML=`
      <div class="settings-section-label">Preferences</div>
      <div class="settings-row" onclick="UI.toggleTheme()"><div class="settings-row-left"><span class="settings-row-icon"><span class="material-icons">dark_mode</span></span><span class="settings-row-label">Theme</span></div><div class="settings-row-right">${isDark?'Dark':'Light'}</div></div>
      <div class="settings-section-label">About</div>
      <div class="settings-row"><div class="settings-row-left"><span class="settings-row-icon"><span class="material-icons">info_outline</span></span><span class="settings-row-label">About GoCrag</span></div><div class="settings-row-right">v2.1</div></div>
      ${State.user?`<div class="settings-section-label">Account</div><div class="settings-row danger" onclick="UI.logout()"><div class="settings-row-left"><span class="settings-row-icon"><span class="material-icons" style="color:var(--bad)">logout</span></span><span class="settings-row-label" style="color:var(--bad)">Sign out</span></div></div>`:`<div class="settings-section-label">Account</div><div class="settings-row" onclick="UI.show('login')"><div class="settings-row-left"><span class="settings-row-icon"><span class="material-icons">person</span></span><span class="settings-row-label">Sign in</span></div><span class="settings-row-right">›</span></div>`}`;
  },
  toggleTheme(){State.theme=State.theme==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',State.theme);localStorage.setItem('gc_theme',State.theme);this.renderSettings();toast(State.theme==='dark'?'🌙 Dark mode':'☀️ Light mode');},
  logout(){Auth.logout();toast('👋 Signed out');this.renderProfile();this.renderSettings();this.show('home');this.renderGuestBanner();MapCtrl.render();this.updateNav();},

  /* ── Helpers ─────────────────────────────────── */
  toggleFav(spotId){if(!State.user){this.show('login');return;}const added=Auth.toggleFav(spotId);toast(added?'❤️ Added to favourites':'🤍 Removed');const btn=document.getElementById('spot-fav-btn');if(btn){btn.classList.toggle('active',added);btn.querySelector('.material-icons').textContent=added?'favorite':'favorite_border';}this.renderProfile();},
  toggleDone(chId,btn){if(!State.user){this.show('login');return;}const done=Auth.toggleDone(chId);toast(done?'✓ Completed!':'○ Unmarked');if(btn){btn.classList.toggle('done',done);const mi=btn.querySelector('.material-icons');if(mi)mi.textContent=done?'check_circle':'radio_button_unchecked';}this.renderProfile();},
  openMaps(lat,lng){window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,'_blank');},
  shareSpot(id){const s=DB.getSpot(id)||{name:'Spot',location:''};if(navigator.share)navigator.share({title:s.name,text:`Boulder spot: ${s.name}`});else navigator.clipboard?.writeText(window.location.href).then(()=>toast('🔗 Link copied!'));},
  shareChallenge(id){const c=DB.getChallenge(id)||{grade:'',name:'Problem'};if(navigator.share)navigator.share({title:c.name,text:`Problem ${c.grade}: ${c.name}`});else navigator.clipboard?.writeText(window.location.href).then(()=>toast('🔗 Link copied!'));},
  emptyState(icon,title,sub,actionLabel='',actionFn=''){return`<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div>${actionLabel?`<button class="empty-action" onclick="${actionFn}">${actionLabel}</button>`:''}</div>`;},
};

/* ── Filters ──────────────────────────────────── */
const Filters={
  open(){document.getElementById('filter-overlay').classList.add('open');document.getElementById('filter-drawer').classList.add('open');this.render();},
  close(){document.getElementById('filter-overlay').classList.remove('open');document.getElementById('filter-drawer').classList.remove('open');},
  render(){
    const f=State.filters;
    $$('.filter-chip').forEach(c=>{if(c.dataset.filter==='condition')c.classList.toggle('active',f.condition===c.dataset.val);if(c.dataset.filter==='rock')c.classList.toggle('active',f.rock===c.dataset.val);if(c.dataset.filter==='grade')c.classList.toggle('active',f.grade===c.dataset.val);});
    const r=document.getElementById('dist-range');if(r){r.value=f.maxDist;document.getElementById('dist-val').textContent=f.maxDist+' km';}
    const sw=document.getElementById('shadow-toggle');if(sw)sw.classList.toggle('on',f.shadow);
  },
  updateBadge(){
    const count=[State.filters.condition,State.filters.rock,State.filters.grade,State.filters.shadow?'x':null].filter(Boolean).length;
    ['filter-badge','explore-filter-badge'].forEach(id=>{const b=document.getElementById(id);if(!b)return;b.textContent=count;b.classList.toggle('hidden',count===0);});
    document.getElementById('map-filter-btn')?.classList.toggle('active',count>0);
    document.getElementById('explore-filter-btn')?.classList.toggle('active',count>0);
  },
  apply(){MapCtrl.render();if(State.screen==='search'){State.searchQuery?UI.renderSearch():UI.renderAllSpots();}this.updateBadge();this.close();toast('✓ Filters applied');},
  reset(){State.filters={condition:null,rock:null,grade:null,shadow:false,maxDist:50};this.render();MapCtrl.render();if(State.screen==='search')UI.renderAllSpots();this.updateBadge();},
  init(){
    document.getElementById('filter-overlay').onclick=()=>this.close();
    document.getElementById('filter-close').onclick=()=>this.close();
    document.getElementById('filter-apply').onclick=()=>this.apply();
    document.getElementById('filter-reset').onclick=()=>{this.reset();this.close();};
    $$('.filter-chip').forEach(c=>c.onclick=()=>{const f=c.dataset.filter,v=c.dataset.val;if(f==='condition')State.filters.condition=State.filters.condition===v?null:v;if(f==='rock')State.filters.rock=State.filters.rock===v?null:v;if(f==='grade')State.filters.grade=State.filters.grade===v?null:v;this.render();});
    const r=document.getElementById('dist-range');if(r)r.oninput=()=>{State.filters.maxDist=+r.value;document.getElementById('dist-val').textContent=r.value+' km';};
    document.getElementById('shadow-toggle').onclick=()=>{State.filters.shadow=!State.filters.shadow;document.getElementById('shadow-toggle').classList.toggle('on',State.filters.shadow);};
  },
};

/* ── Croquis controls ─────────────────────────── */
function initCroquis(){
  document.getElementById('croquis-back').onclick=()=>Croquis.close();
  document.getElementById('croquis-save').onclick=()=>{const d=Croquis.export();if(Croquis.onSave)Croquis.onSave(d);Croquis.close();};
  document.getElementById('croquis-undo').onclick=()=>Croquis.undo();
  document.getElementById('croquis-clear').onclick=()=>Croquis.clear();
  document.getElementById('croquis-size').oninput=(e)=>{Croquis.size=+e.target.value;};
  document.getElementById('croquis-load-photo').onclick=()=>Croquis.loadPhoto();
  $$('.croquis-color').forEach(btn=>btn.onclick=()=>{Croquis.color=btn.dataset.color;$$('.croquis-color').forEach(b=>b.style.outline='');btn.style.outline='3px solid var(--brand)';});
  [['tool-pen','pen'],['tool-eraser','eraser']].forEach(([id,tool])=>{
    document.getElementById(id).onclick=()=>{Croquis.tool=tool;$$('.croquis-tool-btn').forEach(b=>b.classList.remove('active-tool'));document.getElementById(id).classList.add('active-tool');};
  });
  document.getElementById('tool-line').onclick=()=>{toast('Line tool — draw freely for now');};
  document.getElementById('tool-text').onclick=()=>{const t=prompt('Text to add:');if(!t||!Croquis.ctx)return;Croquis.ctx.font=`${Croquis.size*4}px Inter,sans-serif`;Croquis.ctx.fillStyle=Croquis.color;Croquis.ctx.fillText(t,50,50);};
}

/* ── Boot ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',async()=>{
  const savedTheme=localStorage.getItem('gc_theme')||'light';
  State.theme=savedTheme; document.documentElement.setAttribute('data-theme',savedTheme);
  Auth.load();

  // Load user-added spots into DB runtime
  try{const ua=JSON.parse(localStorage.getItem('gc_user_spots')||'[]');DB.spots.push(...ua);}catch{}
  try{const us=JSON.parse(localStorage.getItem('gc_user_sectors')||'[]');DB.sectors.push(...us);}catch{}

  UI.initSplash(); UI.initLogin(); UI.initRegister(); UI.initSearch();
  UI.renderSettings(); Filters.init(); initCroquis();

  $$('.nav-btn[data-screen]').forEach(btn=>btn.onclick=()=>{
    const s=btn.dataset.screen;
    if(s==='add'){if(!State.user){UI.show('login');return;}UI.renderAddSpot();UI.show('add');return;}
    if(s==='profile'){UI.renderProfile();UI.show('profile');return;}
    if(s==='favorites'){UI.renderFavorites();UI.show('favorites');return;}
    UI.show(s);
  });
  document.getElementById('settings-back').onclick=()=>UI.show('profile');

  MapCtrl.init(); UI.initHome(); UI.loadWeather();
});
