const TJS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';
const $ = id => document.getElementById(id);
const S = { walk: null, pipes: {}, tf: null };
const hasGPU = !!navigator.gpu && !!(await Promise.race([navigator.gpu.requestAdapter().catch(() => null), new Promise(r => setTimeout(() => r(null), 2500))]));
$('backend').textContent = `Inference backend: ${hasGPU ? 'WebGPU (lore) + WASM' : 'WASM (CPU)'} · runs locally in this browser`;

// ---------- settings ----------
const prefs = JSON.parse(localStorage.getItem('lw_prefs') || '{}');
for (const k of ['visionSel', 'clipSel', 'textSel']) { if (prefs[k]) $(k).value = prefs[k]; $(k).onchange = savePrefs; }
$('geoChk').checked = !!prefs.geo; $('geoChk').onchange = savePrefs;
function savePrefs() { localStorage.setItem('lw_prefs', JSON.stringify({ visionSel: $('visionSel').value, clipSel: $('clipSel').value, textSel: $('textSel').value, geo: $('geoChk').checked })); }

// ---------- storage ----------
const loadWalks = () => JSON.parse(localStorage.getItem('lw_walks') || '[]');
const saveWalks = w => { try { localStorage.setItem('lw_walks', JSON.stringify(w.slice(-8))); } catch (e) { localStorage.setItem('lw_walks', JSON.stringify(w.slice(-2))); } };
function persist() { const w = loadWalks().filter(x => x.id !== S.walk.id); w.push(S.walk); saveWalks(w); }
if (loadWalks().length) $('codexBtnHome').classList.remove('hidden');

// ---------- views ----------
function show(v) { for (const x of ['home', 'walk', 'codex']) $(x).classList.toggle('hidden', x !== v); scrollTo(0, 0); }
$('startBtn').onclick = () => { S.walk = { id: Date.now(), started: new Date().toISOString(), shards: [] }; persist(); $('lastShard').innerHTML = ''; updCount(); show('walk'); warm(); };
$('endBtn').onclick = () => { S.walk.ended = new Date().toISOString(); persist(); renderCodex(); };
$('newBtn').onclick = () => $('startBtn').onclick();
$('codexBtnHome').onclick = () => { S.walk = loadWalks().at(-1); renderCodex(); };
const updCount = () => $('shardCount').textContent = `${S.walk.shards.length} shard${S.walk.shards.length === 1 ? '' : 's'} found`;
const status = t => { $('status').textContent = t; const m = t.match(/(\d+)%/); $('bar').style.width = m ? m[1] + '%' : '0%'; $('bar').parentElement.classList.toggle('on', !!m); console.log('[status]', t); };

// ---------- models ----------
async function tf() {
  if (!S.tf) { S.tf = await import(`${TJS}/dist/transformers.min.js`); S.tf.env.allowLocalModels = false; }
  return S.tf;
}
async function pipe(kind, model, opts) {
  const key = kind + model;
  if (!S.pipes[key]) {
    const { pipeline } = await tf();
    S.pipes[key] = pipeline(kind, model, { ...opts, progress_callback: p => { if (p.status === 'progress' && p.total > 1e6) status(`Summoning ${model.split('/')[1]} · ${Math.round(p.progress)}% (cached after first time)`); } });
    S.pipes[key].catch(() => delete S.pipes[key]);
  }
  return S.pipes[key];
}
function warm() { /* start downloading while they walk */ const v = $('visionSel').value; if (v !== 'none') pipe('image-to-text', v, { device: 'wasm', dtype: 'q8' }).catch(() => {}); }

// ---------- image ----------
function downscale(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(); img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.78));
    }; img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}

const LABELS = ['tree', 'doorway', 'mural', 'rock', 'river', 'bridge', 'statue', 'old building', 'path', 'flowers', 'mountain', 'beach', 'street', 'bench', 'gate', 'sign', 'animal', 'sky', 'lamp post', 'stairs', 'fence', 'graffiti', 'church', 'water fountain', 'forest', 'field'];

async function readPlace(dataUrl) {
  const out = { caption: '', tags: [], models: [] };
  const v = $('visionSel').value, c = $('clipSel').value;
  if (v !== 'none') {
    try { status('Reading the place…'); const p = await pipe('image-to-text', v, { device: 'wasm', dtype: 'q8' }); const r = await p(dataUrl, { max_new_tokens: 30 }); out.caption = (r[0]?.generated_text || '').trim(); out.models.push(v); } catch (e) { console.warn('vision failed', e); }
  }
  if (c !== 'none') {
    try { status('Naming what it is…'); const p = await pipe('zero-shot-image-classification', c, { device: 'wasm', dtype: 'q8' }); const r = await p(dataUrl, LABELS.map(l => `a photo of a ${l}`)); out.tags = r.slice(0, 3).filter(x => x.score > 0.08).map(x => x.label.replace('a photo of a ', '')); out.models.push(c); } catch (e) { console.warn('clip failed', e); }
  }
  return out;
}

// ---------- lore ----------
const pick = (a, seed) => a[Math.abs(seed) % a.length];
function hash(s) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; }
function templateLore(caption, tags, n) {
  const thing = tags[0] || (caption.split(' ').slice(-2).join(' ')) || 'stone';
  const h = hash(caption + tags.join() + n);
  const names = ['Ashveil', 'Thornmere', 'Kaldra', 'Vessmoor', 'Orrin', 'Duskwell', 'Emberline', 'Halvorn', 'Lumen Reach', 'Grael'];
  const kinds = ['Watch', 'Threshold', 'Witness', 'Hollow', 'Crossing', 'Remnant', 'Sigil', 'Keep'];
  const name = pick(names, h), kind = pick(kinds, h >> 3);
  const title = `The ${kind} of ${name}`;
  const seen = caption ? `Travelers describe it plainly — ${caption.replace(/\.$/, '')} — and that is how it hides.` : `Most walk past it without a second look, which is exactly how it survives.`;
  const lines = [
    `Long before the roads had names, the ${thing} at ${name} was where the Realm kept its promises.`,
    seen,
    pick([`Touch it once and you will remember a place you have never been.`, `The Lorekeepers say every crack in it is a sentence nobody has finished reading.`, `At dusk it hums a single note, and only those who walked here on foot can hear it.`, `It is the ${n === 1 ? 'first' : 'next'} mark on the map that the Visionary drew and the Lorekeeper made real.`], h >> 5)
  ];
  return { title, lore: lines.join(' ') };
}
async function writeLore(caption, tags, n) {
  const m = $('textSel').value;
  const seedText = [caption, tags.length ? `(${tags.join(', ')})` : ''].join(' ').trim() || 'a quiet outdoor place';
  if (m !== 'template') {
    try {
      status('Writing the lore…');
      const gen = await pipe('text-generation', m, hasGPU ? { device: 'webgpu', dtype: 'q4f16' } : { device: 'wasm', dtype: 'q4' });
      const messages = [
        { role: 'system', content: 'You are the Lorekeeper, a fantasy world-builder. You turn real places into locations in a mythic world. Be vivid but grounded in the real details given. Never mention photos or AI.' },
        { role: 'user', content: `A traveler on foot found this: "${seedText}".\nInvent a short place-name title (2-5 words) and 3 sentences of world lore about it as a location in an ancient world.\nAnswer exactly in this format:\nTITLE: <title>\nLORE: <three sentences>` }
      ];
      const r = await gen(messages, { max_new_tokens: 150, do_sample: true, temperature: 0.8, top_p: 0.9, repetition_penalty: 1.15 });
      const txt = r[0].generated_text.at(-1).content;
      const clean = txt.replace(/[*_#"]/g, '').trim();
      const t = clean.match(/TITLE[^:\n]{0,12}:\s*([^\n,]+?)(?=\s*(?:,|LORE:|TITLE|\n|$))/i);
      let title = t?.[1].trim();
      let rest = clean.match(/LORE:\s*([\s\S]+)/i)?.[1] || (t ? clean.slice(t.index + t[0].length) : clean).replace(/TITLE[^:\n]{0,12}:/gi, '');
      if (title && title.split(' ').length > 7) { title = title.split(/\s+/).slice(0, 4).join(' '); }
      const sents = (rest.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || []).map(x => x.trim()).filter(x => x.length > 15);
      let lore = sents.slice(0, 4).join(' ');
      if (title && lore.length > 40) return { title: title.slice(0, 60), lore, model: m };
      console.warn('unparsable lore', txt);
    } catch (e) { console.warn('text model failed', e); }
  }
  return { ...templateLore(caption, tags, n), model: 'template (seeded by vision output)' };
}

function geo() {
  if (!$('geoChk').checked || !navigator.geolocation) return Promise.resolve(null);
  return new Promise(r => navigator.geolocation.getCurrentPosition(p => r([+p.coords.latitude.toFixed(5), +p.coords.longitude.toFixed(5)]), () => r(null), { timeout: 8000, maximumAge: 60000 }));
}

// ---------- capture ----------
async function processFile(file) {
  $('working').classList.remove('hidden');
  const t0 = performance.now();
  try {
    const [img, thumb, pos] = await Promise.all([downscale(file, 512), downscale(file, 480), geo()]);
    const { caption, tags, models } = await readPlace(img);
    const n = S.walk.shards.length + 1;
    const { title, lore, model } = await writeLore(caption, tags, n);
    const shard = { n, title, lore, caption, tags, thumb, pos, at: new Date().toISOString(), models: [...models, model], ms: Math.round(performance.now() - t0) };
    S.walk.shards.push(shard); persist(); updCount();
    $('lastShard').innerHTML = shardHTML(shard) + '<p class="fine" style="text-align:center">Shard saved. Now put me away again.</p>';
    return shard;
  } finally { $('working').classList.add('hidden'); }
}
window.LW = { processFile, get walk() { return S.walk; } };
$('photo').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) processFile(f).catch(err => { alert('Could not read that one: ' + err.message); }); };

const toRoman = n => { const r = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let o = ''; for (const [v, c] of r) while (n >= v) { o += c; n -= v; } return o; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shardHTML = s => `<article class="shard"><div class="num"><span class="ch">${toRoman(s.n)}</span>SHARD ${String(s.n).padStart(2, '0')} · ${new Date(s.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div><img src="${s.thumb}" alt="${esc(s.caption)}"><h3>${esc(s.title)}</h3><p>${esc(s.lore)}</p><div class="meta">seen: ${esc(s.caption || '—')} ${s.tags.length ? '· tags: ' + esc(s.tags.join(', ')) : ''}<br>models: ${esc(s.models.join(' → '))} · ${(s.ms / 1000).toFixed(1)}s on-device</div></article>`;

// ---------- codex ----------
function renderCodex() {
  const w = S.walk; show('codex');
  const mins = Math.max(1, Math.round((new Date(w.ended || Date.now()) - new Date(w.started)) / 60000));
  $('codexMeta').textContent = `${new Date(w.started).toLocaleDateString()} · ${mins} min walked · ${w.shards.length} shards`;
  $('shards').innerHTML = w.shards.length ? w.shards.map(shardHTML).join('') : '<p class="fine" style="text-align:center">No shards this time. The world is still out there.</p>';
  const pts = w.shards.filter(s => s.pos).map(s => s.pos); const svg = $('route');
  if (pts.length >= 2) {
    const la = pts.map(p => p[0]), lo = pts.map(p => p[1]); const [a, b, c, d] = [Math.min(...la), Math.max(...la), Math.min(...lo), Math.max(...lo)];
    const xy = pts.map(([y, x]) => [15 + 270 * ((x - c) / ((d - c) || 1)), 105 - 90 * ((y - a) / ((b - a) || 1))]);
    svg.innerHTML = `<polyline points="${xy.map(p => p.join(',')).join(' ')}" fill="none" stroke="#ff6a1a" stroke-width="2" stroke-dasharray="4 3"/>` + xy.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#f2b134"/><text x="${p[0] + 7}" y="${p[1] - 6}" fill="#f4efe6" font-size="9">${i + 1}</text>`).join('');
    svg.classList.remove('hidden');
  } else svg.classList.add('hidden');
}
function codexMD() {
  const w = S.walk;
  return `# Lore Codex — ${new Date(w.started).toLocaleDateString()}\n\n*Written on foot with LORE WALK — by Penta Dank · Next Realm Interactive. Open-weight models, on-device.*\n\n` +
    w.shards.map(s => `## ${s.n}. ${s.title}\n\n${s.lore}\n\n> seen: ${s.caption || '—'}${s.pos ? ` · ${s.pos.join(', ')}` : ''} · models: ${s.models.join(' → ')}\n`).join('\n');
}
function dl(name, href) { const a = document.createElement('a'); a.href = href; a.download = name; a.click(); }
$('mdBtn').onclick = () => dl('lore-codex.md', URL.createObjectURL(new Blob([codexMD()], { type: 'text/markdown' })));
async function codexPNG() {
  await document.fonts?.ready;
  const W = 1080, sh = S.walk.shards, H = 260 + sh.length * 760; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#2a1450'); grd.addColorStop(1, '#0b0614'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f2b134'; g.font = '120px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.fillText('LORE CODEX', W / 2, 120);
  g.strokeStyle = '#e9b44c88'; g.lineWidth = 2; g.strokeRect(24, 24, W - 48, H - 48); g.strokeStyle = '#e9b44c33'; g.strokeRect(36, 36, W - 72, H - 72); g.fillStyle = '#f4efe699'; g.font = '22px Inter, sans-serif'; g.fillText('LORE WALK — by Penta Dank · Next Realm Interactive', W / 2, 175);
  let y = 240; g.textAlign = 'left';
  for (const s of sh) {
    const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s.thumb; });
    const ih = 400, iw = Math.min(W - 120, im.width * ih / im.height); g.drawImage(im, (W - iw) / 2, y, iw, ih); y += ih + 60;
    g.fillStyle = '#ff6a1a'; g.font = '24px sans-serif'; g.fillText(`SHARD ${String(s.n).padStart(2, '0')}`, 60, y); y += 50;
    g.fillStyle = '#f2b134'; g.font = '60px Anton, Impact, sans-serif'; g.fillText(s.title.toUpperCase().slice(0, 34), 60, y); y += 50;
    g.fillStyle = '#f4efe6'; g.font = '34px "Cormorant Garamond", Georgia, serif'; let line = '', lines = 0;
    for (const word of s.lore.split(' ')) { if (g.measureText(line + word).width > W - 120) { if (lines < 6) g.fillText(line, 60, y); y += 46; lines++; line = ''; } line += word + ' '; }
    if (lines < 7) g.fillText(line, 60, y); y = Math.max(y, y) + 40; y = 240 + (s.n) * 760;
  }
  return new Promise(r => c.toBlob(r, 'image/png'));
}
$('imgBtn').onclick = async () => dl('lore-codex.png', URL.createObjectURL(await codexPNG()));
$('shareBtn').onclick = async () => {
  try {
    const f = new File([await codexPNG()], 'lore-codex.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: 'My Lore Codex', text: codexMD() });
    else if (navigator.share) await navigator.share({ title: 'My Lore Codex', text: codexMD() });
    else { await navigator.clipboard.writeText(codexMD()); alert('Codex copied to clipboard.'); }
  } catch (e) { console.warn(e); }
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
