// Case pages (/cases/…): the player for a recorded court argument. One recording, ours or the court's own file; it loads only
// when someone presses play. Plain controls: play/pause, back and forward 15 seconds, a bar to drag, speed.
(function () {
  var box = document.querySelector('.au');
  if (!box) return;
  var a = box.querySelector('audio'), play = box.querySelector('[data-au="play"]'), bar = box.querySelector('input'), t = box.querySelector('.au-t'), sp = box.querySelector('[data-au="speed"]');
  var total = +box.getAttribute('data-seconds'), SPEEDS = [1, 1.25, 1.5, 2], s = 0, dragging = false;
  var two = function (n) { return (n < 10 ? '0' : '') + n; };
  var clock = function (n) { n = Math.floor(n || 0); return Math.floor(n / 60) + ':' + two(n % 60); };
  var len = function () { return isFinite(a.duration) && a.duration ? a.duration : total; };
  var draw = function () {
    var now = dragging ? +bar.value : a.currentTime;
    if (!dragging) bar.value = now;
    bar.max = Math.floor(len()); bar.style.setProperty('--p', (now / len() * 100) + '%');
    t.innerHTML = clock(now) + '<span> / ' + clock(len()) + '</span>';
    bar.setAttribute('aria-valuetext', clock(now) + ' of ' + clock(len()));
  };
  var state = function () { box.classList.toggle('on', !a.paused); play.setAttribute('aria-label', a.paused ? 'Play' : 'Pause'); play.title = a.paused ? 'Play' : 'Pause'; };
  var to = function (n) { var go = function () { a.currentTime = Math.max(0, Math.min(len() - 1, n)); draw(); }; if (a.readyState) go(); else { a.addEventListener('loadedmetadata', go, { once: true }); a.load(); } };
  play.addEventListener('click', function () { if (a.paused) { a.play().catch(function () { box.parentNode.querySelector('.au-e').hidden = false; }); } else a.pause(); });
  box.querySelectorAll('[data-skip]').forEach(function (b) { b.addEventListener('click', function () { to(a.currentTime + +b.getAttribute('data-skip')); }); });
  sp.addEventListener('click', function () { s = (s + 1) % SPEEDS.length; a.playbackRate = SPEEDS[s]; sp.textContent = SPEEDS[s] + '×'; sp.setAttribute('aria-label', 'Speed ' + SPEEDS[s] + ' times'); });
  bar.addEventListener('input', function () { dragging = true; draw(); });
  bar.addEventListener('change', function () { dragging = false; to(+bar.value); });
  ['timeupdate', 'loadedmetadata'].forEach(function (e) { a.addEventListener(e, draw); });
  ['play', 'pause', 'ended'].forEach(function (e) { a.addEventListener(e, state); });
  draw(); state();
})();
