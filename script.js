const V9_KEY = 'kolaypazar_v9_records';
const V8_KEY = 'KOlayPazar_data_v1';
const LEGACY_KEYS = ['KOlayPazar_data_v1','kolaypazarData','KOlayPazar_v59','KOlayPazar_v60','kp_records','records','marketRecords'];

const fmt = n => Number(n||0).toLocaleString('tr-TR');
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const itemEmoji = name => {
  const n = String(name||'').toLowerCase();
  if(n.includes('scroll')) return '📜';
  if(n.includes('fragment')) return '💎';
  if(n.includes('gem')) return '♦️';
  if(n.includes('weapon')) return '🔮';
  if(n.includes('coin')) return '🪙';
  return '⚔️';
};

let records = loadRecords();
let pendingAction = null;

function readJson(key){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

function isDemoRecord(r){
  const name = String(r.itemName || r.item || '').toLowerCase().trim();
  const qty = Number(r.qty ?? r.quantity ?? 0) || 0;
  const unit = Number(r.unitPrice ?? r.unit ?? r.price ?? 0) || 0;
  const type = String(r.type || '').toLowerCase();
  const demo = [
    ['sell','upgrade scroll',200,50000],
    ['sell','fragment of sloth',100,1200000],
    ['sell','gem of life',50,2500000],
    ['sell','weapon breaker',150,650000],
    ['sell','old coins',1000,100000],
    ['buy','upgrade scroll',200,45000],
    ['buy','fragment of sloth',100,1000000],
    ['buy','gem of life',50,2200000],
    ['buy','weapon breaker',150,600000],
    ['buy','old coins',1000,90000],
  ];
  return demo.some(([dt,dn,dq,du]) => type === dt && name === dn && qty === dq && unit === du);
}

function looksLikeDemo(arr){
  if(!Array.isArray(arr)) return false;
  return arr.filter(isDemoRecord).length >= 5;
}

function cleanDemoRecords(arr){
  return Array.isArray(arr) ? arr.filter(r => !isDemoRecord(r)) : [];
}

function normalizeV9Record(r){
  const qty = Math.max(1, Number(r.qty ?? r.quantity ?? 1) || 1);
  const completed = Math.max(0, Math.min(qty, Number(r.completed ?? 0) || 0));
  const remaining = Math.max(0, Math.min(qty, Number(r.remaining ?? (qty - completed)) || 0));
  const type = (r.type === 'buy' || r.type === 'sell') ? r.type : 'sell';
  let status = r.status || 'Beklemede';
  if(type === 'sell') status = remaining === 0 ? 'Satıldı' : completed > 0 ? 'Kısmi Satıldı' : 'Beklemede';
  if(type === 'buy') status = remaining === 0 ? 'Alındı' : completed > 0 ? 'Kısmi Alındı' : 'Beklemede';
  return {
    id: String(r.id || uid()),
    type,
    itemName: String(r.itemName || r.item || 'İsimsiz İtem'),
    qty,
    remaining,
    completed,
    unitPrice: Number(r.unitPrice ?? r.unit ?? r.price ?? 0) || 0,
    rarity: String(r.rarity || 'Regular'),
    status,
    date: r.date || new Date().toISOString(),
    migratedFrom: r.migratedFrom || undefined
  };
}

function legacyToV9(r){
  const qty = Math.max(1, Number(r.qty ?? r.quantity ?? 1) || 1);
  const unitPrice = Number(r.unit ?? r.unitPrice ?? r.price ?? 0) || 0;
  const oldType = String(r.type || '').toLowerCase();
  const oldStatus = String(r.status || '').toLowerCase();
  const sold = oldType.includes('sat') || oldStatus.includes('sat');
  // V8.9'da Alış/Drop kayıtları çoğunlukla eldeki stok anlamına geliyordu.
  // Bu yüzden eski kayıtlar V9'da Sell Pazar tarafına taşınır; satış olanlar tamamlandı görünür.
  const completed = sold ? qty : 0;
  const remaining = sold ? 0 : qty;
  return {
    id: String(r.id || uid()),
    type: 'sell',
    itemName: String(r.item || r.itemName || 'İsimsiz İtem'),
    qty,
    remaining,
    completed,
    unitPrice,
    rarity: String(r.rarity || 'Regular'),
    status: sold ? 'Satıldı' : 'Beklemede',
    date: r.date || new Date().toISOString(),
    migratedFrom: 'v8.9'
  };
}

function getLegacyRecords(){
  for(const key of LEGACY_KEYS){
    const parsed = readJson(key);
    let arr = [];
    if(Array.isArray(parsed)) arr = parsed;
    else if(parsed && Array.isArray(parsed.records)) arr = parsed.records;
    if(arr.length) return {key, records: arr};
  }
  return {key:null, records:[]};
}

function loadRecords(){
  const existingV9 = readJson(V9_KEY);
  const legacy = getLegacyRecords();
  const hasLegacy = legacy.records.length > 0;

  const v9HasDemo = looksLikeDemo(existingV9);
  const cleanV9 = cleanDemoRecords(existingV9).map(normalizeV9Record);

  if(hasLegacy){
    try{
      localStorage.setItem('KOlayPazar_v9_migration_backup_' + new Date().toISOString().slice(0,10), JSON.stringify({sourceKey: legacy.key, records: legacy.records, oldV9: existingV9 || []}));
    }catch(e){}
    const migrated = legacy.records.map(legacyToV9);
    // V9 içindeki gerçek kullanıcı kayıtlarını koru, demo kayıtlarını at.
    const merged = [...migrated];
    for(const r of cleanV9){
      const same = merged.some(x => x.id === r.id || (x.itemName === r.itemName && x.qty === r.qty && x.unitPrice === r.unitPrice && x.date === r.date));
      if(!same) merged.push(r);
    }
    localStorage.setItem(V9_KEY, JSON.stringify(merged));
    return merged;
  }

  if(Array.isArray(existingV9) && existingV9.length){
    // Eski V9 demo kayıtları tarayıcıda kalmışsa burada temizlenir.
    localStorage.setItem(V9_KEY, JSON.stringify(cleanV9));
    return cleanV9;
  }

  // Kritik: Artık demo veriler yüklenmez. Veri yoksa site boş başlar.
  return [];
}

function save(){ localStorage.setItem(V9_KEY, JSON.stringify(records)); }

function badge(r){
  const cls = r.status.includes('Kısmi') ? 'partial' : (r.status.includes('Satıldı') || r.status.includes('Alındı')) ? 'done' : 'waiting';
  const detail = r.status.includes('Kısmi') ? `<br>(${fmt(r.completed)}/${fmt(r.qty)})` : '';
  return `<span class="badge ${cls}">${esc(r.status)}</span>${detail}`;
}

function row(r){
  const amountQty = Number(r.remaining || 0);
  const total = amountQty * Number(r.unitPrice || 0);
  return `<tr>
    <td><div class="item-cell"><div class="item-icon">${itemEmoji(r.itemName)}</div><div><b>${esc(r.itemName)}</b><span class="rarity">${esc(r.rarity)}</span></div></div></td>
    <td>${fmt(amountQty)}</td><td>${fmt(r.unitPrice)}</td><td>${fmt(total)}</td><td>${badge(r)}</td>
    <td><div class="actions"><button class="icon-btn" onclick="openAction('${r.id}')">✎</button><button class="icon-btn del" onclick="removeRecord('${r.id}')">🗑</button></div></td>
  </tr>`;
}

function render(){
  document.getElementById('sellTable').innerHTML = records.filter(r=>r.type==='sell').map(row).join('') || emptyRow();
  document.getElementById('buyTable').innerHTML = records.filter(r=>r.type==='buy').map(row).join('') || emptyRow();
  document.getElementById('sellWaiting').textContent = fmt(value('sell','remaining'));
  document.getElementById('sellSold').textContent = fmt(value('sell','completed'));
  document.getElementById('buyWaiting').textContent = fmt(value('buy','remaining'));
  document.getElementById('buyTaken').textContent = fmt(value('buy','completed'));
  const wallet = value('sell','completed') - value('buy','completed');
  document.getElementById('walletBalance').textContent = fmt(Math.max(wallet,0));
  document.getElementById('totalCapital').textContent = fmt(value('sell','remaining') + value('buy','remaining'));
  document.getElementById('totalProfit').textContent = fmt(calcProfit());
  document.getElementById('activeListings').textContent = fmt(records.filter(r=>r.remaining>0).length);
  document.getElementById('completedCount').textContent = fmt(records.filter(r=>r.remaining===0).length);
  save();
}

function emptyRow(){return `<tr><td colspan="6" style="text-align:center;color:#b8aa93;padding:24px">Henüz kayıt yok.</td></tr>`}
function value(type, field){return records.filter(r=>r.type===type).reduce((a,r)=>a+(Number(r[field]||0)*Number(r.unitPrice||0)),0)}
function calcProfit(){
  const sellTotal = records.filter(r=>r.type==='sell' && r.completed>0).reduce((a,r)=>a+r.completed*r.unitPrice,0);
  const buyTotal = records.filter(r=>r.type==='buy' && r.completed>0).reduce((a,r)=>a+r.completed*r.unitPrice,0);
  return Math.max(sellTotal-buyTotal,0);
}

document.getElementById('marketForm').addEventListener('submit', e=>{
  e.preventDefault();
  const typeEl = document.getElementById('type');
  const itemEl = document.getElementById('itemName');
  const qtyEl = document.getElementById('qty');
  const unitEl = document.getElementById('unitPrice');
  const rarityEl = document.getElementById('rarity');
  const qty = Math.max(1, Number(qtyEl.value) || 1);
  const type = typeEl.value;
  records.unshift({id:uid(), type, itemName:itemEl.value.trim(), qty, remaining:qty, completed:0, unitPrice:Number(unitEl.value)||0, rarity:rarityEl.value, status:'Beklemede', date:new Date().toISOString()});
  e.target.reset(); render(); toast('İlan kaydedildi');
});

document.querySelectorAll('.mini-add').forEach(b=>b.onclick=()=>{ document.getElementById('type').value=b.dataset.set; document.getElementById('itemName').focus(); window.scrollTo({top:0,behavior:'smooth'}); });
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active')); b.classList.add('active');});

function openAction(id){
  const r = records.find(x=>x.id===id); if(!r) return;
  pendingAction=id;
  document.getElementById('dialogTitle').textContent = r.type==='sell' ? 'Satılan Adet Gir' : 'Alınan Adet Gir';
  document.getElementById('dialogDesc').textContent = `${r.itemName} için maksimum ${fmt(r.remaining)} adet işlem yapılabilir.`;
  const qtyEl = document.getElementById('actionQty');
  qtyEl.value = Math.min(1,r.remaining); qtyEl.max = r.remaining;
  document.getElementById('actionDialog').showModal();
}

document.getElementById('actionForm').addEventListener('submit', e=>{
  const r = records.find(x=>x.id===pendingAction); if(!r) return;
  const qtyEl = document.getElementById('actionQty');
  const q = Math.max(0, Math.min(Number(qtyEl.value||0), r.remaining));
  if(q>0){ r.completed += q; r.remaining -= q; r.status = r.remaining===0 ? (r.type==='sell'?'Satıldı':'Alındı') : (r.type==='sell'?'Kısmi Satıldı':'Kısmi Alındı'); }
  render(); toast('Stok güncellendi');
});

function removeRecord(id){ if(confirm('Bu ilan silinsin mi?')){records=records.filter(r=>r.id!==id); render();} }
function toast(msg){ const t=document.createElement('div'); t.textContent=msg; t.style.cssText='position:fixed;right:18px;bottom:18px;background:#142015;border:1px solid #6ca85c;color:#fff;padding:14px 18px;border-radius:10px;z-index:99;box-shadow:0 10px 40px #000'; document.body.appendChild(t); setTimeout(()=>t.remove(),1800); }

console.log('KOlayPazar V9.2 veri korumalı sürüm aktif - demo temizleme açık');
render();
