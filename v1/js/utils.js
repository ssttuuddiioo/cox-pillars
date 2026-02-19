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

function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
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

// Color helpers
function hexToRgb(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return { r: r, g: g, b: b };
}

function rgbToHex(r, g, b) {
  r = Math.round(Math.max(0, Math.min(255, r)));
  g = Math.round(Math.max(0, Math.min(255, g)));
  b = Math.round(Math.max(0, Math.min(255, b)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function shadeColor(hex, amount) {
  var c = hexToRgb(hex);
  if (amount > 0) {
    c.r = Math.round(c.r + (255 - c.r) * amount);
    c.g = Math.round(c.g + (255 - c.g) * amount);
    c.b = Math.round(c.b + (255 - c.b) * amount);
  } else {
    c.r = Math.round(c.r * (1 + amount));
    c.g = Math.round(c.g * (1 + amount));
    c.b = Math.round(c.b * (1 + amount));
  }
  return rgbToHex(c.r, c.g, c.b);
}

function lerpColor(hex1, hex2, t) {
  var c1 = hexToRgb(hex1);
  var c2 = hexToRgb(hex2);
  return rgbToHex(
    lerp(c1.r, c2.r, t),
    lerp(c1.g, c2.g, t),
    lerp(c1.b, c2.b, t)
  );
}

// Poisson disk sampling within a circular boundary (Bridson's algorithm)
function poissonDiskSample(centerX, centerY, radius, minDist, rng, maxPoints) {
  var cellSize = minDist / Math.sqrt(2);
  var gridW = Math.ceil(2 * radius / cellSize);
  var grid = new Array(gridW * gridW);
  for (var gi = 0; gi < grid.length; gi++) grid[gi] = -1;

  var points = [];
  var active = [];
  var k = 30; // candidates per active point

  var originX = centerX - radius;
  var originY = centerY - radius;

  function gridIndex(x, y) {
    var col = Math.floor((x - originX) / cellSize);
    var row = Math.floor((y - originY) / cellSize);
    if (col < 0 || col >= gridW || row < 0 || row >= gridW) return -1;
    return row * gridW + col;
  }

  function inCircle(x, y) {
    var dx = x - centerX;
    var dy = y - centerY;
    return dx * dx + dy * dy <= radius * radius;
  }

  function tooClose(x, y) {
    var col = Math.floor((x - originX) / cellSize);
    var row = Math.floor((y - originY) / cellSize);
    for (var dr = -2; dr <= 2; dr++) {
      for (var dc = -2; dc <= 2; dc++) {
        var r2 = row + dr;
        var c2 = col + dc;
        if (r2 < 0 || r2 >= gridW || c2 < 0 || c2 >= gridW) continue;
        var idx = r2 * gridW + c2;
        if (grid[idx] >= 0) {
          var p = points[grid[idx]];
          var ddx = x - p.x;
          var ddy = y - p.y;
          if (ddx * ddx + ddy * ddy < minDist * minDist) return true;
        }
      }
    }
    return false;
  }

  // Seed with center point
  var first = { x: centerX, y: centerY };
  points.push(first);
  active.push(0);
  var fi = gridIndex(first.x, first.y);
  if (fi >= 0) grid[fi] = 0;

  while (active.length > 0 && points.length < maxPoints) {
    var randIdx = Math.floor(rng.next() * active.length);
    var pi = active[randIdx];
    var p = points[pi];
    var found = false;

    for (var attempt = 0; attempt < k; attempt++) {
      var angle = rng.next() * Math.PI * 2;
      var d = minDist + rng.next() * minDist;
      var nx = p.x + Math.cos(angle) * d;
      var ny = p.y + Math.sin(angle) * d;

      if (!inCircle(nx, ny)) continue;
      if (tooClose(nx, ny)) continue;

      var ni = gridIndex(nx, ny);
      if (ni < 0) continue;

      points.push({ x: nx, y: ny });
      active.push(points.length - 1);
      grid[ni] = points.length - 1;
      found = true;
      break;
    }

    if (!found) {
      active.splice(randIdx, 1);
    }
  }

  return points;
}

// Unique ID counter
var _uidCounter = 0;
function uid() {
  return ++_uidCounter;
}
