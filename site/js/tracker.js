// Emergency Leave Tracker (Ben, Nov 21 2026). Everything typed is saved ONLY in this browser (localStorage) so a member
// can fill it in day by day during a long activation; nothing is sent anywhere. Print makes the paper copy to sign.
// Later this moves into the Union App behind a member login.
(function () {
  var form = document.getElementById('lt'); if (!form) return;
  var KEY = 'l1776-leave-tracker-v1', box = form.querySelector('.lt-pps');
  var CODES = ['', 'AL', 'ML', 'CT', 'LL', 'LW', 'OD', 'H'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var blankPP = function () { var d = []; for (var i = 0; i < 14; i++) d.push({ s1: '', h1: '', s2: '', h2: '' }); return { num: '', start: '', days: d }; };
  var data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }
  if (!data || !data.pps) data = { name: '', order: '', period: '', unit: 'weeks', begin: '', end: '', pps: [blankPP()] };
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };
  var fmt = function (d) { return (d.getMonth() + 1) + '/' + d.getDate(); };

  function dateOf(pp, i) {
    if (!pp.start) return null;
    var d = new Date(pp.start + 'T12:00:00'); if (isNaN(d)) return null;
    d.setDate(d.getDate() + i); return d;
  }
  function sel(name, v) { return '<select name="' + name + '" aria-label="' + name + '">' + CODES.map(function (c) { return '<option' + (c === v ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>'; }
  function render() {
    ['name', 'order', 'period', 'unit', 'begin', 'end'].forEach(function (k) { form.elements[k].value = data[k] || (k === 'unit' ? 'weeks' : ''); });
    box.innerHTML = data.pps.map(function (pp, p) {
      var first = dateOf(pp, 0), dow = first ? first.getDay() : 0;
      var rows = pp.days.map(function (d, i) {
        var dt = dateOf(pp, i), day = DAYS[(dow + i) % 7];
        return '<tr data-i="' + i + '"><th scope="row">' + day + '<span>' + (dt ? fmt(dt) : '') + '</span></th>'
          + '<td>' + sel('s1', d.s1) + '</td><td><input name="h1" inputmode="decimal" maxlength="4" value="' + esc(d.h1) + '"></td>'
          + '<td>' + sel('s2', d.s2) + '</td><td><input name="h2" inputmode="decimal" maxlength="4" value="' + esc(d.h2) + '"></td>'
          + '<td class="lt-tot">' + ((num(d.h1) + num(d.h2)) || '') + '</td></tr>';
      }).join('');
      return '<fieldset class="lt-pp" data-p="' + p + '"><legend>Pay Period ' + (p + 1) + '</legend>'
        + '<div class="lt-pph"><label class="lt-f">Pay Period Number<input name="num" maxlength="10" value="' + esc(pp.num) + '"></label>'
        + '<label class="lt-f">First Day (Sunday)<input name="start" type="date" value="' + esc(pp.start) + '"></label>'
        + '<p class="lt-sum">Hours accounted for: <b class="lt-pt"></b> of 80</p></div>'
        + '<table class="lt-t"><thead><tr><th scope="col">Day</th><th scope="col">Status 1</th><th scope="col">Hours</th><th scope="col">Status 2</th><th scope="col">Hours</th><th scope="col">Total</th></tr></thead><tbody>' + rows + '</tbody></table></fieldset>';
    }).join('');
    totals(); marks();
  }
  // empty boxes print blank (no "mm/dd/yyyy")
  function marks() { [].forEach.call(form.querySelectorAll("input,select"), function (el) { el.classList.toggle("is-empty", !el.value); }); }
  function totals() {
    [].forEach.call(box.querySelectorAll('.lt-pp'), function (fs) {
      var pp = data.pps[+fs.getAttribute('data-p')], t = pp.days.reduce(function (a, d) { return a + num(d.h1) + num(d.h2); }, 0);
      var b = fs.querySelector('.lt-pt'); b.textContent = t; b.parentNode.classList.toggle('off', t !== 80 && t > 0);
    });
  }

  form.addEventListener('input', function (e) {
    var el = e.target, n = el.name, fs = el.closest('.lt-pp');
    el.classList.toggle('is-empty', !el.value);
    if (!fs) { data[n] = el.value; save(); return; }
    var pp = data.pps[+fs.getAttribute('data-p')], tr = el.closest('tr');
    if (tr) {
      if ((n === 'h1' || n === 'h2') && el.value && !/^\d{0,2}(\.\d{0,2})?$/.test(el.value)) { el.value = el.value.replace(/[^\d.]/g, '').slice(0, 4); }
      pp.days[+tr.getAttribute('data-i')][n] = el.value;
      tr.querySelector('.lt-tot').textContent = (num(pp.days[+tr.getAttribute('data-i')].h1) + num(pp.days[+tr.getAttribute('data-i')].h2)) || '';
      totals(); save(); return;
    }
    pp[n] = el.value; save();
    if (n === 'start') render();                       // new start date: relabel the days
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'print') window.print();
    if (a === 'add') {
      var last = data.pps[data.pps.length - 1], pp = blankPP();
      if (last.start) { var d = new Date(last.start + 'T12:00:00'); d.setDate(d.getDate() + 14); pp.start = d.toISOString().slice(0, 10); }
      data.pps.push(pp); save(); render();
    }
    if (a === 'remove' && data.pps.length > 1) {
      var lp = data.pps[data.pps.length - 1], used = lp.num || lp.days.some(function (d) { return d.s1 || d.h1 || d.s2 || d.h2; });
      if (!used || window.confirm('Remove the last pay period and everything entered in it?')) { data.pps.pop(); save(); render(); }
    }
    if (a === 'clear' && window.confirm('Clear everything on this form? This can’t be undone.')) {
      data = { name: '', order: '', period: '', unit: 'weeks', begin: '', end: '', pps: [blankPP()] }; save(); render();
    }
  });
  render();
})();
