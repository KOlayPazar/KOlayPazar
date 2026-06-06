/* KOlayPazar V9.12 - Silme + Kâr Analizi + Veri Senkron Düzeltmesi
   Bu dosya eski V8.9 verisini korur, V9 panelini doldurur, silinen kaydı geri getirmez. */

const V9_KEY = 'kolaypazar_v9_records';
const V8_KEY = 'KOlayPazar_data_v1';
const DELETED_KEY = 'KOlayPazar_deleted_records_v9';
const LEGACY_KEYS = ['KOlayPazar_data_v1','kolaypazarData','KOlayPazar_v59','KOlayPazar_v60','kp_records','records','marketRecords'];

const fmt = n => Number(n || 0).toLocaleString('tr-TR');
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const byId = id => document.getElementById(id);
const num = v => {
  if (typeof v === 'string') v = v.replace(/\s/g,'').replace(/M$/i,'').replace(/\./g,'').replace(',', '.');
  return Number(v) || 0;
};
const first = (obj, keys, fallback='') => {
  for (const k of keys) {
    const v = obj && obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
};

const itemEmoji = name => {
  const n = String(name || '').toLowerCase();
  if (n.includes('scroll')) return '📜';
  if (n.includes('fragment') || n.includes('gem') || n.includes('crystal')) return '💎';
  if (n.includes('coin')) return '🪙';
  if (n.includes('weapon') || n.includes('breaker')) return '🔮';
  return '⚔️';
};

let records = loadRecords();
let pendingAction = null;

function readJson(key){
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch(e){ return null; }
}

function writeJson(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
}

function getDeleted(){
  const d = readJson(DELETED_KEY);
  return d && typeof d === 'object' ? d : {ids:[], sigs:[]};
}

function saveDeleted(d){ writeJson(DELETED_KEY, {ids:[...new Set(d.ids||[])], sigs:[...new Set(d.sigs||[])]}); }

function signature(r){
  return [
    String(getItemName(r)).toLowerCase().trim(),
    String(getQty(r)),
    String(getUnitPrice(r)),
    String(first(r,['date','createdAt','time','created'],''))
  ].join('|');
}

function isDeleted(r){
  const d = getDeleted();
  return d.ids?.includes(String(r.id)) || d.sigs?.includes(signature(r));
}

function getItemName(r){
  return String(first(r, ['itemName','item','name','title','item_name','itemAdi','itemAdı','urun','ürün','product','label','text','itemText'], 'İsimsiz İtem'));
}
function getQty(r){ return Math.max(1, num(first(r, ['qty','quantity','adet','count','stock','kalan'], 1)) || 1); }
function getUnitPrice(r){ return num(first(r, ['unitPrice','unit','price','fiyat','birimFiyat','alis','alış','satis','satış','sellPrice','salePrice','buyPrice','value'], 0)); }
function getRarity(r){ return String(first(r, ['rarity','rare','grade','quality'], 'Normal')); }
function getType(r){
  const raw = String(first(r, ['type','marketType','category'], '')).toLowerCase();
  if (raw === 'buy' || raw.includes('alış') || raw.includes('alis') || raw.includes('alım') || raw.includes('alim')) return 'buy';
  return 'sell';
}

function isDemoRecord(r){
  const name = getItemName(r).toLowerCase().trim();
  const qty = getQty(r);
  const unit = getUnitPrice(r);
  const type = getType(r);
  const demo = [
    ['sell','upgrade scroll',200,50000], ['sell','fragment of sloth',100,1200000],
    ['sell','gem of life',50,2500000], ['sell','weapon breaker',150,650000], ['sell','old coins',1000,100000],
    ['buy','upgrade scroll',200,45000], ['buy','fragment of sloth',100,1000000],
    ['buy','gem of life',50,2200000], ['buy','weapon breaker',150,600000], ['buy','old coins',1000,90000]
  ];
  return demo.some(([dt,dn,dq,du]) => type === dt && name === dn && qty === dq && unit === du);
}

function cleanDemoRecords(arr){ return Array.isArray(arr) ? arr.filter(r => !isDemoRecord(r)) : []; }

function normalizeRecord(r){
  r = r || {};
  const qty = getQty(r);
  const completedRaw = num(first(r, ['completed','done','soldQty','sold','satilan','satılan','alinan','alınan'], 0));
  const remainingRaw = first(r, ['remaining','remain','kalan'], null);
  let completed = Math.max(0, Math.min(qty, completedRaw));
  let remaining = remainingRaw === null ? Math.max(0, qty - completed) : Math.max(0, Math.min(qty, num(remainingRaw)));
  const type = getType(r);
  const oldStatus = String(first(r, ['status','durum'], '')).toLowerCase();

  if ((oldStatus.includes('sat') || oldStatus.includes('alınd') || oldStatus.includes('alindi')) && completed === 0 && remaining === qty) {
    completed = qty; remaining = 0;
  }

  let status = first(r, ['status','durum'], 'Beklemede');
  if (type === 'sell') status = remaining === 0 ? 'Satıldı' : completed > 0 ? 'Kısmi Satıldı' : 'Beklemede';
  if (type === 'buy') status = remaining === 0 ? 'Alındı' : completed > 0 ? 'Kısmi Alındı' : 'Beklemede';

  return {
    ...r,
    id: String(r.id || uid()),
    type,
    itemName: getItemName(r),
    item: getItemName(r),
    qty,
    quantity: qty,
    remaining,
    completed,
    unitPrice: getUnitPrice(r),
    unit: getUnitPrice(r),
    total: qty * getUnitPrice(r),
    rarity: getRarity(r),
    status,
    date: first(r, ['date','createdAt','time','created'], new Date().toISOString())
  };
}

function getArrayFromParsed(parsed){
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.records)) return parsed.records;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  if (parsed && Array.isArray(parsed.marketRecords)) return parsed.marketRecords;
  if (parsed && Array.isArray(parsed.stock)) return parsed.stock;
  return [];
}

function getLegacyRecords(){
  let best = {key:null, records:[]};
  for (const key of [...new Set([...LEGACY_KEYS, ...Object.keys(localStorage || {})])]) {
    const arr = getArrayFromParsed(readJson(key));
    if (arr.length > best.records.length) best = {key, records:arr};
  }
  return best;
}

function loadRecords(){
  const existingV9 = cleanDemoRecords(getArrayFromParsed(readJson(V9_KEY))).map(normalizeRecord).filter(r => !isDeleted(r));
  const legacy = getLegacyRecords();
  const legacyRecords = cleanDemoRecords(legacy.records).map(normalizeRecord).filter(r => !isDeleted(r));

  // Önemli düzeltme: V9 doluysa her açılışta V8.9'dan yeniden kopyalama yapma.
  // Aksi halde silinen kayıtlar eski anahtardan tekrar geri geliyordu.
  if (existingV9.length) {
    writeJson(V9_KEY, existingV9);
    syncV8Data(existingV9);
    return existingV9;
  }

  if (legacyRecords.length) {
    try { localStorage.setItem('KOlayPazar_v9_migration_backup_' + new Date().toISOString().slice(0,10), JSON.stringify({sourceKey: legacy.key, records: legacy.records})); } catch(e) {}
    writeJson(V9_KEY, legacyRecords);
    syncV8Data(legacyRecords);
    return legacyRecords;
  }

  return [];
}

function syncV8Data(arr){
  const old = readJson(V8_KEY);
  const normalized = arr.map(normalizeRecord);
  if (old && !Array.isArray(old) && typeof old === 'object') {
    old.records = normalized;
    if (!old.settings) old.settings = {taxRate: 3};
    writeJson(V8_KEY, old);
  } else {
    writeJson(V8_KEY, {records: normalized, settings:{taxRate:3}});
  }
  // Eski inline kodların kullandığı global data varsa onu da güncelle.
  if (window.data && typeof window.data === 'object') {
    window.data.records = normalized;
    if (!window.data.settings) window.data.settings = {taxRate:3};
  }
}

function save(){
  records = records.map(normalizeRecord).filter(r => !isDeleted(r));
  writeJson(V9_KEY, records);
  syncV8Data(records);
}

function badge(r){
  const st = String(r.status || 'Beklemede');
  const cls = st.includes('Kısmi') ? 'partial part' : (st.includes('Satıldı') || st.includes('Alındı')) ? 'done ok' : 'waiting';
  const detail = st.includes('Kısmi') ? `<br>(${fmt(r.completed)}/${fmt(r.qty)})` : '';
  return `<span class="badge v9badge ${cls}">${esc(st)}</span>${detail}`;
}

function row(r){
  const amountQty = Number(r.remaining || 0);
  const total = amountQty * Number(r.unitPrice || 0);
  return `<tr>
    <td><div class="item-cell v9item"><div class="item-icon v9itemIcon">${itemEmoji(r.itemName)}</div><div><b>${esc(r.itemName)}</b><span class="rarity"><small>${esc(r.rarity)}</small></span></div></div></td>
    <td>${fmt(amountQty)}</td><td>${fmt(r.unitPrice)} M</td><td>${fmt(total)} M</td><td>${badge(r)}</td>
    <td><div class="actions v9actions"><button type="button" class="icon-btn" onclick="openAction('${esc(r.id)}')">✎</button><button type="button" class="icon-btn del" onclick="removeRecord('${esc(r.id)}')">🗑</button></div></td>
  </tr>`;
}

function emptyRow(msg='Henüz kayıt yok.'){return `<tr><td colspan="6" style="text-align:center;color:#b8aa93;padding:24px" class="v9empty">${msg}</td></tr>`}
function value(type, field){ return records.filter(r=>r.type===type).reduce((a,r)=>a+(Number(r[field]||0)*Number(r.unitPrice||0)),0); }
function isSold(r){ return r.status === 'Satıldı' || r.status === 'Kısmi Satıldı' || Number(r.completed || 0) > 0; }
function recTotal(r){ return Number(r.qty || 0) * Number(r.unitPrice || 0); }
function soldTotal(r){ return Number(r.completed || 0) * Number(r.unitPrice || 0); }
function calcProfit(){
  // Buy kayıt yoksa V8.9 mantığında satış toplamını kâr olarak gösterir.
  const sellTotal = records.filter(r=>r.type==='sell' && isSold(r)).reduce((a,r)=>a+soldTotal(r),0);
  const buyTotal = records.filter(r=>r.type==='buy' && isSold(r)).reduce((a,r)=>a+soldTotal(r),0);
  return sellTotal - buyTotal;
}

function setText(id, val){ const el = byId(id); if (el) el.textContent = val; }
function setHTML(id, val){ const el = byId(id); if (el) el.innerHTML = val; }

function render(){
  records = records.map(normalizeRecord).filter(r => !isDeleted(r));
  const sell = records.filter(r=>r.type==='sell');
  const buy = records.filter(r=>r.type==='buy');
  const sales = records.filter(isSold);
  const pending = records.filter(r=>Number(r.remaining||0)>0);
  const profit = calcProfit();
  const capital = pending.reduce((a,r)=>a+(Number(r.remaining||0)*Number(r.unitPrice||0)),0) + Math.max(profit,0);

  setHTML('sellTable', sell.map(row).join('') || emptyRow());
  setHTML('buyTable', buy.map(row).join('') || emptyRow());
  setHTML('v9SellRows', sell.map(row).join('') || emptyRow('Henüz Sell Pazar kaydı yok.'));
  setHTML('v9BuyRows', buy.map(row).join('') || emptyRow('Henüz Buy Pazar kaydı yok.'));

  setText('sellWaiting', fmt(value('sell','remaining')));
  setText('sellSold', fmt(value('sell','completed')));
  setText('buyWaiting', fmt(value('buy','remaining')));
  setText('buyTaken', fmt(value('buy','completed')));
  setText('v9SellPending', fmt(value('sell','remaining')) + ' M');
  setText('v9SellDone', fmt(value('sell','completed')) + ' M');
  setText('v9BuyPending', fmt(value('buy','remaining')) + ' M');
  setText('v9BuyDone', fmt(value('buy','completed')) + ' M');

  setText('walletBalance', fmt(Math.max(value('sell','completed') - value('buy','completed'),0)));
  setText('totalCapital', fmt(capital));
  setText('totalProfit', fmt(profit));
  setText('activeListings', fmt(pending.length));
  setText('completedCount', fmt(records.filter(r=>Number(r.remaining||0)===0).length));
  setText('v9Capital', fmt(capital) + ' M');
  setText('v9Profit', fmt(profit) + ' M');
  setText('v9Active', fmt(pending.length));
  setText('v9Done', fmt(records.filter(r=>Number(r.remaining||0)===0).length));

  const best = sales.slice().sort((a,b)=>soldTotal(b)-soldTotal(a))[0];
  setHTML('v9ProfitExample', best ? `<b>${esc(best.itemName)}</b><br>Satış: ${fmt(soldTotal(best))} M<br>Net Kâr: <b class="green">${fmt(soldTotal(best))} M</b>` : 'Henüz satış verisi yok.');

  renderStockPage();
  renderProfitPage();
  renderHistoryPage();
  save();
}

function renderStockPage(){
  const stock = records.filter(r => r.type === 'sell' && Number(r.remaining || 0) > 0);
  if (byId('stockList')) {
    byId('stockList').innerHTML = stock.map(r => `<div class="listrow"><div><b>${esc(r.itemName)}</b><br><span class="muted">${fmt(r.remaining)} adet · Alış/Değer ${fmt(r.unitPrice)} M · ${esc(r.status)}</span></div><div><button type="button" onclick="openAction('${esc(r.id)}')">Satıldı</button><button type="button" onclick="openAction('${esc(r.id)}')">Düzenle</button></div></div>`).join('') || '<div class="muted">Stok kaydı yok.</div>';
  }
  setText('stockValue', fmt(stock.reduce((a,r)=>a+(r.remaining*r.unitPrice),0)) + ' M');
  setText('stockCount', fmt(stock.reduce((a,r)=>a+Number(r.remaining||0),0)));
  setText('pendingProfit', fmt(stock.reduce((a,r)=>a+(r.remaining*r.unitPrice),0)) + ' M');
}

function renderProfitPage(){
  const sales = records.filter(isSold);
  const gross = sales.reduce((a,r)=>a+soldTotal(r),0);
  const taxRate = Number((readJson(V8_KEY)?.settings?.taxRate) ?? (window.data?.settings?.taxRate) ?? 3) || 3;
  const tax = gross * taxRate / 100;
  const net = calcProfit() - tax;

  setText('profit', fmt(net) + ' M');
  setText('profitSummary', fmt(net) + ' M');

  // Eski/V8.9 kâr sayfasındaki muhtemel kutular.
  const profitCards = Array.from(document.querySelectorAll('.card,.box,.panel,.summary-card')).filter(el => /kâr|kar|zarar|brüt|vergi/i.test(el.textContent));
  // ID yoksa da kutular boş kalmasın diye sadece güvenli bilinen alanları dolduruyoruz.
  if (byId('profitList')) {
    byId('profitList').innerHTML = sales.map(r => `<div class="listrow"><div><b>${esc(r.itemName)}</b><br><span class="muted">${fmt(r.completed)} adet · ${fmt(r.unitPrice)} M</span></div><b>${fmt(soldTotal(r))} M</b></div>`).join('') || '<div class="muted">Henüz satış kaydı yok.</div>';
  }
  const el = byId('profitSummary');
  if (el) {
    el.innerHTML = `<div><b>Brüt Satış</b><br>${fmt(gross)} M</div><div><b>Toplam Vergi</b><br>-${fmt(tax)} M</div><div><b>Net Kâr / Zarar</b><br>${fmt(net)} M</div>`;
  }
}

function renderHistoryPage(){
  const sales = records.filter(isSold);
  if (byId('sellHistory')) byId('sellHistory').innerHTML = sales.filter(r=>r.type==='sell').map(r=>`<div class="listrow"><b>${esc(r.itemName)}</b><span>${fmt(soldTotal(r))} M</span></div>`).join('') || '<div class="muted">Satış geçmişi yok.</div>';
  if (byId('buyHistory')) byId('buyHistory').innerHTML = sales.filter(r=>r.type==='buy').map(r=>`<div class="listrow"><b>${esc(r.itemName)}</b><span>${fmt(soldTotal(r))} M</span></div>`).join('') || '<div class="muted">Alış geçmişi yok.</div>';
}

function openAction(id){
  const r = records.find(x=>String(x.id)===String(id)); if(!r) return;
  pendingAction = String(id);
  const dTitle = byId('dialogTitle'); if (dTitle) dTitle.textContent = r.type==='sell' ? 'Satılan Adet Gir' : 'Alınan Adet Gir';
  const dDesc = byId('dialogDesc'); if (dDesc) dDesc.textContent = `${r.itemName} için maksimum ${fmt(r.remaining)} adet işlem yapılabilir.`;
  const qtyEl = byId('actionQty'); if (qtyEl) { qtyEl.value = Math.min(1,r.remaining); qtyEl.max = r.remaining; }
  const dlg = byId('actionDialog'); if (dlg && dlg.showModal) dlg.showModal();
}

function applyAction(){
  const r = records.find(x=>String(x.id)===String(pendingAction)); if(!r) return;
  const qtyEl = byId('actionQty');
  const q = Math.max(0, Math.min(num(qtyEl?.value || 0), Number(r.remaining || 0)));
  if(q > 0){
    r.completed = Number(r.completed || 0) + q;
    r.remaining = Number(r.remaining || 0) - q;
    r.status = r.remaining === 0 ? (r.type === 'sell' ? 'Satıldı' : 'Alındı') : (r.type === 'sell' ? 'Kısmi Satıldı' : 'Kısmi Alındı');
  }
  render(); toast('Stok güncellendi');
}

function removeRecord(id){
  if(!confirm('Bu ilan silinsin mi?')) return;
  const target = records.find(r => String(r.id) === String(id));
  const deleted = getDeleted();
  deleted.ids.push(String(id));
  if (target) deleted.sigs.push(signature(target));
  saveDeleted(deleted);
  records = records.filter(r => String(r.id) !== String(id) && !isDeleted(r));
  save();
  render();
  toast('Kayıt silindi');
}
function deleteRecord(id){ removeRecord(id); }
function deleteItem(id){ removeRecord(id); }
function silRecord(id){ removeRecord(id); }

function toast(msg){
  const t=document.createElement('div');
  t.textContent=msg;
  t.style.cssText='position:fixed;right:18px;bottom:18px;background:#142015;border:1px solid #6ca85c;color:#fff;padding:14px 18px;border-radius:10px;z-index:9999;box-shadow:0 10px 40px #000';
  document.body.appendChild(t); setTimeout(()=>t.remove(),1800);
}

function bind(){
  const marketForm = byId('marketForm');
  if (marketForm && !marketForm.dataset.bound) {
    marketForm.dataset.bound = '1';
    marketForm.addEventListener('submit', e=>{
      e.preventDefault();
      const qty = Math.max(1, num(byId('qty')?.value) || 1);
      const type = byId('type')?.value || 'sell';
      const name = byId('itemName')?.value?.trim() || 'İsimsiz İtem';
      const unit = num(byId('unitPrice')?.value);
      records.unshift(normalizeRecord({id:uid(), type, itemName:name, qty, remaining:qty, completed:0, unitPrice:unit, rarity:byId('rarity')?.value || 'Regular', status:'Beklemede', date:new Date().toISOString()}));
      e.target.reset(); render(); toast('İlan kaydedildi');
    });
  }
  const actionForm = byId('actionForm');
  if (actionForm && !actionForm.dataset.bound) {
    actionForm.dataset.bound = '1';
    actionForm.addEventListener('submit', e=>{ e.preventDefault(); applyAction(); const dlg=byId('actionDialog'); if(dlg?.close) dlg.close(); });
  }
  document.querySelectorAll('.mini-add').forEach(b=>{
    if (b.dataset.bound) return; b.dataset.bound='1';
    b.onclick=()=>{ const typeEl=byId('type'); if(typeEl) typeEl.value=b.dataset.set || 'sell'; byId('itemName')?.focus(); window.scrollTo({top:0,behavior:'smooth'}); };
  });
}

window.removeRecord = removeRecord;
window.deleteRecord = deleteRecord;
window.deleteItem = deleteItem;
window.silRecord = silRecord;
window.openAction = openAction;
window.renderV9Dashboard = render;
window.renderStock = renderStockPage;
window.renderProfitPage = renderProfitPage;
window.renderHistoryPage = renderHistoryPage;

bind();
render();
console.log('KOlayPazar V9.12 aktif: silme, kâr analizi ve veri senkron düzeltildi.');
