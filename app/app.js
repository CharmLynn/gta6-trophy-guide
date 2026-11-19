// GTA VI trophy guide and tracker: a checklist that remembers progress in
// localStorage, with filters, a spoiler setting, a roadmap and cited guides.
// The data is data/trophies.json, fetched from this app's own files.
const KEY = 'gta6-trophy-guide-progress';
const listEl = document.getElementById('trophy-list');
const stagesEl = document.getElementById('stages');
const emptyEl = document.getElementById('empty');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');
const earnedOnlyEl = document.getElementById('earned-only');
const countEl = document.getElementById('result-count');

const STAGES = [
  { n: 1, title: 'Play the story', time: '60–80 hours', text: 'Play the five chapters, take optional and stranger missions as they appear, scan vehicles and study animals on the way. Do the Chapter 1 meditation spot at home: it is the one thing that can be missed.' },
  { n: 2, title: 'The 100% checklist', time: 'about 100 hours', text: 'After the credits, work through the 100% checklist (Progress, then Stats, then 100% Completion), including 70 of the 80 challenges. Progress made earlier counts, and nothing on it is missable.' },
  { n: 3, title: 'Clean up and the platinum', time: 'about 10 hours', text: 'Finish the last odd trophies. The platinum pops the moment the final one lands.' },
];

let earned = new Set();
try { earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { earned = new Set(); }
let kind = 'all';
let openId = null;

function save() { localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b))); }

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

function gradeLabel(g) { return g[0].toUpperCase() + g.slice(1); }

function isStory(t) { return t.kinds.includes('story'); }

function masked(t) {
  // Spoiler mode hides a story trophy's name and description until earned.
  return spoilerEl.checked && isStory(t) && !earned.has(t.id);
}

function sourceLine(t) {
  return t.sources.map((s) => s.url ? `<a href="${s.url}">${s.name}</a>` : s.name).join(' · ');
}

function card(t) {
  const li = document.createElement('li');
  li.className = 'trophy' + (earned.has(t.id) ? ' earned' : '') + (t.missable ? ' missable' : '');
  li.id = `trophy-${t.id}`;
  const hidden = masked(t);
  const name = hidden ? `Hidden story trophy${t.chapter ? ` — Chapter ${t.chapter}` : ''}` : t.name;
  const desc = hidden ? 'Earn it to reveal its name and description.' : t.description;
  li.innerHTML = `
    <div class="card-head">
      <label class="check"><input type="checkbox" ${earned.has(t.id) ? 'checked' : ''} aria-label="Earned: ${t.name}"><span class="box" aria-hidden="true"></span></label>
      <button type="button" class="card-title" aria-expanded="false">
        <span class="trophy-name">${name}</span>
        <span class="trophy-desc">${desc}</span>
      </button>
      <span class="grade grade-${t.grade}">${gradeLabel(t.grade)}</span>
    </div>
    <div class="badges">
      ${t.hidden ? '<span class="badge badge-hidden">Hidden on PSN</span>' : ''}
      ${t.missable ? '<span class="badge badge-missable">⚠ Missable</span>' : ''}
      ${t.kinds.map((k) => `<span class="badge">${k}</span>`).join('')}
      ${t.target ? `<span class="badge badge-target">Target: ${t.target.toLocaleString('en-US')}${t.target_note ? ` — ${t.target_note}` : ''}</span>` : ''}
    </div>
    <div class="guide" hidden>
      <p>${t.guide}</p>
      <p class="sources">Sources: ${sourceLine(t)}</p>
    </div>`;
  const box = li.querySelector('input[type=checkbox]');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id); else earned.delete(t.id);
    save(); render();
  });
  const title = li.querySelector('.card-title');
  const guide = li.querySelector('.guide');
  title.addEventListener('click', () => {
    const willOpen = guide.hidden;
    guide.hidden = !willOpen;
    title.setAttribute('aria-expanded', String(willOpen));
    openId = willOpen ? t.id : null;
  });
  if (openId === t.id) { guide.hidden = false; title.setAttribute('aria-expanded', 'true'); }
  return li;
}

function visible(t) {
  if (kind === 'missable') { if (!t.missable) return false; }
  else if (kind !== 'all' && !t.kinds.includes(kind)) return false;
  if (kind === 'online') return false; // No online trophies: all 55 are single-player.
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (earnedOnlyEl.checked && !earned.has(t.id)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
  return true;
}

function renderRoadmap() {
  stagesEl.replaceChildren();
  for (const s of STAGES) {
    const mine = trophies.filter((t) => t.stage === s.n);
    const done = mine.filter((t) => earned.has(t.id)).length;
    const div = document.createElement('div');
    div.className = 'stage';
    div.innerHTML = `
      <h3>Stage ${s.n} — ${s.title}</h3>
      <p class="stage-time">${s.time} · ${done} of ${mine.length} earned</p>
      <p>${s.text}</p>
      <p class="stage-list">${mine.map((t) => `<a href="#trophy-${t.id}">${masked(t) ? 'Hidden story trophy' : t.name}</a>`).join(' · ')}</p>`;
    stagesEl.append(div);
  }
}

function render() {
  const shown = trophies.filter(visible);
  listEl.replaceChildren(...shown.map(card));
  const total = trophies.length;
  const done = earned.size;
  document.getElementById('progress-fill').style.width = `${(done / total) * 100}%`;
  document.getElementById('progress-text').textContent = `${done} of ${total} earned — ${Math.round((done / total) * 100)}% to the platinum`;
  const byGrade = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return `${gradeLabel(g)} ${got}/${all}`;
  }).join(' · ');
  document.getElementById('progress-by-grade').textContent = byGrade;
  countEl.textContent = shown.length === total ? '' : `Showing ${shown.length} of ${total} trophies`;
  if (kind === 'online') {
    emptyEl.hidden = false;
    emptyEl.textContent = 'No online trophies. All 55 are single-player, so this filter is empty by design (Exophase, GTABase).';
  } else if (shown.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'No trophies match these filters.';
  } else {
    emptyEl.hidden = true;
  }
  renderRoadmap();
}

document.getElementById('kind-chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-kind]');
  if (!b) return;
  kind = b.dataset.kind;
  document.querySelectorAll('#kind-chips .chip').forEach((c) => c.classList.toggle('active', c === b));
  render();
});
searchEl.addEventListener('input', render);
gradeEl.addEventListener('change', render);
spoilerEl.addEventListener('change', render);
earnedOnlyEl.addEventListener('change', render);

document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort((x, y) => x - y) }, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    earned = new Set(ids.filter((id) => trophies.some((t) => t.id === id)));
    save(); render();
  } catch { alert('That file is not a trophy progress export.'); }
  e.target.value = '';
});

// Deep links, for sharing a view and for screenshots: #trophy=<id> opens its
// guide, #filter=<kind> and #grade=<grade> set the filters, #spoiler=off
// shows story trophies, #view=roadmap jumps to the roadmap.
const hash = new URLSearchParams(location.hash.slice(1));
const filterParam = hash.get('filter');
if (filterParam && document.querySelector(`[data-kind="${filterParam}"]`)) {
  kind = filterParam;
  document.querySelectorAll('#kind-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.kind === kind));
}
if (hash.get('grade') && [...gradeEl.options].some((o) => o.value === hash.get('grade'))) gradeEl.value = hash.get('grade');
if (hash.get('spoiler') === 'off') spoilerEl.checked = false;
const trophyParam = Number(hash.get('trophy'));
if (trophyParam && trophies.some((t) => t.id === trophyParam)) openId = trophyParam;

render();
if (openId) document.getElementById(`trophy-${openId}`)?.scrollIntoView({ block: 'center' });
if (hash.get('view') === 'roadmap') document.getElementById('roadmap').scrollIntoView();
