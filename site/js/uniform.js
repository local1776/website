// Uniform Request page: the "How It Works" box for the chosen contract, fields that only show when they apply, the
// Open Season warning, and the email to unit supply (Michigan, South Dakota). What they need is picked in ufig.js;
// sending is site.js (data-form).
(function () {
  var form = document.getElementById('uf');
  if (!form) return;
  var rules = JSON.parse(document.getElementById('data-uniform').textContent).units;
  var units = window.L1776_CONTRACTS || {};
  var $ = function (s) { return form.querySelector(s); };
  var items = function () { return window.L1776_ufigItems ? window.L1776_ufigItems() : []; };
  function show(name, on) { form.querySelectorAll('[data-show="' + name + '"]').forEach(function (el) { el.hidden = !on; }); }

  function update() {
    var code = form.elements.agency.value.replace(/-(ARMY|AIR)$/, ''), rule = rules[code], unit = units[code];   // "LA-AIR" → LA
    // nothing else can be filled in until they pick a state or territory and confirm they are a dual-status technician (Ben, Nov 21 2026)
    var open = !!code && form.elements.dst.checked;
    form.querySelectorAll('[data-gate]').forEach(function (el) { el.disabled = !open; });   // shown but grayed out and locked until then
    $('[data-gate-note]').hidden = open;
    // the seal of the branch they picked lights up
    var air = /-AIR$/.test(form.elements.agency.value);
    form.querySelectorAll('[data-seal]').forEach(function (s) { s.classList.toggle('on', !!form.elements.agency.value && (s.getAttribute('data-seal') === 'air') === air); });
    var how = $('.uf-how');
    how.hidden = !rule;
    if (rule) {
      how.querySelector('[data-name]').textContent = unit.state;
      how.querySelector('[data-ask]').textContent = rule.ask;
      how.querySelector('[data-time]').textContent = rule.time;
      how.querySelector('[data-contract]').href = unit.href + '#s10-1';
    }
    var why = form.elements.reason.value;
    show('worn', why === 'wear' || why === 'duty');
    show('asked', form.elements.askedBefore.value === 'Yes');
    $('[data-season]').hidden = !(rule && rule.mode === 'season' && why && why !== 'duty');
    $('[data-mail]').hidden = !(rule && rule.mode === 'email');
  }

  // the email to unit supply, with the supervisor copied (Section 10.1 in Michigan and South Dakota)
  function mail() {
    var list = items().filter(function (x) { return !/11\.3/.test(x.group); }), unit = units[form.elements.agency.value.replace(/-(ARMY|AIR)$/, '')] || {};
    var name = (form.elements.firstName.value + ' ' + form.elements.lastName.value).trim();
    var body = 'Under Section 10.1 of the ' + (unit.name || '') + ' collective bargaining agreement, I am requesting the following uniform items:\n\n' +
      (list.length ? list.map(function (x) { return '- ' + x.item + (x.size ? ', size ' + x.size : '') + ', quantity ' + x.qty; }).join('\n') : '- (list your items)') +
      '\n\nPlease confirm the order and the expected issue date.\n\nThank you,\n' + (name || '') + (form.elements.phone.value ? '\n' + form.elements.phone.value : '');
    var cc = form.elements.supervisorEmail.value.trim();
    location.href = 'mailto:?' + (cc ? 'cc=' + encodeURIComponent(cc) + '&' : '') + 'subject=' + encodeURIComponent('Uniform Request' + (name ? ', ' + name : '')) + '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('click', function (e) { var b = e.target.closest('[data-act="mail"]'); if (b) mail(); });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('reset', function () { setTimeout(update); });
  // at least one item: point at the picker if the order is empty
  form.addEventListener('submit', function (e) {
    var pick = function (n) { return form.querySelector('input[name="' + n + '"]:checked'); };
    var miss = !pick('uniform') ? 'Uniform' : !pick('sex') ? 'Sex' : !pick('setsOnHand') ? 'Wearable Sets You Have Now' : '';
    if (miss) { e.stopImmediatePropagation(); e.preventDefault(); var mm = $('.form-msg'); mm.className = 'form-msg err'; mm.textContent = 'Please choose your ' + miss + ' under What You Need.'; $('[data-ufig]').scrollIntoView({ block: 'start' }); return; }
    if (!items().length) { e.stopImmediatePropagation(); e.preventDefault(); var m = $('.form-msg'); m.className = 'form-msg err'; m.textContent = 'Please choose at least one item under What You Need.'; $('[data-ufig]').scrollIntoView({ block: 'start' }); return; }
    var gaps = window.L1776_ufigMissing ? window.L1776_ufigMissing() : [];
    if (gaps.length) { e.stopImmediatePropagation(); e.preventDefault(); var g = $('.form-msg'); g.className = 'form-msg err'; g.textContent = 'Please add the size or details for: ' + gaps.join(', ') + '.'; var first = $('.ufig-row.need'); if (first) first.scrollIntoView({ block: 'center' }); }
  }, true);
  form.dataset.ok = 'Thank you. We received your request and emailed you a copy. A representative will be in touch.';
  update();
})();
