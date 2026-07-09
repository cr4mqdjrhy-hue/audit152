(() => {
  const script = document.currentScript;
  const apiUrl = script?.dataset.apiUrl || 'http://localhost:3000/audit152';
  const root = document.getElementById('audit152-widget');

  if (!root || root.dataset.auditReady === '1') return;
  root.dataset.auditReady = '1';

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

    .audit152-widget{
      --bg:#f5f7f8;
      --panel:#ffffff;
      --ink:#111827;
      --muted:#667085;
      --line:#d8dee6;
      --soft:#eef2f5;
      --accent:#174ea6;
      --accent-ink:#ffffff;
      --pass:#147a4a;
      --warn:#a15c00;
      --fail:#b42318;
      --fine:#7c2d12;
      font-family:"Manrope",Arial,sans-serif;
      color:var(--ink);
    }

    .audit152-widget *{box-sizing:border-box}

    .audit152-shell{
      max-width:940px;
      margin:0 auto;
      padding:28px;
      border:1px solid var(--line);
      border-radius:8px;
      background:var(--panel);
      box-shadow:0 18px 50px rgba(17,24,39,.08);
    }

    .audit152-top{
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:24px;
      align-items:end;
      margin-bottom:24px;
    }

    .audit152-kicker{
      margin:0 0 10px;
      color:var(--accent);
      font-size:12px;
      font-weight:800;
      letter-spacing:0;
      text-transform:uppercase;
    }

    .audit152-title{
      max-width:650px;
      margin:0;
      font-size:34px;
      line-height:1.08;
      letter-spacing:0;
    }

    .audit152-subtitle{
      max-width:690px;
      margin:12px 0 0;
      color:var(--muted);
      font-size:16px;
      line-height:1.55;
    }

    .audit152-meta{
      display:grid;
      gap:8px;
      min-width:190px;
      padding:14px;
      border:1px solid var(--line);
      border-radius:8px;
      background:var(--bg);
    }

    .audit152-meta span{
      color:var(--muted);
      font-size:12px;
      font-weight:700;
      text-transform:uppercase;
    }

    .audit152-meta strong{
      font-size:22px;
      line-height:1.1;
    }

    .audit152-form{
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:10px;
      margin-top:4px;
    }

    .audit152-input{
      min-width:0;
      height:54px;
      padding:0 16px;
      border:1px solid #c9d1dc;
      border-radius:8px;
      background:#fff;
      color:var(--ink);
      font:500 16px/1.2 "Manrope",Arial,sans-serif;
      outline:none;
    }

    .audit152-input:focus{
      border-color:var(--accent);
      box-shadow:0 0 0 4px rgba(23,78,166,.12);
    }

    .audit152-button{
      height:54px;
      padding:0 22px;
      border:0;
      border-radius:8px;
      background:var(--accent);
      color:var(--accent-ink);
      font:800 15px/1 "Manrope",Arial,sans-serif;
      cursor:pointer;
    }

    .audit152-button:disabled{cursor:wait;opacity:.7}

    .audit152-error{
      margin-top:14px;
      padding:13px 14px;
      border:1px solid rgba(180,35,24,.22);
      border-radius:8px;
      background:#fff4f2;
      color:var(--fail);
      font-size:14px;
      line-height:1.45;
    }

    .audit152-progress{
      margin-top:18px;
      padding:16px;
      border:1px solid var(--line);
      border-radius:8px;
      background:var(--bg);
    }

    .audit152-progress-line{
      height:6px;
      overflow:hidden;
      border-radius:999px;
      background:#dde4ec;
    }

    .audit152-progress-line span{
      display:block;
      width:38%;
      height:100%;
      border-radius:inherit;
      background:var(--accent);
      animation:audit152-progress 1.05s ease-in-out infinite alternate;
    }

    .audit152-progress ol{
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:8px;
      margin:14px 0 0;
      padding:0;
      list-style:none;
      color:var(--muted);
      font-size:12px;
      line-height:1.35;
    }

    .audit152-result{margin-top:22px}

    .audit152-summary{
      display:grid;
      grid-template-columns:120px minmax(0,1fr);
      gap:18px;
      align-items:stretch;
      margin-bottom:12px;
    }

    .audit152-score{
      display:grid;
      place-items:center;
      min-height:120px;
      border:1px solid var(--line);
      border-radius:8px;
      background:var(--bg);
      color:var(--accent);
      font-size:30px;
      font-weight:800;
    }

    .audit152-summary-text{
      padding:18px;
      border:1px solid var(--line);
      border-radius:8px;
      background:var(--panel);
    }

    .audit152-summary h3{
      margin:0 0 8px;
      font-size:21px;
      line-height:1.28;
      letter-spacing:0;
    }

    .audit152-summary p{
      margin:0;
      color:var(--muted);
      font-size:14px;
      line-height:1.55;
    }

    .audit152-fine-strip{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
      margin-bottom:14px;
    }

    .audit152-stat{
      padding:14px;
      border:1px solid var(--line);
      border-radius:8px;
      background:var(--bg);
    }

    .audit152-stat span{
      display:block;
      margin-bottom:7px;
      color:var(--muted);
      font-size:11px;
      font-weight:800;
      letter-spacing:0;
      text-transform:uppercase;
    }

    .audit152-stat strong{
      display:block;
      color:var(--ink);
      font-size:22px;
      line-height:1.1;
    }

    .audit152-stat.fine strong{color:var(--fine)}

    .audit152-checks{display:grid;gap:10px}

    .audit152-check{
      padding:15px;
      border:1px solid var(--line);
      border-left-width:4px;
      border-radius:8px;
      background:var(--panel);
    }

    .audit152-check.pass{border-left-color:var(--pass)}
    .audit152-check.warn{border-left-color:var(--warn)}
    .audit152-check.fail{border-left-color:var(--fail)}

    .audit152-check-head{
      display:flex;
      gap:10px;
      align-items:flex-start;
      justify-content:space-between;
      margin-bottom:8px;
    }

    .audit152-check-title{
      font-size:15px;
      font-weight:800;
      line-height:1.35;
    }

    .audit152-badge{
      flex:0 0 auto;
      padding:5px 8px;
      border-radius:999px;
      font-size:11px;
      font-weight:800;
      line-height:1;
    }

    .audit152-badge.pass{background:#e8f5ee;color:var(--pass)}
    .audit152-badge.warn{background:#fff4df;color:var(--warn)}
    .audit152-badge.fail{background:#fff0ef;color:var(--fail)}

    .audit152-check p{
      margin:0 0 7px;
      color:var(--muted);
      font-size:13px;
      line-height:1.5;
    }

    .audit152-check p:last-child{margin-bottom:0}

    .audit152-fine{
      display:inline-flex;
      align-items:center;
      gap:8px;
      margin:4px 0 9px;
      padding:7px 9px;
      border:1px solid #fed7aa;
      border-radius:8px;
      background:#fff7ed;
      color:var(--fine);
      font-size:12px;
      font-weight:800;
      line-height:1.3;
    }

    .audit152-total{
      margin-top:14px;
      padding:16px;
      border:1px solid #fed7aa;
      border-radius:8px;
      background:#fff7ed;
    }

    .audit152-total-row{
      display:flex;
      gap:12px;
      align-items:flex-end;
      justify-content:space-between;
      margin-bottom:7px;
    }

    .audit152-total span{
      color:var(--fine);
      font-size:12px;
      font-weight:800;
      text-transform:uppercase;
    }

    .audit152-total strong{
      color:var(--fine);
      font-size:28px;
      line-height:1;
    }

    .audit152-total p{
      margin:0;
      color:#7c3f12;
      font-size:13px;
      line-height:1.45;
    }

    .audit152-evidence{
      margin-top:12px;
      padding:14px;
      border:1px solid var(--line);
      border-radius:8px;
      background:var(--bg);
      color:var(--muted);
      font-size:13px;
      line-height:1.55;
    }

    .audit152-evidence strong{color:var(--ink)}
    .audit152-note{margin-top:10px;color:var(--muted);font-size:12px;line-height:1.45}

    @keyframes audit152-progress{from{transform:translateX(0)}to{transform:translateX(165%)}}

    @media (max-width:760px){
      .audit152-shell{padding:18px}
      .audit152-top,.audit152-summary,.audit152-fine-strip{grid-template-columns:1fr}
      .audit152-title{font-size:27px}
      .audit152-form{grid-template-columns:1fr}
      .audit152-button{width:100%}
      .audit152-progress ol{grid-template-columns:1fr}
      .audit152-total-row{display:block}
      .audit152-total strong{display:block;margin-top:6px}
    }
  `;

  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);

  root.className = 'audit152-widget';
  root.innerHTML = `
    <div class="audit152-shell">
      <div class="audit152-top">
        <div>
          <div class="audit152-kicker">152-Р¤Р— В· СЌРєСЃРїСЂРµСЃСЃ-Р°СѓРґРёС‚</div>
          <h2 class="audit152-title">РџСЂРѕРІРµСЂРєР° СЃР°Р№С‚Р° РЅР° СЂРёСЃРєРё РїРѕ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹Рј РґР°РЅРЅС‹Рј</h2>
          <p class="audit152-subtitle">РЎРµСЂРІРёСЃ СЃРјРѕС‚СЂРёС‚ РѕС‚РєСЂС‹С‚С‹Рµ РїСЂРёР·РЅР°РєРё: РїРѕР»РёС‚РёРєСѓ, СЃРѕРіР»Р°СЃРёСЏ РІ С„РѕСЂРјР°С…, cookie-Р±Р°РЅРЅРµСЂ Рё Р·Р°РїСѓСЃРє Р°РЅР°Р»РёС‚РёРєРё РґРѕ СЃРѕРіР»Р°СЃРёСЏ.</p>
        </div>
        <div class="audit152-meta">
          <span>Р¤РѕРєСѓСЃ РїСЂРѕРІРµСЂРєРё</span>
          <strong>РџР”, cookies, С„РѕСЂРјС‹</strong>
        </div>
      </div>

      <form class="audit152-form">
        <input class="audit152-input" name="url" type="text" inputmode="url" autocomplete="url" placeholder="example.ru">
        <button class="audit152-button" type="submit">РџСЂРѕРІРµСЂРёС‚СЊ</button>
      </form>

      <div class="audit152-error" hidden></div>

      <div class="audit152-progress" hidden>
        <div class="audit152-progress-line"><span></span></div>
        <ol>
          <li>РћС‚РєСЂС‹РІР°СЋ СЃР°Р№С‚</li>
          <li>РС‰Сѓ РґРѕРєСѓРјРµРЅС‚С‹</li>
          <li>РџСЂРѕРІРµСЂСЏСЋ С„РѕСЂРјС‹</li>
          <li>РЎРјРѕС‚СЂСЋ Р°РЅР°Р»РёС‚РёРєСѓ</li>
          <li>РЎРѕР±РёСЂР°СЋ РѕС‚С‡РµС‚</li>
        </ol>
      </div>

      <div class="audit152-result" hidden></div>
    </div>
  `;

  const form = root.querySelector('.audit152-form');
  const input = root.querySelector('.audit152-input');
  const button = root.querySelector('.audit152-button');
  const errorBox = root.querySelector('.audit152-error');
  const progress = root.querySelector('.audit152-progress');
  const result = root.querySelector('.audit152-result');

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const statusText = {
    pass: 'OK',
    warn: 'Р’РЅРёРјР°РЅРёРµ',
    fail: 'Р РёСЃРє'
  };

  function formatRub(value) {
    const number = Number(value) || 0;
    if (!number) return '0 в‚Ѕ';
    return `${new Intl.NumberFormat('ru-RU').format(number)} в‚Ѕ`;
  }

  function renderFine(fine) {
    if (!fine) return '';
    const prefix = fine.includedInTotal === false ? 'СѓС‡С‚РµРЅРѕ РІ СЃРјРµР¶РЅРѕРј СЂРёСЃРєРµ' : 'РІРµСЂС…РЅСЏСЏ РѕС†РµРЅРєР°';
    return `
      <div class="audit152-fine">
        Р РљРќ: РґРѕ ${formatRub(fine.maxRub)} В· ${escapeHtml(fine.article)} В· ${escapeHtml(prefix)}
      </div>
    `;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearState() {
    errorBox.hidden = true;
    errorBox.textContent = '';
    result.hidden = true;
    result.innerHTML = '';
  }

  function renderReport(data) {
    const fineSummary = data.fineSummary || {};
    const checksHtml = data.checks
      .map((check) => `
        <article class="audit152-check ${escapeHtml(check.status)}">
          <div class="audit152-check-head">
            <div class="audit152-check-title">${escapeHtml(check.title)}</div>
            <div class="audit152-badge ${escapeHtml(check.status)}">${escapeHtml(statusText[check.status] || check.status)}</div>
          </div>
          ${renderFine(check.fine)}
          <p>${escapeHtml(check.details)}</p>
          <p><strong>Р§С‚Рѕ СЃРґРµР»Р°С‚СЊ:</strong> ${escapeHtml(check.recommendation)}</p>
        </article>
      `)
      .join('');

    const analytics = data.evidence.analytics || [];
    const analyticsText = analytics.length
      ? analytics.map((item) => item.name).join(', ')
      : 'РЅРµ РѕР±РЅР°СЂСѓР¶РµРЅС‹ РїРѕРїСѓР»СЏСЂРЅС‹Рµ СЃС‡РµС‚С‡РёРєРё РґРѕ СЃРѕРіР»Р°СЃРёСЏ';
    const docLinks = data.evidence.documentLinks || [];
    const docText = docLinks.length
      ? docLinks
          .slice(0, 5)
          .map((link) => `${escapeHtml(link.text || 'РґРѕРєСѓРјРµРЅС‚')}: ${escapeHtml(link.href)}`)
          .join('<br>')
      : 'РґРѕРєСѓРјРµРЅС‚С‹ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РЅРµ РЅР°Р№РґРµРЅС‹';
    const topRiskText = fineSummary.topRisk
      ? `${formatRub(fineSummary.topRisk.maxRub)} В· ${fineSummary.topRisk.article}`
      : '0 в‚Ѕ';

    result.innerHTML = `
      <section class="audit152-summary">
        <div class="audit152-score">${Number(data.score) || 0}%</div>
        <div class="audit152-summary-text">
          <h3>${escapeHtml(data.summary)}</h3>
          <p>РџСЂРѕРІРµСЂРµРЅРѕ: ${escapeHtml(data.finalUrl || data.targetUrl)}. РћС€РёР±РѕРє: ${data.failCount}, РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёР№: ${data.warnCount}.</p>
        </div>
      </section>

      <section class="audit152-fine-strip">
        <div class="audit152-stat">
          <span>РљСЂРёС‚РёС‡РЅС‹Рµ СЂРёСЃРєРё</span>
          <strong>${Number(data.failCount) || 0}</strong>
        </div>
        <div class="audit152-stat">
          <span>РЎР°РјС‹Р№ РґРѕСЂРѕРіРѕР№ СЂРёСЃРє</span>
          <strong>${escapeHtml(topRiskText)}</strong>
        </div>
        <div class="audit152-stat fine">
          <span>РС‚РѕРіРѕ РїРѕС‚РµРЅС†РёР°Р»СЊРЅРѕ</span>
          <strong>РґРѕ ${formatRub(fineSummary.totalMaxRub)}</strong>
        </div>
      </section>

      <div class="audit152-checks">${checksHtml}</div>

      <section class="audit152-total">
        <div class="audit152-total-row">
          <span>РС‚РѕРіРѕРІР°СЏ РІРµСЂС…РЅСЏСЏ РѕС†РµРЅРєР° С€С‚СЂР°С„Р° Р РљРќ</span>
          <strong>РґРѕ ${formatRub(fineSummary.totalMaxRub)}</strong>
        </div>
        <p>${escapeHtml(fineSummary.basis || '')} ${escapeHtml(fineSummary.note || '')}</p>
      </section>

      <div class="audit152-evidence">
        <div><strong>Р¤РѕСЂРјС‹:</strong> ${Number(data.evidence.formsFound) || 0}</div>
        <div><strong>РџРѕР»СЏ СЃ РџР”:</strong> ${Number(data.evidence.personalFieldsFound) || 0}</div>
        <div><strong>Р§РµРєР±РѕРєСЃС‹ СЃРѕРіР»Р°СЃРёСЏ:</strong> ${Number(data.evidence.consentFieldsFound) || 0}</div>
        <div><strong>РђРЅР°Р»РёС‚РёРєР° РґРѕ СЃРѕРіР»Р°СЃРёСЏ:</strong> ${escapeHtml(analyticsText)}</div>
        <div><strong>Р”РѕРєСѓРјРµРЅС‚С‹:</strong><br>${docText}</div>
      </div>

      <div class="audit152-note">${escapeHtml(data.disclaimer)}</div>
    `;
    result.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearState();

    const url = input.value.trim();
    if (!url) {
      showError('Р’РІРµРґРёС‚Рµ Р°РґСЂРµСЃ СЃР°Р№С‚Р°.');
      input.focus();
      return;
    }

    button.disabled = true;
    button.textContent = 'РџСЂРѕРІРµСЂСЏСЋ...';
    progress.hidden = false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url }),
        signal: controller.signal
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.ok) {
        throw new Error(data?.message || 'РџСЂРѕРІРµСЂРєР° РЅРµ СѓРґР°Р»Р°СЃСЊ.');
      }

      renderReport(data);
    } catch (error) {
      showError(
        error.name === 'AbortError'
          ? 'РџСЂРѕРІРµСЂРєР° Р·Р°РЅСЏР»Р° СЃР»РёС€РєРѕРј РјРЅРѕРіРѕ РІСЂРµРјРµРЅРё. РџРѕРїСЂРѕР±СѓР№С‚Рµ РґСЂСѓРіРѕР№ СЃР°Р№С‚ РёР»Рё РїРѕРІС‚РѕСЂРёС‚Рµ РїРѕР·Р¶Рµ.'
          : error.message
      );
    } finally {
      clearTimeout(timer);
      progress.hidden = true;
      button.disabled = false;
      button.textContent = 'РџСЂРѕРІРµСЂРёС‚СЊ';
    }
  });
})();
