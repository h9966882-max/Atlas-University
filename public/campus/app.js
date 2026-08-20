(() => {
  'use strict';

  const TOKYO_TZ = 'Asia/Tokyo';
  const STORAGE = {
    visited: 'atlas-campus-visited-v1',
    theme: 'atlas-campus-theme-v1',
  };

  const notion = {
    dashboard: 'https://app.notion.com/p/3b3c70c3c0768182821cd34014f6745a',
  };

  const campusEvents = [
    { date: '2026-08-29', title: '第2回オープンキャンパス', note: '開校前に、もう一度キャンパスを歩く日。' },
    { date: '2026-09-01', title: 'Atlas大学 開校', note: '大学を創るから、大学へ通うへ。' },
    { date: '2026-09-05', title: '最初の自由登校日', note: '講義がなくても、大学へ来ていい日。' },
    { date: '2026-09-14', title: 'Atlas図書館 開架週間', note: '9月14日から20日まで。' },
    { date: '2026-09-19', title: 'いつも選ばない棚散歩', note: '普段は手に取らない棚へ。' },
    { date: '2026-09-22', title: '夕方キャンパス', note: '昼とは少し違う大学を歩く。' },
    { date: '2026-09-26', title: '秋のキャンパス散歩', note: '秋の気配を見つける日。' },
    { date: '2026-09-30', title: 'September Compass', note: '9月の問いと理解を次の月へ。' },
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }

  function tokyoDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('ja-JP', {
      timeZone: TOKYO_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(date);

    return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  }

  function tokyoIsoDate(date = new Date()) {
    const p = tokyoDateParts(date);
    return `${p.year}-${p.month}-${p.day}`;
  }

  function renderDateAndGreeting() {
    const p = tokyoDateParts();
    const hour = Number(p.hour);
    const greeting = hour < 5 ? '夜の大学へようこそ' : hour < 11 ? 'おはよう' : hour < 17 ? 'こんにちは' : 'こんばんは';

    $('#campus-date').textContent = `${p.year}年${Number(p.month)}月${Number(p.day)}日 ${p.weekday}`;
    $('#campus-greeting').textContent = greeting;
  }

  function renderNextEvent() {
    const today = tokyoIsoDate();
    const next = campusEvents.find((event) => event.date >= today);

    if (!next) return;

    const [year, month, day] = next.date.split('-').map(Number);
    const weekday = new Intl.DateTimeFormat('ja-JP', { weekday: 'short', timeZone: TOKYO_TZ })
      .format(new Date(`${next.date}T12:00:00+09:00`));

    $('#next-event-title').textContent = next.title;
    $('#next-event-date').textContent = `${year}年${month}月${day}日（${weekday}）`;
    $('#next-event-note').textContent = next.note;
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

    root.dataset.theme = resolved;
    root.dataset.themePreference = theme;
    $('#theme-icon').textContent = theme === 'light' ? '☀︎' : theme === 'dark' ? '☾' : '◐';
    $('#theme-toggle').setAttribute('aria-label', `表示テーマ：${theme === 'light' ? 'ライト' : theme === 'dark' ? 'ダーク' : '端末設定'}。切り替える`);
  }

  function setupTheme() {
    const saved = safeGet(STORAGE.theme) || 'system';
    applyTheme(saved);

    $('#theme-toggle').addEventListener('click', () => {
      const current = document.documentElement.dataset.themePreference || 'system';
      const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
      safeSet(STORAGE.theme, next);
      applyTheme(next);
      showToast(`表示テーマ：${next === 'light' ? 'ライト' : next === 'dark' ? 'ダーク' : '端末設定'}`);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if ((document.documentElement.dataset.themePreference || 'system') === 'system') applyTheme('system');
    });
  }

  function setupEnterCampus() {
    const button = $('#enter-campus');
    const visited = safeGet(STORAGE.visited) === 'yes';
    button.textContent = visited ? '今日も大学へ' : 'ENTER CAMPUS';

    button.addEventListener('click', () => {
      safeSet(STORAGE.visited, 'yes');
      button.textContent = '今日も大学へ';
      $('#today').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function validateResumeSnapshot() {
    const card = $('#resume-card');
    const today = tokyoIsoDate();
    const validUntil = card.dataset.validUntil;
    const isStale = today > validUntil;

    if (!isStale) return;

    card.classList.add('is-stale');
    $('#resume-detail').hidden = true;
    $('#snapshot-warning').hidden = false;
    $('#snapshot-label').textContent = `確認期限：${validUntil}`;

    const primary = $('#resume-primary');
    primary.href = notion.dashboard;
    primary.textContent = 'Student Dashboardで確認';
    $('#copy-resume').hidden = true;
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }

  function setupCopy() {
    const button = $('#copy-resume');
    button.addEventListener('click', async () => {
      const ok = await copyText(button.dataset.copy || '');
      showToast(ok ? '「FP101-02の続きから！」をコピーしました' : 'コピーできませんでした');
    });
  }

  function setupActiveNavigation() {
    const navLinks = new Map($$('.bottom-nav a').map((link) => [link.dataset.nav, link]));
    const sections = ['home', 'learn', 'campus', 'library', 'life']
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const update = (id) => {
      navLinks.forEach((link, key) => {
        if (key === id) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    };

    update('home');

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) update(visible.target.id);
    }, { rootMargin: '-32% 0px -52% 0px', threshold: [0.05, 0.25, 0.55] });

    sections.forEach((section) => observer.observe(section));
  }

  function setupInternalLinks() {
    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', link.getAttribute('href'));
      });
    });
  }

  function init() {
    renderDateAndGreeting();
    renderNextEvent();
    setupTheme();
    setupEnterCampus();
    validateResumeSnapshot();
    setupCopy();
    setupActiveNavigation();
    setupInternalLinks();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
