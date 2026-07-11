(() => {
  const script = document.currentScript;
  const apiUrl = script?.dataset.apiUrl || 'http://localhost:3000/audit152';
  const root = document.getElementById('audit152-widget');

  if (!root || root.dataset.auditReady === '1') return;
  root.dataset.auditReady = '1';

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

    .audit152-widget{
      --yellow:#ffe600;
      --yellow-soft:#fff36a;
      --black:#050505;
      --paper:#fffef2;
      --white:#ffffff;
      --muted:#5d5d51;
      --line:rgba(5,5,5,.16);
      --soft-line:rgba(5,5,5,.09);
      --red:#ef2b18;
      --orange:#ff9500;
      --green:#0b7d45;
      font-family:"Manrope",Arial,sans-serif;
      color:var(--black);
    }

    .audit152-widget *{box-sizing:border-box}

    .audit152-shell{
      width:100%;
      max-width:1340px;
      margin:0 auto;
      padding:28px;
      border:1px solid rgba(5,5,5,.22);
      border-radius:10px;
      background:
        radial-gradient(circle at 82% 12%, rgba(255,255,255,.55) 0 12%, transparent 30%),
        linear-gradient(135deg, var(--yellow) 0%, #fff000 52%, #ffd900 100%);
      box-shadow:0 22px 70px rgba(5,5,5,.18);
      overflow:hidden;
    }

    .audit152-kicker{
      margin:0 0 22px;
      font-size:13px;
      font-weight:900;
      letter-spacing:.08em;
      text-transform:uppercase;
    }

    .audit152-title{
      max-width:880px;
      margin:0;
      color:var(--black);
      font-size:64px;
      line-height:1.02;
      letter-spacing:0;
      font-weight:800;
    }

    .audit152-subtitle{
      max-width:710px;
      margin:22px 0 0;
      color:#1f1f17;
      font-size:18px;
      line-height:1.45;
      font-weight:600;
    }

    .audit152-form-wrap{
      margin-top:34px;
    }

    .audit152-form{
      display:grid;
      grid-template-columns:minmax(0,1fr) 292px;
      gap:8px;
      padding:8px;
      border:2px solid var(--black);
      border-radius:8px;
      background:var(--white);
      box-shadow:0 14px 30px rgba(5,5,5,.12);
    }

    .audit152-input-shell{
      display:flex;
      align-items:center;
      gap:14px;
      min-width:0;
      padding:0 16px;
    }

    .audit152-globe{
      flex:0 0 auto;
      display:grid;
      place-items:center;
      width:32px;
      height:32px;
      color:var(--black);
      font-size:22px;
      line-height:1;
    }

    .audit152-input{
      width:100%;
      min-width:0;
      height:58px;
      padding:0;
      border:0;
      outline:none;
      background:transparent;
      color:var(--black);
      font:700 17px/1.2 "Manrope",Arial,sans-serif;
    }

    .audit152-input::placeholder{color:#88887b}

    .audit152-button{
      height:58px;
      border:0;
      border-radius:6px;
      background:var(--black);
      color:var(--white);
      font:900 16px/1 "Manrope",Arial,sans-serif;
      cursor:pointer;
    }

    .audit152-button:disabled{cursor:wait;opacity:.72}

    .audit152-button-arrow{
      display:inline-block;
      margin-left:16px;
      font-size:22px;
      line-height:0;
      transform:translateY(2px);
    }

    .audit152-under-form{
      display:flex;
      align-items:center;
      gap:9px;
      margin-top:18px;
      color:#17170f;
      font-size:14px;
      font-weight:700;
    }

    .audit152-under-form svg{
      flex:0 0 auto;
    }

    .audit152-error{
      margin-top:16px;
      padding:14px 16px;
      border:2px solid var(--red);
      border-radius:8px;
      background:#fff2ec;
      color:var(--red);
      font-size:14px;
      font-weight:800;
      line-height:1.45;
    }

    .audit152-progress{
      margin-top:22px;
      padding:18px;
      border:2px solid var(--black);
      border-radius:8px;
      background:rgba(255,255,255,.9);
    }

    .audit152-progress-line{
      height:8px;
      overflow:hidden;
      border-radius:999px;
      background:#ece6ad;
    }

    .audit152-progress-line span{
      display:block;
      width:34%;
      height:100%;
      border-radius:inherit;
      background:var(--black);
      animation:audit152-progress 1.05s ease-in-out infinite alternate;
    }

    .audit152-progress ol{
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:10px;
      margin:16px 0 0;
      padding:0;
      list-style:none;
      color:#2f2f25;
      font-size:12px;
      font-weight:800;
      line-height:1.35;
    }

    .audit152-result{
      margin-top:48px;
      display:grid;
      grid-template-columns:minmax(0,1.45fr) minmax(320px,.9fr);
      gap:12px;
    }

    .audit152-card{
      border:1px solid rgba(5,5,5,.12);
      border-radius:8px;
      background:rgba(255,255,255,.94);
      box-shadow:0 12px 28px rgba(5,5,5,.08);
    }

    .audit152-card-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      padding:26px 28px 10px;
    }

    .audit152-card-title{
      margin:0;
      font-size:20px;
      font-weight:900;
      line-height:1.2;
    }

    .audit152-pill{
      display:inline-flex;
      align-items:center;
      min-height:32px;
      padding:0 14px;
      border-radius:999px;
      background:#f2f1eb;
      color:#222218;
      font-size:12px;
      font-weight:900;
      white-space:nowrap;
    }

    .audit152-checks{
      padding:0 28px 20px;
    }

    .audit152-check{
      display:grid;
      grid-template-columns:34px minmax(0,1fr) auto;
      gap:16px;
      align-items:center;
      min-height:62px;
      border-bottom:1px solid var(--soft-line);
    }

    .audit152-check:last-child{border-bottom:0}

    .audit152-icon{
      display:grid;
      place-items:center;
      width:26px;
      height:26px;
      border-radius:50%;
      color:#fff;
      font-size:15px;
      font-weight:900;
    }

    .audit152-check.pass .audit152-icon{background:var(--green)}
    .audit152-check.warn .audit152-icon{background:var(--orange)}
    .audit152-check.fail .audit152-icon{background:var(--red)}

    .audit152-check-main{
      min-width:0;
    }

    .audit152-check-title{
      margin:0;
      color:var(--black);
      font-size:15px;
      font-weight:800;
      line-height:1.35;
    }

    .audit152-check-details{
      margin:5px 0 0;
      color:var(--muted);
      font-size:12px;
      font-weight:600;
      line-height:1.35;
    }

    .audit152-badge{
      justify-self:end;
      padding:7px 12px;
      border-radius:999px;
      font-size:12px;
      font-weight:900;
      white-space:nowrap;
    }

    .audit152-badge.pass{background:#e6f7ec;color:var(--green)}
    .audit152-badge.warn{background:#fff2d9;color:#a35b00}
    .audit152-badge.fail{background:#ffe9e5;color:var(--red)}

    .audit152-open-report{
      display:inline-flex;
      align-items:center;
      gap:10px;
      margin:0 28px 26px;
      color:var(--black);
      font-size:14px;
      font-weight:900;
      text-decoration:none;
    }

    .audit152-side{
      display:grid;
      gap:12px;
    }

    .audit152-score-card{
      padding:26px 28px;
    }

    .audit152-score-layout{
      display:grid;
      grid-template-columns:146px minmax(0,1fr);
      gap:22px;
      align-items:center;
      margin-top:18px;
    }

    .audit152-ring{
      --score:0;
      display:grid;
      place-items:center;
      width:146px;
      height:146px;
      border-radius:50%;
      background:
        radial-gradient(circle at center, #fff 0 57%, transparent 58%),
        conic-gradient(var(--orange) calc(var(--score)*1%), #e9e6dc 0);
    }

    .audit152-ring strong{
      display:block;
      color:var(--black);
      font-size:44px;
      line-height:1;
      font-weight:900;
      text-align:center;
    }

    .audit152-ring span{
      display:block;
      margin-top:4px;
      color:#66665a;
      font-size:12px;
      font-weight:800;
      text-align:center;
    }

    .audit152-risk-name{
      margin:0 0 8px;
      font-size:18px;
      font-weight:900;
    }

    .audit152-risk-text{
      margin:0;
      color:var(--muted);
      font-size:14px;
      font-weight:600;
      line-height:1.45;
    }

    .audit152-fine-card{
      padding:26px 28px;
    }

    .audit152-fine-grid{
      display:grid;
      gap:14px;
      margin-top:18px;
    }

    .audit152-fine-row{
      display:flex;
      justify-content:space-between;
      gap:18px;
      color:#24241c;
      font-size:15px;
      font-weight:800;
    }

    .audit152-fine-row strong{
      white-space:nowrap;
    }

    .audit152-total-fine{
      margin-top:20px;
      padding-top:18px;
      border-top:1px solid var(--soft-line);
    }

    .audit152-total-fine span{
      display:block;
      margin-bottom:6px;
      color:#6b2a0f;
      font-size:12px;
      font-weight:900;
      text-transform:uppercase;
    }

    .audit152-total-fine strong{
      color:var(--red);
      font-size:32px;
      line-height:1;
      font-weight:900;
    }

    .audit152-fix-card{
      grid-column:1 / -1;
      display:grid;
      gap:20px;
      padding:28px;
      border:2px solid var(--black);
      border-radius:8px;
      background:var(--black);
      color:var(--white);
      box-shadow:0 14px 34px rgba(5,5,5,.18);
    }

    .audit152-fix-button{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:max-content;
      min-height:54px;
      padding:0 22px;
      border:2px solid var(--yellow);
      border-radius:6px;
      background:var(--yellow);
      color:var(--black);
      font:900 15px/1.1 "Manrope",Arial,sans-serif;
      text-decoration:none;
      text-transform:uppercase;
    }

    .audit152-fix-list{
      display:grid;
      gap:12px;
      margin:0;
      padding:0;
      list-style:none;
    }

    .audit152-fix-list li{
      position:relative;
      padding-left:24px;
      color:#fffef2;
      font-size:16px;
      font-weight:700;
      line-height:1.45;
    }

    .audit152-fix-list li::before{
      content:"";
      position:absolute;
      left:0;
      top:.62em;
      width:9px;
      height:9px;
      border-radius:50%;
      background:var(--yellow);
    }

    .audit152-fix-gift{
      margin:0;
      padding-top:16px;
      border-top:1px solid rgba(255,255,255,.22);
      color:#fff9a8;
      font-size:15px;
      font-weight:800;
      line-height:1.45;
    }

    .audit152-fix-footer{
      display:flex;
      justify-content:flex-start;
    }

    .audit152-fix-button.secondary{
      border-color:var(--white);
      background:var(--white);
    }

    @keyframes audit152-progress{
      from{transform:translateX(0)}
      to{transform:translateX(194%)}
    }

    @media (max-width:980px){
      .audit152-shell{padding:22px}
      .audit152-title{font-size:48px}
      .audit152-result{grid-template-columns:1fr}
    }

    @media (max-width:680px){
      .audit152-shell{padding:18px;border-radius:8px}
      .audit152-title{font-size:34px}
      .audit152-subtitle{font-size:15px}
      .audit152-form{grid-template-columns:1fr;padding:7px}
      .audit152-button{width:100%}
      .audit152-progress ol{grid-template-columns:1fr}
      .audit152-result{margin-top:34px}
      .audit152-card-head{display:block;padding:20px 18px 8px}
      .audit152-pill{margin-top:10px}
      .audit152-checks{padding:0 18px 16px}
      .audit152-check{grid-template-columns:28px minmax(0,1fr);gap:12px;padding:12px 0}
      .audit152-badge{grid-column:2;justify-self:start}
      .audit152-score-layout{grid-template-columns:1fr}
      .audit152-score-card,.audit152-fine-card{padding:20px 18px}
      .audit152-ring{width:132px;height:132px}
      .audit152-total-fine strong{font-size:26px}
      .audit152-fix-card{padding:22px}
      .audit152-fix-button{width:100%;text-align:center}
    }
  `;

  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);

  root.className = 'audit152-widget';
  root.innerHTML = `
    <section class="audit152-shell">
      <p class="audit152-kicker">Проверка сайта на соответствие 152-ФЗ</p>
      <h2 class="audit152-title">Проверьте сайт на соответствие 152-ФЗ о персональных данных</h2>
      <p class="audit152-subtitle">Автоматически проверим политику, формы, согласия, cookie-баннер и запуск аналитики до согласия пользователя.</p>

      <div class="audit152-form-wrap" id="audit152-form">
        <form class="audit152-form">
          <div class="audit152-input-shell">
            <span class="audit152-globe" aria-hidden="true">◎</span>
            <input class="audit152-input" name="url" type="text" inputmode="url" autocomplete="url" placeholder="Вставьте адрес сайта, например: example.ru">
          </div>
          <button class="audit152-button" type="submit">Проверить сайт <span class="audit152-button-arrow">→</span></button>
        </form>
        <div class="audit152-under-form">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.4-2.7 8.4-7 10-4.3-1.6-7-5.6-7-10V6l7-3z" stroke="currentColor" stroke-width="2"/>
            <path d="M9 12l2 2 4-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Проверка занимает около минуты. Регистрация не требуется.
        </div>
      </div>

      <div class="audit152-error" hidden></div>

      <div class="audit152-progress" hidden>
        <div class="audit152-progress-line"><span></span></div>
        <ol>
          <li>Открываем сайт</li>
          <li>Ищем документы</li>
          <li>Проверяем формы</li>
          <li>Смотрим cookies</li>
          <li>Собираем отчет</li>
        </ol>
      </div>

      <div class="audit152-result" hidden></div>
    </section>
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
    warn: 'Важно',
    fail: 'Критично'
  };

  const statusIcon = {
    pass: '✓',
    warn: '!',
    fail: '!'
  };

  function formatRub(value) {
    const number = Number(value) || 0;
    if (!number) return '0 ₽';
    return `${new Intl.NumberFormat('ru-RU').format(number)} ₽`;
  }

  function riskName(score) {
    if (score >= 80) return 'Низкий риск';
    if (score >= 55) return 'Средний риск';
    return 'Высокий риск';
  }

  function riskDescription(score) {
    if (score >= 80) return 'Критичных открытых проблем не найдено, но документы и процессы стоит проверить вручную.';
    if (score >= 55) return 'Есть элементы соответствия, но найдены риски, которые лучше исправить до активного сбора заявок.';
    return 'На сайте выявлены нарушения или пробелы, которые могут повысить риск претензий и штрафов.';
  }

  function renderCheck(check) {
    return `
      <article class="audit152-check ${escapeHtml(check.status)}">
        <div class="audit152-icon">${escapeHtml(statusIcon[check.status] || '!')}</div>
        <div class="audit152-check-main">
          <p class="audit152-check-title">${escapeHtml(check.title)}</p>
          <p class="audit152-check-details">${escapeHtml(check.recommendation)}</p>
        </div>
        <div class="audit152-badge ${escapeHtml(check.status)}">${escapeHtml(statusText[check.status] || check.status)}</div>
      </article>
    `;
  }

  function hasProblem(checks, ids) {
    return checks.some((check) => ids.includes(check.id) && check.status !== 'pass');
  }

  function renderFixOffer(checks) {
    const telegramUrl = 'https://t.me/fz152check_bot';
    const fixes = [];

    if (hasProblem(checks, ['policy_link', 'policy_content'])) {
      fixes.push('Подготовим политику обработки персональных данных — под ваш сайт, а не шаблон из интернета');
    }

    if (hasProblem(checks, ['forms_consent', 'consent_document'])) {
      fixes.push('Составим отдельное согласие на обработку ПДн');
    }

    if (hasProblem(checks, ['cookie_banner', 'cookie_document', 'analytics_before_consent'])) {
      fixes.push('Выстроим корректную систему сбора cookie в соответствии с законом');
    }

    if (hasProblem(checks, ['service_offer'])) {
      fixes.push('Составим оферту под ваши услуги: зафиксируем условия работы, оплату и ответственность, чтобы устранить риск споров с клиентами');
    }

    return `
      <section class="audit152-fix-card">
        <a class="audit152-fix-button" href="${telegramUrl}" target="_blank" rel="noopener">Исправить все за 10 000 рублей</a>
        ${fixes.length ? `<ul class="audit152-fix-list">${fixes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        <p class="audit152-fix-gift">В подарок: подготовим бота для оперативной записи и ее подтверждения через удобный мессенджер, с функцией календаря</p>
        <div class="audit152-fix-footer">
          <a class="audit152-fix-button secondary" href="${telegramUrl}" target="_blank" rel="noopener">Написать в ТГ</a>
        </div>
      </section>
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
    const checks = data.checks || [];
    const problemChecks = checks.filter((check) => check.status !== 'pass');
    const shownChecks = (problemChecks.length ? problemChecks : checks).slice(0, 5);
    const score = Number(data.score) || 0;

    result.innerHTML = `
      <section class="audit152-card">
        <div class="audit152-card-head">
          <h3 class="audit152-card-title">Предварительные результаты</h3>
          <span class="audit152-pill">Найдено проблем: ${Number(data.failCount || 0) + Number(data.warnCount || 0)}</span>
        </div>
        <div class="audit152-checks">
          ${shownChecks.map(renderCheck).join('')}
        </div>
      </section>

      <div class="audit152-side">
        <section class="audit152-card audit152-score-card">
          <h3 class="audit152-card-title">Предварительная оценка риска</h3>
          <div class="audit152-score-layout">
            <div class="audit152-ring" style="--score:${score}">
              <div>
                <strong>${score}</strong>
                <span>из 100</span>
              </div>
            </div>
            <div>
              <p class="audit152-risk-name">${escapeHtml(riskName(score))}</p>
              <p class="audit152-risk-text">${escapeHtml(riskDescription(score))}</p>
            </div>
          </div>
        </section>

        <section class="audit152-card audit152-fine-card">
          <h3 class="audit152-card-title">Возможные штрафы</h3>
          <div class="audit152-fine-grid">
            <div class="audit152-fine-row"><span>Критичные риски</span><strong>${Number(data.failCount) || 0}</strong></div>
            <div class="audit152-fine-row"><span>Предупреждения</span><strong>${Number(data.warnCount) || 0}</strong></div>
            <div class="audit152-fine-row"><span>Оценка риска</span><strong>${fineSummary.topRisk ? formatRub(fineSummary.topRisk.maxRub) : '0 ₽'}</strong></div>
          </div>
          <div class="audit152-total-fine">
            <span>Итого потенциально</span>
            <strong>до ${formatRub(fineSummary.totalMaxRub)}</strong>
          </div>
        </section>
      </div>

      ${renderFixOffer(checks)}
    `;
    result.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearState();

    const url = input.value.trim();
    if (!url) {
      showError('Введите адрес сайта.');
      input.focus();
      return;
    }

    button.disabled = true;
    button.innerHTML = 'Проверяю...';
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
        throw new Error(data?.message || 'Проверка не удалась.');
      }

      renderReport(data);
    } catch (error) {
      showError(
        error.name === 'AbortError'
          ? 'Проверка заняла слишком много времени. Попробуйте другой сайт или повторите позже.'
          : error.message
      );
    } finally {
      clearTimeout(timer);
      progress.hidden = true;
      button.disabled = false;
      button.innerHTML = 'Проверить сайт <span class="audit152-button-arrow">→</span>';
    }
  });
})();

