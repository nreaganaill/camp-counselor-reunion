/* Edit your scrapbook page · talks to the scrapbook edit API (contract v1.5).
   The login key lives only in the variable KEY below: never in the URL, storage or logs. */
(function () {
  'use strict';

  var RELAY = 'https://script.google.com/macros/s/AKfycbw7hODgIjGUUbITk-RQIy-16v0zi3KjvlFN0B8wHvKo1OudVWqFOaAcglN8M-_NIytAtg/exec'; // REAL relay (same as site/intake/), set 2026-11-28 on the conductor's order
  var keptRegion = '';

  var LABELS = [
    ['Therapists & Healers', '#BC6A37'], ['Coaches & Leaders', '#37524F'], ['Circles & Relating', '#494E74'], ['Spirit & Ceremony', '#A8286B'],
    ['Community & Commune Life', '#7C522E'], ['Music, Art & Play', '#5764A6'], ['AI, Tech & Business', '#37524F'], ['Family & Parenting', '#BC6A37']
  ];
  var KINDS = [
    ['instagram', 'Instagram', 'IG', 'linear-gradient(135deg,#F58529,#DD2A7B,#515BD4)'], ['linkedin', 'LinkedIn', 'IN', '#494E74'],
    ['facebook', 'Facebook', 'FB', '#5764A6'], ['website', 'Website', 'WEB', '#37524F'], ['project', 'Project', 'PRJ', '#BC6A37'],
    ['other', 'Other link', 'LINK', '#7C522E'], ['ask', 'Ask me (no link)', 'ASK', '#A8286B']
  ];
  var DEFAULTS = { front_line: 50, ask_me_about: 32, bio: 900, cta: 28, links: 6, labels_max: 3 };

  var KEY = null, page = null, limits = {}, contact = { email: '', phone_last4: '' };
  var version = 0, links = [], labels = [], gifts = [], customBadges = [], photoThumb = null;
  var useForReg = null, saving = false;

  var $ = function (id) { return document.getElementById(id); };
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k]; else if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function lim(name) { var v = limits && limits[name]; return typeof v === 'number' && v > 0 ? v : DEFAULTS[name]; }

  /* ── relay ── */
  function post(body, ms) {
    body.v = 1;
    return new Promise(function (resolve) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; resolve({ ok: false, error: 'timeout' }); } }, ms || 30000);
      fetch(RELAY, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', credentials: 'omit', cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!done) { done = true; clearTimeout(t); resolve(j && typeof j === 'object' ? j : { ok: false, error: 'server' }); } })
        .catch(function () { if (!done) { done = true; clearTimeout(t); resolve({ ok: false, error: 'network' }); } });
    });
  }
  var GENERIC = {
    network: "We couldn't reach the scrapbook. Check your connection and try again.",
    timeout: 'That took too long. Try again in a minute.',
    server: 'Something went wrong. Try again in a minute.',
    closed: 'The scrapbook is closed for now.',
    busy: 'Too many tries. Please wait a few minutes.',
    bad_key: 'Something went wrong. Start again with your email.',
    too_long: "That's too long. Please shorten it.",
    bad_input: "That doesn't look right. Please check it and try again."
  };

  /* ── screens ── */
  function show(id) {
    ['s-email', 's-edit', 's-preview'].forEach(function (s) { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  function setErr(id, text) { var e = $(id); e.textContent = text || ''; e.hidden = !text; }
  function clearErrors() {
    ['e-labels', 'e-front_line', 'e-ask_me_about', 'e-bio', 'e-links', 'e-contact-email', 'e-contact-phone'].forEach(function (i) { setErr(i, ''); });
    document.querySelectorAll('.msg-slot').forEach(function (s) { s.textContent = ''; });
  }

  /* ── open ── */
  function openByEmail(ev) {
    ev.preventDefault();
    var email = $('em').value.trim();
    $('nf').hidden = true;
    setErr('e-email', '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr('e-email', "That doesn't look like an email."); return; }
    var b = $('b-open'); b.disabled = true;
    post({ action: 'scrapbook_open', email: email }).then(function (r) {
      b.disabled = false;
      if (r.ok && r.found) { KEY = r.key; fill(r); show('s-edit'); }
      else if (r.ok) $('nf').hidden = false;
      else if (r.error === 'bad_input') setErr('e-email', "That doesn't look like an email.");
      else if (r.error === 'busy') setErr('e-email', 'Too many tries. Please wait a few minutes.');
      else setErr('e-email', GENERIC[r.error] || GENERIC.server);
    });
  }
  function openByKey(k) {
    $('b-open').disabled = true;
    post({ action: 'scrapbook_load', key: k }).then(function (r) {
      $('b-open').disabled = false;
      if (r.ok && r.page) { KEY = k; fill(r); show('s-edit'); }
      else setErr('e-email', r.error === 'bad_key' ? 'That saved link no longer works. Open your page with your email instead.' : (GENERIC[r.error] || GENERIC.server));
    });
  }

  /* ── fill the page from a reply ── */
  function fill(r) {
    page = r.page || {}; limits = r.limits || {}; contact = r.contact || { email: '', phone_last4: '' };
    var p = page.pending ? Object.assign({}, page, page.pending) : page;
    version = page.version || 0;
    $('nm').textContent = page.display || '';
    $('pv-nm').textContent = page.display || '';
    photoThumb = page.photo && page.photo.thumb ? page.photo.thumb : null;
    drawPhoto();
    labels = (p.labels || []).filter(function (l) { return LABELS.some(function (x) { return x[0] === l; }); }).slice(0, lim('labels_max'));
    gifts = (p.gifts || page.gifts || []).map(function (g) { return typeof g === 'object' ? g.id : g; });
    customBadges = p.custom_badges || page.custom_badges || [];
    links = (p.links || []).map(function (l) { return { kind: l.kind, label: l.label || '', url: l.url || '', orig: l.url || '', cta: l.cta || '' }; });
    setText('front_line', p.front_line, 'front_line');
    setText('ask_me_about', p.ask_me_about, 'ask_me_about');
    keptRegion = p.home_region || ''; // home region is not editable for now (his call 2026-11-28); sent back unchanged so a save never clears it
    setText('bio', p.bio, 'bio');
    $('c-email').value = contact.email || '';
    $('c-phone').value = '';
    var ph = $('phone-on-file');
    ph.hidden = !contact.phone_last4;
    ph.textContent = contact.phone_last4 ? 'Phone ending ' + contact.phone_last4 : '';
    useForReg = null; syncConfirm();
    renderLabels(); renderLinks(); clearErrors();
  }
  function setText(id, val, limName) {
    var el = $(id); el.value = val || ''; el.maxLength = lim(limName); count(id);
  }
  function count(id) {
    var el = $(id), c = $('c-' + id), max = lim(id === 'bio' ? 'bio' : id);
    c.textContent = el.value.length + '/' + max; c.classList.toggle('full', el.value.length >= max);
  }
  function drawPhoto() {
    var img = $('ava-img'), pv = $('pv-img');
    [img, pv].forEach(function (i) {
      if (photoThumb) { i.src = 'data:image/jpeg;base64,' + photoThumb; i.hidden = false; } else { i.removeAttribute('src'); i.hidden = true; }
    });
  }

  /* ── labels ── */
  function renderLabels() {
    var box = $('labels'); box.textContent = '';
    var max = lim('labels_max');
    LABELS.forEach(function (l) {
      var on = labels.indexOf(l[0]) >= 0;
      var b = h('button', { type: 'button', class: 'lb' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', text: l[0] });
      b.style.setProperty('--c', l[1]);
      if (!on && labels.length >= max) b.disabled = true;
      b.addEventListener('click', function () {
        var i = labels.indexOf(l[0]);
        if (i >= 0) labels.splice(i, 1); else if (labels.length < max) labels.push(l[0]);
        setErr('e-labels', ''); renderLabels();
        var again = $('labels').querySelectorAll('button')[LABELS.indexOf(l)]; if (again && !again.disabled) again.focus();
      });
      box.appendChild(b);
    });
  }

  /* ── links ── */
  function kindInfo(k) { return KINDS.filter(function (x) { return x[0] === k; })[0] || KINDS[5]; }
  function renderLinks() {
    var box = $('links'); box.textContent = '';
    links.forEach(function (l, i) {
      var info = kindInfo(l.kind);
      var sel = h('select', { 'aria-label': 'Link type' });
      KINDS.forEach(function (k) { var o = h('option', { value: k[0], text: k[1] }); if (k[0] === l.kind) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { links[i].kind = sel.value; if (sel.value === 'ask') links[i].url = ''; renderLinks(); });
      var ic = h('div', { class: 'ic' }, [h('span', { text: info[2] }), sel]); ic.style.background = info[3];
      var row = h('div', { class: 'row' }, [ic]);
      if (l.kind === 'ask') row.appendChild(h('div', { class: 'noset', text: 'No link: ask me in person' }));
      else {
        var u = h('input', { class: 'inp', type: 'url', inputmode: 'url', autocapitalize: 'off', spellcheck: 'false', placeholder: 'https://', 'aria-label': 'Link address' });
        u.value = l.url; u.addEventListener('input', function () { links[i].url = u.value; });
        row.appendChild(u);
      }
      var rm = h('button', { type: 'button', class: 'rm', 'aria-label': 'Remove this link', text: '×' });
      rm.addEventListener('click', function () { links.splice(i, 1); setErr('e-links', ''); renderLinks(); $('b-addlink').focus(); });
      row.appendChild(rm);
      var cta = h('input', { class: 'inp cta', type: 'text', maxlength: String(lim('cta')), autocomplete: 'off', placeholder: 'What should it say? (e.g. Follow my maps)', 'aria-label': 'Button words' });
      cta.value = l.cta;
      var cnt = h('b', { text: l.cta.length + '/' + lim('cta') });
      cta.addEventListener('input', function () { links[i].cta = cta.value; cnt.textContent = cta.value.length + '/' + lim('cta'); });
      var wrap = h('div', { class: 'lt' + (l.kind === 'ask' ? ' ask' : '') }, [row, cta, h('div', { class: 'cnt' }, [h('span'), cnt])]);
      box.appendChild(wrap);
    });
    var add = $('b-addlink'), max = lim('links');
    add.disabled = links.length >= max;
    add.textContent = links.length >= max ? 'That’s all ' + max + ' links' : '+ Add a link or an “ask me” (' + links.length + ' of ' + max + ' used)';
  }

  /* ── contact ── */
  function emailChanged() {
    var v = $('c-email').value.trim().toLowerCase();
    return !!v && v !== String(contact.email || '').toLowerCase();
  }
  function syncConfirm() {
    var show = emailChanged();
    $('confirm').hidden = !show;
    if (!show) useForReg = null;
    $('yn-yes').setAttribute('aria-pressed', useForReg === true ? 'true' : 'false');
    $('yn-no').setAttribute('aria-pressed', useForReg === false ? 'true' : 'false');
  }

  /* ── save ── */
  function collect() {
    var out = {
      page: {
        front_line: $('front_line').value.trim(), bio: $('bio').value.trim(), ask_me_about: $('ask_me_about').value.trim(), home_region: keptRegion,
        gifts: gifts, custom_badges: customBadges, labels: labels.slice(),
        links: links.map(function (l) {
          var cta = l.cta.trim();
          var url = l.kind === 'ask' ? '' : l.url.trim();
          return { kind: l.kind, label: deriveLabel(l, url), url: url, cta: cta };
        })
      }
    };
    var c = {};
    if (emailChanged()) { c.email = $('c-email').value.trim(); c.use_for_registration = useForReg === true; }
    var ph = $('c-phone').value.replace(/[^0-9+\s().\-]/g, '').trim();
    if (ph) { c.phone = ph; if (c.use_for_registration === undefined) c.use_for_registration = false; }
    if (Object.keys(c).length) out.contact = c;
    return out;
  }
  /* label = short domain or @handle (board shows "{Platform} · {label}"); kept as loaded if the url is unchanged */
  function deriveLabel(l, url) {
    if (l.kind === 'ask' || !url) return '';
    if (l.label && l.orig === url) return l.label;
    var u;
    try { u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url); } catch (e) { return ''; }
    var host = u.hostname.replace(/^www\./i, '');
    if (/^(instagram|tiktok|twitter|x|threads|youtube|facebook|linkedin)\.com$|^youtu\.be$/i.test(host)) {
      var seg = u.pathname.split('/').filter(Boolean).filter(function (x) { return !/^(in|company|pages|profile\.php)$/i.test(x); })[0];
      if (seg) return (seg.charAt(0) === '@' ? seg : '@' + seg).slice(0, 40);
    }
    return host;
  }
  function slot() { return $('s-preview').hidden ? $('slot-edit') : $('slot-preview'); }
  function say(kind, text, withReload) {
    var s = slot(); s.textContent = '';
    var m = h('div', { class: 'msg ' + kind, role: kind === 'bad' ? 'alert' : 'status', text: text });
    if (withReload) {
      var b = h('button', { type: 'button', class: 'btn', text: 'Reload' });
      b.addEventListener('click', function () { reload(); });
      m.appendChild(b);
    }
    s.appendChild(m);
    if (!$('s-preview').hidden || kind !== 'ok') m.scrollIntoView({ block: 'nearest' });
  }
  function plainWords() {
    return [($('front_line').value || ''), ($('ask_me_about').value || ''), ($('bio').value || '')].join('\n');
  }
  function copyText(text) {
    function fallback() {
      var ta = h('textarea', { 'aria-hidden': 'true', tabindex: '-1' });
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      ta.value = text; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }
  function sayStale() {
    var s = slot(); s.textContent = '';
    var m = h('div', { class: 'msg bad', role: 'alert', text: 'Your page changed somewhere else. Reload and lose these edits, or keep editing?' });
    var row = h('div', { class: 'row2' });
    var b1 = h('button', { type: 'button', class: 'btn', text: 'Reload' });
    b1.addEventListener('click', function () { reload(); });
    var b2 = h('button', { type: 'button', class: 'btn ghost', text: 'Keep editing' });
    b2.addEventListener('click', function () { s.textContent = ''; show('s-edit'); });
    var b3 = h('button', { type: 'button', class: 'btn ghost', text: 'Copy my words' });
    b3.addEventListener('click', function () {
      copyText(plainWords()).then(function (ok) { b3.textContent = ok ? 'Copied' : "Couldn't copy"; });
    });
    row.appendChild(b1); row.appendChild(b2); row.appendChild(b3);
    m.appendChild(row); s.appendChild(m);
    m.scrollIntoView({ block: 'nearest' });
  }
  function reload() {
    if (!KEY) { location.reload(); return; }
    post({ action: 'scrapbook_load', key: KEY }).then(function (r) {
      if (r.ok && r.page) { fill(r); show('s-edit'); say('ok', 'Reloaded. This is the newest version.'); }
      else say('bad', GENERIC[r.error] || GENERIC.server);
    });
  }
  function save() {
    if (saving) return;
    clearErrors();
    if (emailChanged() && useForReg === null) { setErr('e-contact-email', 'Choose Yes or No above.'); show('s-edit'); $('confirm').scrollIntoView({ block: 'center' }); return; }
    var body = collect();
    body.action = 'scrapbook_save'; body.key = KEY; body.base_version = version;
    saving = true; $('b-save').disabled = true; $('b-save2').disabled = true;
    post(body).then(function (r) {
      saving = false; $('b-save').disabled = false; $('b-save2').disabled = false;
      if (r.ok) {
        if (typeof r.version === 'number') version = r.version;
        if (body.contact) {
          if (body.contact.email && body.contact.use_for_registration) contact.email = body.contact.email;
          if (body.contact.phone) { var d = body.contact.phone.replace(/\D/g, ''); contact.phone_last4 = d.slice(-4); $('phone-on-file').textContent = 'Phone ending ' + contact.phone_last4; $('phone-on-file').hidden = false; $('c-phone').value = ''; }
          if (body.contact.email && !body.contact.use_for_registration) { /* page-only email: keep showing the main one */ $('c-email').value = contact.email || ''; }
          useForReg = null; syncConfirm();
        }
        say('ok', "Thank you! We've got your changes. Your page updates within a few minutes online, and on the camp TV at its next refresh.");
        return;
      }
      if (r.error === 'stale') { sayStale(); return; }
      if (r.error === 'busy') { say('bad', 'Lots of people are saving right now. Tap Save again in a few seconds.'); return; }
      if (r.error === 'bad_input' || r.error === 'too_long') {
        var f = r.field, id = { front_line: 'e-front_line', ask_me_about: 'e-ask_me_about', bio: 'e-bio', labels: 'e-labels', links: 'e-links', 'contact.email': 'e-contact-email', 'contact.phone': 'e-contact-phone' }[f];
        var msg = fieldMessage(f, r.error);
        if (id) { show('s-edit'); setErr(id, msg); $(id).scrollIntoView({ block: 'center' }); return; }
        say('bad', msg); return;
      }
      say('bad', GENERIC[r.error] || GENERIC.server);
    });
  }
  function fieldMessage(f, err) {
    if (err === 'too_long') return "That's too long. Please shorten it.";
    if (f === 'labels') return 'Pick 1 to 3 labels.';
    if (f === 'links') return 'Each link needs a full address starting with https://. An "ask me" needs no address, just the words.';
    if (f === 'contact.email') return "That email doesn't work. Check it, or it may already be in use.";
    if (f === 'contact.phone') return "That phone number doesn't look right. Include the country code if it's outside the US.";
    return 'Keep contact details off your page. Put them in Your contact details instead.';
  }

  /* ── preview ── */
  function openPreview() {
    $('pv-line').textContent = $('front_line').value.trim();
    var d = $('pv-dots'); d.textContent = '';
    labels.forEach(function (l) {
      var c = (LABELS.filter(function (x) { return x[0] === l; })[0] || [0, '#BC6A37'])[1];
      var i = h('i', { title: l }); i.style.setProperty('--c', c); d.appendChild(i);
    });
    $('slot-preview').textContent = '';
    show('s-preview');
  }

  /* ── photo (same browser-side resize as the intake form; goes live at once) ── */
  var PHOTO = {
    master: { long: 2048, q: [0.85, 0.7, 0.6], cap: 2000000 },
    card: { w: 800, h: 1000, q: [0.8, 0.7, 0.6], cap: 300000 },
    thumb: { side: 240, q: [0.7, 0.5], cap: 45000 }
  };
  function cropRect(w, hh, aspect) {
    var sw, sh, sx, sy;
    if (w / hh > aspect) { sh = hh; sw = hh * aspect; sx = (w - sw) / 2; sy = 0; } else { sw = w; sh = w / aspect; sx = 0; sy = (hh - sh) * 0.25; }
    return { sx: Math.round(sx), sy: Math.round(sy), sw: Math.round(sw), sh: Math.round(sh) };
  }
  function planPhoto(w, hh) {
    var m = Math.min(1, PHOTO.master.long / Math.max(w, hh));
    var card = cropRect(w, hh, PHOTO.card.w / PHOTO.card.h), c = Math.min(1, PHOTO.card.w / card.sw);
    return {
      master: { w: Math.round(w * m), h: Math.round(hh * m) },
      card: { crop: card, w: Math.round(card.sw * c), h: Math.round(card.sh * c) },
      thumb: { crop: cropRect(w, hh, 1), w: PHOTO.thumb.side, h: PHOTO.thumb.side }
    };
  }
  function encodeCapped(encode, qs, cap) {
    for (var i = 0; i < qs.length; i++) { var d = encode(qs[i]); if (d && d.length <= cap) return { data: d, q: qs[i] }; }
    return null;
  }
  function b64(u) { return String(u).replace(/^data:[^,]+,/, ''); }
  function canvas(w, hh) { var c = document.createElement('canvas'); c.width = w; c.height = hh; return c; }
  function imgTag(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('bad_photo')); };
      img.src = url;
    });
  }
  function loadImage(file) {
    if (window.createImageBitmap) return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return imgTag(file); });
    return imgTag(file);
  }
  function shrinkPhoto(file) {
    return loadImage(file).then(function (img) {
      var w = img.naturalWidth || img.width, hh = img.naturalHeight || img.height;
      if (!w || !hh) throw new Error('bad_photo');
      var plan = planPhoto(w, hh);
      function draw(out, crop) {
        var c = canvas(out.w, out.h), ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        if (crop) ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, out.w, out.h); else ctx.drawImage(img, 0, 0, out.w, out.h);
        return function (q) { return b64(c.toDataURL('image/jpeg', q)); };
      }
      var master = encodeCapped(draw(plan.master), PHOTO.master.q, PHOTO.master.cap);
      var card = encodeCapped(draw(plan.card, plan.card.crop), PHOTO.card.q, PHOTO.card.cap);
      var thumb = encodeCapped(draw(plan.thumb, plan.thumb.crop), PHOTO.thumb.q, PHOTO.thumb.cap);
      if (img.close) img.close();
      if (!master) throw new Error('too_big');
      return { type: 'image/jpeg', data: master.data, card: card ? card.data : null, thumb: thumb ? thumb.data : null, w: plan.master.w, h: plan.master.h };
    }, function () { throw new Error('bad_photo'); });
  }
  function photoId() {
    var c = '', out = 'ph_', b = null;
    for (var k = 0; k < 62; k++) c += String.fromCharCode(k < 26 ? 65 + k : k < 52 ? 71 + k : k - 4);
    try { b = crypto.getRandomValues(new Uint8Array(20)); } catch (e) {}
    for (var i = 0; i < 20; i++) out += c[(b ? b[i] : Math.floor(Math.random() * 256)) % 62];
    return out;
  }
  function photoMsg(text, bad) { var m = $('photo-msg'); m.textContent = text || ''; m.className = 'photo-msg' + (bad ? ' bad' : ''); }
  function pickPhoto(file) {
    if (!file) return;
    photoMsg('Getting your photo ready…');
    shrinkPhoto(file).then(function (photo) {
      photo.id = photoId();
      var n = 0, waits = [1500, 4000];
      photoMsg('Saving your photo…');
      function attempt() {
        n++;
        return post({ action: 'save_photo', key: KEY, photo: photo }, 90000).then(function (r) {
          if (r.ok) { photoThumb = photo.thumb; drawPhoto(); photoMsg('Photo saved. It is live now.'); return; }
          if (['network', 'timeout', 'busy', 'server'].indexOf(r.error) >= 0 && n < 3) {
            photoMsg('Trying again…');
            return new Promise(function (ok) { setTimeout(ok, waits[n - 1]); }).then(attempt);
          }
          photoMsg(r.error === 'too_big' ? 'That photo is too big. Try another.' : r.error === 'bad_photo' ? "That photo didn't work. Try another." : (GENERIC[r.error] || GENERIC.server), true);
        });
      }
      return attempt();
    }).catch(function (e) {
      photoMsg(e && e.message === 'too_big' ? 'That photo is too big. Try another.' : "That photo didn't work. Try another.", true);
    });
  }

  /* ── wire up ── */
  $('f-email').addEventListener('submit', openByEmail);
  ['front_line', 'ask_me_about', 'bio'].forEach(function (id) {
    $(id).addEventListener('input', function () { count(id); setErr('e-' + id, ''); });
  });
  $('b-addlink').addEventListener('click', function () {
    if (links.length >= lim('links')) return;
    links.push({ kind: 'website', label: '', url: '', cta: '' }); renderLinks();
    var rows = $('links').querySelectorAll('.lt'); var last = rows[rows.length - 1];
    var inp = last && last.querySelector('input'); if (inp) inp.focus();
  });
  $('c-email').addEventListener('input', function () { syncConfirm(); setErr('e-contact-email', ''); });
  $('c-phone').addEventListener('input', function () {
    var el = $('c-phone'), v = el.value.replace(/[^0-9+\s().\-]/g, ''); if (v !== el.value) el.value = v; setErr('e-contact-phone', '');
  });
  $('yn-yes').addEventListener('click', function () { useForReg = true; setErr('e-contact-email', ''); syncConfirm(); });
  $('yn-no').addEventListener('click', function () { useForReg = false; setErr('e-contact-email', ''); syncConfirm(); });
  $('b-photo').addEventListener('click', function () { $('file').click(); });
  $('file').addEventListener('change', function (e) { pickPhoto(e.target.files && e.target.files[0]); e.target.value = ''; });
  $('b-preview').addEventListener('click', openPreview);
  $('b-back').addEventListener('click', function () { show('s-edit'); });
  $('b-save').addEventListener('click', save);
  $('b-save2').addEventListener('click', save);

  if (/\bFBA[NV]\/|FBIOS|Instagram|WhatsApp/i.test(navigator.userAgent || '')) { $('inapp').hidden = false; }
  window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });

  /* a saved form link (?k=): read once, strip it from the address bar, then load */
  (function () {
    var k = null;
    try { k = new URLSearchParams(location.search).get('k'); } catch (e) {}
    if (location.search || location.hash) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
    if (k && /^k_[A-Za-z0-9]{32}$/.test(k)) openByKey(k);
  })();
})();
