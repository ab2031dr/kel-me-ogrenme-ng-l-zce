// ============================
// KELİMELİK • SCRIPT.JS (full)
// ============================

// Kısayollar
const $  = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const todayStr = () => new Date().toISOString().slice(0,10);

// Storage anahtarları
const KEYS = { SAVED:'savedWords', NOTES:'userNotes', STATS:'stats', THEME:'theme' };
const store = {
  get(k, def){ try{const v = localStorage.getItem(k); return v?JSON.parse(v):def;}catch{ return def; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};
// Varsayılanlar
if (!store.get(KEYS.SAVED)) store.set(KEYS.SAVED, []);
if (!store.get(KEYS.NOTES)) store.set(KEYS.NOTES, {});
if (!store.get(KEYS.STATS)) store.set(KEYS.STATS, { lastDay: todayStr(), learnedToday:0, totalLearned:0, totalSaved:0 });
if (!store.get(KEYS.THEME)) store.set(KEYS.THEME, 'dark');

// Global durum
let currentLevel = 'A1';
let pool = [];
let currentIndex = 0;
let historyStack = [];
let seenToday = new Set();

// Elementler
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
const wordCount = $('#word-count');

const btnPrev = $('#btn-prev');
const btnNext = $('#btn-next');
const btnSave = $('#btn-save');
const btnNote = $('#btn-note');
const btnDelete = $('#btn-delete');
const btnSpeak = $('#btn-speak');
const btnSpeakSlow = $('#btn-speak-slow');

const savedList = $('#saved-list');
const savedEmpty = $('#saved-empty');

const modalNote = $('#modal-note');
const modalConfirm = $('#modal-confirm');
const modalStats = $('#modal-stats');
const modalQuiz = $('#modal-quiz');
const modalAuth = $('#modal-auth');

const noteText = $('#note-text');
const noteSave = $('#note-save');
const confirmYes = $('#confirm-yes');

const btnStatsOpen = $('#btn-stats-open');
const btnQuizOpen  = $('#btn-quiz-open');

const statToday = $('#stat-today');
const statTotal = $('#stat-total');
const statSaved = $('#stat-saved');

const topLoginBtn  = $('#top-login-btn');
const topLogoutBtn = $('#top-logout-btn');
// Auth inputs & buttons
const authEmail = $('#authEmail');
const authPass  = $('#authPass');
const authLoginBtn    = $('#auth-login');
const authRegisterBtn = $('#auth-register');
const authGuestBtn    = $('#auth-guest');

// Quiz elemanları
const quizChooser = $('#quiz-chooser');
const quizFromSaved = $('#quiz-from-saved');
const quizFromRandom = $('#quiz-from-random');
const quizLevelsWrap = $('#quiz-levels');
const quizLevelBtns = $$('.q-level');
const quizArea = $('#quiz-area');
const quizQ = $('#quiz-q');
const quizHint = $('#quiz-hint');
const quizOpts = $('#quiz-opts');
const quizN = $('#quiz-n');
const quizTotalEl = $('#quiz-total');
const quizScore = $('#quiz-score');
const quizRestart = $('#quiz-restart');
const quizSkip = $('#quiz-skip');
const quizClose = $('#quiz-close');

// ============== Tema ==============
(function initTheme(){
  const saved = store.get(KEYS.THEME, 'dark');
  document.documentElement.setAttribute('data-theme', saved);
  document.body.setAttribute('data-theme', saved);
  if (themeSelect) themeSelect.value = saved;
})();
themeSelect?.addEventListener('change', ()=>{
  const t = themeSelect.value;
  document.documentElement.setAttribute('data-theme', t);
  document.body.setAttribute('data-theme', t);
  store.set(KEYS.THEME, t);
});

// Görünüm helper
function showOnly(view){
  [viewHome, viewLevels, viewLearn, viewSaved].forEach(v=>v.classList.remove('active'));
  view.classList.add('active');
}
showOnly(viewHome);

// ============== Navigasyon ==============
goLearn.addEventListener('click', ()=> showOnly(viewLevels));
goSaved.addEventListener('click', ()=> { showOnly(viewSaved); renderSaved(); });
backHome1.addEventListener('click', ()=> showOnly(viewHome));
backHome2.addEventListener('click', ()=> showOnly(viewHome));
backLevels.addEventListener('click', ()=> showOnly(viewLevels));

// Seviye seçimi
levelButtons.forEach(b=>{
  b.addEventListener('click', ()=>{
    levelButtons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    currentLevel = b.dataset.level;
  });
});

// Başlat
btnStart.addEventListener('click', ()=>{
  pool = (window.words || []).filter(w => w.cefr === currentLevel);
  currentIndex = 0;
  historyStack = [];
  if (!pool.length){
    wordEn.textContent = 'Bu seviyede kelime yok';
    wordEnPlain.textContent = '-';
    wordTr.textContent = '—';
    exampleList.innerHTML = '';
    updateWordCounter();
    showOnly(viewLearn);
    return;
  }
  renderCurrent(true);
  showOnly(viewLearn);
});

// Sayaç
function updateWordCounter(){
  const total = pool.length || 0;
  const cur = total ? (currentIndex + 1) : 0;
  if (wordCount) wordCount.textContent = `${cur} / ${total}`;
}

// Kartı çiz
function renderCurrent(animate=false){
  const w = pool[currentIndex];
  if (!w) { updateWordCounter(); return; }

  wordLevel.textContent = w.cefr || '-';
  wordPos.textContent = w.pos || '-';
  wordEn.textContent = w.word || '-';
  wordEnPlain.textContent = w.word || '-';

  // TR sansürlü
  wordTr.textContent = w.meaning_tr || '—';
  wordTr.classList.add('hidden');

  // Örnekler
  exampleList.innerHTML = '';
  (w.examples || []).slice(0,5).forEach(ex=>{
    const li = document.createElement('li');
    const tr = ex.tr ? ` — <span class="tr-censor muted hidden">${ex.tr}</span>` : '';
    li.innerHTML = `<strong>${ex.en}</strong>${tr}`;
    exampleList.appendChild(li);
  });

  updateWordCounter();

  if (animate){
    wordCard.classList.remove('fade-in');
    void wordCard.offsetWidth;
    wordCard.classList.add('fade-in');
  }
}

// TR göster/gizle
btnShowTr.addEventListener('click', ()=>{
  wordTr.classList.toggle('hidden');
  $$('.tr-censor').forEach(s => s.classList.toggle('hidden'));
  bumpToday();
});

// Önceki/Sonraki
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

// ============== Telaffuz ==============
function speakText(txt, rate=1){
  if (!txt || !window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(txt);
  utt.lang = 'en-US';
  utt.rate = rate;
  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
}
btnSpeak.addEventListener('click', ()=>{
  const w = pool[currentIndex]; if (!w) return;
  speakText(w.word, 1);
});
btnSpeakSlow.addEventListener('click', ()=>{
  const w = pool[currentIndex]; if (!w) return;
  speakText(w.word, 0.72);
});

// ============== Kaydet / Not / Sil ==============
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

// ============== Kaydedilenler ekranı ==============
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
        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn small" data-action="edit">Not Düzenle</button>
          <button class="btn small danger" data-action="remove">Kelimeden Sil</button>
          <button class="btn small" data-action="speak">🔊 Telaffuz</button>
          <button class="btn small outline" data-action="speak-slow">🐢 Yavaş</button>
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

    $('[data-action="speak"]', wrap).addEventListener('click', ()=> speakText(item.word, 1));
    $('[data-action="speak-slow"]', wrap).addEventListener('click', ()=> speakText(item.word, 0.72));

    savedList.appendChild(wrap);
  });
}

// ============== İstatistik ==============
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

btnStatsOpen?.addEventListener('click', ()=>{
  const s = stats();
  statToday.textContent = s.learnedToday || 0;
  statTotal.textContent = s.totalLearned || 0;
  statSaved.textContent = (store.get(KEYS.SAVED, []).length) || 0;
  modalStats.showModal();
});

// ============== Quiz ==============
let quizState = null;
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }

function makeMCQ(havuz){
  if (havuz.length < 4) return null;
  const correct = havuz[Math.floor(Math.random()*havuz.length)];
  const set = new Set([correct.meaning_tr]);
  while(set.size < 4){ set.add(havuz[Math.floor(Math.random()*havuz.length)].meaning_tr); }
  return {
    type:'mcq',
    q: correct,
    opts: shuffle([...set]),
    prompt: `“${correct.word}” kelimesinin Türkçesi nedir?`,
    hint: `(İpucu: ${correct.pos||'?'} • seviye ${correct.cefr})`
  };
}

function pickClozeSource(w){
  // örnek cümlelerden içinde kelime geçen birini seç
  const withWord = (w.examples||[]).filter(ex => (ex.en||'').toLowerCase().includes(w.word.toLowerCase()));
  if (withWord.length) return withWord[Math.floor(Math.random()*withWord.length)].en;
  // yoksa generik bir cümle
  return `The ${w.word} is here.`;
}
function makeCLOZE(havuz){
  const correct = havuz[Math.floor(Math.random()*havuz.length)];
  const sentence = pickClozeSource(correct);
  const re = new RegExp(`\\b${correct.word}\\b`, 'i');
  const masked = sentence.replace(re, '____');
  return {
    type:'cloze',
    q: correct,
    sentenceMasked: masked,
    sentenceFull: sentence.replace(re, correct.word),
    prompt: `Boşluğu doldur: ${masked}`,
    hint: `İpucu: ${correct.meaning_tr} (${correct.pos||'?'}) — doğru kelimeyi İngilizce yaz.`
  };
}

function nextQ(reset=false){
  if (!quizState) return;
  if (!reset && quizState.n > quizState.total){
    quizQ.innerHTML = `Bitti! Skorun: ${quizState.score}/${quizState.total}`;
    quizHint.textContent = '';
    quizOpts.innerHTML = '';
    updateFoot(); return;
  }
  // Tür seçimi: %50 mcq, %50 cloze
  const maker = Math.random() < 0.5 ? makeMCQ : makeCLOZE;
  let mcq = maker(quizState.src);
  // fallback
  if (!mcq) mcq = makeCLOZE(quizState.src);

  quizState.current = mcq;
  quizQ.innerHTML = mcq.prompt;
  quizHint.textContent = mcq.hint || '';

  quizOpts.innerHTML = '';
  if (mcq.type === 'mcq'){
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
        setTimeout(()=>{ quizState.n++; updateFoot(); nextQ(); }, 800);
      });
      quizOpts.appendChild(d);
    });
  } else {
    // cloze: input + kontrol butonu
    const wrap = document.createElement('div');
    const inp = document.createElement('input');
    inp.className = 'input';
    inp.placeholder = 'İngilizce kelimeyi yaz';
    inp.autocomplete = 'off';

    const btn = document.createElement('button');
    btn.className = 'btn'; btn.textContent = 'Kontrol'; btn.type='button';

    const feedback = document.createElement('div');
    feedback.className = 'muted';
    feedback.style.marginTop = '6px';

    btn.addEventListener('click', ()=>{
      const val = (inp.value||'').trim().toLowerCase();
      const ok = val === mcq.q.word.toLowerCase();
      if (ok){
        feedback.innerHTML = `✅ Doğru! <strong>${mcq.sentenceFull}</strong>`;
        quizState.score++;
      } else {
        feedback.innerHTML = `❌ Yanlış. Doğru: <strong>${mcq.q.word}</strong><br><span class="muted">${mcq.sentenceFull}</span>`;
      }
      setTimeout(()=>{ quizState.n++; updateFoot(); nextQ(); }, 900);
    });

    wrap.appendChild(inp);
    wrap.appendChild(btn);
    wrap.appendChild(feedback);
    quizOpts.appendChild(wrap);
    inp.focus();
  }

  if (reset) { quizState.n = 1; } // ilk soru
  updateFoot();
}
function updateFoot(){
  quizN.textContent = Math.min(quizState?.n||0, quizState?.total||10);
  quizTotalEl.textContent = quizState?.total || 10;
  quizScore.textContent = quizState?.score||0;
}

// Quiz aç
btnQuizOpen.addEventListener('click', ()=>{
  quizChooser.style.display = 'flex';
  quizLevelsWrap.style.display = 'none';
  quizArea.style.display = 'none';
  modalQuiz.showModal();
});

// Kaydedilmiş kelimelerden quiz
quizFromSaved?.addEventListener('click', (e)=>{
  e.preventDefault();
  const saved = store.get(KEYS.SAVED, []);
  startQuiz(saved);
});

// Rastgele: önce seviye seçtir
quizFromRandom?.addEventListener('click', (e)=>{
  e.preventDefault();
  quizLevelsWrap.style.display = 'block';
});
quizLevelBtns.forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    const lvl = btn.dataset.level;
    const src = (window.words || []).filter(w => w.cefr === lvl);
    startQuiz(src);
  });
});

function startQuiz(src){
  const base = src?.length ? src : [];
  if (!base.length){
    alert('Yeterli kelime yok (en az 4 gerekir).');
    return;
  }
  quizState = { n:0, score:0, src: base, current:null, total: 10 };
  quizChooser.style.display = 'none';
  quizArea.style.display = 'block';
  nextQ(true);
}

// Kontroller
quizRestart?.addEventListener('click', (e)=>{
  e.preventDefault();
  if (!quizState) return;
  const src = quizState.src;
  startQuiz(src);
});
quizSkip?.addEventListener('click', (e)=>{
  e.preventDefault();
  if (!quizState) return;
  quizState.n++;
  updateFoot();
  nextQ();
});
quizClose?.addEventListener('click', (e)=>{
  e.preventDefault();
  modalQuiz.close();
});

// ============== Auth (Supabase) ==============
function refreshLoginButton(){
  if (!window.sb || !sb) { topLoginBtn.style.display=''; topLogoutBtn.style.display='none'; return; }
  sb.auth.getUser().then(({ data })=>{
    const logged = !!data?.user;
    topLoginBtn.style.display = logged ? 'none' : '';
    topLogoutBtn.style.display = logged ? '' : 'none';
  }).catch(()=> {
    topLoginBtn.style.display='';
    topLogoutBtn.style.display='none';
  });
}

topLoginBtn?.addEventListener('click', ()=>{
  modalAuth.showModal();
});
topLogoutBtn?.addEventListener('click', async ()=>{
  try{
    if (window.sb) await sb.auth.signOut();
    showToast('Çıkış yapıldı.');
  }catch(e){ /* no-op */ }
  refreshLoginButton();
});

authLoginBtn?.addEventListener('click', async (e)=>{
  e.preventDefault();
  if (!window.sb){ showToast('Giriş sistemi yüklenmedi'); return; }
  try{
    const { error } = await sb.auth.signInWithPassword({
      email: (authEmail.value||'').trim(),
      password: authPass.value||'',
    });
    if (error) throw error;
    showToast('Giriş başarılı!');
    modalAuth.close();
    refreshLoginButton();
  }catch(err){
    showToast('Giriş hata: ' + (err.message||err));
  }
});
authRegisterBtn?.addEventListener('click', async (e)=>{
  e.preventDefault();
  if (!window.sb){ showToast('Kayıt sistemi yüklenmedi'); return; }
  try{
    const { error } = await sb.auth.signUp({
      email: (authEmail.value||'').trim(),
      password: authPass.value||'',
    });
    if (error) throw error;
    showToast('Kayıt başarılı! E-postanı kontrol et.');
    modalAuth.close();
  }catch(err){
    showToast('Kayıt hata: ' + (err.message||err));
  }
});
authGuestBtn?.addEventListener('click', (e)=>{
  e.preventDefault();
  showToast('Misafir mod: veriler bu cihazda saklanacak.');
  modalAuth.close();
});

// ilk yüklemede login/çıkış butonlarını güncelle
refreshLoginButton();

// ============== Toast ==============
function showToast(msg){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(()=> t.classList.remove('show'), 1800);
}
