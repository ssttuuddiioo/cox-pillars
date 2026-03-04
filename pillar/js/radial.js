/* ── radial.js ── Standalone radial leaf burst animation ── */

var RadialLeaf = (function() {

  // ── Configuration ──
  var LEAF_COUNT = 150;
  var LEAF_SPACING = 20;
  var RING_GAP = LEAF_SPACING * 1.5;
  var NORM_SIZE = 1000;

  // ── Palettes per pillar ──
  var PALETTES = {
    carbon:      ['#1a3366', '#2d6bc4', '#7ab5eb'],
    circularity: ['#1e5c1e', '#48af4c', '#80d248'],
    water:       ['#0d4f5a', '#1a9aaa', '#5ccedd'],
    habitat:     ['#8b2f1a', '#e05a2b', '#f4a68a']
  };

  // ── State ──
  var bgCanvas, bgCtx, fgCanvas, fgCtx;
  var palette = PALETTES.carbon;
  var leaves = [];
  var rafId = null;
  var running = false;

  // Cached dimensions
  var fgW, fgH, bgW, bgH;
  var fgScale, bgScale;
  var fgOffsetX, fgOffsetY, bgOffsetX, bgOffsetY;

  // ── Seeded PRNG (deterministic layout) ──
  var _seed = 42;
  function resetSeed() { _seed = 42; }
  function nextRand() {
    _seed = (_seed * 1664525 + 1013904223) & 0x7FFFFFFF;
    return _seed / 0x7FFFFFFF;
  }
  function randRange(min, max) {
    return min + nextRand() * (max - min);
  }

  // ── Math ──
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ── Public: Initialize ──
  function init(bgEl, fgEl, pillarId) {
    bgCanvas = bgEl;
    fgCanvas = fgEl;
    bgCtx = bgCanvas.getContext('2d');
    fgCtx = fgCanvas.getContext('2d');
    palette = PALETTES[pillarId] || PALETTES.carbon;

    resize();
    generateLeaves();
    start();
  }

  // ── Public: Resize / DPI handling ──
  function resize() {
    var dpr = window.devicePixelRatio || 1;

    // Foreground canvas
    var fgRect = fgCanvas.getBoundingClientRect();
    fgW = fgRect.width;
    fgH = fgRect.height;
    fgCanvas.width = fgW * dpr;
    fgCanvas.height = fgH * dpr;
    fgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background canvas
    var bgRect = bgCanvas.getBoundingClientRect();
    bgW = bgRect.width;
    bgH = bgRect.height;
    bgCanvas.width = bgW * dpr;
    bgCanvas.height = bgH * dpr;
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    recalcScale();
  }

  function recalcScale() {
    // Foreground: fit disc in the illustration area
    var fgSx = fgW / NORM_SIZE;
    var fgSy = fgH / NORM_SIZE;
    fgScale = Math.min(fgSx, fgSy) * 6.5;
    fgOffsetX = (fgW - NORM_SIZE * fgScale) / 2;
    fgOffsetY = (fgH - NORM_SIZE * fgScale) / 2;

    // Background: 2x of foreground, centered on full app frame
    bgScale = Math.min(bgW / NORM_SIZE, bgH / NORM_SIZE) * 13;
    bgOffsetX = (bgW - NORM_SIZE * bgScale) / 2;
    bgOffsetY = (bgH - NORM_SIZE * bgScale) / 2;
  }

  // ── Generate leaf positions (concentric rings) ──
  function generateLeaves() {
    resetSeed();
    leaves = [];
    var positions = [];
    var centerX = NORM_SIZE / 2;
    var centerY = NORM_SIZE / 2;

    // Ring 0: center point
    positions.push({ x: centerX, y: centerY, ring: 0 });

    var ringIndex = 2;
    while (positions.length < LEAF_COUNT) {
      var ringRadius = ringIndex * RING_GAP;
      var circumference = 1.5 * Math.PI * ringRadius;
      var countInRing = Math.max(6, Math.floor(circumference / LEAF_SPACING));

      var remaining = LEAF_COUNT - positions.length;
      if (remaining < countInRing * 0.5 && positions.length > 1) break;

      var angleOffset = (ringIndex % 2 === 1) ? (Math.PI / countInRing) : 0;

      for (var ci = 0; ci < countInRing; ci++) {
        var angle = (ci / countInRing) * Math.PI * 2 + angleOffset;
        positions.push({
          x: centerX + Math.cos(angle) * ringRadius,
          y: centerY + Math.sin(angle) * ringRadius,
          ring: ringIndex
        });
      }
      ringIndex++;
    }

    if (positions.length > LEAF_COUNT) {
      positions.length = LEAF_COUNT;
    }

    var maxRing = ringIndex - 1;

    for (var i = 0; i < positions.length; i++) {
      var pt = positions[i];
      var ringFrac = maxRing > 0 ? pt.ring / maxRing : 0;

      // Color distribution
      var colorIdx;
      if (ringFrac < 0.35) colorIdx = 0;
      else if (ringFrac < 0.7) colorIdx = 1;
      else colorIdx = 2;
      if (nextRand() < 0.25) colorIdx = Math.floor(nextRand() * 3);

      // Scale: large center → small edges
      var baseFalloff = maxRing > 0 ? lerp(1.6, 0.6, ringFrac) : 1.5;
      var ringMod = (pt.ring % 2 === 0) ? 1.08 : 0.92;
      var leafScale = baseFalloff * ringMod * randRange(0.93, 1.07);

      // Rotation: radial outward (sunburst) + jitter
      var radialAngle = Math.atan2(pt.y - centerY, pt.x - centerX);
      var rotation = radialAngle + Math.PI / 2 + randRange(-0.15, 0.15);

      leaves.push({
        x: pt.x + randRange(-0.5, 0.5),
        y: pt.y + randRange(-0.5, 0.5),
        color: palette[colorIdx],
        scale: leafScale,
        rotation: rotation,
        windSeed: randRange(0.3, 1.0),
        id: i
      });
    }

    // Depth sort: edges first (behind), center last (on top)
    leaves.sort(function(a, b) { return b.id - a.id; });
  }

  // ── Wind sway (ported from v1/renderer.js) ──
  function swayPos(leaf, time) {
    var gust = Math.sin(time * 0.4) * 0.4
             + Math.sin(time * 0.7) * 0.3
             + 0.3;
    var amp = (4 + leaf.windSeed * 6) * gust;

    return {
      x: leaf.x + Math.sin(time * (0.35 + leaf.windSeed * 0.15) + leaf.id * 0.4) * amp + gust * 3,
      y: leaf.y + Math.cos(time * (0.25 + leaf.windSeed * 0.1) + leaf.id * 0.3) * amp * 0.4
    };
  }

  function swayRot(leaf, time) {
    var gust = Math.sin(time * 0.4) * 0.4
             + Math.sin(time * 0.7) * 0.3
             + 0.3;
    return leaf.rotation
         + Math.sin(time * (0.35 + leaf.windSeed * 0.15) + leaf.id * 0.4) * 0.12 * gust;
  }

  // ── Draw one leaf (bezier shape from v1/renderer.js:236-240) ──
  function drawLeaf(ctx, px, py, color, sz, rotation, alpha) {
    if (sz < 1) sz = 1;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);

    ctx.beginPath();
    ctx.moveTo(0, -sz * 1.3);
    ctx.bezierCurveTo(sz * 0.9, -sz * 0.7, sz * 0.9, sz * 0.5, 0, sz * 1.3);
    ctx.bezierCurveTo(-sz * 0.9, sz * 0.5, -sz * 0.9, -sz * 0.7, 0, -sz * 1.3);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.restore();
  }

  // ── Render all leaves on a context ──
  function renderFrame(ctx, cScale, offX, offY, w, h, time) {
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < leaves.length; i++) {
      var leaf = leaves[i];
      var pos = swayPos(leaf, time);
      var rot = swayRot(leaf, time);
      var px = pos.x * cScale + offX;
      var py = pos.y * cScale + offY;
      var sz = 10 * cScale * leaf.scale;

      drawLeaf(ctx, px, py, leaf.color, sz, rot, 0.92);
    }
  }

  // ── Animation loop ──
  function loop(timestamp) {
    if (!running) return;
    var time = timestamp * 0.001;

    renderFrame(fgCtx, fgScale, fgOffsetX, fgOffsetY, fgW, fgH, time);
    renderFrame(bgCtx, bgScale, bgOffsetX, bgOffsetY, bgW, bgH, time);

    rafId = requestAnimationFrame(loop);
  }

  // ── Public: Start / Stop ──
  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ── Public: Toggle blurred background visibility ──
  function showBackground(show) {
    if (!bgCanvas) return;
    if (show) {
      bgCanvas.classList.add('visible');
    } else {
      bgCanvas.classList.remove('visible');
    }
  }

  return {
    init: init,
    start: start,
    stop: stop,
    resize: resize,
    showBackground: showBackground
  };

})();
