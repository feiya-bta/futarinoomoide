(() => {
const $ = s => document.querySelector(s);
const KEY = 'couple-memory-v1';
const FONTS = { mplus: "'M PLUS Rounded 1c',sans-serif", kosugi: "'Kosugi Maru',sans-serif" };
const DOW = ['日','月','火','水','木','金','土'];
const def = { memories: [], couple: { n1: '', n2: '', anniv: '' }, set: { fmt: 'days', font: 'mplus', size: 100 } };
let db = load();
let cur = { photos: [], editId: null, title: '' };
let month = new Date(); month.setDate(1);
let selected = ymd(new Date());
let view = 'viewMain';

/* ---------- storage ---------- */
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return norm(d); } catch (e) {}
  return structuredClone(def);
}
function norm(d) {
  return { memories: Array.isArray(d.memories) ? d.memories.map(m => ({ id: m.id || uid(), date: m.date, title: m.title || '', text: m.text || '', photos: m.photos || [], ts: m.ts || Date.now() })).filter(m => m.date) : [],
    couple: { ...def.couple, ...d.couple }, set: { ...def.set, ...d.set } };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
  catch (e) { toast('保存容量がいっぱいです。写真を減らしてください'); return false; }
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function esc(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
function fmtDate(s) { const [y,m,d] = s.split('-').map(Number); return `${y}年${m}月${d}日（${DOW[new Date(y,m-1,d).getDay()]}）`; }

/* ---------- settings / counter ---------- */
function applySettings() {
  document.documentElement.style.fontSize = db.set.size + '%';
  document.documentElement.style.setProperty('--font', FONTS[db.set.font]);
  $('#sizeVal').textContent = db.set.size + '%';
}
function countUp(el, to) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches || to < 2) { el.textContent = to.toLocaleString('ja-JP'); return; }
  const t0 = performance.now(), dur = 900;
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(to * e).toLocaleString('ja-JP'); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function renderCounter(animate) {
  const { n1, n2, anniv } = db.couple, nm = $('#names'), el = $('#counter');
  const names = [n1, n2].filter(Boolean).join(' & ');
  nm.hidden = !names; nm.textContent = names;
  if (!anniv) { el.innerHTML = '<button class="hint" id="hint">記念日を設定する</button>'; $('#hint').onclick = openSettings; return; }
  const [y, m, d] = anniv.split('-').map(Number);
  const start = new Date(y, m-1, d), now = new Date(); now.setHours(0,0,0,0);
  if (now < start) { el.innerHTML = '<span class="lead">記念日はこれから</span>'; return; }
  if (db.set.fmt === 'days') {
    const days = Math.round((now - start) / 864e5);
    el.innerHTML = '<span class="lead">ふたりで</span><span class="num"></span><span class="unit">日</span>';
    const n = el.querySelector('.num'); animate ? countUp(n, days) : n.textContent = days.toLocaleString('ja-JP');
  } else {
    let yy = now.getFullYear() - y, mm = now.getMonth() - (m-1), dd = now.getDate() - d;
    if (dd < 0) { mm--; dd += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (mm < 0) { yy--; mm += 12; }
    el.innerHTML = `<span class="lead">ふたりで</span><span class="num">${yy}</span><span class="unit">年</span><span class="num">${mm}</span><span class="unit">ヶ月</span><span class="num">${dd}</span><span class="unit">日</span>`;
  }
}

/* ---------- views ---------- */
function show(id) {
  view = id;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
  const main = id === 'viewMain';
  $('#btnNav use').setAttribute('href', main ? '#i-back' : '#i-plus');
  $('#btnNav').setAttribute('aria-label', main ? 'カレンダーへ' : '思い出を追加');
  if (id === 'viewCal') renderCal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('#btnNav').onclick = () => {
  if (view === 'viewMain') { if (cur.editId) resetForm(); show('viewCal'); }
  else { resetForm(selected); show('viewMain'); }
};

/* ---------- form ---------- */
function resetForm(date) {
  cur = { photos: [], editId: null, title: '' };
  $('#fDate').value = date || ymd(new Date()); $('#fText').value = '';
  $('#editBadge').hidden = true; $('#btnSave').textContent = '保存する'; $('#btnCancel').hidden = true;
  renderPhotos();
}
function renderPhotos() {
  $('#photoList').innerHTML = cur.photos.map((p, i) =>
    `<div class="thumb"><img src="${p}" alt=""><button data-i="${i}" aria-label="削除"><svg class="ic"><use href="#i-x"/></svg></button></div>`).join('');
}
function resize(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .78));
    }; img.src = r.result; };
    r.readAsDataURL(file);
  });
}
$('#fPhoto').onchange = async e => { for (const f of e.target.files) cur.photos.push(await resize(f)); e.target.value = ''; renderPhotos(); };
$('#photoList').onclick = e => { const b = e.target.closest('button'); if (!b) return; cur.photos.splice(+b.dataset.i, 1); renderPhotos(); };
$('#btnSave').onclick = () => {
  const date = $('#fDate').value, text = $('#fText').value.trim();
  if (!date) return toast('日付を選んでください');
  if (!text && !cur.photos.length) return toast('内容を入力してください');
  const item = { id: cur.editId || uid(), date, title: cur.title, text, photos: cur.photos, ts: Date.now() };
  const prev = db.memories, edited = !!cur.editId;
  db.memories = edited ? prev.map(m => m.id === cur.editId ? item : m) : [...prev, item];
  if (!save()) { db.memories = prev; return; }
  selected = date; month = new Date(date + 'T00:00:00'); month.setDate(1);
  resetForm(); toast(edited ? '更新しました' : '保存しました'); show('viewCal');
};
$('#btnCancel').onclick = () => { resetForm(); show('viewCal'); };

/* ---------- calendar ---------- */
function renderCal() {
  const y = month.getFullYear(), m = month.getMonth();
  $('#monthLabel').textContent = `${y}年${m+1}月`;
  $('#dow').innerHTML = DOW.map(d => `<span>${d}</span>`).join('');
  const first = new Date(y, m, 1).getDay(), last = new Date(y, m+1, 0).getDate(), today = ymd(new Date());
  const has = new Set(db.memories.map(x => x.date));
  let h = '<span class="cell empty"></span>'.repeat(first);
  for (let d = 1; d <= last; d++) {
    const s = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    h += `<button class="cell${s===today?' today':''}${s===selected?' sel':''}${has.has(s)?' has':''}" data-d="${s}">${d}</button>`;
  }
  $('#days').innerHTML = h; renderDay();
}
function memCard(m, i, acts) {
  return `<article class="mem" data-id="${m.id}" style="--i:${i}">
      <div class="mem-top"><div class="grow">${m.title ? `<h4>${esc(m.title)}</h4>` : ''}${m.text ? `<p>${esc(m.text)}</p>` : ''}</div>
        ${acts ? `<div class="acts">
          <button class="icon-btn edit" aria-label="編集"><svg class="ic"><use href="#i-edit"/></svg></button>
          <button class="icon-btn del" aria-label="削除"><svg class="ic"><use href="#i-trash"/></svg></button>
        </div>` : ''}</div>
      ${m.photos.length ? `<div class="imgs">${m.photos.map(p => `<img src="${p}" alt="">`).join('')}</div>` : ''}
    </article>`;
}
function renderDay() {
  $('#dayLabel').textContent = fmtDate(selected);
  const list = db.memories.filter(x => x.date === selected).sort((a, b) => a.ts - b.ts);
  let html = list.length ? list.map((m, i) => memCard(m, i, true)).join('') : '<div class="none">この日の思い出はまだありません</div>';
  // 過去の同じ日（新しい年から順に）
  const y = +selected.slice(0, 4), md = selected.slice(5), years = {};
  db.memories.forEach(m => { const my = +m.date.slice(0, 4); if (my < y && m.date.slice(5) === md) (years[my] = years[my] || []).push(m); });
  Object.keys(years).sort((a, b) => b - a).forEach(yr => {
    html += `<div class="past-head"><span>${y - yr}年前</span><small>${fmtDate(`${yr}-${md}`)}</small></div>` +
      years[yr].sort((a, b) => a.ts - b.ts).map((m, i) => memCard(m, i, false)).join('');
  });
  $('#memList').innerHTML = html;
}
$('#days').onclick = e => { const b = e.target.closest('.cell[data-d]'); if (!b) return; selected = b.dataset.d; renderCal(); };
$('#prevM').onclick = () => { month.setMonth(month.getMonth() - 1); renderCal(); };
$('#nextM').onclick = () => { month.setMonth(month.getMonth() + 1); renderCal(); };
$('#btnAddDay').onclick = () => { resetForm(selected); show('viewMain'); };
$('#memList').onclick = e => {
  const art = e.target.closest('.mem'); if (!art) return;
  const m = db.memories.find(x => x.id === art.dataset.id); if (!m) return;
  if (e.target.closest('.edit')) {
    cur = { photos: [...m.photos], editId: m.id, title: m.title };
    $('#fDate').value = m.date; $('#fText').value = m.text;
    $('#editBadge').hidden = false; $('#btnSave').textContent = '更新する'; $('#btnCancel').hidden = false;
    renderPhotos(); show('viewMain');
  } else if (e.target.closest('.del')) {
    if (!confirm('この思い出を削除しますか？')) return;
    art.style.transition = 'all .35s cubic-bezier(.22,.8,.3,1)'; art.style.opacity = 0; art.style.transform = 'translateX(1.2rem)';
    setTimeout(() => { db.memories = db.memories.filter(x => x.id !== m.id); save(); renderCal(); toast('削除しました'); }, 320);
  } else if (e.target.tagName === 'IMG') {
    const lb = document.createElement('div'); lb.className = 'lightbox';
    lb.innerHTML = `<img src="${e.target.src}" alt="">`; lb.onclick = () => lb.remove(); document.body.appendChild(lb);
  }
};

/* ---------- settings sheet ---------- */
function openSettings() {
  $('#sName1').value = db.couple.n1; $('#sName2').value = db.couple.n2; $('#sAnniv').value = db.couple.anniv;
  $('#sSize').value = db.set.size; syncSeg(); $('#overlay').hidden = false;
}
function syncSeg() {
  document.querySelectorAll('#sFormat button').forEach(b => b.classList.toggle('on', b.dataset.v === db.set.fmt));
  document.querySelectorAll('#sFont button').forEach(b => b.classList.toggle('on', b.dataset.v === db.set.font));
}
$('#btnSettings').onclick = openSettings;
$('#sFormat').onclick = e => { const b = e.target.closest('button'); if (!b) return; db.set.fmt = b.dataset.v; syncSeg(); renderCounter(); save(); };
$('#sFont').onclick = e => { const b = e.target.closest('button'); if (!b) return; db.set.font = b.dataset.v; syncSeg(); applySettings(); save(); };
$('#sSize').oninput = e => { db.set.size = +e.target.value; applySettings(); save(); };
['sName1','sName2','sAnniv'].forEach(id => $('#' + id).addEventListener('input', () => {
  db.couple = { n1: $('#sName1').value.trim(), n2: $('#sName2').value.trim(), anniv: $('#sAnniv').value };
  renderCounter(); save();
}));
const closeSet = () => { $('#overlay').hidden = true; save(); };
$('#closeSet').onclick = closeSet; $('#btnSettingsSave').onclick = closeSet;
$('#overlay').onclick = e => { if (e.target.id === 'overlay') closeSet(); };

/* ---------- export / import ---------- */
function download(name, text, type) {
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type }));
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const stamp = () => ymd(new Date()).replace(/-/g, '');
const q = s => /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
$('#exJson').onclick = () => {
  download(`memories-${stamp()}.json`, JSON.stringify({ app: 'couple-memory', version: 1, exportedAt: new Date().toISOString(), ...db }, null, 2), 'application/json');
  toast('JSONを保存しました');
};
$('#exCsv').onclick = () => {
  const rows = [...db.memories].sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts)
    .map(m => `${m.date},${q((m.title ? `【${m.title}】` : '') + m.text)}`);
  download(`memories-${stamp()}.csv`, '\ufeffdate,comment\r\n' + rows.join('\r\n'), 'text/csv;charset=utf-8');
  toast(`CSVを保存しました（${rows.length}件・写真は含まれません）`);
};
$('#tpl').onclick = () => download('memories-template.csv', '\ufeffdate,comment\r\n2024-05-01,はじめて一緒に行った水族館\r\n2024/6/12,"雨の日のカフェ、<br>なんでもない一日"\r\n'.replace('<br>', '\n'), 'text/csv;charset=utf-8');

function decode(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch (e) { return new TextDecoder('shift_jis').decode(buf); }
}
function parseCSV(t) {
  t = t.replace(/^\ufeff/, '');
  const first = t.split(/\r?\n/)[0] || '';
  const sep = first.includes(',') ? ',' : first.includes('\t') ? '\t' : first.includes(';') ? ';' : ',';
  const rows = []; let row = [], f = '', inq = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inq) { if (c === '"') { if (t[i+1] === '"') { f += '"'; i++; } else inq = false; } else f += c; }
    else if (c === '"') inq = true;
    else if (c === sep) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i+1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function parseDate(s) {
  s = s.trim(); let m = s.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/) || s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]], dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? ymd(dt) : null;
}
$('#imCsv').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const rows = parseCSV(decode(await f.arrayBuffer()));
  const have = new Set(db.memories.map(m => m.date + '|' + m.text));
  let add = 0, dup = 0, bad = 0; const out = [];
  rows.forEach((r, i) => {
    const date = parseDate(r[0] || ''); const text = r.slice(1).join(', ').trim();
    if (!date) { if (i > 0) bad++; return; }
    if (!text) { bad++; return; }
    if (have.has(date + '|' + text)) { dup++; return; }
    have.add(date + '|' + text); add++;
    out.push({ id: uid(), date, title: '', text, photos: [], ts: Date.now() + out.length });
  });
  if (!add) return toast(`取り込める行がありませんでした（重複${dup}・無効${bad}）`);
  const prev = db.memories; db.memories = [...prev, ...out];
  if (!save()) { db.memories = prev; return; }
  const latest = out.map(o => o.date).sort().pop(); selected = latest; month = new Date(latest + 'T00:00:00'); month.setDate(1);
  renderCal(); toast(`${add}件を追加しました` + (dup || bad ? `（重複${dup}・無効${bad}をスキップ）` : ''));
};
$('#imJson').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(decode(await f.arrayBuffer())); if (!d || !Array.isArray(d.memories)) throw 0;
    const inc = norm(d), ids = new Set(db.memories.map(m => m.id));
    const add = inc.memories.filter(m => !ids.has(m.id)), prev = db;
    db = { memories: [...db.memories, ...add], couple: d.couple ? inc.couple : db.couple, set: d.set ? inc.set : db.set };
    if (!save()) { db = prev; return; }
    applySettings(); renderCounter(); syncSeg(); renderCal();
    $('#sName1').value = db.couple.n1; $('#sName2').value = db.couple.n2; $('#sAnniv').value = db.couple.anniv; $('#sSize').value = db.set.size;
    toast(`${add.length}件を復元しました`);
  } catch (err) { toast('JSONを読み込めませんでした'); }
};

/* ---------- boot ---------- */
applySettings(); renderCounter(true); resetForm(); show('viewMain');
})();
