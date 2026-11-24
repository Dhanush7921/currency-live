'use strict';

const API = 'https://api.frankfurter.dev/v1';
const REFRESH_MS = 60 * 60 * 1000;
const MAX_AMOUNT = 1e15;
const FALLBACK_CURRENCIES = {
  AUD:'Australian Dollar', BGN:'Bulgarian Lev', BRL:'Brazilian Real', CAD:'Canadian Dollar', CHF:'Swiss Franc', CNY:'Chinese Renminbi Yuan', CZK:'Czech Koruna', DKK:'Danish Krone', EUR:'Euro', GBP:'British Pound', HKD:'Hong Kong Dollar', HUF:'Hungarian Forint', IDR:'Indonesian Rupiah', ILS:'Israeli New Shekel', INR:'Indian Rupee', ISK:'Icelandic Króna', JPY:'Japanese Yen', KRW:'South Korean Won', MXN:'Mexican Peso', MYR:'Malaysian Ringgit', NOK:'Norwegian Krone', NZD:'New Zealand Dollar', PHP:'Philippine Peso', PLN:'Polish Złoty', RON:'Romanian Leu', SEK:'Swedish Krona', SGD:'Singapore Dollar', THB:'Thai Baht', TRY:'Turkish Lira', USD:'US Dollar', ZAR:'South African Rand'
};
const COUNTRY = {AUD:'AU',BGN:'BG',BRL:'BR',CAD:'CA',CHF:'CH',CNY:'CN',CZK:'CZ',DKK:'DK',EUR:'EU',GBP:'GB',HKD:'HK',HUF:'HU',IDR:'ID',ILS:'IL',INR:'IN',ISK:'IS',JPY:'JP',KRW:'KR',MXN:'MX',MYR:'MY',NOK:'NO',NZD:'NZ',PHP:'PH',PLN:'PL',RON:'RO',SEK:'SE',SGD:'SG',THB:'TH',TRY:'TR',USD:'US',ZAR:'ZA'};
const $ = (id) => document.getElementById(id);
const els = {
  amount: $('amountInput'), from: $('fromCurrency'), to: $('toCurrency'), result: $('resultValue'),
  fromFlag: $('fromFlag'), toFlag: $('toFlag'), fromName: $('fromName'), toName: $('toName'),
  rate: $('rateText'), change: $('changeBadge'), notice: $('notice'), refresh: $('refreshBtn'),
  swap: $('swapBtn'), list: $('currencyList'), chart: $('rateChart'), empty: $('chartEmpty'),
  chartTitle: $('chartTitle'), chartLow: $('chartLow'), chartHigh: $('chartHigh'),
  theme: $('themeBtn'), network: $('networkBadge'), install: $('installBtn'), dialog: $('installDialog'),
  installCopy: $('installCopy'), installSteps: $('installSteps')
};
const state = { currencies: {...FALLBACK_CURRENCIES}, from:'USD', to:'INR', amount:1, rate:null, date:null, fetchedAt:null, history:[], range:30, controller:null, deferredInstall:null };

function safeJSON(value, fallback) { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } }
function cacheKey(from=state.from,to=state.to) { return `cl-rate-${from}-${to}`; }
function historyKey(from=state.from,to=state.to,range=state.range) { return `cl-history-${from}-${to}-${range}`; }
function flag(code) {
  const cc = COUNTRY[code];
  return cc ? [...cc].map(c => String.fromCodePoint(127397 + c.charCodeAt())).join('') : '💱';
}
function formatNumber(value, max=6) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', {maximumFractionDigits:max, minimumFractionDigits:0}).format(value);
}
function formatDate(date) {
  if (!date) return 'unknown date';
  return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(new Date(`${date}T12:00:00Z`));
}
function validAmount(raw) {
  const cleaned = String(raw).replace(/,/g,'').trim();
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '') return null;
  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0 && number <= MAX_AMOUNT ? number : null;
}
function validCode(raw) { const code = raw.trim().toUpperCase(); return state.currencies[code] ? code : null; }

function renderCurrencyList() {
  els.list.replaceChildren(...Object.entries(state.currencies).sort().map(([code,name]) => {
    const option = document.createElement('option'); option.value = code; option.label = `${flag(code)} ${name}`; return option;
  }));
}
function renderCurrencyMeta() {
  els.from.value = state.from; els.to.value = state.to;
  els.fromFlag.textContent = flag(state.from); els.toFlag.textContent = flag(state.to);
  els.fromName.textContent = state.currencies[state.from] || state.from;
  els.toName.textContent = state.currencies[state.to] || state.to;
  els.chartTitle.textContent = `${state.from} to ${state.to}`;
}
function renderConversion() {
  const amount = validAmount(els.amount.value);
  state.amount = amount;
  els.amount.setAttribute('aria-invalid', amount === null ? 'true' : 'false');
  if (amount === null) { els.result.textContent = 'Invalid'; return; }
  els.result.textContent = state.rate === null ? '—' : formatNumber(amount * state.rate, 6);
}
function setNotice(message='', type='') { els.notice.textContent = message; els.notice.className = `notice ${type}`.trim(); }
function setNetwork() {
  const online = navigator.onLine;
  els.network.className = `status-pill ${online ? 'online':'offline'}`;
  els.network.lastElementChild.textContent = online ? 'Online' : 'Offline';
  if (!online) setNotice('Offline — showing the last successfully cached rate when available.', 'warning');
}
function showRate(data, cached=false) {
  state.rate = Number(data.rate); state.date = data.date; state.fetchedAt = data.fetchedAt || Date.now();
  els.rate.textContent = `1 ${state.from} = ${formatNumber(state.rate, 6)} ${state.to}`;
  renderConversion();
  const oldDays = state.date ? Math.floor((Date.now() - new Date(`${state.date}T23:59:59Z`)) / 86400000) : 999;
  if (cached) setNotice(`Cached reference rate • source date ${formatDate(state.date)}${oldDays > 3 ? ' • data may be stale' : ''}`, oldDays > 3 ? 'warning' : '');
  else setNotice(`Latest available reference rate • source updated ${formatDate(state.date)}`);
}
function showChange(points) {
  els.change.className = 'change neutral'; els.change.textContent = 'No daily change';
  if (points.length < 2) return;
  const prev = points.at(-2).value, current = points.at(-1).value;
  const pct = ((current - prev) / prev) * 100;
  if (!Number.isFinite(pct)) return;
  els.change.textContent = `${pct > 0 ? '+':''}${pct.toFixed(2)}% daily`;
  els.change.className = `change ${pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'}`;
}

async function fetchJSON(url, signal) {
  const response = await fetch(url, {signal, headers:{Accept:'application/json'}, cache:'no-store'});
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  const data = await response.json();
  if (!data || typeof data !== 'object') throw new Error('Invalid API response');
  return data;
}
async function loadCurrencies() {
  try {
    const data = await fetchJSON(`${API}/currencies`);
    if (Object.keys(data).length < 10) throw new Error('Incomplete currency list');
    state.currencies = data; localStorage.setItem('cl-currencies', JSON.stringify(data));
  } catch {
    state.currencies = safeJSON(localStorage.getItem('cl-currencies'), FALLBACK_CURRENCIES);
  }
  if (!state.currencies[state.from]) state.from='USD';
  if (!state.currencies[state.to]) state.to='INR';
  renderCurrencyList(); renderCurrencyMeta();
}
async function loadRate({manual=false}={}) {
  if (state.controller) state.controller.abort();
  state.controller = new AbortController();
  els.refresh.classList.add('loading'); els.refresh.disabled = true;
  if (state.from === state.to) {
    const same = {rate:1,date:new Date().toISOString().slice(0,10),fetchedAt:Date.now()};
    showRate(same); await loadHistory(); finishRefresh(); return;
  }
  try {
    const data = await fetchJSON(`${API}/latest?from=${encodeURIComponent(state.from)}&to=${encodeURIComponent(state.to)}`, state.controller.signal);
    const rate = Number(data.rates?.[state.to]);
    if (!data.date || !Number.isFinite(rate) || rate <= 0) throw new Error('The API returned an invalid rate');
    const clean = {rate,date:data.date,fetchedAt:Date.now()};
    localStorage.setItem(cacheKey(), JSON.stringify(clean));
    showRate(clean);
    await loadHistory();
    if (manual) setNotice(`Refreshed • source updated ${formatDate(data.date)}`);
  } catch (error) {
    if (error.name === 'AbortError') return;
    const cached = safeJSON(localStorage.getItem(cacheKey()), null);
    if (cached && Number.isFinite(Number(cached.rate))) { showRate(cached, true); await loadHistory(true); }
    else { state.rate=null; els.rate.textContent='Rate unavailable'; renderConversion(); setNotice('No verified rate is available. Connect to the internet and try again.', 'error'); els.empty.hidden=false; }
  } finally { finishRefresh(); }
}
function finishRefresh() { els.refresh.classList.remove('loading'); els.refresh.disabled=false; }
function startDate(days) { const d=new Date(); d.setUTCDate(d.getUTCDate()-days-3); return d.toISOString().slice(0,10); }
function today() { return new Date().toISOString().slice(0,10); }
async function loadHistory(cachedOnly=false) {
  if (state.from === state.to) {
    const now=new Date(); state.history=Array.from({length:Math.min(state.range,30)},(_,i)=>({date:new Date(now-((Math.min(state.range,30)-1-i)*86400000)).toISOString().slice(0,10),value:1})); drawChart(); showChange(state.history); return;
  }
  const key=historyKey();
  try {
    if (cachedOnly) throw new Error('offline');
    const data=await fetchJSON(`${API}/${startDate(state.range)}..${today()}?from=${encodeURIComponent(state.from)}&to=${encodeURIComponent(state.to)}`);
    const points=Object.entries(data.rates || {}).map(([date,rates])=>({date,value:Number(rates[state.to])})).filter(p=>Number.isFinite(p.value)&&p.value>0).slice(-state.range);
    if (points.length < 2) throw new Error('Insufficient historical data');
    state.history=points; localStorage.setItem(key,JSON.stringify({points,fetchedAt:Date.now()}));
  } catch {
    const cached=safeJSON(localStorage.getItem(key),null);
    state.history=Array.isArray(cached?.points)?cached.points:[];
  }
  drawChart(); showChange(state.history);
}

function drawChart() {
  const canvas=els.chart, points=state.history;
  els.empty.hidden=points.length>1;
  els.empty.style.display=points.length>1?'none':'grid';
  if (points.length<2) { canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height); els.chartLow.textContent='Low —'; els.chartHigh.textContent='High —'; return; }
  const rect=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.max(1,Math.round(rect.width*dpr)); canvas.height=Math.max(1,Math.round(rect.height*dpr));
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const w=rect.width,h=rect.height,pad={t:18,r:8,b:26,l:8};
  const values=points.map(p=>p.value), min=Math.min(...values), max=Math.max(...values), spread=max-min||1;
  const x=i=>pad.l+(i/(points.length-1))*(w-pad.l-pad.r), y=v=>pad.t+(1-(v-min)/spread)*(h-pad.t-pad.b);
  ctx.clearRect(0,0,w,h); ctx.lineWidth=1; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--line').trim();
  for(let i=0;i<4;i++){const gy=pad.t+i*(h-pad.t-pad.b)/3;ctx.beginPath();ctx.moveTo(pad.l,gy);ctx.lineTo(w-pad.r,gy);ctx.stroke();}
  const grad=ctx.createLinearGradient(0,pad.t,0,h); grad.addColorStop(0,'rgba(46,230,166,.28)');grad.addColorStop(1,'rgba(46,230,166,0)');
  ctx.beginPath();points.forEach((p,i)=>{const px=x(i),py=y(p.value);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.lineTo(x(points.length-1),h-pad.b);ctx.lineTo(x(0),h-pad.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();points.forEach((p,i)=>{const px=x(i),py=y(p.value);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--emerald').trim();ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();ctx.font='10px system-ui';ctx.textAlign='left';ctx.fillText(new Intl.DateTimeFormat('en-IN',{month:'short',day:'numeric'}).format(new Date(points[0].date+'T12:00:00Z')),pad.l,h-6);ctx.textAlign='right';ctx.fillText(new Intl.DateTimeFormat('en-IN',{month:'short',day:'numeric'}).format(new Date(points.at(-1).date+'T12:00:00Z')),w-pad.r,h-6);
  els.chartLow.textContent=`Low ${formatNumber(min,4)}`;els.chartHigh.textContent=`High ${formatNumber(max,4)}`;
}

function persistPair() { localStorage.setItem('cl-preferences',JSON.stringify({from:state.from,to:state.to})); }
function commitCurrency(input,side) {
  const code=validCode(input.value);
  if (!code) { input.value=state[side]; setNotice(`Choose a supported three-letter currency code.`, 'error'); return; }
  if (state[side]===code) { renderCurrencyMeta(); return; }
  state[side]=code; persistPair(); renderCurrencyMeta(); state.rate=null; els.result.textContent='—'; loadRate();
}
function initTheme() {
  const saved=localStorage.getItem('cl-theme');
  const theme=saved || (matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  document.documentElement.dataset.theme=theme; document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#071b18':'#f2faf6';
}
function toggleTheme() { const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('cl-theme',next);document.querySelector('meta[name="theme-color"]').content=next==='dark'?'#071b18':'#f2faf6';drawChart(); }
function showInstallHelp() {
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent), standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  els.installSteps.replaceChildren();
  if (standalone) { els.installCopy.textContent='CurrencyLive is already running as an installed app.'; }
  else if (ios) { els.installCopy.textContent='Install using Safari:'; addSteps(['Tap the Share button in Safari.','Choose “Add to Home Screen”.','Tap “Add”.']); }
  else { els.installCopy.textContent='Install from your browser:'; addSteps(['Open the browser menu.','Choose “Install app” or “Add to Home screen”.','Confirm installation.']); }
  els.dialog.showModal();
}
function addSteps(steps){steps.forEach(text=>{const li=document.createElement('li');li.textContent=text;els.installSteps.append(li);});}

function bindEvents() {
  let amountTimer;
  els.amount.addEventListener('input',()=>{clearTimeout(amountTimer);amountTimer=setTimeout(renderConversion,30);});
  ['change','blur'].forEach(event=>{els.from.addEventListener(event,()=>commitCurrency(els.from,'from'));els.to.addEventListener(event,()=>commitCurrency(els.to,'to'));});
  [els.from,els.to].forEach(input=>input.addEventListener('input',()=>{input.value=input.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);}));
  els.swap.addEventListener('click',()=>{[state.from,state.to]=[state.to,state.from];persistPair();renderCurrencyMeta();els.swap.classList.remove('swapping');void els.swap.offsetWidth;els.swap.classList.add('swapping');loadRate();});
  els.refresh.addEventListener('click',()=>loadRate({manual:true})); els.theme.addEventListener('click',toggleTheme);
  document.querySelectorAll('[data-range]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('active',b===btn));state.range=Number(btn.dataset.range);loadHistory();}));
  window.addEventListener('online',()=>{setNetwork();loadRate();});window.addEventListener('offline',setNetwork);window.addEventListener('resize',()=>requestAnimationFrame(drawChart));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e;els.install.hidden=false;});
  els.install.addEventListener('click',async()=>{if(state.deferredInstall){state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;els.install.hidden=true;}else showInstallHelp();});
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { els.install.hidden=false; }
  window.addEventListener('appinstalled',()=>{els.install.hidden=true;setNotice('CurrencyLive installed successfully.');});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-(state.fetchedAt||0)>REFRESH_MS)loadRate();});
}
async function init() {
  initTheme();setNetwork();bindEvents();
  const pref=safeJSON(localStorage.getItem('cl-preferences'),{from:'USD',to:'INR'});state.from=pref.from||'USD';state.to=pref.to||'INR';
  await loadCurrencies();
  const cached=safeJSON(localStorage.getItem(cacheKey()),null);if(cached)showRate(cached,true);
  await loadRate();
  if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('./sw.js');}catch{setNotice('Offline installation support could not be enabled.', 'warning');}}
  setInterval(()=>{if(!document.hidden&&navigator.onLine)loadRate();},REFRESH_MS);
}
init();
