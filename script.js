const fmt = n => Number(n||0).toLocaleString('tr-TR');
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const itemEmoji = name => {
  const n = name.toLowerCase();
  if(n.includes('scroll')) return '📜'; if(n.includes('fragment')) return '💎'; if(n.includes('gem')) return '♦️'; if(n.includes('weapon')) return '🔮'; if(n.includes('coin')) return '🪙'; return '⚔️';
};
let records = JSON.parse(localStorage.getItem('kolaypazar_v9_records') || 'null') || [
  {id:uid(), type:'sell', itemName:'Upgrade Scroll', qty:200, remaining:200, completed:0, unitPrice:50000, rarity:'Regular', status:'Beklemede'},
  {id:uid(), type:'sell', itemName:'Fragment of Sloth', qty:100, remaining:0, completed:100, unitPrice:1200000, rarity:'Regular', status:'Satıldı'},
  {id:uid(), type:'sell', itemName:'Gem of Life', qty:50, remaining:20, completed:30, unitPrice:2500000, rarity:'Regular', status:'Kısmi Satıldı'},
  {id:uid(), type:'sell', itemName:'Weapon Breaker', qty:150, remaining:150, completed:0, unitPrice:650000, rarity:'Regular', status:'Beklemede'},
  {id:uid(), type:'sell', itemName:'Old Coins', qty:1000, remaining:0, completed:1000, unitPrice:100000, rarity:'Regular', status:'Satıldı'},
  {id:uid(), type:'buy', itemName:'Upgrade Scroll', qty:200, remaining:200, completed:0, unitPrice:45000, rarity:'Regular', status:'Beklemede'},
  {id:uid(), type:'buy', itemName:'Fragment of Sloth', qty:100, remaining:60, completed:40, unitPrice:1000000, rarity:'Regular', status:'Kısmi Alındı'},
  {id:uid(), type:'buy', itemName:'Gem of Life', qty:50, remaining:50, completed:0, unitPrice:2200000, rarity:'Regular', status:'Beklemede'},
  {id:uid(), type:'buy', itemName:'Weapon Breaker', qty:150, remaining:0, completed:150, unitPrice:600000, rarity:'Regular', status:'Alındı'},
  {id:uid(), type:'buy', itemName:'Old Coins', qty:1000, remaining:400, completed:600, unitPrice:90000, rarity:'Regular', status:'Kısmi Alındı'}
];
let pendingAction = null;
function save(){ localStorage.setItem('kolaypazar_v9_records', JSON.stringify(records)); }
function badge(r){
  const cls = r.status.includes('Kısmi') ? 'partial' : (r.status.includes('Satıldı') || r.status.includes('Alındı')) ? 'done' : 'waiting';
  const detail = r.status.includes('Kısmi') ? `<br>(${fmt(r.completed)}/${fmt(r.qty)})` : '';
  return `<span class="badge ${cls}">${r.status}</span>${detail}`;
}
function row(r){
  const amountQty = r.type==='sell' ? r.remaining : r.remaining;
  const total = r.type==='sell' ? r.remaining*r.unitPrice : r.remaining*r.unitPrice;
  return `<tr>
    <td><div class="item-cell"><div class="item-icon">${itemEmoji(r.itemName)}</div><div><b>${r.itemName}</b><span class="rarity">${r.rarity}</span></div></div></td>
    <td>${fmt(amountQty)}</td><td>${fmt(r.unitPrice)}</td><td>${fmt(total)}</td><td>${badge(r)}</td>
    <td><div class="actions"><button class="icon-btn" onclick="openAction('${r.id}')">✎</button><button class="icon-btn del" onclick="removeRecord('${r.id}')">🗑</button></div></td>
  </tr>`;
}
function render(){
  document.getElementById('sellTable').innerHTML = records.filter(r=>r.type==='sell').map(row).join('') || emptyRow();
  document.getElementById('buyTable').innerHTML = records.filter(r=>r.type==='buy').map(row).join('') || emptyRow();
  const sellWaiting = sum('sell','remaining'); const sellSold = sum('sell','completed');
  const buyWaiting = sum('buy','remaining'); const buyTaken = sum('buy','completed');
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
function sum(type, field){return records.filter(r=>r.type===type).reduce((a,r)=>a+Number(r[field]||0),0)}
function value(type, field){return records.filter(r=>r.type===type).reduce((a,r)=>a+(Number(r[field]||0)*Number(r.unitPrice||0)),0)}
function calcProfit(){
  const sellAvg = records.filter(r=>r.type==='sell' && r.completed>0).reduce((a,r)=>a+r.completed*r.unitPrice,0);
  const buyAvg = records.filter(r=>r.type==='buy' && r.completed>0).reduce((a,r)=>a+r.completed*r.unitPrice,0);
  return Math.max(sellAvg-buyAvg,0);
}
document.getElementById('marketForm').addEventListener('submit', e=>{
  e.preventDefault();
  const qty = Number(document.getElementById('qty').value);
  records.unshift({id:uid(), type:type.value, itemName:itemName.value.trim(), qty, remaining:qty, completed:0, unitPrice:Number(unitPrice.value), rarity:rarity.value, status:'Beklemede'});
  e.target.reset(); render(); toast('İlan kaydedildi');
});
document.querySelectorAll('.mini-add').forEach(b=>b.onclick=()=>{ type.value=b.dataset.set; itemName.focus(); window.scrollTo({top:0,behavior:'smooth'}); });
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active')); b.classList.add('active');});
function openAction(id){
  const r = records.find(x=>x.id===id); pendingAction=id;
  dialogTitle.textContent = r.type==='sell' ? 'Satılan Adet Gir' : 'Alınan Adet Gir';
  dialogDesc.textContent = `${r.itemName} için maksimum ${fmt(r.remaining)} adet işlem yapılabilir.`;
  actionQty.value = Math.min(1,r.remaining); actionQty.max = r.remaining; actionDialog.showModal();
}
document.getElementById('actionForm').addEventListener('submit', e=>{
  const r = records.find(x=>x.id===pendingAction); if(!r) return;
  const q = Math.max(0, Math.min(Number(actionQty.value||0), r.remaining));
  if(q>0){ r.completed += q; r.remaining -= q; r.status = r.remaining===0 ? (r.type==='sell'?'Satıldı':'Alındı') : (r.type==='sell'?'Kısmi Satıldı':'Kısmi Alındı'); }
  render(); toast('Stok güncellendi');
});
function removeRecord(id){ if(confirm('Bu ilan silinsin mi?')){records=records.filter(r=>r.id!==id); render();} }
function toast(msg){ const t=document.createElement('div'); t.textContent=msg; t.style.cssText='position:fixed;right:18px;bottom:18px;background:#142015;border:1px solid #6ca85c;color:#fff;padding:14px 18px;border-radius:10px;z-index:99;box-shadow:0 10px 40px #000'; document.body.appendChild(t); setTimeout(()=>t.remove(),1800); }
render();
