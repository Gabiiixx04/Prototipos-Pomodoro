/* Bitácora de Pomodoro Time · Autor: Gabriel Paspuel. */
(() => {
  'use strict';
  const entries = window.POMODORO_ARCHIVE;
  const prototypes = entries.filter(entry => entry.prototype);
  const $ = id => document.getElementById(id);
  const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  let current = 'v1';
  let toastTimer;
  const escape = text => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function toast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500);
  }
  function selectVersion(version, scroll = false) {
    const entry = prototypes.find(entry => entry.prototype === version);
    if (!entry) return;
    current = version;
    document.querySelectorAll('[data-version]').forEach(button => {
      const selected = button.dataset.version === version;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    $('prototype-panel').setAttribute('aria-labelledby', `version-${version}`);
    $('active-prompt-number').textContent = entry.id;
    $('active-prompt-title').textContent = entry.title;
    $('active-prompt').textContent = entry.prompt;
    $('active-changes').innerHTML = entry.changes.map(change => `<li>${icon('check')}<span>${escape(change)}</span></li>`).join('');
    $('browser-path').textContent = version === 'v1' ? 'prototipo-01 / calma' : 'prototipo-02 / pomodoro-time';
    $('open-prototype').href = `./prototipos/${version}/`;
    $('open-prototype').setAttribute('aria-label', `Abrir ${entry.name} en otra pestaña`);
    $('download-prototype').href = `./prototipos/${version}/${version === 'v1' ? 'calma-codigo.zip' : 'pomodoro-time-codigo.zip'}`;
    for (const prototype of prototypes) {
      const frame = $(`frame-${prototype.prototype}`);
      frame.hidden = prototype.prototype !== version;
      if (!frame.hidden && frame.dataset.src && !frame.getAttribute('src')) frame.src = frame.dataset.src;
    }
    if (scroll) $('prototipos').scrollIntoView({behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'});
  }
  async function copyPrompt(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const input = document.createElement('textarea');
        input.value = text; input.setAttribute('readonly', '');
        input.style.cssText = 'position:fixed;left:-9999px;top:0';
        const previous = document.activeElement;
        document.body.append(input); input.select();
        const copied = document.execCommand('copy'); input.remove(); previous?.focus();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      toast('Prompt copiado al portapapeles.');
    } catch { toast('No se ha podido copiar. Puedes seleccionar y copiar el texto del prompt.'); }
  }
  $('prompt-timeline').innerHTML = entries.map(entry => {
    const badge = entry.prototype ? `PROTOTIPO ${entry.id}` : entry.excluded ? 'PROTOTIPO OMITIDO' : entry.id === '04' ? 'ENTREGA DEL CÓDIGO' : 'ESTA BITÁCORA';
    return `<details class="timeline-item ${entry.excluded ? 'excluded' : ''}" id="prompt-${entry.id}"><summary><span class="timeline-number">${entry.id}</span><div><span class="timeline-category">${escape(entry.category)}</span><h3>${escape(entry.title)}</h3></div><span class="timeline-badge">${badge}</span><span class="summary-plus" aria-hidden="true">+</span></summary><div class="timeline-content"><div class="timeline-prompt-top"><span class="eyebrow">PROMPT ORIGINAL · GABRIEL PASPUEL</span><button class="icon-button" data-copy="${entry.id}" aria-label="Copiar prompt ${entry.id}" title="Copiar prompt">${icon('copy')}</button></div><blockquote>${escape(entry.prompt)}</blockquote><div class="timeline-result"><p>${escape(entry.note)}</p>${entry.prototype ? `<button class="text-link" data-open="${entry.prototype}">Probar este prototipo ${icon('arrow')}</button>` : ''}</div></div></details>`;
  }).join('');
  document.querySelectorAll('[data-version]').forEach(button => {
    button.addEventListener('click', () => selectVersion(button.dataset.version));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const version = event.key === 'Home' ? 'v1' : event.key === 'End' ? 'v2' : current === 'v1' ? 'v2' : 'v1';
      selectVersion(version); $(`version-${version}`).focus();
    });
  });
  document.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => {
    const mobile = button.dataset.device === 'mobile';
    $('prototype-viewport').classList.toggle('mobile', mobile);
    document.querySelectorAll('[data-device]').forEach(item => {
      const selected = item === button; item.classList.toggle('active', selected); item.setAttribute('aria-pressed', String(selected));
    });
  }));
  $('copy-active-prompt').addEventListener('click', () => copyPrompt(prototypes.find(entry => entry.prototype === current).prompt));
  $('prompt-timeline').addEventListener('click', event => {
    const open = event.target.closest('[data-open]');
    if (open) selectVersion(open.dataset.open, true);
    const copy = event.target.closest('[data-copy]');
    if (copy) { const entry = entries.find(entry => entry.id === copy.dataset.copy); if (entry) copyPrompt(entry.prompt); }
  });
  function updateExpandButton() {
    const allOpen = [...document.querySelectorAll('.timeline-item')].every(item => item.open);
    $('expand-prompts').innerHTML = allOpen ? 'Contraer todos <span>−</span>' : 'Desplegar todos <span>+</span>';
    $('expand-prompts').setAttribute('aria-expanded', String(allOpen));
  }
  $('expand-prompts').addEventListener('click', () => {
    const items = [...document.querySelectorAll('.timeline-item')];
    const open = !items.every(item => item.open);
    items.forEach(item => { item.open = open; }); updateExpandButton();
  });
  document.querySelectorAll('.timeline-item').forEach(item => item.addEventListener('toggle', updateExpandButton));
  selectVersion('v1');
})();
