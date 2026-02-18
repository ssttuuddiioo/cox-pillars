/* ── tooltip.js ── Leaf tooltip positioning and content ── */

var Tooltip = (function() {

  var el, nameEl, pillarDot, pillarText, messageEl;
  var visible = false;

  function init() {
    el = document.getElementById('leaf-tooltip');
    nameEl = el.querySelector('.tooltip-name');
    pillarDot = el.querySelector('.tooltip-pillar-dot');
    pillarText = el.querySelector('.tooltip-pillar-text');
    messageEl = el.querySelector('.tooltip-message');
  }

  function show(screenX, screenY, pledge) {
    nameEl.textContent = pledge.name;
    pillarDot.style.backgroundColor = pledge.pillar.color;
    pillarText.textContent = pledge.pillar.icon + ' ' + pledge.pillar.name + ' Pledge';

    if (pledge.message) {
      messageEl.textContent = pledge.message;
      messageEl.style.display = 'block';
    } else {
      messageEl.style.display = 'none';
    }

    // Position tooltip above the leaf
    var tipW = el.offsetWidth || 180;
    var tipH = el.offsetHeight || 70;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var left = screenX - tipW / 2;
    var top = screenY - tipH - 16;

    // Keep within viewport
    if (left < 8) left = 8;
    if (left + tipW > vw - 8) left = vw - tipW - 8;
    if (top < 8) top = screenY + 20; // flip below if too high

    el.style.left = left + 'px';
    el.style.top = top + 'px';

    el.classList.remove('hidden');
    visible = true;
  }

  function hide() {
    el.classList.add('hidden');
    visible = false;
  }

  function isVisible() {
    return visible;
  }

  return {
    init: init,
    show: show,
    hide: hide,
    isVisible: isVisible
  };
})();
