/* ── tooltip.js ── Leaf tooltip positioning and content ── */

var Tooltip = (function() {

  var el, nameEl, pillarDot, pillarText, messageEl, tailEl;
  var visible = false;
  var hideTimer = null;

  function init() {
    el = document.getElementById('leaf-tooltip');
    nameEl = el.querySelector('.tooltip-name');
    pillarDot = el.querySelector('.tooltip-pillar-dot');
    pillarText = el.querySelector('.tooltip-pillar-text');
    messageEl = el.querySelector('.tooltip-message');
    tailEl = el.querySelector('.tooltip-tail');
  }

  function show(screenX, screenY, pledge, duration) {
    nameEl.textContent = pledge.name.toUpperCase();
    messageEl.textContent = 'Has taken the COX Conserves pledge.';
    messageEl.style.display = '';

    // Get app-frame bounds (the 9×16 container)
    var frame = document.getElementById('app-frame');
    var frameRect = frame.getBoundingClientRect();
    var PAD = 8;

    // Measure tooltip dimensions
    // Temporarily show off-screen to measure
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    el.classList.remove('hidden');
    el.classList.remove('pop-in');
    var tipW = el.offsetWidth;
    var tipH = el.offsetHeight;

    // screenX/screenY are relative to the canvas, which fills app-frame
    // Tooltip is positioned absolute inside app-frame, so coords are relative to frame
    var GAP = 15; // space between leaf and tooltip
    var flipped = false;

    // Default: tooltip above the leaf
    var left = screenX - 21; // align tail roughly over leaf
    var top = screenY - tipH - GAP;

    // Clamp horizontally within app-frame
    if (left < PAD) left = PAD;
    if (left + tipW > frameRect.width - PAD) left = frameRect.width - tipW - PAD;

    // If tooltip goes above app-frame, flip below the leaf
    if (top < PAD) {
      top = screenY + GAP + 6;
      flipped = true;
    }

    // Clamp vertically within app-frame (bottom edge)
    if (top + tipH > frameRect.height - PAD) {
      top = frameRect.height - tipH - PAD;
    }

    el.style.left = left + 'px';
    el.style.top = top + 'px';

    // Position the tail to point at the leaf
    // tailX = where the leaf is relative to the tooltip's left edge
    var tailX = screenX - left;
    // Clamp tail within the pill (keep 8px from edges)
    tailX = Math.max(8, Math.min(tipW - 8, tailX));
    tailEl.style.left = (tailX - 5) + 'px'; // -5 = half of tail width (10px total border)

    // Flip tail if tooltip is below the leaf
    if (flipped) {
      tailEl.classList.add('flipped');
    } else {
      tailEl.classList.remove('flipped');
    }

    // Pop-in: start scaled to 0, then remove class to trigger spring scale
    el.classList.add('pop-in');
    // Force reflow so the scale(0) applies before we remove it
    el.offsetWidth;
    el.classList.remove('pop-in');
    visible = true;

    // Auto-hide after 3 seconds
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function() {
      hide();
      hideTimer = null;
    }, duration || 3000);
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
