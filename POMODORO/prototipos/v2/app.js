/* Pomodoro Time · Autor: Gabriel Paspuel. Aplicación sin dependencias. Los tiempos se calculan con fechas
   absolutas para seguir funcionando al dejar la pestaña en segundo plano. */
(() => {
  'use strict';

  const STORAGE_KEY = 'pomodoro.bitacora.v2.v1';
  const DURATION = { work: 20 * 60 * 1000, rest: 5 * 60 * 1000 };
  const DAILY_GOAL = 4;
  const $ = id => document.getElementById(id);
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const characters = [
    { id: 'milo', name: 'Milo', species: 'el zorro', at: 0, quote: 'Las grandes cosas empiezan con pequeños pasos.', color: '#c58348' },
    { id: 'nube', name: 'Nube', species: 'la conejita', at: 1, quote: 'Hasta el salto más pequeño te lleva un poco más lejos.', color: '#d8ceb4' },
    { id: 'oliva', name: 'Oliva', species: 'la gatita', at: 3, quote: 'Encuentra tu rincón. Hazlo a tu manera.', color: '#a7ac87' },
    { id: 'bruno', name: 'Bruno', species: 'el oso', at: 5, quote: 'Avanza a tu ritmo. Aquí no hay ninguna prisa.', color: '#aa805f' },
    { id: 'luna', name: 'Luna', species: 'la lechuza', at: 10, quote: 'Un poco de atención abre un mundo de posibilidades.', color: '#a49a81' },
    { id: 'bambu', name: 'Bambú', species: 'el panda', at: 20, quote: 'Mira cuánto has crecido, un día a la vez.', color: '#a0a99a' }
  ];
  const landscapes = [
    { name: 'Lago de Braies', subtitle: 'Un respiro entre montañas.', image: './assets/lake.jpg' },
    { name: 'Bosque sereno', subtitle: 'Deja que el mundo vaya un poco más lento.', image: './assets/forest.jpg' },
    { name: 'Orilla tranquila', subtitle: 'Nada que perseguir. Solo estar aquí.', image: './assets/coast.jpg' }
  ];

  function uuid() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function freshState() {
    return { version: 1, mode: 'work', timers: {
      work: { remaining: DURATION.work, endAt: null, id: uuid() },
      rest: { remaining: DURATION.rest, endAt: null, id: uuid() }
    }, sessions: [], avatar: 'milo', landscape: 0, autoLandscape: true };
  }

  // Validate persisted data so a damaged or older record cannot break the app.
  function readState() {
    const base = freshState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== 1) return base;
      base.mode = saved.mode === 'rest' ? 'rest' : 'work';
      for (const mode of ['work', 'rest']) {
        const timer = saved.timers?.[mode];
        if (!timer) continue;
        base.timers[mode].remaining = Number.isFinite(timer.remaining) ? Math.max(0, Math.min(DURATION[mode], timer.remaining)) : DURATION[mode];
        base.timers[mode].endAt = Number.isFinite(timer.endAt) && mode === base.mode ? Math.min(timer.endAt, Date.now() + DURATION[mode]) : null;
        base.timers[mode].id = typeof timer.id === 'string' ? timer.id : uuid();
      }
      base.sessions = Array.isArray(saved.sessions) ? [...new Map(saved.sessions.filter(s => typeof s?.id === 'string' && Number.isFinite(s.at) && s.at > 0 && s.at <= Date.now()).map(s => [s.id, { id: s.id, at: s.at }])).values()] : [];
      base.avatar = characters.some(c => c.id === saved.avatar && c.at <= base.sessions.length) ? saved.avatar : 'milo';
      base.landscape = Number.isInteger(saved.landscape) && saved.landscape >= 0 && saved.landscape < landscapes.length ? saved.landscape : 0;
      base.autoLandscape = typeof saved.autoLandscape === 'boolean' ? saved.autoLandscape : true;
    } catch { /* Use defaults if storage is unavailable. */ }
    return base;
  }

  let state = readState();
  let storageWarning = false;
  let view = 'space';
  let toastTimeout;
  let completionMode = 'work';
  let audioContext, ambientSource, ambientGain;
  let soundEnabled = false;
  let previousDate = localDateKey(Date.now());

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch {
      if (!storageWarning) {
        storageWarning = true;
        toast('El navegador no permite guardar el progreso. Se conservará mientras esta página esté abierta.');
      }
    }
  }

  function localDateKey(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }
  function todayCount() { const key = localDateKey(Date.now()); return state.sessions.filter(s => localDateKey(s.at) === key).length; }
  function remaining(mode) { const timer = state.timers[mode]; return timer.endAt === null ? timer.remaining : Math.max(0, timer.endAt - Date.now()); }
  function clock(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function toast(message) {
    clearTimeout(toastTimeout);
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 5000);
  }

  /* Original SVG companions: scalable, offline, no icon or image libraries. */
  function avatarSVG(id) {
    const common = '<ellipse cx="120" cy="214" rx="63" ry="6" fill="#cbd5b7" opacity=".65"/>';
    const eyes = '<path d="M88 106q7-8 14 0m36 0q7-8 14 0" stroke="#4d4736" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="120" cy="119" rx="5" ry="4" fill="#514b3c"/><path d="M120 123q-6 7-11 1m11-1q6 7 11 1" stroke="#6c614a" stroke-width="2" fill="none" stroke-linecap="round"/>';
    const blush = '<ellipse cx="84" cy="119" rx="9" ry="4" fill="#dba28b" opacity=".5"/><ellipse cx="156" cy="119" rx="9" ry="4" fill="#dba28b" opacity=".5"/>';
    const scarf = '<path d="M85 143q35 13 70 0l-3 18q-33 12-65-1Z" fill="#75865b"/><path d="m138 154 14 2 3 29-18-4Z" fill="#687b51"/><path d="m141 178 12 3" stroke="#a4b182" stroke-width="2"/>';
    let art = '';
    if (id === 'milo') art = '<path d="M164 172c39-33 48-7 35 14-10 21-34 29-63 18Z" fill="#bd7943"/><path d="M196 160c20 3 9 27-5 36l-9-15Z" fill="#f2e5c7"/><ellipse cx="120" cy="175" rx="42" ry="39" fill="#cb8b4f"/><ellipse cx="120" cy="182" rx="27" ry="29" fill="#ebd9b6"/><ellipse cx="95" cy="209" rx="20" ry="8" fill="#9e643e"/><ellipse cx="146" cy="209" rx="20" ry="8" fill="#9e643e"/><path d="m68 88-8-56q24 0 43 32m34 0q18-32 43-32l-8 56" fill="#b97844"/><path d="m72 73-5-30 26 23m54 0 26-23-5 30" fill="#e8c6a5"/><path d="M60 90q16-34 60-31 45-3 60 31l-15 42q-18 26-45 25-29 1-45-25Z" fill="#cb8b4f"/><path d="M61 91q34-10 59 31 24-41 59-31-5 53-59 63-51-8-59-63Z" fill="#f6e8ca"/>' + eyes + blush + scarf + '<path d="M100 62q16-18 37-8-8 4-9 12" fill="#d49a5a"/>';
    if (id === 'nube') art = '<ellipse cx="161" cy="185" rx="19" ry="21" fill="#eee6d2"/><ellipse cx="120" cy="174" rx="40" ry="40" fill="#e6dec9"/><ellipse cx="120" cy="184" rx="26" ry="27" fill="#f8f1df"/><ellipse cx="95" cy="209" rx="20" ry="8" fill="#d4cbb5"/><ellipse cx="145" cy="209" rx="20" ry="8" fill="#d4cbb5"/><ellipse cx="91" cy="55" rx="18" ry="47" fill="#e6dec9" transform="rotate(-10 91 55)"/><ellipse cx="148" cy="55" rx="18" ry="47" fill="#e6dec9" transform="rotate(10 148 55)"/><ellipse cx="91" cy="48" rx="8" ry="30" fill="#dcb9ac" transform="rotate(-10 91 48)"/><ellipse cx="148" cy="48" rx="8" ry="30" fill="#dcb9ac" transform="rotate(10 148 48)"/><ellipse cx="120" cy="108" rx="57" ry="48" fill="#eee7d2"/>' + eyes + blush + scarf;
    if (id === 'oliva') art = '<path d="M159 181q38-34 34-5-2 28-39 27" fill="none" stroke="#8b9678" stroke-width="18" stroke-linecap="round"/><ellipse cx="120" cy="176" rx="41" ry="38" fill="#a2ad8a"/><ellipse cx="120" cy="185" rx="26" ry="25" fill="#d9ddbd"/><ellipse cx="96" cy="209" rx="19" ry="8" fill="#859370"/><ellipse cx="145" cy="209" rx="19" ry="8" fill="#859370"/><path d="m65 88 1-53q25 3 39 29h30q13-26 39-29l1 53q13 24-4 46-18 25-51 24-34 0-52-24-14-22-3-46Z" fill="#a8b38f"/><path d="m74 71 1-24 20 20m50 0 20-20 1 24" fill="#d5b5a5"/><path d="M110 66v16m10-18v15m10-13v16" stroke="#7e8b6c" stroke-width="5" stroke-linecap="round"/><ellipse cx="120" cy="126" rx="27" ry="22" fill="#dfe1c5"/>' + eyes + blush + '<path d="m80 121-22-3m22 11-22 3m102-11 22-3m-22 11 22 3" stroke="#728361" stroke-width="1.4"/>' + scarf;
    if (id === 'bruno') art = '<ellipse cx="120" cy="174" rx="46" ry="41" fill="#a9815e"/><ellipse cx="120" cy="180" rx="29" ry="31" fill="#d8bd93"/><ellipse cx="91" cy="209" rx="23" ry="9" fill="#92704f"/><ellipse cx="150" cy="209" rx="23" ry="9" fill="#92704f"/><circle cx="76" cy="68" r="24" fill="#a37a56"/><circle cx="163" cy="68" r="24" fill="#a37a56"/><circle cx="76" cy="68" r="13" fill="#d5b58c"/><circle cx="163" cy="68" r="13" fill="#d5b58c"/><ellipse cx="120" cy="105" rx="60" ry="53" fill="#b58b63"/><ellipse cx="120" cy="124" rx="28" ry="22" fill="#e3cb9f"/>' + eyes + blush + scarf;
    if (id === 'luna') art = '<path d="M94 199v17m8-16v15m36-16v16m8-17v17" stroke="#aa8c54" stroke-width="5" stroke-linecap="round"/><ellipse cx="120" cy="156" rx="58" ry="53" fill="#9d947a"/><ellipse cx="120" cy="163" rx="40" ry="44" fill="#e9ddba"/><path d="M66 129q-24 46 8 64 14-23 7-49m93-15q24 46-8 64-14-23-7-49" fill="#827c65"/><path d="m64 80-1-35 32 20q25-10 50 0l32-20-1 35q22 37-6 62-50 37-100 0-27-25-6-62Z" fill="#a59b7d"/><path d="M120 89q-30-43-53 0-12 43 53 58 66-15 53-58-23-43-53 0Z" fill="#f0e7c9"/><path d="M82 106q10-12 20 0m36 0q10-12 20 0" fill="none" stroke="#625d49" stroke-width="3.5" stroke-linecap="round"/><path d="m112 118 8 14 8-14-8-5Z" fill="#ba9558"/><path d="m104 163 4 4 4-4m16 0 4 4 4-4m-20 14 4 4 4-4" stroke="#bbaf88" stroke-width="2.5" fill="none"/>' + scarf;
    if (id === 'bambu') art = '<ellipse cx="120" cy="173" rx="46" ry="42" fill="#e7e7d9"/><ellipse cx="85" cy="176" rx="15" ry="28" fill="#596558" transform="rotate(12 85 176)"/><ellipse cx="155" cy="176" rx="15" ry="28" fill="#596558" transform="rotate(-12 155 176)"/><ellipse cx="94" cy="208" rx="23" ry="10" fill="#596558"/><ellipse cx="148" cy="208" rx="23" ry="10" fill="#596558"/><circle cx="76" cy="66" r="23" fill="#596558"/><circle cx="163" cy="66" r="23" fill="#596558"/><ellipse cx="120" cy="105" rx="60" ry="53" fill="#f0f0e5"/><ellipse cx="92" cy="103" rx="18" ry="22" fill="#66705f" transform="rotate(22 92 103)"/><ellipse cx="148" cy="103" rx="18" ry="22" fill="#66705f" transform="rotate(-22 148 103)"/><path d="M85 105q7-8 14 0m42 0q7-8 14 0" stroke="#f4f2dd" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="120" cy="122" rx="6" ry="4" fill="#4c5748"/><path d="M120 126q-6 7-11 1m11-1q6 7 11 1" stroke="#7b806b" stroke-width="2" fill="none"/>' + blush + scarf;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 230" aria-hidden="true">${common}${art}</svg>`;
  }

  function renderTimer() {
    const mode = state.mode;
    const current = clock(remaining(mode));
    const [minutes, seconds] = current.split(':');
    const markup = `${minutes}<span>:</span>${seconds}`;
    if ($('timer-digits').innerHTML !== markup) $('timer-digits').innerHTML = markup;
    $('timer-digits').setAttribute('aria-label', `Tiempo restante de ${mode === 'work' ? 'enfoque' : 'descanso'}: ${Number(minutes)} minutos y ${Number(seconds)} segundos`);
    $('work-mini').textContent = clock(remaining('work'));
    $('rest-mini').textContent = clock(remaining('rest'));
    const running = state.timers[mode].endAt !== null;
    const paused = !running && state.timers[mode].remaining < DURATION[mode];
    $('start-label').textContent = running ? 'Pausar un momento' : paused ? 'Continuar sesión' : mode === 'work' ? 'Comenzar enfoque' : 'Comenzar descanso';
    $('start-icon').innerHTML = `<use href="#i-${running ? 'pause' : 'play'}"/>`;
    $('timer-label').textContent = mode === 'work' ? 'ES TU MOMENTO DE CONCENTRACIÓN' : 'ES TU MOMENTO DE RESPIRAR';
    $('timer-message').textContent = mode === 'work' ? 'No tienes que hacerlo todo. Solo empezar.' : 'Suelta los hombros. Lo estás haciendo bien.';
    $('reset-button').setAttribute('aria-label', `Reiniciar el contador de ${mode === 'work' ? 'enfoque' : 'descanso'}`);
    document.querySelectorAll('[data-mode]').forEach(button => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.title = running ? `${current} · ${mode === 'work' ? 'Enfoque' : 'Descanso'} · Pomodoro Time` : 'Pomodoro Time · Un paso a la vez';
  }

  function renderProgress() {
    const today = todayCount();
    const total = state.sessions.length;
    const unlocked = characters.filter(c => c.at <= total).length;
    $('today-sessions').innerHTML = `${today}<span> sesiones</span>`;
    $('today-minutes').innerHTML = `${today * 20}<span> min</span>`;
    $('total-unlocked').innerHTML = `${unlocked}<span> de ${characters.length}</span>`;
    $('unlocked-count').textContent = unlocked;
    $('collection-total').textContent = `${unlocked} / ${characters.length} descubiertos`;
    $('session-progress-text').textContent = today >= DAILY_GOAL ? `¡Meta diaria cumplida! ${today} sesiones completadas` : `${today} de ${DAILY_GOAL} sesiones de tu meta diaria`;
    [...$('session-dots').children].forEach((dot, i) => dot.classList.toggle('done', i < today));
    const next = characters.find(c => c.at > total);
    $('next-reward-count').textContent = next ? `${total} / ${next.at}` : `${total} sesiones`;
    $('reward-progress').style.width = next ? `${Math.min(100, total / next.at * 100)}%` : '100%';
    $('next-reward-copy').innerHTML = next ? `${icon('lock')} ${next.at - total === 1 ? 'Completa 1 sesión' : `Completa ${next.at - total} sesiones`} y conoce a ${next.name}` : `${icon('check')} ¡Tu pequeño equipo ya está completo!`;
    const selected = characters.find(c => c.id === state.avatar) || characters[0];
    $('companion-art').innerHTML = avatarSVG(selected.id);
    $('header-avatar').innerHTML = avatarSVG(selected.id);
    $('companion-heading').textContent = `${selected.name}, ${selected.species}`;
    $('companion-quote').textContent = `“${selected.quote}”`;
    $('collection-grid').innerHTML = characters.map(c => {
      const locked = total < c.at;
      const selected = state.avatar === c.id;
      return `<article class="avatar-card ${locked ? 'locked' : ''} ${selected ? 'selected' : ''}"><span class="avatar-threshold">${icon(locked ? 'lock' : 'leaf')}${c.at === 0 ? 'Desde el primer día' : `${c.at} ${c.at === 1 ? 'sesión' : 'sesiones'}`}</span><div class="avatar-card-art">${avatarSVG(c.id)}</div><h3>${c.name}</h3><p>“${c.quote}”</p><button data-avatar="${c.id}" ${locked || selected ? 'disabled' : ''}>${icon(locked ? 'lock' : selected ? 'check' : 'leaf')}${locked ? `Faltan ${c.at - total} ${c.at - total === 1 ? 'sesión' : 'sesiones'}` : selected ? 'Tu compañero actual' : 'Elegir compañero'}</button></article>`;
    }).join('');
  }

  function renderLandscape() {
    const landscape = landscapes[state.landscape];
    $('landscape-image').style.backgroundImage = `url("${landscape.image}")`;
    $('landscape-name').textContent = landscape.name;
    $('landscape-caption').textContent = landscape.subtitle;
    document.querySelectorAll('[data-landscape]').forEach(button => {
      const selected = Number(button.dataset.landscape) === state.landscape;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $('landscape-options').innerHTML = landscapes.map((landscape, i) => `<button class="landscape-option ${state.landscape === i ? 'selected' : ''}" data-pick-landscape="${i}" aria-pressed="${state.landscape === i}"><img src="${landscape.image}" alt="" width="100" height="62"><span>${landscape.name}<small>${landscape.subtitle}</small></span>${state.landscape === i ? icon('check') : ''}</button>`).join('');
    $('auto-landscape').checked = state.autoLandscape;
  }

  function renderDate() {
    $('today-date').textContent = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date()).replaceAll('.', '');
  }
  function render() { renderTimer(); renderProgress(); renderLandscape(); renderDate(); }
  function setView(next) {
    view = next;
    $('space-view').hidden = next !== 'space';
    $('collection-view').hidden = next !== 'collection';
    $('page-title').innerHTML = next === 'space' ? 'Un paso <em>a la vez.</em>' : 'Crecer <em>en compañía.</em>';
    $('page-subtitle').textContent = next === 'space' ? 'Respira. Elige una cosa. Dale tu atención.' : 'Pequeños amigos para celebrar tu constancia.';
    document.querySelectorAll('[data-view]').forEach(button => {
      button.classList.toggle('active', button.dataset.view === next);
      if (button.dataset.view === next) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function tick() {
    const mode = state.mode;
    if (state.timers[mode].endAt !== null && remaining(mode) <= 0) finishSession(mode);
    const key = localDateKey(Date.now());
    if (key !== previousDate) { previousDate = key; renderProgress(); renderDate(); }
    renderTimer();
  }
  function pause(mode) {
    const timer = state.timers[mode];
    if (timer.endAt !== null) { timer.remaining = remaining(mode); timer.endAt = null; }
  }
  function switchMode(mode) {
    tick();
    if (state.mode === mode) return;
    pause(state.mode);
    state.mode = mode;
    save();
    renderTimer();
  }
  function toggleTimer() {
    tick();
    const mode = state.mode;
    const timer = state.timers[mode];
    if (timer.endAt !== null) pause(mode);
    else { timer.endAt = Date.now() + timer.remaining; prepareAudio(); }
    save();
    renderTimer();
  }
  function resetTimer() {
    tick();
    const mode = state.mode;
    state.timers[mode] = { remaining: DURATION[mode], endAt: null, id: uuid() };
    save();
    renderTimer();
    toast(mode === 'work' ? 'Enfoque reiniciado. Un nuevo comienzo.' : 'Descanso reiniciado. Date tu tiempo.');
  }
  function finishSession(mode) {
    const timer = state.timers[mode];
    const totalBefore = state.sessions.length;
    // Timer IDs make completion idempotent, including across open tabs.
    if (mode === 'work' && !state.sessions.some(s => s.id === timer.id)) {
      state.sessions.push({ id: timer.id, at: Math.min(timer.endAt ?? Date.now(), Date.now()) });
      if (state.autoLandscape) state.landscape = (state.landscape + 1) % landscapes.length;
    }
    state.timers[mode] = { remaining: DURATION[mode], endAt: null, id: uuid() };
    save();
    render();
    completionMode = mode;
    const newlyUnlocked = characters.filter(c => c.at > totalBefore && c.at <= state.sessions.length);
    $('complete-art').innerHTML = avatarSVG(newlyUnlocked[0]?.id || state.avatar);
    $('complete-eyebrow').textContent = newlyUnlocked.length ? '¡UN NUEVO COMPAÑERO!' : mode === 'work' ? 'UN PASO MÁS' : 'CON LAS PILAS RENOVADAS';
    $('complete-title').textContent = newlyUnlocked.length ? `¡Hola, ${newlyUnlocked[0].name}!` : mode === 'work' ? 'Bien hecho. Te lo has ganado.' : '¿Seguimos creciendo?';
    $('complete-copy').textContent = mode === 'work' ? 'Has dedicado 20 minutos a lo que importa. Ahora tienes 5 minutos para respirar, estirarte y cuidarte.' : 'Tu descanso de 5 minutos ha terminado. Cuando te apetezca, tu siguiente pequeño paso te espera.';
    $('complete-rewards').hidden = !newlyUnlocked.length;
    $('complete-rewards').textContent = newlyUnlocked.length ? `Has desbloqueado a ${newlyUnlocked.map(c => c.name).join(', ')}. Ya puedes elegirlo en Mis compañeros.` : '';
    $('complete-next').innerHTML = `${mode === 'work' ? 'Preparar mi descanso' : 'Volver al enfoque'} ${icon('arrow')}`;
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    openModal('complete-dialog');
    playBell();
  }

  function openModal(id) { const dialog = $(id); if (!dialog.open) dialog.showModal(); }

  // Generated brown noise creates a quiet ambient sound with no audio download.
  function prepareAudio() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audioContext) audioContext = new Audio();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch { /* The timer works even when audio is unavailable. */ }
  }
  function playBell() {
    if (!audioContext || audioContext.state !== 'running') return;
    try {
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = audioContext.currentTime + index * .14;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.065, start + .02);
        gain.gain.exponentialRampToValueAtTime(.001, start + 1.5);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(start); oscillator.stop(start + 1.6);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* Visual completion feedback remains available. */ }
  }
  function toggleSound() {
    prepareAudio();
    if (!audioContext) { toast('El sonido ambiente no está disponible en este navegador.'); return; }
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 8, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
      ambientSource = audioContext.createBufferSource();
      ambientSource.buffer = buffer; ambientSource.loop = true;
      ambientGain = audioContext.createGain(); ambientGain.gain.value = .18;
      const lowpass = audioContext.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 550;
      ambientSource.connect(lowpass); lowpass.connect(ambientGain); ambientGain.connect(audioContext.destination);
      ambientSource.start();
      ambientSource.onended = () => { lowpass.disconnect(); };
    } else if (ambientSource) { ambientSource.stop(); ambientSource.disconnect(); ambientGain.disconnect(); ambientSource = null; }
    $('sound-button').setAttribute('aria-pressed', String(soundEnabled));
    $('sound-icon').innerHTML = `<use href="#i-${soundEnabled ? 'sound' : 'mute'}"/>`;
    $('sound-label').textContent = soundEnabled ? 'Brisa suave' : 'Sonido ambiente';
  }

  $('start-button').addEventListener('click', toggleTimer);
  $('reset-button').addEventListener('click', resetTimer);
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => switchMode(button.dataset.mode));
    button.addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const mode = event.key === 'Home' ? 'work' : event.key === 'End' ? 'rest' : state.mode === 'work' ? 'rest' : 'work';
        switchMode(mode); $(`${mode}-tab`).focus();
      }
    });
  });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('profile-button').addEventListener('click', () => setView('collection'));
  $('view-collection-button').addEventListener('click', () => setView('collection'));
  $('how-button').addEventListener('click', () => openModal('how-dialog'));
  $('landscape-button').addEventListener('click', () => openModal('landscape-dialog'));
  $('sound-button').addEventListener('click', toggleSound);
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));
  document.querySelectorAll('[data-landscape]').forEach(button => button.addEventListener('click', () => {
    state.landscape = Number(button.dataset.landscape); save(); renderLandscape();
  }));
  $('landscape-options').addEventListener('click', event => {
    const button = event.target.closest('[data-pick-landscape]');
    if (!button) return;
    state.landscape = Number(button.dataset.pickLandscape); save(); renderLandscape();
    $('landscape-dialog').close();
  });
  $('auto-landscape').addEventListener('change', event => { state.autoLandscape = event.target.checked; save(); });
  $('collection-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-avatar]');
    const character = characters.find(c => c.id === button?.dataset.avatar);
    if (!character || character.at > state.sessions.length) return;
    state.avatar = character.id; save(); renderProgress(); toast(`${character.name} te acompaña a partir de ahora.`);
  });
  $('complete-next').addEventListener('click', () => {
    $('complete-dialog').close();
    const next = completionMode === 'work' ? 'rest' : 'work';
    switchMode(next); setView('space'); $('start-button').focus();
  });
  $('complete-dismiss').addEventListener('click', () => $('complete-dialog').close());
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) { state = readState(); render(); tick(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('focus', tick);

  render();
  tick();
  setInterval(tick, 250);
  // La bitácora usa una caché común del navegador; cada demo guarda su progreso por separado.
})();
