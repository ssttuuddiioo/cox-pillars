/* ── ripple.js ── Animate PNG sequence on the turquoise screensaver overlay ── */

var RippleAnim = (function() {

  var FRAME_COUNT = 60;
  var FPS = 30;
  var frames = [];
  var loadedCount = 0;
  var currentFrame = 0;
  var canvas = null;
  var ctx = null;
  var lastFrameTime = 0;
  var frameInterval = 1000 / FPS;
  var ready = false;

  function init() {
    canvas = document.getElementById('ss-svg-turquoise');
    if (!canvas || canvas.tagName !== 'CANVAS') return;
    ctx = canvas.getContext('2d');
    preload();
  }

  function preload() {
    for (var i = 0; i < FRAME_COUNT; i++) {
      (function(index) {
        var img = new Image();
        var num = String(index);
        while (num.length < 5) num = '0' + num;
        img.src = '../ui/ripple/Comp 1_' + num + '.png';
        img.onload = function() {
          loadedCount++;
          if (loadedCount === 1) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
          }
          if (loadedCount === FRAME_COUNT) {
            ready = true;
            requestAnimationFrame(tick);
          }
        };
        frames[index] = img;
      })(i);
    }
  }

  function tick(timestamp) {
    if (!ready) return;
    if (timestamp - lastFrameTime >= frameInterval) {
      lastFrameTime = timestamp;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frames[currentFrame], 0, 0);
      currentFrame = (currentFrame + 1) % FRAME_COUNT;
    }
    requestAnimationFrame(tick);
  }

  return { init: init };

})();
