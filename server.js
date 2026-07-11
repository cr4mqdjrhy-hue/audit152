import dns from 'node:dns/promises';
import net from 'node:net';
import express from 'express';
import { chromium } from 'playwright';

const PORT = Number(process.env.PORT || 3000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const USER_AGENT =
  'Mozilla/5.0 (compatible; Audit152Bot/1.0; +https://example.ru/152)';

const app = express();
app.use(express.static(new URL('./public/', import.meta.url).pathname));
app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  const origin = req.get('origin');

  if (ALLOWED_ORIGINS.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

let browserPromise;

function userError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeInputUrl(raw) {
  let value = String(raw || '').trim();

  if (!value) {
    throw userError('Введите адрес сайта.');
  }

  if (value.length > 300) {
    throw userError('Адрес сайта слишком длинный.');
  }

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw userError('Не похоже на корректный адрес сайта.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw userError('Можно проверять только http- и https-сайты.');
  }

  if (parsed.username || parsed.password) {
    throw userError('Адрес не должен содержать логин или пароль.');
  }

  parsed.hash = '';
  return parsed.toString();
}

function isBlockedHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0'
  );
}

function isPrivateIp(ip) {
  if (ip.includes(':') && ip.includes('.')) {
    const ipv4Tail = ip.slice(ip.lastIndexOf(':') + 1);
    if (net.isIP(ipv4Tail) === 4) {
      return isPrivateIp(ipv4Tail);
    }
  }

  const family = net.isIP(ip);

  if (family === 4) {
    const parts = ip.split('.').map((part) => Number(part));
    const [a, b] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (family === 6) {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:')
    );
  }

  return true;
}

async function assertPublicHttpUrl(rawUrl) {
  const parsed = new URL(rawUrl);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw userError('Можно проверять только http- и https-сайты.');
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw userError('Этот адрес нельзя проверять автоматически.');
  }

  if (net.isIP(parsed.hostname)) {
    if (isPrivateIp(parsed.hostname)) {
      throw userError('Этот адрес нельзя проверять автоматически.');
    }
    return;
  }

  let records;
  try {
    records = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw userError('Не получилось найти сайт по DNS.');
  }

  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw userError('Этот адрес нельзя проверять автоматически.');
  }
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
  }

  return browserPromise;
}

function cleanupText(value, maxLength = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function uniqBy(items, keyFn) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

async function inspectMainPage(browser, targetUrl) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: USER_AGENT
  });

  const page = await context.newPage();
  const requests = [];

  page.on('request', (request) => {
    requests.push({
      url: request.url(),
      type: request.resourceType()
    });
  });

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 18000
    });

    await page.waitForTimeout(2500);

    const info = await page.evaluate(() => {
      const compact = (value, maxLength = 500) =>
        String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

      const links = Array.from(document.links).map((link) => ({
        href: link.href,
        text: compact(link.innerText || link.textContent || link.getAttribute('aria-label'), 180)
      }));

      const buttons = Array.from(
        document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')
      ).map((button) => ({
        text: compact(
          button.innerText ||
            button.textContent ||
            button.value ||
            button.getAttribute('aria-label'),
          180
        ),
        tag: button.tagName.toLowerCase()
      }));

      const fields = Array.from(document.querySelectorAll('input, textarea, select')).map(
        (field) => {
          const labelText = Array.from(field.labels || [])
            .map((label) => label.innerText)
            .join(' ');
          const closestText =
            field.closest('label, .t-input-group, .tn-form__item, .form-group, .field')
              ?.innerText || '';

          return {
            type: compact(field.getAttribute('type') || field.tagName.toLowerCase(), 50),
            name: compact(field.getAttribute('name'), 120),
            placeholder: compact(field.getAttribute('placeholder'), 160),
            ariaLabel: compact(field.getAttribute('aria-label'), 160),
            label: compact(`${labelText} ${closestText}`, 350),
            checked: Boolean(field.checked),
            required: Boolean(field.required)
          };
        }
      );

      const forms = Array.from(document.querySelectorAll('form, .t-form, .tn-form')).map(
        (form) => ({
          text: compact(form.innerText || form.textContent, 700),
          action: compact(form.getAttribute('action'), 200),
          method: compact(form.getAttribute('method'), 30)
        })
      );

      const scripts = Array.from(document.scripts)
        .map((script) => script.src || compact(script.textContent, 500))
        .filter(Boolean)
        .slice(0, 200);

      return {
        title: compact(document.title, 200),
        text: compact(document.body?.innerText || '', 200000),
        links,
        buttons,
        fields,
        forms,
        scripts
      };
    });

    const cookies = await context.cookies();

    return {
      status: response?.status() || null,
      finalUrl: page.url(),
      info,
      cookies: cookies.map((cookie) => ({
        name: cookie.name,
        domain: cookie.domain,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      })),
      requests
    };
  } finally {
    await context.close();
  }
}

function isPolicyLink(link) {
  const haystack = `${link.text} ${link.href}`.toLowerCase();
  return /(политик|конфиденц|privacy|personal[-_ ]?data|персональн)/i.test(haystack);
}

function isConsentLink(link) {
  const haystack = `${link.text} ${link.href}`.toLowerCase();
  return /(соглас|consent|обработк.*персон|152[- ]?фз)/i.test(haystack);
}

function isCookieLink(link) {
  const haystack = `${link.text} ${link.href}`.toLowerCase();
  return /(cookie|cookies|куки|куки-файл)/i.test(haystack);
}

function isOfferLink(link) {
  const haystack = `${link.text} ${link.href}`.toLowerCase();
  return /(оферт|договор|услови[яй].*услуг|terms|offer|agreement|contract)/i.test(haystack);
}

function isLikelyDocumentLink(link) {
  return isPolicyLink(link) || isConsentLink(link) || isCookieLink(link) || isOfferLink(link);
}

function isPersonalField(field) {
  const haystack = `${field.type} ${field.name} ${field.placeholder} ${field.ariaLabel} ${field.label}`.toLowerCase();
  return /(email|e-mail|mail|phone|tel|name|surname|fio|имя|фамил|отчест|телефон|почт|e почта|адрес|address|паспорт|коммент|сообщени)/i.test(
    haystack
  );
}

function isConsentField(field) {
  const haystack = `${field.type} ${field.name} ${field.placeholder} ${field.ariaLabel} ${field.label}`.toLowerCase();
  return (
    field.type.toLowerCase() === 'checkbox' &&
    /(соглас|персональн|политик|конфиденц|обработк|152[- ]?фз|privacy|consent)/i.test(
      haystack
    )
  );
}

async function readDocumentPages(browser, links) {
  const candidates = uniqBy(links.filter(isLikelyDocumentLink), (link) => link.href).slice(0, 5);
  const docs = [];

  if (!candidates.length) {
    return docs;
  }

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: USER_AGENT
  });
  const page = await context.newPage();

  try {
    for (const link of candidates) {
      try {
        await assertPublicHttpUrl(link.href);
        const response = await page.goto(link.href, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(700);
        const text = await page.evaluate(() =>
          String(document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80000)
        );

        docs.push({
          href: link.href,
          text: link.text,
          status: response?.status() || null,
          bodyText: text
        });
      } catch (error) {
        docs.push({
          href: link.href,
          text: link.text,
          status: null,
          bodyText: '',
          error: cleanupText(error.message, 180)
        });
      }
    }
  } finally {
    await context.close();
  }

  return docs;
}

function detectAnalytics(requests, cookies, scripts) {
  const sources = [
    {
      name: 'Яндекс.Метрика',
      request: /(mc\.yandex\.ru|yandex\.[a-z]+\/metrika|metrika\.yandex)/i,
      cookie: /^_ym|^yandexuid$/i,
      script: /(mc\.yandex\.ru|metrika)/i
    },
    {
      name: 'Google Analytics / Tag Manager',
      request: /(google-analytics\.com|googletagmanager\.com|gtag\/js)/i,
      cookie: /^_ga|^_gid|^_gat/i,
      script: /(google-analytics\.com|googletagmanager\.com|gtag\()/i
    },
    {
      name: 'VK / Mail.ru / myTarget',
      request: /(top-fwz1\.mail\.ru|vk\.com\/rtrg|mytarget)/i,
      cookie: /^(tmr_|_ym_d|_vk)/i,
      script: /(top-fwz1\.mail\.ru|vk\.com\/rtrg|mytarget)/i
    },
    {
      name: 'Meta Pixel',
      request: /(connect\.facebook\.net|facebook\.com\/tr)/i,
      cookie: /^_fbp|^_fbc/i,
      script: /(fbq\(|connect\.facebook\.net)/i
    }
  ];

  return sources
    .map((source) => {
      const matchedRequests = requests
        .filter((request) => source.request.test(request.url))
        .map((request) => request.url);
      const matchedCookies = cookies
        .filter((cookie) => source.cookie.test(cookie.name))
        .map((cookie) => `${cookie.name} (${cookie.domain})`);
      const matchedScripts = scripts.filter((script) => source.script.test(script)).slice(0, 3);

      return {
        name: source.name,
        requests: uniqBy(matchedRequests, (item) => item).slice(0, 8),
        cookies: uniqBy(matchedCookies, (item) => item).slice(0, 8),
        scripts: matchedScripts
      };
    })
    .filter((source) => source.requests.length || source.cookies.length || source.scripts.length);
}

const FINE_RISKS = {
  policyPublication: {
    article: 'КоАП РФ ст. 13.11 ч. 3',
    maxRub: 60000,
    title: 'неопубликование политики ПД',
    basis: 'верхняя граница для юридического лица'
  },
  unlawfulProcessing: {
    article: 'КоАП РФ ст. 13.11 ч. 1',
    maxRub: 300000,
    title: 'обработка ПД с нарушением целей или оснований',
    basis: 'верхняя граница для юридического лица'
  },
  consent: {
    article: 'КоАП РФ ст. 13.11 ч. 2',
    maxRub: 700000,
    title: 'обработка ПД без требуемого согласия или с дефектом согласия',
    basis: 'верхняя граница для юридического лица'
  }
};

function makeFine(type, includedInTotal = true) {
  const fine = FINE_RISKS[type];
  if (!fine) return null;
  return { ...fine, includedInTotal };
}

function buildFineSummary(checks) {
  const riskyChecks = checks.filter(
    (check) => ['fail', 'warn'].includes(check.status) && check.fine
  );
  const totalMaxRub = riskyChecks.reduce((sum, check) => {
    if (check.fine.includedInTotal === false) return sum;
    return sum + check.fine.maxRub;
  }, 0);
  const criticalMaxRub = riskyChecks.reduce((sum, check) => {
    if (check.status !== 'fail' || check.fine.includedInTotal === false) return sum;
    return sum + check.fine.maxRub;
  }, 0);
  const topRisk = riskyChecks.reduce((max, check) => {
    if (!max || check.fine.maxRub > max.maxRub) return check.fine;
    return max;
  }, null);

  return {
    totalMaxRub,
    criticalMaxRub,
    topRisk,
    basis:
      'Ориентир рассчитан по верхним границам штрафов для юридических лиц по ст. 13.11 КоАП РФ.',
    note: ''
  };
}

function makeCheck(id, title, status, details, recommendation, fine = null) {
  return { id, title, status, details, recommendation, fine };
}

function buildReport(targetUrl, main, docs, elapsedMs) {
  const links = uniqBy(main.info.links || [], (link) => link.href);
  const policyLinks = links.filter(isPolicyLink);
  const consentLinks = links.filter(isConsentLink);
  const cookieLinks = links.filter(isCookieLink);
  const offerLinks = links.filter(isOfferLink);
  const personalFields = (main.info.fields || []).filter(isPersonalField);
  const consentFields = (main.info.fields || []).filter(isConsentField);
  const precheckedConsentFields = consentFields.filter((field) => field.checked);
  const pageText = `${main.info.text || ''}`.toLowerCase();
  const docText = docs.map((doc) => doc.bodyText).join(' ').toLowerCase();
  const allLegalText = `${pageText} ${docText}`;
  const buttonsText = (main.info.buttons || []).map((button) => button.text).join(' ').toLowerCase();
  const analytics = detectAnalytics(main.requests, main.cookies, main.info.scripts || []);

  const policyTerms = [
    ['оператор', /оператор/],
    ['цели обработки', /цел[ьи]\s+обработк|цель\s+обработк/],
    ['категории данных', /категори.*персональн|состав\s+персональн/],
    ['правовые основания', /правов.*основан|основани.*обработк/],
    ['действия с данными', /сбор|запис|систематизац|хранени|уточнени|удалени/],
    ['сроки обработки', /срок.*обработк|срок.*хранени/],
    ['права субъекта', /права\s+субъект|субъект.*прав/],
    ['отзыв согласия', /отзыв.*соглас|отозвать\s+соглас/],
    ['передача третьим лицам', /третьим\s+лиц|поручен.*обработк|обработчик/],
    ['меры защиты', /мер.*защит|защит.*персональн/]
  ];
  const foundPolicyTerms = policyTerms
    .filter(([, pattern]) => pattern.test(allLegalText))
    .map(([label]) => label);

  const hasCookieMention = /(cookie|cookies|куки|куки-файл)/i.test(pageText);
  const hasRejectButton = /(отказ|отклон|запрет|не соглас|reject|decline|deny)/i.test(buttonsText);
  const hasAcceptButton = /(соглас|принять|accept|allow|ok|хорошо)/i.test(buttonsText);

  const checks = [];

  checks.push(
    makeCheck(
      'open',
      'Сайт открывается',
      'pass',
      `Главная страница открылась. Финальный адрес: ${main.finalUrl}`,
      'Если часть сайта закрыта от автоматических проверок, проверьте формы и документы вручную.'
    )
  );

  checks.push(
    policyLinks.length
      ? makeCheck(
          'policy_link',
          'Ссылка на политику персональных данных',
          'pass',
          `Найдено ссылок: ${policyLinks.length}. Первая: ${policyLinks[0].href}`,
          'Проверьте, что ссылка есть в подвале и рядом с формами сбора данных.'
        )
      : makeCheck(
          'policy_link',
          'Ссылка на политику персональных данных',
          'fail',
          'Автоматически не найдена ссылка на политику обработки персональных данных.',
          'Добавьте заметную ссылку на политику в подвал сайта и рядом с каждой формой.',
          makeFine('policyPublication')
        )
  );

  if (!policyLinks.length) {
    checks.push(
      makeCheck(
        'policy_content',
        'Содержание политики',
        'fail',
        'Документ политики не найден, поэтому содержание проверить нельзя.',
        'Опубликуйте отдельную страницу с политикой обработки персональных данных.',
        makeFine('unlawfulProcessing')
      )
    );
  } else if (foundPolicyTerms.length >= 7) {
    checks.push(
      makeCheck(
        'policy_content',
        'Содержание политики',
        'pass',
        `В документах найдены ключевые разделы: ${foundPolicyTerms.join(', ')}.`,
        'Оставьте документ привязанным к реальным процессам сайта, а не только к шаблону.'
      )
    );
  } else {
    checks.push(
      makeCheck(
        'policy_content',
        'Содержание политики',
        'warn',
        `Найдено мало ключевых разделов: ${foundPolicyTerms.join(', ') || 'не найдено'}.`,
        'Добавьте цели, состав данных, основания, сроки, права субъекта, порядок отзыва согласия и меры защиты.',
        makeFine('unlawfulProcessing')
      )
    );
  }

  if (!personalFields.length) {
    checks.push(
      makeCheck(
        'forms_consent',
        'Согласие рядом с формами',
        'warn',
        'Поля, похожие на сбор персональных данных, не найдены.',
        'Если формы появляются в попапах, корзине или личном кабинете, проверьте их отдельно.'
      )
    );
  } else if (consentFields.length && !precheckedConsentFields.length) {
    checks.push(
      makeCheck(
        'forms_consent',
        'Согласие рядом с формами',
        'pass',
        `Найдено полей с персональными данными: ${personalFields.length}. Найдено чекбоксов согласия: ${consentFields.length}.`,
        'Проверьте, что текст согласия конкретный и ведет на актуальную политику.'
      )
    );
  } else if (precheckedConsentFields.length) {
    checks.push(
      makeCheck(
        'forms_consent',
        'Согласие рядом с формами',
        'fail',
        'Найден чекбокс согласия, который уже отмечен заранее.',
        'Согласие должно быть активным действием пользователя. Уберите предустановленную галочку.',
        makeFine('consent')
      )
    );
  } else {
    checks.push(
      makeCheck(
        'forms_consent',
        'Согласие рядом с формами',
        'fail',
        `Найдены поля, похожие на персональные данные: ${personalFields.length}, но чекбокс согласия не найден.`,
        'Добавьте чекбокс согласия на обработку персональных данных ко всем формам.',
        makeFine('consent')
      )
    );
  }

  if (consentLinks.length) {
    checks.push(
      makeCheck(
        'consent_document',
        'Отдельное согласие на обработку ПД',
        'pass',
        `Найдено ссылок или упоминаний согласия: ${consentLinks.length}.`,
        'Убедитесь, что согласие конкретное, предметное, информированное и однозначное.'
      )
    );
  } else {
    checks.push(
      makeCheck(
        'consent_document',
        'Отдельное согласие на обработку ПД',
        'warn',
        'Отдельная ссылка на согласие не найдена.',
        'Для форм лучше иметь отдельный текст согласия, а не только ссылку на политику.',
        personalFields.length ? makeFine('consent') : null
      )
    );
  }

  if (analytics.length && !hasCookieMention) {
    checks.push(
      makeCheck(
        'cookie_banner',
        'Cookie-баннер',
        'fail',
        'На странице найдена аналитика, но cookie-уведомление автоматически не обнаружено.',
        'Добавьте cookie-баннер с понятным выбором: согласиться или отказаться.',
        makeFine('unlawfulProcessing', false)
      )
    );
  } else if (hasCookieMention && hasRejectButton && hasAcceptButton) {
    checks.push(
      makeCheck(
        'cookie_banner',
        'Cookie-баннер',
        'pass',
        'Найдены упоминание cookie и кнопки согласия/отказа.',
        'Проверьте, что отказ действительно блокирует необязательные cookies и аналитику.'
      )
    );
  } else if (hasCookieMention) {
    checks.push(
      makeCheck(
        'cookie_banner',
        'Cookie-баннер',
        'warn',
        'Упоминание cookie найдено, но полноценный выбор согласия/отказа не очевиден.',
        'Добавьте отдельные кнопки согласия и отказа, а не только информационный текст.',
        analytics.length ? makeFine('unlawfulProcessing', false) : null
      )
    );
  } else {
    checks.push(
      makeCheck(
        'cookie_banner',
        'Cookie-баннер',
        'warn',
        'Cookie-баннер не найден.',
        'Если сайт использует только технические cookies, это может быть допустимо; для аналитики нужен отдельный контроль.'
      )
    );
  }

  if (analytics.length) {
    checks.push(
      makeCheck(
        'analytics_before_consent',
        'Аналитика до согласия',
        'fail',
        `До действия пользователя обнаружены: ${analytics.map((item) => item.name).join(', ')}.`,
        'Настройте запуск Яндекс.Метрики, Google Analytics и пикселей только после согласия пользователя.',
        makeFine('unlawfulProcessing')
      )
    );
  } else {
    checks.push(
      makeCheck(
        'analytics_before_consent',
        'Аналитика до согласия',
        'pass',
        'До действия пользователя явные запросы популярных систем аналитики не обнаружены.',
        'Проверьте редкие счетчики и рекламные пиксели, если они подключаются через сторонние скрипты.'
      )
    );
  }

  checks.push(
    cookieLinks.length
      ? makeCheck(
          'cookie_document',
          'Документ о cookies',
          'pass',
          `Найдено cookie-ссылок: ${cookieLinks.length}.`,
          'Документ должен описывать категории cookies, цели и способ отказа.'
        )
      : makeCheck(
          'cookie_document',
          'Документ о cookies',
          'warn',
          'Отдельная ссылка на документ о cookies не найдена.',
          'Добавьте страницу или раздел о cookies, если используете аналитику и рекламные пиксели.',
          analytics.length ? makeFine('unlawfulProcessing', false) : null
        )
  );

  checks.push(
    offerLinks.length
      ? makeCheck(
          'service_offer',
          'Оферта на услуги',
          'pass',
          `Найдено ссылок на оферту или договорные условия: ${offerLinks.length}.`,
          'Проверьте, что оферта описывает состав услуг, оплату, сроки, ограничения ответственности и порядок претензий.'
        )
      : makeCheck(
          'service_offer',
          'Оферта на услуги',
          'warn',
          'Автоматически не найдена оферта или договорные условия оказания услуг.',
          'Разместите оферту, если сайт продает услуги, принимает заявки на оплату или фиксирует условия работы с клиентами.'
        )
  );

  const scoredChecks = checks.filter((check) => check.status !== 'info');
  const scoreValue = scoredChecks.reduce((sum, check) => {
    if (check.status === 'pass') return sum + 1;
    if (check.status === 'warn') return sum + 0.5;
    return sum;
  }, 0);
  const score = Math.round((scoreValue / scoredChecks.length) * 100);
  const failCount = checks.filter((check) => check.status === 'fail').length;
  const warnCount = checks.filter((check) => check.status === 'warn').length;
  const fineSummary = buildFineSummary(checks);

  let summary = 'Есть заметные риски по 152-ФЗ. Начните с ошибок, отмеченных красным.';
  if (score >= 80 && failCount === 0) {
    summary = 'Критичных открытых проблем не найдено, но результат не заменяет юридический аудит.';
  } else if (score >= 55) {
    summary = 'Базовые элементы частично есть, но нужны исправления перед спокойным запуском рекламы и форм.';
  }

  return {
    ok: true,
    targetUrl,
    finalUrl: main.finalUrl,
    title: main.info.title,
    checkedAt: new Date().toISOString(),
    elapsedMs,
    score,
    failCount,
    warnCount,
    summary,
    fineSummary,
    checks,
    evidence: {
      documentLinks: uniqBy([...policyLinks, ...consentLinks, ...cookieLinks, ...offerLinks], (link) => link.href)
        .slice(0, 10)
        .map((link) => ({ text: link.text, href: link.href })),
      formsFound: main.info.forms.length,
      personalFieldsFound: personalFields.length,
      consentFieldsFound: consentFields.length,
      cookies: main.cookies.slice(0, 30),
      analytics
    },
    disclaimer: ''
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/audit152', async (req, res) => {
  const startedAt = Date.now();

  try {
    const targetUrl = normalizeInputUrl(req.body?.url);
    await assertPublicHttpUrl(targetUrl);

    const browser = await getBrowser();
    const main = await inspectMainPage(browser, targetUrl);
    await assertPublicHttpUrl(main.finalUrl);

    const docs = await readDocumentPages(browser, main.info.links || []);
    const report = buildReport(targetUrl, main, docs, Date.now() - startedAt);

    res.json(report);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      ok: false,
      message:
        status === 500
          ? 'Не получилось выполнить автоматическую проверку. Попробуйте позже.'
          : error.message
    });
  }
});

process.on('SIGTERM', async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`152 audit API is running on port ${PORT}`);
});
  next();
});

let browserPromise;

function userError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeInputUrl(raw) {
  let value = String(raw || '').trim();

  if (!value) {
    throw userError('Введите адрес сайта.');
  }

  if (value.length > 300) {
    throw userError('Адрес сайта слишком длинный.');
  }

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw userError('Не похоже на корректный адрес сайта.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw userError('Можно проверять только http- и https-сайты.');
  }

  if (parsed.username || parsed.password) {
    throw userError('Адрес не должен содержать логин или пароль.');
  }

  parsed.hash = '';
  return parsed.toString();
}

function isBlockedHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0'
  );
}

function isPrivateIp(ip) {
  if (ip.includes(':') && ip.includes('.')) {
    const ipv4Tail = ip.slice(ip.lastIndexOf(':') + 1);
    if (net.isIP(ipv4Tail) === 4) {
      return isPrivateIp(ipv4Tail);
    }
  }

  const family = net.isIP(ip);

  if (family === 4) {
    const parts = ip.split('.').map((part) => Number(part));
    const [a, b] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (family === 6) {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:')
    );
  }

  return true;
}

async function assertPublicHttpUrl(rawUrl) {
  const parsed = new URL(rawUrl);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw userError('Можно проверять только http- и https-сайты.');
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw userError('Этот адрес нельзя проверять автоматически.');
  }

  if (net.isIP(parsed.hostname)) {
    if (isPrivateIp(parsed.hostname)) {
      throw userError('Этот адрес нельзя проверять автоматически.');
    }
    return;
  }

  let records;
  try {
    records = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw userError('Не получилось найти сайт по DNS.');
  }

  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw userError('Этот адрес нельзя проверять автоматически.');
  }
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
  }

  return browserPromise;
}

function cleanupText(value, maxLength = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function uniqBy(items, keyFn) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

async function inspectMainPage(browser, targetUrl) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: USER_AGENT
  });

  const page = await context.newPage();
  const requests = [];

  page.on('request', (request) => {
    requests.push({
      url: request.url(),
      type: request.resourceType()
    });
  });

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 18000
    });

    await page.waitForTimeout(2500);

    const info = await page.evaluate(() => {
      const compact = (value, maxLength = 500) =>
        String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

      const links = Array.from(document.links).map((link) => ({
        href: link.href,
        text: compact(link.innerText || link.textContent || link.getAttribute('aria-label'), 180)
      }));

      const buttons = Array.from(
        document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')
      ).map((button) => ({
        text: compact(
          button.innerText ||
            button.textContent ||
            button.value ||
            button.getAttribute('aria-label'),
          180
        ),
        tag: button.tagName.toLowerCase()
      }));

      const fields = Array.from(document.querySelectorAll('input, textarea, select')).map(
        (field) => {
          const labelText = Array.from(field.labels || [])
            .map((label) => label.innerText)
            .join(' ');
          const closestText =
            field.closest('label, .t-input-group, .tn-form__item, .form-group, .field')
              ?.innerText || '';

          return {
            type: compact(field.getAttribute('type') || field.tagName.toLowerCase(), 50),
            name: compact(field.getAttribute('name'), 120),
            placeholder: compact(field.getAttribute('placeholder'), 160),
            ariaLabel: compact(field.getAttribute('aria-label'), 160),
            label: compact(`${labelText} ${closestText}`, 350),
            checked: Boolean(field.checked),
            required: Boolean(field.required)
          };
        }
      );

      const forms = Array.from(document.querySelectorAll('form, .t-form, .tn-form')).map(
        (form) => ({
          text: compact(form.innerText || form.textContent, 700),
          action: compact(form.getAttribute('action'), 200),
          method: compact(form.getAttribute('method'), 30)
        })
      );

      const scripts = Array.from(document.scripts)
        .map((script) => script.src || compact(script.textContent, 500))
        .filter(Boolean)
        .slice(0, 200);

      return {
        title: compact(document.title, 200),
        text: compact(document.body?.innerText || '', 200000),
        links,
        buttons,
        fields,
        forms,
        scripts
      };
    });

    const cookies = await context.cookies();

    return {
      status: response?.status() || null,
      finalUrl: page.url(),
      info,
      cookies: cookies.map((cookie) => ({
        name: cookie.name,
        domain: cookie.domain,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      })),
      requests
    };
  } finally {
    await context.close();
  }
}

function isPolicyLink(link) {
  const haystack = `${link.text} ${link.href}`.toLowerCase();
  return /(политик|конфиденц|privacy|personal[-_ ]?data|персональн)/i.test(haystack);
}

function isConsentLink(link) {
  const haystack = `${link.text} ${link.href}`.toLowerCase();
  return /(соглас|consent|обработк.*персон|152[- ]?фз)/i.test(haystack);
}

function isCookieLink(link) {
  const haystack = `${link.text} ${link.href}`.toLowerCase();
  return /(cookie|cookies|куки|куки-файл)/i.test(haystack);
}

function isLikelyDocumentLink(link) {
  return isPolicyLink(link) || isConsentLink(link) || isCookieLink(link);
}

function isPersonalField(field) {
  const haystack = `${field.type} ${field.name} ${field.placeholder} ${field.ariaLabel} ${field.label}`.toLowerCase();
  return /(email|e-mail|mail|phone|tel|name|surname|fio|имя|фамил|отчест|телефон|почт|e почта|адрес|address|паспорт|коммент|сообщени)/i.test(
    haystack
  );
}

function isConsentField(field) {
  const haystack = `${field.type} ${field.name} ${field.placeholder} ${field.ariaLabel} ${field.label}`.toLowerCase();
  return (
    field.type.toLowerCase() === 'checkbox' &&
    /(соглас|персональн|политик|конфиденц|обработк|152[- ]?фз|privacy|consent)/i.test(
      haystack
    )
  );
}

async function readDocumentPages(browser, links) {
  const candidates = uniqBy(links.filter(isLikelyDocumentLink), (link) => link.href).slice(0, 5);
  const docs = [];

  if (!candidates.length) {
    return docs;
  }

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: USER_AGENT
  });
  const page = await context.newPage();

  try {
    for (const link of candidates) {
      try {
        await assertPublicHttpUrl(link.href);
        const response = await page.goto(link.href, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(700);
        const text = await page.evaluate(() =>
          String(document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80000)
        );

        docs.push({
          href: link.href,
          text: link.text,
          status: response?.status() || null,
          bodyText: text
        });
      } catch (error) {
        docs.push({
          href: link.href,
          text: link.text,
          status: null,
          bodyText: '',
          error: cleanupText(error.message, 180)
        });
      }
    }
  } finally {
    await context.close();
  }

  return docs;
}

function detectAnalytics(requests, cookies, scripts) {
  const sources = [
    {
      name: 'Яндекс.Метрика',
      request: /(mc\.yandex\.ru|yandex\.[a-z]+\/metrika|metrika\.yandex)/i,
      cookie: /^_ym|^yandexuid$/i,
      script: /(mc\.yandex\.ru|metrika)/i
    },
    {
      name: 'Google Analytics / Tag Manager',
      request: /(google-analytics\.com|googletagmanager\.com|gtag\/js)/i,
      cookie: /^_ga|^_gid|^_gat/i,
      script: /(google-analytics\.com|googletagmanager\.com|gtag\()/i
    },
    {
      name: 'VK / Mail.ru / myTarget',
      request: /(top-fwz1\.mail\.ru|vk\.com\/rtrg|mytarget)/i,
      cookie: /^(tmr_|_ym_d|_vk)/i,
      script: /(top-fwz1\.mail\.ru|vk\.com\/rtrg|mytarget)/i
    },
    {
      name: 'Meta Pixel',
      request: /(connect\.facebook\.net|facebook\.com\/tr)/i,
      cookie: /^_fbp|^_fbc/i,
      script: /(fbq\(|connect\.facebook\.net)/i
    }
  ];

  return sources
    .map((source) => {
      const matchedRequests = requests
        .filter((request) => source.request.test(request.url))
        .map((request) => request.url);
      const matchedCookies = cookies
        .filter((cookie) => source.cookie.test(cookie.name))
        .map((cookie) => `${cookie.name} (${cookie.domain})`);
      const matchedScripts = scripts.filter((script) => source.script.test(script)).slice(0, 3);

      return {
        name: source.name,
        requests: uniqBy(matchedRequests, (item) => item).slice(0, 8),
        cookies: uniqBy(matchedCookies, (item) => item).slice(0, 8),
        scripts: matchedScripts
      };
    })
    .filter((source) => source.requests.length || source.cookies.length || source.scripts.length);
}

const FINE_RISKS = {
  policyPublication: {
    article: 'КоАП РФ ст. 13.11 ч. 3',
    maxRub: 60000,
    title: 'неопубликование политики ПД',
    basis: 'верхняя граница для юридического лица'
  },
  unlawfulProcessing: {
    article: 'КоАП РФ ст. 13.11 ч. 1',
    maxRub: 300000,
    title: 'обработка ПД с нарушением целей или оснований',
    basis: 'верхняя граница для юридического лица'
  },
  consent: {
    article: 'КоАП РФ ст. 13.11 ч. 2',
    maxRub: 700000,
    title: 'обработка ПД без требуемого согласия или с дефектом согласия',
    basis: 'верхняя граница для юридического лица'
  }
};

function makeFine(type, includedInTotal = true) {
  const fine = FINE_RISKS[type];
  if (!fine) return null;
  return { ...fine, includedInTotal };
}

function buildFineSummary(checks) {
  const riskyChecks = checks.filter(
    (check) => ['fail', 'warn'].includes(check.status) && check.fine
  );
  const totalMaxRub = riskyChecks.reduce((sum, check) => {
    if (check.fine.includedInTotal === false) return sum;
    return sum + check.fine.maxRub;
  }, 0);
  const criticalMaxRub = riskyChecks.reduce((sum, check) => {
    if (check.status !== 'fail' || check.fine.includedInTotal === false) return sum;
    return sum + check.fine.maxRub;
  }, 0);
  const topRisk = riskyChecks.reduce((max, check) => {
    if (!max || check.fine.maxRub > max.maxRub) return check.fine;
    return max;
  }, null);

  return {
    totalMaxRub,
    criticalMaxRub,
    topRisk,
    basis:
      'Ориентир рассчитан по верхним границам штрафов для юридических лиц по ст. 13.11 КоАП РФ.',
    note:
      'Это не прогноз постановления: РКН и суд квалифицируют нарушение по обстоятельствам, а суммы по разным составам не всегда складываются автоматически. Расчет не включает утечки, повторность и отсутствие уведомления РКН, если ИНН оператора не проверялся.'
  };
}

function makeCheck(id, title, status, details, recommendation, fine = null) {
  return { id, title, status, details, recommendation, fine };
}

function buildReport(targetUrl, main, docs, elapsedMs) {
  const links = uniqBy(main.info.links || [], (link) => link.href);
  const policyLinks = links.filter(isPolicyLink);
  const consentLinks = links.filter(isConsentLink);
  const cookieLinks = links.filter(isCookieLink);
  const personalFields = (main.info.fields || []).filter(isPersonalField);
  const consentFields = (main.info.fields || []).filter(isConsentField);
  const precheckedConsentFields = consentFields.filter((field) => field.checked);
  const pageText = `${main.info.text || ''}`.toLowerCase();
  const docText = docs.map((doc) => doc.bodyText).join(' ').toLowerCase();
  const allLegalText = `${pageText} ${docText}`;
  const buttonsText = (main.info.buttons || []).map((button) => button.text).join(' ').toLowerCase();
  const analytics = detectAnalytics(main.requests, main.cookies, main.info.scripts || []);

  const policyTerms = [
    ['оператор', /оператор/],
    ['цели обработки', /цел[ьи]\s+обработк|цель\s+обработк/],
    ['категории данных', /категори.*персональн|состав\s+персональн/],
    ['правовые основания', /правов.*основан|основани.*обработк/],
    ['действия с данными', /сбор|запис|систематизац|хранени|уточнени|удалени/],
    ['сроки обработки', /срок.*обработк|срок.*хранени/],
    ['права субъекта', /права\s+субъект|субъект.*прав/],
    ['отзыв согласия', /отзыв.*соглас|отозвать\s+соглас/],
    ['передача третьим лицам', /третьим\s+лиц|поручен.*обработк|обработчик/],
    ['меры защиты', /мер.*защит|защит.*персональн/]
  ];
  const foundPolicyTerms = policyTerms
    .filter(([, pattern]) => pattern.test(allLegalText))
    .map(([label]) => label);

  const hasCookieMention = /(cookie|cookies|куки|куки-файл)/i.test(pageText);
  const hasRejectButton = /(отказ|отклон|запрет|не соглас|reject|decline|deny)/i.test(buttonsText);
  const hasAcceptButton = /(соглас|принять|accept|allow|ok|хорошо)/i.test(buttonsText);

  const checks = [];

  checks.push(
    makeCheck(
      'open',
      'Сайт открывается',
      'pass',
      `Главная страница открылась. Финальный адрес: ${main.finalUrl}`,
      'Если часть сайта закрыта от автоматических проверок, проверьте формы и документы вручную.'
    )
  );

  checks.push(
    policyLinks.length
      ? makeCheck(
          'policy_link',
          'Ссылка на политику персональных данных',
          'pass',
          `Найдено ссылок: ${policyLinks.length}. Первая: ${policyLinks[0].href}`,
          'Проверьте, что ссылка есть в подвале и рядом с формами сбора данных.'
        )
      : makeCheck(
          'policy_link',
          'Ссылка на политику персональных данных',
          'fail',
          'Автоматически не найдена ссылка на политику обработки персональных данных.',
          'Добавьте заметную ссылку на политику в подвал сайта и рядом с каждой формой.',
          makeFine('policyPublication')
        )
  );

  if (!policyLinks.length) {
    checks.push(
      makeCheck(
        'policy_content',
        'Содержание политики',
        'fail',
        'Документ политики не найден, поэтому содержание проверить нельзя.',
        'Опубликуйте отдельную страницу с политикой обработки персональных данных.',
        makeFine('unlawfulProcessing')
      )
    );
  } else if (foundPolicyTerms.length >= 7) {
    checks.push(
      makeCheck(
        'policy_content',
        'Содержание политики',
        'pass',
        `В документах найдены ключевые разделы: ${foundPolicyTerms.join(', ')}.`,
        'Оставьте документ привязанным к реальным процессам сайта, а не только к шаблону.'
      )
    );
  } else {
    checks.push(
      makeCheck(
        'policy_content',
        'Содержание политики',
        'warn',
        `Найдено мало ключевых разделов: ${foundPolicyTerms.join(', ') || 'не найдено'}.`,
        'Добавьте цели, состав данных, основания, сроки, права субъекта, порядок отзыва согласия и меры защиты.',
        makeFine('unlawfulProcessing')
      )
    );
  }

  if (!personalFields.length) {
    checks.push(
      makeCheck(
        'forms_consent',
        'Согласие рядом с формами',
        'warn',
        'Поля, похожие на сбор персональных данных, не найдены.',
        'Если формы появляются в попапах, корзине или личном кабинете, проверьте их отдельно.'
      )
    );
  } else if (consentFields.length && !precheckedConsentFields.length) {
    checks.push(
      makeCheck(
        'forms_consent',
        'Согласие рядом с формами',
        'pass',
        `Найдено полей с персональными данными: ${personalFields.length}. Найдено чекбоксов согласия: ${consentFields.length}.`,
        'Проверьте, что текст согласия конкретный и ведет на актуальную политику.'
      )
    );
  } else if (precheckedConsentFields.length) {
    checks.push(
      makeCheck(
        'forms_consent',
        'Согласие рядом с формами',
        'fail',
        'Найден чекбокс согласия, который уже отмечен заранее.',
        'Согласие должно быть активным действием пользователя. Уберите предустановленную галочку.',
        makeFine('consent')
      )
    );
  } else {
    checks.push(
      makeCheck(
        'forms_consent',
        'Согласие рядом с формами',
        'fail',
        `Найдены поля, похожие на персональные данные: ${personalFields.length}, но чекбокс согласия не найден.`,
        'Добавьте чекбокс согласия на обработку персональных данных ко всем формам.',
        makeFine('consent')
      )
    );
  }

  if (consentLinks.length) {
    checks.push(
      makeCheck(
        'consent_document',
        'Отдельное согласие на обработку ПД',
        'pass',
        `Найдено ссылок или упоминаний согласия: ${consentLinks.length}.`,
        'Убедитесь, что согласие конкретное, предметное, информированное и однозначное.'
      )
    );
  } else {
    checks.push(
      makeCheck(
        'consent_document',
        'Отдельное согласие на обработку ПД',
        'warn',
        'Отдельная ссылка на согласие не найдена.',
        'Для форм лучше иметь отдельный текст согласия, а не только ссылку на политику.',
        personalFields.length ? makeFine('consent') : null
      )
    );
  }

  if (analytics.length && !hasCookieMention) {
    checks.push(
      makeCheck(
        'cookie_banner',
        'Cookie-баннер',
        'fail',
        'На странице найдена аналитика, но cookie-уведомление автоматически не обнаружено.',
        'Добавьте cookie-баннер с понятным выбором: согласиться или отказаться.',
        makeFine('unlawfulProcessing', false)
      )
    );
  } else if (hasCookieMention && hasRejectButton && hasAcceptButton) {
    checks.push(
      makeCheck(
        'cookie_banner',
        'Cookie-баннер',
        'pass',
        'Найдены упоминание cookie и кнопки согласия/отказа.',
        'Проверьте, что отказ действительно блокирует необязательные cookies и аналитику.'
      )
    );
  } else if (hasCookieMention) {
    checks.push(
      makeCheck(
        'cookie_banner',
        'Cookie-баннер',
        'warn',
        'Упоминание cookie найдено, но полноценный выбор согласия/отказа не очевиден.',
        'Добавьте отдельные кнопки согласия и отказа, а не только информационный текст.',
        analytics.length ? makeFine('unlawfulProcessing', false) : null
      )
    );
  } else {
    checks.push(
      makeCheck(
        'cookie_banner',
        'Cookie-баннер',
        'warn',
        'Cookie-баннер не найден.',
        'Если сайт использует только технические cookies, это может быть допустимо; для аналитики нужен отдельный контроль.'
      )
    );
  }

  if (analytics.length) {
    checks.push(
      makeCheck(
        'analytics_before_consent',
        'Аналитика до согласия',
        'fail',
        `До действия пользователя обнаружены: ${analytics.map((item) => item.name).join(', ')}.`,
        'Настройте запуск Яндекс.Метрики, Google Analytics и пикселей только после согласия пользователя.',
        makeFine('unlawfulProcessing')
      )
    );
  } else {
    checks.push(
      makeCheck(
        'analytics_before_consent',
        'Аналитика до согласия',
        'pass',
        'До действия пользователя явные запросы популярных систем аналитики не обнаружены.',
        'Проверьте редкие счетчики и рекламные пиксели, если они подключаются через сторонние скрипты.'
      )
    );
  }

  checks.push(
    cookieLinks.length
      ? makeCheck(
          'cookie_document',
          'Документ о cookies',
          'pass',
          `Найдено cookie-ссылок: ${cookieLinks.length}.`,
          'Документ должен описывать категории cookies, цели и способ отказа.'
        )
      : makeCheck(
          'cookie_document',
          'Документ о cookies',
          'warn',
          'Отдельная ссылка на документ о cookies не найдена.',
          'Добавьте страницу или раздел о cookies, если используете аналитику и рекламные пиксели.',
          analytics.length ? makeFine('unlawfulProcessing', false) : null
        )
  );

  const scoredChecks = checks.filter((check) => check.status !== 'info');
  const scoreValue = scoredChecks.reduce((sum, check) => {
    if (check.status === 'pass') return sum + 1;
    if (check.status === 'warn') return sum + 0.5;
    return sum;
  }, 0);
  const score = Math.round((scoreValue / scoredChecks.length) * 100);
  const failCount = checks.filter((check) => check.status === 'fail').length;
  const warnCount = checks.filter((check) => check.status === 'warn').length;
  const fineSummary = buildFineSummary(checks);

  let summary = 'Есть заметные риски по 152-ФЗ. Начните с ошибок, отмеченных красным.';
  if (score >= 80 && failCount === 0) {
    summary = 'Критичных открытых проблем не найдено, но результат не заменяет юридический аудит.';
  } else if (score >= 55) {
    summary = 'Базовые элементы частично есть, но нужны исправления перед спокойным запуском рекламы и форм.';
  }

  return {
    ok: true,
    targetUrl,
    finalUrl: main.finalUrl,
    title: main.info.title,
    checkedAt: new Date().toISOString(),
    elapsedMs,
    score,
    failCount,
    warnCount,
    summary,
    fineSummary,
    checks,
    evidence: {
      documentLinks: uniqBy([...policyLinks, ...consentLinks, ...cookieLinks], (link) => link.href)
        .slice(0, 10)
        .map((link) => ({ text: link.text, href: link.href })),
      formsFound: main.info.forms.length,
      personalFieldsFound: personalFields.length,
      consentFieldsFound: consentFields.length,
      cookies: main.cookies.slice(0, 30),
      analytics
    },
    disclaimer:
      'Это автоматическая проверка открытых признаков сайта, а не юридическое заключение. Штрафы показаны как верхняя оценка риска для юридического лица.'
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/audit152', async (req, res) => {
  const startedAt = Date.now();

  try {
    const targetUrl = normalizeInputUrl(req.body?.url);
    await assertPublicHttpUrl(targetUrl);

    const browser = await getBrowser();
    const main = await inspectMainPage(browser, targetUrl);
    await assertPublicHttpUrl(main.finalUrl);

    const docs = await readDocumentPages(browser, main.info.links || []);
    const report = buildReport(targetUrl, main, docs, Date.now() - startedAt);

    res.json(report);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      ok: false,
      message:
        status === 500
          ? 'Не получилось выполнить автоматическую проверку. Попробуйте позже.'
          : error.message
    });
  }
});

process.on('SIGTERM', async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`152 audit API is running on port ${PORT}`);
});
