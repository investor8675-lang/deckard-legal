/* DECKARD — usedeckard.com, the prelaunch page: the waitlist and the emailed
   links.
   The waitlist half is the long page's (website/site.js, kept at git tag
   website-full-2026-10-09), unchanged in what it asks the server and says. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('That email doesn’t look right.'); input.focus(); return; }
    button.disabled = true;
    say('');
    try {
      const r = await call({ action: 'join', email, consent: true, company: form.company.value });
      if (r.ok) { form.classList.add('done'); say(`Check ${email} to confirm your place in line.`); }
      else if (r.status === 429) say('Too many tries from here. Try again in an hour.');
      else if (r.data.error === 'invalid_email') say('That email doesn’t look right.');
      else say('Something went wrong. Try again in a moment.');
    } catch {
      say('Couldn’t reach DECKARD. Check your connection and try again.');
    } finally {
      button.disabled = false;
    }
  });
  call(null).then((r) => {
    const n = r.ok ? r.data.count : null;
    if (typeof n === 'number' && n >= SHOW_COUNT_FROM) {
      $('#waiting-n').textContent = n.toLocaleString('en-US');
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
      openSheet('Confirming…', '');
      call({ action: 'confirm', token }).then((r) => {
        if (r.ok) openSheet('You’re in.', `Number ${Number(r.data.position).toLocaleString('en-US')} in line. We’ll email you the day DECKARD launches.`);
        else if (r.status === 404) openSheet('This link has expired.', 'Join again and we’ll send a new one.', { label: 'Join again', run: () => { closeSheet(); setTimeout(() => input.focus(), 520); } });
        else openSheet('Something went wrong.', 'Open the link from your email again in a moment.');
      }).catch(() => openSheet('Couldn’t reach DECKARD.', 'Check your connection and open the link again.'));
    } else {
      openSheet('Leave the waitlist?', 'Your address will be deleted.', {
        label: 'Remove',
        run: () => call({ action: 'remove', token }).then((r) => {
          openSheet(r.ok ? 'Removed.' : 'Something went wrong.', r.ok ? 'Your address is deleted. You won’t hear from us.' : 'Open the link from your email again in a moment.');
        }).catch(() => openSheet('Couldn’t reach DECKARD.', 'Check your connection and try again.')),
      });
    }
  }
})();
