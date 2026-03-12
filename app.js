/*  ================================================================
    app.js — Vocab Flashcard Engine
    words.json'a yeni kelime eklemen yeterli, uygulama otomatik alır.
    Format:  { "word": "example", "meaning": "Örnek, misal" }
    ================================================================ */

(function () {
  "use strict";

  /* ---------- ANİMASYON SÜRELERİ (CSS ile senkron olmalı) ---------- */
  const ANIM_ENTER_MS = 350;   /* cardIn animasyon süresi */
  const ANIM_FLIP_MS  = 360;   /* flipX animasyon süresi */
  const ANIM_FLIP_MID = 180;   /* flipX ortası (scaleX=0 anı) */

  /* ---------- STATE ---------- */
  let WORDS        = [];
  let sessionWords = [];   /* mevcut oturumun kelime havuzu (tam liste veya zayıf alt kümesi) */
  let deck         = [];
  let lastWord     = null;
  let knownSet     = new Set();
  let learnSet     = new Set();
  let current      = null;
  let showBack     = false;
  let locked       = false;
  let swipeFlag    = false;
  let currentRange = null;   /* { from, to } veya null */

  /* ---------- DOM ---------- */
  const card       = document.getElementById("card");
  const cLabel     = document.getElementById("cLabel");
  const cText      = document.getElementById("cText");
  const sKnown     = document.getElementById("sKnown");
  const sLearn     = document.getElementById("sLearn");
  const sRemain    = document.getElementById("sRemain");
  const pFill      = document.getElementById("pFill");
  const doneScreen = document.getElementById("doneScreen");
  const actions    = document.getElementById("actionsPanel");
  const wlOverlay  = document.getElementById("wlOverlay");
  const wlList     = document.getElementById("wlList");
  const rangeFrom  = document.getElementById("rangeFrom");
  const rangeTo    = document.getElementById("rangeTo");

  /* ---------- LOCALSTORAGE ---------- */
  const LS_KEY = "vocab_progress";

  function saveProgress() {
    localStorage.setItem(LS_KEY, JSON.stringify({
      known: [...knownSet],
      learn: [...learnSet],
      count: WORDS.length   /* kelime listesi değişirse kayıt geçersiz sayılır */
    }));
  }

  function loadProgress() {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) { init(); return; }
    try {
      const { known, learn, count } = JSON.parse(saved);
      if (count !== WORDS.length) { init(); return; }   /* liste güncellendiyse sıfırla */

      knownSet     = new Set(known);
      learnSet     = new Set(learn);
      sessionWords = WORDS;

      const remaining = WORDS.filter(w => !knownSet.has(w.word) && !learnSet.has(w.word));
      resetCardUI();
      if (remaining.length === 0) { showComplete(); return; }
      deck = buildDeck(remaining);
      updateStats();
      showNext();
    } catch (e) {
      init();
    }
  }

  /* ---------- LOAD JSON ---------- */
  fetch("words.json")
    .then(r => {
      if (!r.ok) throw new Error("words.json yüklenemedi (" + r.status + ")");
      return r.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        cText.textContent = "words.json boş veya hatalı";
        return;
      }
      WORDS = data;
      loadProgress();
    })
    .catch(err => {
      cText.textContent = "Hata: " + err.message;
      console.error(err);
    });

  /* ---------- SHUFFLE (Fisher-Yates) + art arda tekrar yok ---------- */
  function buildDeck(words) {
    if (!words.length) return [];
    const a = words.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    /* ilk kart son gösterilenle aynıysa yer değiştir */
    if (a.length > 1 && lastWord && a[0].word === lastWord) {
      for (let k = 1; k < a.length; k++) {
        if (a[k].word !== lastWord) { [a[0], a[k]] = [a[k], a[0]]; break; }
      }
    }
    return a;
  }

  /* ---------- UI SIFIRLA ---------- */
  function resetCardUI() {
    doneScreen.classList.remove("active");
    card.style.display    = "";
    actions.style.display = "";
    card.classList.remove("show-back");
    showBack = false;
  }

  /* ---------- RANGE BADGE ---------- */
  function showRangeBadge(from, to) {
    currentRange = { from, to };
    document.getElementById("rangeBadgeText").textContent = from + "–" + to + " aralığı";
    document.getElementById("rangeBadge").style.display = "flex";
  }

  function hideRangeBadge() {
    currentRange = null;
    document.getElementById("rangeBadge").style.display = "none";
  }

  /* ---------- INIT (tam sıfırlama) ---------- */
  function init() {
    knownSet.clear();
    learnSet.clear();
    lastWord     = null;
    sessionWords = WORDS;
    localStorage.removeItem(LS_KEY);
    hideRangeBadge();
    resetCardUI();
    deck = buildDeck(WORDS.slice());
    updateStats();
    showNext();
  }

  /* ---------- SHOW NEXT ---------- */
  function showNext() {
    if (deck.length === 0) { showComplete(); return; }

    locked   = true;
    showBack = false;
    card.classList.remove("show-back");

    current  = deck.shift();
    lastWord = current.word;

    cLabel.textContent = "Kelime";
    cText.textContent  = current.word;

    card.classList.remove("entering");
    void card.offsetWidth;   /* reflow — animasyonu yeniden tetikle */
    card.classList.add("entering");

    setTimeout(() => { locked = false; }, ANIM_ENTER_MS);
  }

  /* ---------- FLIP (scaleX) ---------- */
  function flipCard() {
    if (locked) return;
    locked = true;

    const goingBack = !showBack;

    card.classList.remove("flipping");
    void card.offsetWidth;
    card.classList.add("flipping");

    /* animasyonun tam ortasında (kart scaleX=0) içerik değişir */
    setTimeout(() => {
      showBack = goingBack;
      if (goingBack) {
        cLabel.textContent = "Anlam";
        cText.textContent  = current.meaning;
        card.classList.add("show-back");
      } else {
        cLabel.textContent = "Kelime";
        cText.textContent  = current.word;
        card.classList.remove("show-back");
      }
    }, ANIM_FLIP_MID);

    setTimeout(() => {
      card.classList.remove("flipping");
      locked = false;
    }, ANIM_FLIP_MS);
  }

  /* ---------- MARK ---------- */
  function markCard(type) {
    if (locked || !current) return;
    if (type === "known") {
      knownSet.add(current.word);
      learnSet.delete(current.word);
    } else {
      learnSet.add(current.word);
      knownSet.delete(current.word);
    }
    updateStats();
    saveProgress();
    showNext();
  }

  /* ---------- STATS (session-scoped) ---------- */
  /*
   * Ana oturumda sessionWords === WORDS olduğundan knownSet/learnSet direkt kullanılır.
   * Zayıf kelime tekrarında sessionWords ⊂ WORDS olduğundan, yalnızca o alt kümedeki
   * kelimeler sayılır — böylece önceki oturumdan gelen "biliyorum" sayısı karışmaz.
   */
  function sessionCounts() {
    if (sessionWords === WORDS) {
      return { k: knownSet.size, l: learnSet.size };
    }
    const sw = new Set(sessionWords.map(w => w.word));
    return {
      k: [...knownSet].filter(w => sw.has(w)).length,
      l: [...learnSet].filter(w => sw.has(w)).length,
    };
  }

  function updateStats() {
    const total = sessionWords.length;
    const { k, l } = sessionCounts();
    sKnown.textContent  = k;
    sLearn.textContent  = l;
    sRemain.textContent = total - k - l;
    pFill.style.width   = ((k + l) / total * 100) + "%";
  }

  /* ---------- COMPLETE ---------- */
  function showComplete() {
    card.style.display    = "none";
    actions.style.display = "none";
    const { k, l } = sessionCounts();
    document.getElementById("fKnown").textContent = k;
    document.getElementById("fLearn").textContent = l;
    document.getElementById("btnReview").style.display = l > 0 ? "" : "none";
    doneScreen.classList.add("active");
  }

  /* ---------- REVIEW WEAK ---------- */
  /*
   * FIX: knownSet KORUNUYOR — önceki oturumdan bilinen kelimeler silinmez.
   * Yalnızca learnSet temizlenir; tekrar sırasında kelimeler yeniden işaretlendikçe
   * knownSet/learnSet güncellenir ve saveProgress() ile localStorage'a yansır.
   * Böylece "öğreniyorum" → review'da "biliyorum" işaretleme kalıcı olur.
   */
  function reviewWeak() {
    const weak = WORDS.filter(w => learnSet.has(w.word));
    if (!weak.length) return;

    learnSet.clear();          /* tekrar edilecek kelimeleri sıfırla (yeniden işaretlenecek) */
    sessionWords = weak;       /* istatistikler bu alt kümeye göre hesaplanır */
    lastWord     = null;

    deck = buildDeck(weak);
    resetCardUI();
    updateStats();
    showNext();
  }

  /* ---------- WORD LIST OVERLAY ---------- */
  function updateRangeHint() {
    const from = Math.max(1, parseInt(rangeFrom.value, 10) || 1);
    const to   = Math.max(from, Math.min(parseInt(rangeTo.value, 10) || from, WORDS.length));
    const count = to - from + 1;
    document.getElementById("rangeHint").textContent = count + " kelime";
  }

  function openWordList() {
    /* kelime listesini doldur (ilk açılışta veya WORDS değiştiyse) */
    if (wlList.children.length !== WORDS.length) {
      wlList.innerHTML = "";
      WORDS.forEach((w, i) => {
        const item = document.createElement("div");
        item.className = "wl-item";
        item.innerHTML =
          '<span class="wl-num">' + (i + 1) + '</span>' +
          '<span class="wl-word">' + w.word + '</span>' +
          '<span class="wl-meaning">' + w.meaning + '</span>';
        wlList.appendChild(item);
      });
      rangeFrom.max = WORDS.length;
      rangeTo.max   = WORDS.length;
      rangeTo.value = Math.min(20, WORDS.length);
      document.getElementById("wlTotal").textContent = WORDS.length + " kelime";
      updateRangeHint();
    }
    wlOverlay.classList.add("active");
  }

  function closeWordList() {
    wlOverlay.classList.remove("active");
  }

  /* ---------- RANGE SESSION ---------- */
  function startRangeSession() {
    let from = parseInt(rangeFrom.value, 10);
    let to   = parseInt(rangeTo.value, 10);

    /* sınır düzeltmeleri */
    from = Math.max(1, Math.min(from, WORDS.length));
    to   = Math.max(from, Math.min(to, WORDS.length));
    rangeFrom.value = from;
    rangeTo.value   = to;

    const subset = WORDS.slice(from - 1, to);   /* 1-indexed, inclusive */

    /* bu aralıktaki kelimelerin önceki işaretlerini temizle (taze oturum) */
    subset.forEach(w => { knownSet.delete(w.word); learnSet.delete(w.word); });

    sessionWords = subset;
    lastWord     = null;

    deck = buildDeck(subset.slice());
    closeWordList();
    showRangeBadge(from, to);
    resetCardUI();
    updateStats();
    showNext();
  }

  /* ================================================================
     EVENTS
     ================================================================ */

  /* kart tıkla / dokun → çevir */
  card.addEventListener("click", e => {
    e.stopPropagation();
    if (swipeFlag) return;
    flipCard();
  });

  /* butonlar */
  document.getElementById("btnKnow").addEventListener("click",       () => markCard("known"));
  document.getElementById("btnLearn").addEventListener("click",      () => markCard("learning"));
  document.getElementById("btnRestart").addEventListener("click",    () => init());
  document.getElementById("btnReview").addEventListener("click",     () => reviewWeak());
  document.getElementById("btnList").addEventListener("click",       () => openWordList());
  document.getElementById("wlClose").addEventListener("click",       () => closeWordList());
  document.getElementById("btnStartRange").addEventListener("click", () => startRangeSession());
  document.getElementById("btnExitRange").addEventListener("click",  () => init());

  /* overlay dışına tıklayınca kapat */
  wlOverlay.addEventListener("click", e => { if (e.target === wlOverlay) closeWordList(); });

  /* aralık değişince hint güncelle */
  rangeFrom.addEventListener("input", updateRangeHint);
  rangeTo.addEventListener("input", updateRangeHint);

  /* klavye */
  document.addEventListener("keydown", e => {
    /* liste overlay açıksa Escape ile kapat */
    if (wlOverlay.classList.contains("active")) {
      if (e.code === "Escape") { e.preventDefault(); closeWordList(); }
      return;
    }
    if (doneScreen.classList.contains("active")) {
      /* done ekranında: Enter → baştan başla, R → zayıfları tekrarla */
      if (e.code === "Enter") { e.preventDefault(); init(); }
      if (e.code === "KeyR")  { e.preventDefault(); reviewWeak(); }
      return;
    }
    if (e.code === "Escape")     { e.preventDefault(); init(); }        /* tam sıfırla */
    if (e.code === "Space")      { e.preventDefault(); flipCard(); }
    if (e.code === "ArrowRight") { e.preventDefault(); markCard("known"); }
    if (e.code === "ArrowLeft")  { e.preventDefault(); markCard("learning"); }
  });

  /* swipe (mobil) */
  let sx = 0, sy = 0;
  document.getElementById("cardArea").addEventListener("touchstart", e => {
    sx = e.changedTouches[0].clientX;
    sy = e.changedTouches[0].clientY;
    swipeFlag = false;
  }, { passive: true });

  document.getElementById("cardArea").addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swipeFlag = true;
      markCard(dx > 0 ? "known" : "learning");
      setTimeout(() => { swipeFlag = false; }, 100);
    }
  }, { passive: true });

})();
