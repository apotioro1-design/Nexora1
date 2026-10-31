/* =============================================================
   Nexora — script.js
   -------------------------------------------------------------
   EDIT THIS BLOCK to connect your real business details.
   Everything else on the site reads from here. Leave a value as
   '' (empty) until you have it; the site handles each case
   honestly instead of showing a broken button.
   ============================================================= */
const SITE_CONFIG = {
  // Public contact email
  contactEmail: 'hello@nexoravoice.com',

  // Booking page
  schedulingUrl: '',

  // Live demo phone line
  demoPhoneNumber: '',

  // Recorded sample call
  demoAudioUrl: 'riverbend-demo.mp3',

  // Formspree endpoint
  formEndpoint: 'https://formspree.io/f/xkjjvlra'
};

/* ============================================================= */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cfg = SITE_CONFIG;

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Contact email ---------- */
  if (cfg.contactEmail) {
    $$('[data-email-link]').forEach(a => {
      a.href = 'mailto:' + cfg.contactEmail;
      a.textContent = cfg.contactEmail;
    });
  }

  /* ---------- Booking links ---------- */
  if (cfg.schedulingUrl) {
    $$('[data-book], [data-book-direct]').forEach(a => {
      a.href = cfg.schedulingUrl;
      a.target = '_blank';
      a.rel = 'noopener';
    });
    const alt = $('[data-schedule-alt]');
    if (alt) alt.hidden = false;
  }

  /* ---------- "Discuss This Package" → prefill form ---------- */
  $$('[data-plan]').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = $('#f-message');
      if (!msg) return;
      const line = 'I would like to discuss the ' + btn.dataset.plan + ' package.';
      if (!msg.value.includes(line)) msg.value = msg.value ? line + '\n' + msg.value : line;
      // Focus the first empty required field once scrolling settles.
      setTimeout(() => {
        const firstEmpty = $$('#contact-form [required]').find(f => !f.value);
        (firstEmpty || msg).focus({ preventScroll: true });
      }, reduceMotion ? 0 : 600);
    });
  });

  /* ---------- Live demo slot ---------- */
  const liveDemo = $('[data-live-demo]');
  if (liveDemo && (cfg.demoAudioUrl || cfg.demoPhoneNumber)) {
    liveDemo.innerHTML = '';
    if (cfg.demoAudioUrl) {
      const p = document.createElement('p');
      p.className = 'placeholder-note';
      p.textContent = 'A recorded call with a demonstration receptionist.';
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'none';
      audio.src = cfg.demoAudioUrl;
      audio.setAttribute('aria-label', 'Recorded demonstration call');
      liveDemo.append(p, audio);
    }
    if (cfg.demoPhoneNumber) {
      const tel = cfg.demoPhoneNumber.replace(/[^\d+]/g, '');
      const p = document.createElement('p');
      p.className = 'placeholder-note';
      p.textContent = 'Call our demonstration receptionist and try it yourself. Standard call charges may apply.';
      const a = document.createElement('a');
      a.className = 'btn btn-small btn-primary';
      a.href = 'tel:' + tel;
      a.textContent = 'Call the live demo: ' + cfg.demoPhoneNumber;
      liveDemo.append(p, a);
    }
  }

  /* ---------- Mobile navigation ---------- */
  const toggle = $('.nav-toggle');
  const nav = $('#primary-nav');
  const setNav = open => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  if (toggle && nav) {
    toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
    $$('a', nav).forEach(a => a.addEventListener('click', () => setNav(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); toggle.focus(); }
    });
    document.addEventListener('click', e => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) setNav(false);
    });
    window.matchMedia('(min-width: 921px)').addEventListener('change', e => { if (e.matches) setNav(false); });
  }

  /* ---------- Highlight current section in nav ---------- */
  const navLinks = $$('.primary-nav ul a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(a => a.removeAttribute('aria-current'));
        const link = navLinks.find(a => a.getAttribute('href') === '#' + entry.target.id);
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));
  }

  /* ---------- Hero call timer ---------- */
  const timer = $('.call-timer');
  if (timer) {
    const end = 42;
    if (reduceMotion) {
      timer.textContent = '0:' + end;
    } else {
      let s = 0;
      const id = setInterval(() => {
        s += 1;
        timer.textContent = '0:' + String(s).padStart(2, '0');
        if (s >= end) clearInterval(id);
      }, 140);
    }
  }

 
/* ---------- Transcript playback synchronized with audio ---------- */
const replayBtn = $('#replay-transcript');
const transcript = $('#transcript');

if (replayBtn && transcript) {
  const lines = $$('li', transcript);
  const label = $('span', replayBtn);

  // Audio file is stored in the root of the website. It downloads only when Play is pressed.
  const transcriptAudio = new Audio();
  transcriptAudio.preload = 'none';
  transcriptAudio.src = '/riverbend-demo.mp3';
  let activeIndex = -1;

  const getStartTime = line => {
    // Prefer the precise data-start (seconds); fall back to the m:ss label.
    const precise = parseFloat(line.dataset.start);
    if (!isNaN(precise)) return precise;
    const timeLabel = $('.t-time', line);
    const parts = (timeLabel ? timeLabel.textContent.trim() : '0:00')
      .split(':')
      .map(Number);

    return parts.length === 2
      ? parts[0] * 60 + parts[1]
      : 0;
  };

  const startTimes = lines.map(getStartTime);

  const resetTranscript = () => {
    lines.forEach(line => {
      line.classList.remove('is-shown', 'is-active');
    });
    transcript.classList.remove('is-playing');
    label.textContent = 'Play transcript';
    replayBtn.setAttribute('aria-pressed', 'false');
    activeIndex = -1;
  };

  const syncTranscript = () => {
    const time = transcriptAudio.currentTime;
    let nextIndex = -1;

    for (let i = 0; i < startTimes.length; i++) {
      if (time >= startTimes[i]) {
        nextIndex = i;
      } else {
        break;
      }
    }

    if (nextIndex === activeIndex) return;

    activeIndex = nextIndex;

    lines.forEach((line, index) => {
      line.classList.toggle('is-active', index === activeIndex);
      line.classList.toggle('is-shown', index <= activeIndex);
    });

    if (activeIndex >= 0) {
      const line = lines[activeIndex];
      const top = line.offsetTop - transcript.offsetTop - 16;

      transcript.scrollTo({
        top: Math.max(0, top),
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    }
  };

  replayBtn.setAttribute('aria-pressed', 'false');

  replayBtn.addEventListener('click', async () => {
    if (!transcriptAudio.paused) {
      transcriptAudio.pause();
      return;
    }

    if (transcriptAudio.ended) {
      transcriptAudio.currentTime = 0;
    }

    transcript.classList.add('is-playing');
    label.textContent = 'Pause transcript';
    replayBtn.setAttribute('aria-pressed', 'true');

    try {
      await transcriptAudio.play();
      syncTranscript();
    } catch (error) {
      // Pausing while it's still loading isn't a failure.
      if (error && error.name === 'AbortError') return;
      resetTranscript();
      console.error('Could not play demo audio:', error);
    }
  });

  transcriptAudio.addEventListener('timeupdate', syncTranscript);

  transcriptAudio.addEventListener('play', () => {
    transcript.classList.add('is-playing');
    label.textContent = 'Pause transcript';
    replayBtn.setAttribute('aria-pressed', 'true');
  });

  transcriptAudio.addEventListener('pause', () => {
    label.textContent = 'Play transcript';
    replayBtn.setAttribute('aria-pressed', 'false');
  });

  transcriptAudio.addEventListener('ended', resetTranscript);

  transcriptAudio.addEventListener('seeked', syncTranscript);
}

  /* ---------- Contact form ---------- */
  const form = $('#contact-form');
  if (!form) return;
  const status = $('#form-status');
  const warning = $('[data-form-warning]');
  if (!cfg.formEndpoint && warning) {
    warning.hidden = false;
    if (!cfg.contactEmail) {
      warning.innerHTML = '<strong>Form not connected yet.</strong> Online submissions are not active, so requests sent here will not reach us. Please check back soon.';
    }
  }

  const messages = {
    name: 'Enter your full name.',
    business: 'Enter your business name.',
    email: 'Enter a valid email address, like name@business.com.',
    website: 'Enter a full web address starting with https://, or leave this blank.',
    industry: 'Choose your industry.',
    problem: 'Choose the main call-handling problem.',
    consent: 'Tick the box so we can use your details to reply.'
  };

  const showError = (field, show) => {
    const wrap = field.closest('.field');
    let err = wrap.querySelector('.field-error');
    if (show) {
      field.setAttribute('aria-invalid', 'true');
      if (!err) {
        err = document.createElement('p');
        err.className = 'field-error';
        err.id = field.id + '-error';
        wrap.appendChild(err);
      }
      err.textContent = messages[field.name] || 'Check this field.';
      field.setAttribute('aria-describedby', err.id);
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      if (err) err.remove();
    }
  };

  const fields = $$('input:not([name="_gotcha"]), select, textarea', form);
  fields.forEach(f => {
    f.addEventListener('blur', () => { if (f.value || f.type === 'checkbox') showError(f, !f.checkValidity()); });
    f.addEventListener('input', () => { if (f.getAttribute('aria-invalid')) showError(f, !f.checkValidity()); });
    f.addEventListener('change', () => { if (f.getAttribute('aria-invalid')) showError(f, !f.checkValidity()); });
  });

  const setStatus = (html, type) => {
    status.className = 'form-status' + (type ? ' is-' + type : '');
    status.innerHTML = html;
  };

  const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const buildMailto = data => {
    const body = [
      'Full name: ' + data.get('name'),
      'Business: ' + data.get('business'),
      'Email: ' + data.get('email'),
      'Website: ' + (data.get('website') || '-'),
      'Industry: ' + data.get('industry'),
      'Main problem: ' + data.get('problem'),
      '',
      String(data.get('message') || '')
    ].join('\n');
    return 'mailto:' + cfg.contactEmail +
      '?subject=' + encodeURIComponent('Discovery call request: ' + data.get('business')) +
      '&body=' + encodeURIComponent(body);
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Validate
    let firstInvalid = null;
    fields.forEach(f => {
      const bad = !f.checkValidity();
      showError(f, bad);
      if (bad && !firstInvalid) firstInvalid = f;
    });
    if (firstInvalid) {
      setStatus('Some details are missing or incorrect. Check the highlighted fields.', 'error');
      firstInvalid.focus();
      return;
    }

    const data = new FormData(form);

    // Honeypot: quietly stop obvious bots
    if (data.get('_gotcha')) return;

    // No backend configured: never pretend it was sent.
    if (!cfg.formEndpoint) {
      if (cfg.contactEmail) {
        setStatus(
          'Online submission isn\'t switched on yet, so your request has <strong>not</strong> been sent. ' +
          '<a href="' + escapeHtml(buildMailto(data)) + '">Open it as an email</a> to send it to ' + escapeHtml(cfg.contactEmail) + ' instead.',
          'error'
        );
      } else {
        setStatus(
          'This form isn\'t connected yet, so your request has <strong>not</strong> been sent. ' +
          'Site owner: add a form endpoint or contact email in <code>script.js</code> (see README).',
          'error'
        );
        console.warn('[Nexora] Contact form submitted but SITE_CONFIG.formEndpoint and contactEmail are empty. Nothing was sent.');
      }
      return;
    }

    const btn = $('button[type="submit"]', form);
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    setStatus('', '');

    try {
      const res = await fetch(cfg.formEndpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      form.innerHTML =
        '<div class="form-success" role="status" tabindex="-1">' +
        '<h3>Request sent</h3>' +
        '<p>Thanks, ' + escapeHtml(String(data.get('name')).split(' ')[0]) + '. We\'ve received your details and will reply to ' +
        escapeHtml(String(data.get('email'))) + ' to arrange your discovery call.</p>' +
        (cfg.schedulingUrl ? '<p><a class="btn btn-primary" href="' + escapeHtml(cfg.schedulingUrl) + '" target="_blank" rel="noopener">Pick a time now</a></p>' : '') +
        '</div>';
      $('.form-success', form).focus();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = original;
      const fallback = cfg.contactEmail
        ? ' You can also <a href="' + escapeHtml(buildMailto(data)) + '">send it by email</a>.'
        : '';
      setStatus('Your request could not be sent. Check your connection and try again.' + fallback, 'error');
      console.error('[Nexora] Form submission failed:', err);
    }
  });
})();
