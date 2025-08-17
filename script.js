;(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // Views
  const views = {
    home:    $('#view-home'),
    level:   $('#view-level'),
    session: $('#view-session'),
    saved:   $('#view-saved'),
  };

  // Nav / Action bar
  const btnLearn = $('#nav-learn');
  const btnSaved = $('#nav-saved');
  const btnBack  = $('#btn-back');

  // Level & start
  const levelGrid = $('#level-grid');
  const btnStart  = $('#btn-start');

  // Session
  const wordTitleEl  = $('#word-en');
  const wordBadgeEl  = $('#word-badges');
  const trBox        = $('#tr-box');
  const trTextEl     = $('#tr-text');
  const trToggleBtn  = $('#tr-toggle');
  const examplesList = $('#examples-list');
  const btnSaveWord  = $('#btn-save');
  const btnNext      = $('#btn-next');   // YENİ: Sonraki

  // Saved
  const savedListEl = $('#saved-list');

  // Data
  const WORDS = Array.isArray(window.words) ? window.words : [];
  WORDS.forEach(w => {
    if (!w.meaning_tr && (w.tr || w.translation)) w.meaning_tr = w.tr || w.translation;
    if (!w.pos && (w.partOfSpeech || w.type)) w.pos = w.partOfSpeech || w.type;
    if (!w.examples || !Array.isArray(w.examples)) {
      const arr = [];
      for (let i=1;i<=5;i++){ if (w['example'+i]) arr.push(w['example'+i]); }
      if (arr.length) w.examples = arr;
    }
  });

  const LS_SAVED = 'kc_saved_words_v2';
  let currentLevel = null;
  let pool = [];
  let current = null;

  function showView(name){
    Object.keys(views).forEach(k=>{
      if(views[k]) views[k].style.display = (k===name)?'block':'none';
    });
  }

  function chip(text){
    const s=document.createElement('span');
    s.className='chip'; s.textContent=text; return s;
  }

  function normalizeExamples(exs){
    if(!exs) return [];
    return exs.map(e=>{
      if(typeof e==='string') return {en:e, tr:null};
      if(Array.isArray(e)) return {en:e[0]||'', tr:e[1]||null};
      if(e&&typeof e==='object') return {en:e.en||'', tr:e.tr||null};
      return {en:String(e||''), tr:null};
    });
  }

  function renderWord(w){
    if(!w) return;
    wordTitleEl.textContent = w.word || '';
    wordBadgeEl.innerHTML='';
    wordBadgeEl.appendChild(chip(`Seviye: ${w.cefr||'?'}`));
    if(w.pos) wordBadgeEl.appendChild(chip(`Tür: ${w.pos.toUpperCase()}`));
    if(w.meaning_tr) wordBadgeEl.appendChild(chip(`TR: ${w.meaning_tr}`));

    trBox.classList.remove('revealed');
    trTextEl.textContent = w.meaning_tr || '—';

    examplesList.innerHTML='';
    const norm = normalizeExamples(w.examples);
    const total = Math.max(5, norm.length);
    for(let i=0;i<total;i++){
      const ex = norm[i] || {en:'', tr:null};
      const card = document.createElement('div'); card.className='ex-card';
      const en = document.createElement('div'); en.className='ex-en'; en.textContent = ex.en || '—';
      const tr = document.createElement('div'); tr.className='ex-tr';
      if(ex.tr){
        tr.textContent = ex.tr; tr.classList.add('masked');
        tr.addEventListener('click',()=>tr.classList.toggle('masked'));
      }else{
        tr.innerHTML = '<span class="ex-missing">TR yok</span>';
      }
      card.appendChild(en); card.appendChild(tr);
      examplesList.appendChild(card);
    }
  }

  function setLevel(lvl){
    currentLevel = lvl;
    pool = WORDS.filter(w => String(w.cefr||'').toUpperCase() === String(lvl).toUpperCase());
  }
  function pickRandom(){
    if(!pool.length) return null;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function startSession(){
    current = pickRandom();
    renderWord(current);
    showView('session');
  }

  // TR toggle
  trToggleBtn.addEventListener('click', ()=> trBox.classList.toggle('revealed'));

  // Save
  function readSaved(){ try{return JSON.parse(localStorage.getItem(LS_SAVED)||'[]')}catch{return[]} }
  function writeSaved(a){ localStorage.setItem(LS_SAVED, JSON.stringify(a)); }
  function isSaved(key){ return readSaved().some(x => (x.word||'').toLowerCase()===(key||'').toLowerCase()); }
  btnSaveWord.addEventListener('click', ()=>{
    if(!current) return;
    const all = readSaved();
    if(isSaved(current.word)) { toast('Bu kelime zaten kaydedilmiş.'); return; }
    all.push({ word: current.word, cefr: current.cefr||'', pos: current.pos||'',
      meaning_tr: current.meaning_tr||'', examples: current.examples||[], note:'' });
    writeSaved(all);
    toast('Kelime kaydedildi ✔');
  });

  // Next
  btnNext.addEventListener('click', ()=>{
    if(!pool.length){ toast('Önce seviye seç ve başlat.'); return; }
    current = pickRandom();
    renderWord(current);
  });

  // Saved
  function renderSaved(){
    const all = readSaved();
    savedListEl.innerHTML='';
    if(!all.length){
      const d=document.createElement('div'); d.className='empty'; d.textContent='Henüz kayıtlı kelime yok.'; savedListEl.appendChild(d); return;
    }
    all.forEach(item=>{
      const wrap=document.createElement('div'); wrap.className='saved-item';
      const head=document.createElement('div'); head.className='saved-head';
      const icon=document.createElement('div'); icon.className='round-icon'; icon.textContent=(item.word||'?')[0]?.toUpperCase()||'•';
      const title=document.createElement('div'); title.className='saved-title'; title.textContent=item.word;
      const toggle=document.createElement('button'); toggle.className='btn tiny ghost'; toggle.textContent='▼';
      head.appendChild(icon); head.appendChild(title); head.appendChild(toggle);

      const body=document.createElement('div'); body.className='saved-body'; body.style.display='none';

      const badges=document.createElement('div'); badges.className='badge-row';
      badges.appendChild(chip(`Seviye: ${item.cefr||'?'}`));
      if(item.pos) badges.appendChild(chip(`Tür: ${String(item.pos).toUpperCase()}`));
      if(item.meaning_tr) badges.appendChild(chip(`TR: ${item.meaning_tr}`));

      const exWrap=document.createElement('div'); exWrap.className='ex-wrap';
      const exT=document.createElement('div'); exT.className='section-title'; exT.textContent='Cümle içinde kullanım';
      const exList=document.createElement('div'); exList.className='ex-grid';

      const norm = normalizeExamples(item.examples);
      const total = Math.max(5, norm.length);
      for(let i=0;i<total;i++){
        const ex = norm[i] || {en:'', tr:null};
        const card=document.createElement('div'); card.className='ex-card';
        const en=document.createElement('div'); en.className='ex-en'; en.textContent=ex.en||'—';
        const tr=document.createElement('div'); tr.className='ex-tr';

        if(ex.tr){
          tr.textContent=ex.tr; tr.classList.add('masked');
          tr.addEventListener('click',()=>tr.classList.toggle('masked'));
        }else{
          tr.innerHTML='<span class="ex-missing">TR yok</span>';

          // YENİ: TR ekleme alanı
          const edit=document.createElement('div'); edit.className='ex-edit';
          const inp=document.createElement('input'); inp.type='text'; inp.placeholder='Türkçe çeviri ekle';
          const add=document.createElement('button'); add.className='btn tiny primary'; add.textContent='Ekle';
          add.addEventListener('click', ()=>{
            const val=inp.value.trim(); if(!val){return;}
            // kayıttaki examples'i güvenli objeye çevir
            const allNow = readSaved();
            const me = allNow.find(x => (x.word||'').toLowerCase()===(item.word||'').toLowerCase());
            if(!me){ return; }
            if(!Array.isArray(me.examples)) me.examples=[];
            // ilgili indexi objeye dönüştür
            if(!me.examples[i]) me.examples[i] = {en: ex.en||'', tr: val};
            else {
              if(typeof me.examples[i]==='string') me.examples[i] = {en: me.examples[i], tr: val};
              else if(Array.isArray(me.examples[i])) me.examples[i] = {en: me.examples[i][0]||'', tr: val};
              else me.examples[i].tr = val;
            }
            writeSaved(allNow);
            renderSaved();
            toast('Çeviri eklendi ✔');
          });
          edit.appendChild(inp); edit.appendChild(add);
          card.appendChild(edit);
        }

        card.appendChild(en); card.appendChild(tr);
        exList.appendChild(card);
      }

      exWrap.appendChild(exT); exWrap.appendChild(exList);

      const noteLabel=document.createElement('div'); noteLabel.className='section-title'; noteLabel.textContent='Not (ipucu / mnemonik)';
      const note=document.createElement('textarea'); note.className='note'; note.value=item.note||'';
      const row=document.createElement('div'); row.className='btn-row';
      const saveBtn=document.createElement('button'); saveBtn.className='btn primary'; saveBtn.textContent='Notu Kaydet';
      const delBtn=document.createElement('button'); delBtn.className='btn danger'; delBtn.textContent='Kelimeyi Sil';

      saveBtn.addEventListener('click', ()=>{
        const all2=readSaved();
        const hit=all2.find(x=>(x.word||'').toLowerCase()===(item.word||'').toLowerCase());
        if(hit){ hit.note = note.value; writeSaved(all2); toast('Not kaydedildi ✔'); }
      });

      delBtn.addEventListener('click', ()=>{
        confirmModal(`“${item.word}” kelimesini silmek istiyor musun?`, 'Sil', 'İptal', ()=>{
          const rest=readSaved().filter(x=>(x.word||'').toLowerCase()!==(item.word||'').toLowerCase());
          writeSaved(rest); renderSaved(); toast('Kelime silindi 🗑️');
        });
      });

      toggle.addEventListener('click', ()=>{
        const open=body.style.display==='block';
        body.style.display=open?'none':'block';
        toggle.textContent=open?'▼':'▲';
      });

      body.appendChild(badges);
      body.appendChild(exWrap);
      body.appendChild(noteLabel);
      body.appendChild(note);
      body.appendChild(row);
      row.appendChild(saveBtn);
      row.appendChild(delBtn);

      wrap.appendChild(head);
      wrap.appendChild(body);
      savedListEl.appendChild(wrap);
    });
  }

  // Toast
  let toastTimer=null;
  function toast(msg){
    let t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
    t.textContent=msg; t.className='show';
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>{t.className='';},1800);
  }

  // Modal
  function confirmModal(message, okText='Onayla', cancelText='İptal', onOK=()=>{}){
    const m = $('#kc-modal'); m.querySelector('.kc-message').textContent=message;
    const ok = $('#kc-ok'), cancel = $('#kc-cancel');
    ok.textContent=okText; cancel.textContent=cancelText;
    function close(){ m.classList.remove('open'); ok.onclick=cancel.onclick=null; }
    ok.onclick=()=>{ close(); onOK(); };
    cancel.onclick=close;
    m.classList.add('open');
  }

  // Nav
  btnLearn.addEventListener('click', ()=> showView('level'));
  btnSaved.addEventListener('click', ()=>{ showView('saved'); renderSaved(); });
  btnBack.addEventListener('click', ()=> showView('home'));

  // Level buttons
  levelGrid.addEventListener('click', (e)=>{
    const btn=e.target.closest('[data-level]'); if(!btn) return;
    $$('.level-btn.active').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); setLevel(btn.dataset.level);
  });

  // Start
  btnStart.addEventListener('click', ()=>{
    if(!currentLevel){ toast('Önce seviye seç 🗂️'); return; }
    if(!pool.length){ alert('Bu seviye için word listesinde veri bulunamadı.'); return; }
    startSession();
  });

  // Start view
  showView('home');
})();
