// ============================
// KELİMELİK • SCRIPT.JS (full)
//  - 5 tema + arka plan entegrasyonu
//  - Quiz: yanlışsa doğru da yeşil
//  - Toast, TR sansür, geri/ileri, istatistik, kaydet/sil/not
// ============================

// --- yardımcılar ---
const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const todayStr = () => new Date().toISOString().slice(0,10);

// --- storage ---
const KEYS = { SAVED:'savedWords', NOTES:'userNotes', STATS:'stats', THEME:'theme' };
const store = {
  get(k, def){ try{const v = localStorage.getItem(k); return v?JSON.parse(v):def;}catch{ return def; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};
if (!store.get(KEYS.SAVED)) store.set(KEYS.SAVED, []);
if (!store.get(KEYS.NOTES)) store.set(KEYS.NOTES, {});
if (!store.get(KEYS.STATS)) store.set(KEYS.STATS, { lastDay: todayStr(), learnedToday:0, totalLearned:0, totalSaved:0 });
if (!store.get(KEYS.THEME)) store.set(KEYS.THEME, 'dark');

// --- global state ---
let currentLevel = 'A1';
let pool = [];
let currentIndex = 0;
let historyStack = [];
let seenToday = new Set();

// --- element refs ---
const themeSelect = $('#themeSelect');

const viewHome   = $('#view-home');
const viewLevels = $('#view-levels');
const viewLearn  = $('#view-learn');
const viewSaved  = $('#view-saved');

const goLearn   = $('#go-learn');
const goSaved   = $('#go-saved');
const backHome1 = $('#back-home-1');
const backHome2 = $('#back-home-2');
const backLevels= $('#back-levels');

const levelButtons = $$('.level');
const btnStart = $('#btn-start');

const wordCard = $('#word-card');
const wordLevel = $('#word-level');
const wordPos = $('#word-pos');
const wordEn = $('#word-en');
const wordEnPlain = $('#word-en-plain');
const wordTr = $('#word-tr');
const btnShowTr = $('#btn-show-tr');
const exampleList = $('#example-list');

const btnPrev = $('#btn-prev');
const btnNext = $('#btn-next');
const btnSave = $('#btn-save');
const btnNote = $('#btn-note');
const btnDelete = $('#btn-delete');

const savedList = $('#saved-list');
const savedEmpty = $('#saved-empty');

const modalNote = $('#modal-note');
const modalConfirm = $('#modal-confirm');
const modalStats = $('#modal-stats');
const modalQuiz = $('#modal-quiz');

const noteText = $('#note-text');
const noteSave = $('#note-save');
const confirmYes = $('#confirm-yes');

const btnStats = $('#btn-stats');
const btnQuiz = $('#btn-quiz');
const statToday = $('#stat-today');
const statTotal = $('#stat-total');
const statSaved = $('#stat-saved');
const quizQ = $('#quiz-q');
const quizOpts = $('#quiz-opts');
const quizN = $('#quiz-n');
const quizScore = $('#quiz-score');
const quizRestart = $('#quiz-restart');

// --- tema (5 seçenek + arka plan) ---
(function initTheme(){
  const saved = store.get(KEYS.THEME, 'dark');
  document.documentElement.setAttribute('data-theme', saved);
  document.body.setAttribute('data-theme', saved);    // CSS alternatif seçiciler için
  if (themeSelect) themeSelect.value = saved;
})();
themeSelect?.addEventListener('change', ()=>{
  const t = themeSelect.value;
  document.documentElement.setAttribute('data-theme', t);
  document.body.setAttribute('data-theme', t);
  store.set(KEYS.THEME, t);
});

// --- view helper ---
function showOnly(view){
  [viewHome, viewLevels, viewLearn, viewSaved].forEach(v=>v.classList.remove('active'));
  view.classList.add('active');
}
showOnly(viewHome);

// --- navigation ---
goLearn.addEventListener('click', ()=> showOnly(viewLevels));
goSaved.addEventListener('click', ()=> { showOnly(viewSaved); renderSaved(); });

backHome1.addEventListener('click', ()=> showOnly(viewHome));
backHome2.addEventListener('click', ()=> showOnly(viewHome));
backLevels.addEventListener('click', ()=> showOnly(viewLevels));

// --- level select ---
levelButtons.forEach(b=>{
  b.addEventListener('click', ()=>{
    levelButtons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    currentLevel = b.dataset.level;
  });
});

btnStart.addEventListener('click', ()=>{
  pool = (window.words || []).filter(w => w.cefr === currentLevel);
  currentIndex = 0;
  historyStack = [];
  if (!pool.length){
    wordEn.textContent = 'Bu seviyede kelime yok';
    wordEnPlain.textContent = '-';
    wordTr.textContent = '—';
    exampleList.innerHTML = '';
    showOnly(viewLearn);
    return;
  }
  renderCurrent(true);
  showOnly(viewLearn);
});

// --- render current word ---
function renderCurrent(animate=false){
  const w = pool[currentIndex];
  if (!w) return;

  wordLevel.textContent = w.cefr || '-';
  wordPos.textContent = w.pos || '-';
  wordEn.textContent = w.word || '-';
  wordEnPlain.textContent = w.word || '-';

  // TR ana anlam sansürlü
  wordTr.textContent = w.meaning_tr || '—';
  wordTr.classList.add('hidden');

  // Örnek cümleler (TR sansürlü)
  exampleList.innerHTML = '';
  (w.examples || []).slice(0,5).forEach(ex=>{
    const li = document.createElement('li');
    const tr = ex.tr ? ` — <span class="tr-censor muted hidden">${ex.tr}</span>` : '';
    li.innerHTML = `<strong>${ex.en}</strong>${tr}`;
    exampleList.appendChild(li);
  });

  if (animate){
    wordCard.classList.remove('fade-in');
    void wordCard.offsetWidth;
    wordCard.classList.add('fade-in');
  }
}

// --- show TR ---
btnShowTr.addEventListener('click', ()=>{
  wordTr.classList.toggle('hidden');
  $$('.tr-censor').forEach(s => s.classList.toggle('hidden'));
  bumpToday();
});

// --- prev / next ---
btnNext.addEventListener('click', ()=>{
  if (!pool.length) return;
  historyStack.push(currentIndex);
  currentIndex = (currentIndex + 1) % pool.length;
  renderCurrent(true);
});
btnPrev.addEventListener('click', ()=>{
  if (!pool.length) return;
  if (!historyStack.length) return;
  currentIndex = historyStack.pop();
  renderCurrent(true);
});

// --- save / delete / note ---
btnSave.addEventListener('click', ()=>{
  const w = pool[currentIndex]; if (!w) return;
  const saved = store.get(KEYS.SAVED, []);
  if (!saved.find(x=>x.word===w.word && x.cefr===w.cefr)){
    saved.push({ ...w, savedAt: Date.now() });
    store.set(KEYS.SAVED, saved);
    const s = stats(); s.totalSaved = (s.totalSaved||0)+1; setStats(s);
    showToast("✔️ Başarıyla kaydedildi");
  } else {
    showToast("ℹ️ Zaten kaydedilmiş");
  }
});

btnDelete.addEventListener('click', ()=> modalConfirm.showModal());

confirmYes.addEventListener('click', ()=>{
  const w = pool[currentIndex]; if (!w) return;
  const saved = store.get(KEYS.SAVED, []);
  const i = saved.findIndex(x=>x.word===w.word && x.cefr===w.cefr);
  if (i>=0){
    saved.splice(i,1);
    store.set(KEYS.SAVED, saved);
    showToast("🗑️ Kayıt silindi");
  }
});

btnNote.addEventListener('click', ()=>{
  const w = pool[currentIndex]; if (!w) return;
  const notes = store.get(KEYS.NOTES, {});
  noteText.value = notes[w.word] || '';
  modalNote.showModal();
});
noteSave.addEventListener('click', ()=>{
  const w = pool[currentIndex]; if (!w) return;
  const notes = store.get(KEYS.NOTES, {});
  notes[w.word] = noteText.value.trim();
  store.set(KEYS.NOTES, notes);
  showToast("📝 Not kaydedildi");
});

// --- saved render ---
function renderSaved(){
  const saved = store.get(KEYS.SAVED, []);
  const notes = store.get(KEYS.NOTES, {});
  savedList.innerHTML = '';
  savedEmpty.style.display = saved.length ? 'none' : 'block';

  saved.forEach(item=>{
    const wrap = document.createElement('div');
    wrap.className = 'saved-item';
    const note = notes[item.word] || '';
    wrap.innerHTML = `
      <div class="saved-head">
        <div class="saved-title">
          <span class="w">${item.word}</span>
          <span class="meta">• ${item.cefr} • ${item.pos||'-'}</span>
        </div>
        <button class="btn small outline toggle">Detay</button>
      </div>
      <div class="saved-body">
        <div class="muted">Türkçe: <strong>${item.meaning_tr||'—'}</strong></div>
        <div style="margin-top:6px;">
          <div class="muted" style="margin-bottom:4px;">Örnek Cümleler</div>
          <ul style="padding-left:16px; margin:0;">
            ${(item.examples||[]).slice(0,5).map(ex=>`<li><strong>${ex.en}</strong>${ex.tr?` — <span class="muted">${ex.tr}</span>`:''}</li>`).join('')}
          </ul>
        </div>
        <div class="saved-note">Not: ${note?note:'<em>(Not yok)</em>'}</div>
        <div style="margin-top:8px; display:flex; gap:6px;">
          <button class="btn small" data-action="edit">Not Düzenle</button>
          <button class="btn small danger" data-action="remove">Kelimeden Sil</button>
        </div>
      </div>
    `;

    $('.toggle', wrap).addEventListener('click', ()=>{
      $('.saved-body', wrap).classList.toggle('open');
    });

    $('[data-action="edit"]', wrap).addEventListener('click', ()=>{
      const currentNotes = store.get(KEYS.NOTES, {});
      noteText.value = currentNotes[item.word] || '';
      modalNote.showModal();
      noteSave.onclick = () => {
        const ns = store.get(KEYS.NOTES, {});
        ns[item.word] = noteText.value.trim();
        store.set(KEYS.NOTES, ns);
        modalNote.close();
        renderSaved();
        showToast("📝 Not güncellendi");
      };
    });

    $('[data-action="remove"]', wrap).addEventListener('click', ()=>{
      modalConfirm.showModal();
      confirmYes.onclick = () => {
        const arr = store.get(KEYS.SAVED, []);
        const idx = arr.findIndex(x=>x.word===item.word && x.cefr===item.cefr);
        if (idx>=0){ arr.splice(idx,1); store.set(KEYS.SAVED, arr); }
        modalConfirm.close();
        renderSaved();
        showToast("🗑️ Kayıt silindi");
      };
    });

    savedList.appendChild(wrap);
  });
}

// --- istatistik ---
function stats(){
  const s = store.get(KEYS.STATS, { lastDay: todayStr(), learnedToday:0, totalLearned:0, totalSaved:0 });
  if (s.lastDay !== todayStr()){
    s.lastDay = todayStr();
    s.learnedToday = 0;
    store.set(KEYS.STATS, s);
    seenToday.clear();
  }
  return s;
}
function setStats(s){ store.set(KEYS.STATS, s); }
function bumpToday(){
  const w = pool[currentIndex]; if (!w) return;
  const key = `${todayStr()}::${w.word}`;
  if (seenToday.has(key)) return;
  seenToday.add(key);
  const s = stats();
  s.learnedToday = (s.learnedToday||0)+1;
  s.totalLearned = (s.totalLearned||0)+1;
  setStats(s);
}

btnStats.addEventListener('click', ()=>{
  const s = stats();
  statToday.textContent = s.learnedToday || 0;
  statTotal.textContent = s.totalLearned || 0;
  statSaved.textContent = (store.get(KEYS.SAVED, []).length) || 0;
  modalStats.showModal();
});

// --- quiz ---
let quizState = null;
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
function makeMCQ(havuz){
  if (havuz.length < 4) return null;
  const correct = havuz[Math.floor(Math.random()*havuz.length)];
  const set = new Set([correct.meaning_tr]);
  while(set.size < 4){ set.add(havuz[Math.floor(Math.random()*(havuz.length))].meaning_tr); }
  return { q: correct, opts: shuffle([...set]) };
}
function startQuiz(){
  const src = pool.length ? pool : (window.words||[]).filter(w=>w.cefr===currentLevel);
  if (src.length < 4){ quizQ.textContent='Bu seviye için yeterli kelime yok.'; quizOpts.innerHTML=''; return; }
  quizState = { n:0, score:0, src, current:null };
  nextQ();
}
function nextQ(){
  if (!quizState) return;
  if (quizState.n >= 5){
    quizQ.textContent = `Bitti! Skorun: ${quizState.score}/5`;
    quizOpts.innerHTML = '';
    updateFoot(); return;
  }
  const mcq = makeMCQ(quizState.src);
  quizState.current = mcq;
  quizQ.innerHTML = `<strong>${mcq.q.word}</strong> kelimesinin Türkçesi nedir?`;
  quizOpts.innerHTML = '';
  mcq.opts.forEach(opt=>{
    const d = document.createElement('div');
    d.className = 'opt'; d.textContent = opt;
    d.addEventListener('click', ()=>{
      const ok = (opt === mcq.q.meaning_tr);
      d.classList.add(ok ? 'correct' : 'wrong');
      if (!ok){
        const correctEl = $$('.opt', quizOpts).find(el => el.textContent === mcq.q.meaning_tr);
        if (correctEl) correctEl.classList.add('correct');
      } else {
        quizState.score++;
      }
      $$('.opt', quizOpts).forEach(x=> x.style.pointerEvents='none');
      setTimeout(()=>{ quizState.n++; nextQ(); }, 700);
      updateFoot();
    });
    quizOpts.appendChild(d);
  });
  quizState.n++; updateFoot();
}
function updateFoot(){
  quizN.textContent = Math.min(quizState?.n||0, 5);
  quizScore.textContent = quizState?.score||0;
}
btnQuiz.addEventListener('click', ()=>{ startQuiz(); modalQuiz.showModal(); });
quizRestart.addEventListener('click', ()=> startQuiz());

// --- toast ---
function showToast(msg){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(()=> t.classList.remove('show'), 1500);
}
