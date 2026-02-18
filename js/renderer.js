/* ── renderer.js ── Canvas drawing: curved branches, leaves, DPI scaling ── */

var Renderer = (function() {

  var canvas, ctx;
  var displayW, displayH;
  var scale, offsetX, offsetY;
  var windStrength = 0;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    return ctx;
  }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    displayW = rect.width;
    displayH = rect.height;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    recalcScale(1000, 1000);
  }

  function recalcScale(normW, normH) {
    var sx = displayW / normW;
    var sy = displayH / normH;
    scale = Math.min(sx, sy);
    offsetX = (displayW - normW * scale) / 2;
    offsetY = (displayH - normH * scale) / 2;
  }

  function toScreen(nx, ny) {
    return {
      x: nx * scale + offsetX,
      y: ny * scale + offsetY
    };
  }

  function toNormalized(sx, sy) {
    return {
      x: (sx - offsetX) / scale,
      y: (sy - offsetY) / scale
    };
  }

  function clear() {
    ctx.clearRect(0, 0, displayW, displayH);
  }

  // ── Draw ground line ──
  function drawGround(treeData, alpha) {
    alpha = alpha !== undefined ? alpha : 1;
    if (alpha <= 0.01) return;
    var groundY = treeData.normalizedH * 0.9;
    var p = toScreen(0, groundY);
    var p2 = toScreen(treeData.normalizedW, groundY);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p2.x, p.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.12 * alpha).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── Draw tree branches recursively (quadratic bezier curves) ──
  function drawTree(branch, time, maxDepth, activeBranches, treeAlpha) {
    treeAlpha = treeAlpha !== undefined ? treeAlpha : 1;
    if (treeAlpha <= 0.01) return;
    // Skip branches belonging to inactive main branches
    if (branch.mainBranchIndex >= 0 && branch.mainBranchIndex >= activeBranches) return;

    var swayEnd = applySway(branch, time, maxDepth);
    var swayCP = applySwayCP(branch, time, maxDepth);

    var s = toScreen(branch.start.x, branch.start.y);
    var cp = toScreen(swayCP.x, swayCP.y);
    var e = toScreen(swayEnd.x, swayEnd.y);

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.quadraticCurveTo(cp.x, cp.y, e.x, e.y);

    var alpha = mapRange(branch.depth, 0, maxDepth, 0.7, 0.2) * treeAlpha;
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + alpha.toFixed(2) + ')';
    ctx.lineWidth = Math.max(branch.thickness * scale, 0.5);
    ctx.lineCap = 'round';
    ctx.stroke();

    for (var i = 0; i < branch.children.length; i++) {
      drawTree(branch.children[i], time, maxDepth, activeBranches, treeAlpha);
    }
  }

  function setWindStrength(w) { windStrength = w; }

  // ── Wind offset (gusts + directional push) ──
  function windOffset(depth, id, time, scale) {
    if (windStrength <= 0) return { x: 0, y: 0 };
    var gust = Math.sin(time * 0.4) * 0.4 + Math.sin(time * 0.7) * 0.3 + 0.3;
    var w = depth * 2.5 * windStrength * gust * scale;
    return {
      x: Math.sin(time * 1.5 + id * 0.4) * w + w * 0.6,
      y: Math.cos(time * 1.1 + id * 0.3) * w * 0.25
    };
  }

  // ── Apply subtle sway to branch endpoints ──
  function applySway(branch, time, maxDepth) {
    var amt = branch.depth * 0.4;
    var freq = 0.35 + (branch.id % 19) * 0.015;
    var ox = Math.sin(time * freq) * amt;
    var oy = Math.cos(time * freq * 0.7) * amt * 0.35;
    var wo = windOffset(branch.depth, branch.id, time, 1);
    return {
      x: branch.end.x + ox + wo.x,
      y: branch.end.y + oy + wo.y
    };
  }

  // ── Apply sway to control point (half the sway of endpoint) ──
  function applySwayCP(branch, time, maxDepth) {
    var amt = branch.depth * 0.2;
    var freq = 0.35 + (branch.id % 19) * 0.015;
    var ox = Math.sin(time * freq) * amt;
    var oy = Math.cos(time * freq * 0.7) * amt * 0.2;
    var wo = windOffset(branch.depth, branch.id, time, 0.5);
    return {
      x: branch.cp.x + ox + wo.x,
      y: branch.cp.y + oy + wo.y
    };
  }

  // ── Get swayed position for a leaf slot ──
  function getSwayedSlotPos(slot, time) {
    var lastBranch = slot.branchPath[slot.branchPath.length - 1];
    if (!lastBranch) return { x: slot.x, y: slot.y };

    // Sway proportional to branchT (position along the branch)
    var branchT = slot.branchT || 1.0;
    var amt = lastBranch.depth * 0.4 * branchT;
    var freq = 0.35 + (lastBranch.id % 19) * 0.015;
    var ox = Math.sin(time * freq) * amt;
    var oy = Math.cos(time * freq * 0.7) * amt * 0.35;
    var wo = windOffset(lastBranch.depth, lastBranch.id + slot.id, time, branchT);

    return {
      x: slot.x + ox + wo.x,
      y: slot.y + oy + wo.y
    };
  }

  // ── Draw a leaf shape (bezier leaf) ──
  function drawLeaf(x, y, color, leafScale, rotation, glowAlpha) {
    leafScale = leafScale !== undefined ? leafScale : 1;
    rotation = rotation || 0;
    glowAlpha = glowAlpha !== undefined ? glowAlpha : 1;

    var p = toScreen(x, y);
    var sz = 10 * scale * leafScale;
    if (sz < 1) sz = 1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rotation);

    // Soft glow
    ctx.beginPath();
    ctx.arc(0, 0, sz * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08 * glowAlpha * leafScale;
    ctx.fill();

    // Leaf shape (two bezier curves forming a leaf)
    ctx.beginPath();
    ctx.moveTo(0, -sz * 1.3);
    ctx.bezierCurveTo(sz * 0.9, -sz * 0.7, sz * 0.9, sz * 0.5, 0, sz * 1.3);
    ctx.bezierCurveTo(-sz * 0.9, sz * 0.5, -sz * 0.9, -sz * 0.7, 0, -sz * 1.3);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.88 * glowAlpha;
    ctx.fill();

    // Vein/highlight
    ctx.beginPath();
    ctx.moveTo(0, -sz * 0.8);
    ctx.bezierCurveTo(sz * 0.25, -sz * 0.3, sz * 0.2, sz * 0.2, 0, sz * 0.7);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.globalAlpha = 0.5 * glowAlpha;
    ctx.lineWidth = Math.max(0.5, sz * 0.1);
    ctx.stroke();

    ctx.restore();
  }

  // ── Draw all occupied leaves ──
  function drawLeaves(leafSlots, time, activeBranches, chartT) {
    chartT = chartT || 0;
    var easedT = easeInOutQuad(chartT);

    for (var i = 0; i < leafSlots.length; i++) {
      var slot = leafSlots[i];
      if (!slot.occupied || !slot.leaf) continue;
      if (slot.mainBranchIndex >= 0 && slot.mainBranchIndex >= activeBranches) continue;

      var treePos = getSwayedSlotPos(slot, time);
      var x = treePos.x;
      var y = treePos.y;

      if (easedT > 0 && slot.chartX !== undefined) {
        x = lerp(treePos.x, slot.chartX, easedT);
        y = lerp(treePos.y, slot.chartY, easedT);
      }

      var glow = Math.sin(time * 1.2 + slot.id * 0.5) * 0.06 + 0.94;
      var rot = lerp(slot.rotation || 0, 0, easedT);
      drawLeaf(x, y, slot.leaf.pillar.color, 1, rot, glow);
    }
  }

  // ── Draw stroke animation along a curved branch path ──
  function drawStrokePath(branchPath, color, progress, time) {
    // Compute total path length using bezier approximation
    var totalLen = 0;
    var segLens = [];
    for (var i = 0; i < branchPath.length; i++) {
      var b = branchPath[i];
      var swayEnd = applySway(b, time, 6);
      var swayCP = applySwayCP(b, time, 6);
      var len = TreeGenerator.quadBezierLength(
        b.start.x, b.start.y, swayCP.x, swayCP.y, swayEnd.x, swayEnd.y
      );
      segLens.push(len);
      totalLen += len;
    }

    var drawnLen = progress * totalLen;
    var accumulated = 0;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2 * scale, 1.2);
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.6;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6 * scale;

    for (var j = 0; j < branchPath.length; j++) {
      var branch = branchPath[j];
      var segLen = segLens[j];
      var swE = applySway(branch, time, 6);
      var swC = applySwayCP(branch, time, 6);
      var s = toScreen(branch.start.x, branch.start.y);
      var cp = toScreen(swC.x, swC.y);

      if (accumulated + segLen <= drawnLen) {
        // Full curved segment
        var e = toScreen(swE.x, swE.y);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(cp.x, cp.y, e.x, e.y);
        ctx.stroke();
        accumulated += segLen;
      } else {
        // Partial segment: draw up to parameter t
        var remain = drawnLen - accumulated;
        var t = remain / segLen;
        // Subdivide bezier at t to get partial curve endpoint
        var px = TreeGenerator.quadBezierAt(branch.start.x, swC.x, swE.x, t);
        var py = TreeGenerator.quadBezierAt(branch.start.y, swC.y, swE.y, t);
        // For a partial quadratic bezier, use de Casteljau subdivision
        var cp1x = lerp(branch.start.x, swC.x, t);
        var cp1y = lerp(branch.start.y, swC.y, t);
        var pe = toScreen(px, py);
        var scp = toScreen(cp1x, cp1y);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(scp.x, scp.y, pe.x, pe.y);
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  // ── Draw chart legend ──
  function drawChartLabels(labels, chartAlpha) {
    if (!labels || labels.length === 0 || chartAlpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = chartAlpha;

    var fontSize = Math.max(10, 12 * scale);
    ctx.font = '500 ' + fontSize + 'px Gotham, Helvetica Neue, Arial, sans-serif';

    // Measure total width for centering
    var items = [];
    var totalWidth = 0;
    var dotSize = 5;
    var dotGap = 8;
    var itemGap = 24;

    for (var i = 0; i < labels.length; i++) {
      var text = labels[i].pillar.name + ' (' + labels[i].count + ')';
      var tw = ctx.measureText(text).width;
      items.push({ text: text, width: tw, color: labels[i].pillar.color });
      totalWidth += dotSize * 2 + dotGap + tw;
    }
    totalWidth += itemGap * (items.length - 1);

    // Position between chart bottom and buttons
    var maxR = 0;
    for (var k = 0; k < labels.length; k++) {
      if (labels[k].radius > maxR) maxR = labels[k].radius;
    }
    var chartBottom = toScreen(500, 500 + maxR).y;
    var buttonsTop = displayH - 90;
    var y = chartBottom + (buttonsTop - chartBottom) / 2;

    var x = (displayW - totalWidth) / 2;

    for (var j = 0; j < items.length; j++) {
      ctx.globalAlpha = chartAlpha;
      ctx.beginPath();
      ctx.arc(x + dotSize, y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = items[j].color;
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(items[j].text, x + dotSize * 2 + dotGap, y);

      x += dotSize * 2 + dotGap + items[j].width + itemGap;
    }

    ctx.restore();
  }

  return {
    init: init,
    resize: resize,
    clear: clear,
    drawGround: drawGround,
    drawTree: drawTree,
    drawLeaves: drawLeaves,
    drawLeaf: drawLeaf,
    drawStrokePath: drawStrokePath,
    drawChartLabels: drawChartLabels,
    setWindStrength: setWindStrength,
    toScreen: toScreen,
    toNormalized: toNormalized,
    getSwayedSlotPos: getSwayedSlotPos,
    getCanvas: function() { return canvas; },
    getDisplaySize: function() { return { w: displayW, h: displayH }; },
    getScale: function() { return scale; }
  };
})();
