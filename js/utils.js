/* ── utils.js ── Seeded PRNG, easing, math helpers ── */

// Seeded pseudo-random number generator (LCG)
function SeededRandom(seed) {
  this.seed = seed || 42;
}

SeededRandom.prototype.next = function() {
  this.seed = (this.seed * 1664525 + 1013904223) & 0x7FFFFFFF;
  return this.seed / 0x7FFFFFFF;
};

SeededRandom.prototype.range = function(min, max) {
  return min + this.next() * (max - min);
};

SeededRandom.prototype.intRange = function(min, max) {
  return Math.floor(this.range(min, max + 1));
};

SeededRandom.prototype.pick = function(arr) {
  return arr[Math.floor(this.next() * arr.length)];
};

// Easing functions
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
  var c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

// Math helpers
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
}

function dist(x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function debounce(fn, delay) {
  var timer = null;
  return function() {
    var ctx = this;
    var args = arguments;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(ctx, args);
    }, delay);
  };
}

// Unique ID counter
var _uidCounter = 0;
function uid() {
  return ++_uidCounter;
}
