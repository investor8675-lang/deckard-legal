/* DECKARD — usedeckard.com, the prelaunch page: the waitlist and the emailed
   links.
   The waitlist half is the long page's (website/site.js, kept at git tag
   website-full-2026-10-09), unchanged in what it asks the server and says. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);

  /* ====================================================== LANGUAGE === */
  // A language page (/es/, /latam/, /de/, /fr/, /it/, /br/) carries its words
  // as JSON (scripts/website-langs/build.mjs); the English page carries none.
  const EN = {
    badEmail: 'That email doesn’t look right.',
    check: 'Check {email} to confirm your place in line.',
    tooMany: 'Too many tries from here. Try again in an hour.',
    wrongTryAgain: 'Something went wrong. Try again in a moment.',
    offline: 'Couldn’t reach DECKARD. Check your connection and try again.',
    waiting: '{n} people are waiting.',
    confirming: 'Confirming…',
    youreIn: 'You’re in.',
    position: 'Number {n} in line. We’ll email you the day DECKARD launches.',
    expired: 'This link has expired.',
    expiredLine: 'Join again and we’ll send a new one.',
    joinAgain: 'Join again',
    wrong: 'Something went wrong.',
    reopen: 'Open the link from your email again in a moment.',
    unreachable: 'Couldn’t reach DECKARD.',
    unreachableLink: 'Check your connection and open the link again.',
    unreachableTry: 'Check your connection and try again.',
    leave: 'Leave the waitlist?',
    leaveLine: 'Your address will be deleted.',
    remove: 'Remove',
    removed: 'Removed.',
    removedLine: 'Your address is deleted. You won’t hear from us.',
  };
  let L = EN;
  try { const t = $('#t'); if (t) L = { ...EN, ...JSON.parse(t.textContent) }; } catch { /* English */ }
  const LANG = document.documentElement.dataset.lang || 'en';
  const LOCALE = document.documentElement.dataset.locale || 'en-US';
  const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  // The footer's language menu: the choice is remembered, so the English
  // page stops sending this browser to its own language.
  const menu = $('#lang');
  if (menu) menu.addEventListener('change', () => {
    try { localStorage.setItem('deckard-lang', menu.value); } catch { /* private mode */ }
    location.href = menu.selectedOptions[0].dataset.href;
  });

  /* ======================================================= WAITLIST === */
  // The live count is the real number of confirmed sign-ups, shown only once
  // it reaches SHOW_COUNT_FROM: below that a count reads as nobody here.
  const WAITLIST = 'https://qlsidnowsqpfovdvyhog.supabase.co/functions/v1/waitlist';
  const SHOW_COUNT_FROM = 500;
  const form = $('#signup'), input = $('#email'), button = $('button[type="submit"]', form), status = $('#status');
  async function call(body) {
    const res = await fetch(WAITLIST, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    let data = {};
    try { data = await res.json(); } catch { /* empty */ }
    return { ok: res.ok, status: res.status, data };
  }
  const say = (t) => { status.textContent = t; };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say(L.badEmail); input.focus(); return; }
    button.disabled = true;
    say('');
    try {
      const r = await call({ action: 'join', email, consent: true, company: form.hp.value, lang: LANG });
      if (r.ok) { form.classList.add('done'); say(fill(L.check, { email })); }
      else if (r.status === 429) say(L.tooMany);
      else if (r.data.error === 'invalid_email') say(L.badEmail);
      else say(L.wrongTryAgain);
    } catch {
      say(L.offline);
    } finally {
      button.disabled = false;
    }
  });
  call(null).then((r) => {
    const n = r.ok ? r.data.count : null;
    if (typeof n === 'number' && n >= SHOW_COUNT_FROM) {
      const [before, after = ''] = L.waiting.split('{n}');
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = n.toLocaleString(LOCALE);
      $('#waiting').replaceChildren(before, num, after);
      $('#waiting').hidden = false;
    }
  }).catch(() => {});

  // The emailed link opens the page with ?confirm= or ?remove=; the page, not
  // the link, tells the server, so a mail scanner fetching it confirms nothing.
  const sheet = $('#sheet');
  const sheetIn = $('.sheet-in', sheet);
  sheetIn.tabIndex = -1;
  const sheetTitle = $('#sheet-title'), sheetLine = $('#sheet-line'), sheetGo = $('#sheet-go'), sheetClose = $('#sheet-close');
  function openSheet(title, line, go) {
    sheetTitle.textContent = title;
    sheetLine.textContent = line;
    sheetGo.hidden = !go;
    if (go) { sheetGo.textContent = go.label; sheetGo.onclick = go.run; }
    sheet.hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(() => sheet.classList.add('in'));
    // the sheet takes focus, not its button: a button focused before anyone
    // has touched the page is drawn with its focus ring
    sheetIn.focus({ preventScroll: true });
  }
  function closeSheet() {
    sheet.classList.remove('in');
    document.body.classList.remove('locked');
    setTimeout(() => { sheet.hidden = true; }, 500);
  }
  sheetClose.addEventListener('click', closeSheet);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
  const qs = new URLSearchParams(location.search);
  const token = qs.get('confirm') || qs.get('remove');
  if (token) {
    history.replaceState(null, '', location.pathname);
    if (qs.get('confirm')) {
      openSheet(L.confirming, '');
      call({ action: 'confirm', token }).then((r) => {
        if (r.ok) openSheet(L.youreIn, fill(L.position, { n: Number(r.data.position).toLocaleString(LOCALE) }));
        else if (r.status === 404) openSheet(L.expired, L.expiredLine, { label: L.joinAgain, run: () => { closeSheet(); setTimeout(() => input.focus(), 520); } });
        else openSheet(L.wrong, L.reopen);
      }).catch(() => openSheet(L.unreachable, L.unreachableLink));
    } else {
      openSheet(L.leave, L.leaveLine, {
        label: L.remove,
        run: () => call({ action: 'remove', token }).then((r) => {
          openSheet(r.ok ? L.removed : L.wrong, r.ok ? L.removedLine : L.reopen);
        }).catch(() => openSheet(L.unreachable, L.unreachableTry)),
      });
    }
  }
})();
