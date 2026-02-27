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
  function drawTree(branch, time, maxDepth, activeBranches, treeAlpha, accumX, accumY) {
    treeAlpha = treeAlpha !== undefined ? treeAlpha : 1;
    accumX = accumX || 0;
    accumY = accumY || 0;
    if (treeAlpha <= 0.01) return;
    // Skip branches belonging to inactive main branches
    if (branch.mainBranchIndex >= 0 && branch.mainBranchIndex >= activeBranches) return;

    var swayEnd = applySway(branch, time, maxDepth);
    var swayCP = applySwayCP(branch, time, maxDepth);

    // This branch's own sway delta
    var ownEndOX = swayEnd.x - branch.end.x;
    var ownEndOY = swayEnd.y - branch.end.y;

    // Shift all points by accumulated parent sway
    var s = toScreen(branch.start.x + accumX, branch.start.y + accumY);
    var cp = toScreen(swayCP.x + accumX, swayCP.y + accumY);
    var e = toScreen(swayEnd.x + accumX, swayEnd.y + accumY);

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.quadraticCurveTo(cp.x, cp.y, e.x, e.y);

    var alpha = mapRange(branch.depth, 0, maxDepth, 0.7, 0.2) * treeAlpha;
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + alpha.toFixed(2) + ')';
    ctx.lineWidth = Math.max(branch.thickness * scale, 0.5);
    ctx.lineCap = 'round';
    ctx.stroke();

    // Children inherit accumulated parent sway + this branch's own end sway
    var newAccumX = accumX + ownEndOX;
    var newAccumY = accumY + ownEndOY;
    for (var i = 0; i < branch.children.length; i++) {
      drawTree(branch.children[i], time, maxDepth, activeBranches, treeAlpha, newAccumX, newAccumY);
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
    if (!slot.branchPath || slot.branchPath.length === 0) {
      return { x: slot.x, y: slot.y };
    }

    var branchT = slot.branchT || 1.0;
    var accumX = 0;
    var accumY = 0;

    // Accumulate full sway from all ancestor branches (all except the last)
    for (var i = 0; i < slot.branchPath.length - 1; i++) {
      var b = slot.branchPath[i];
      var sw = applySway(b, time, 6);
      accumX += sw.x - b.end.x;
      accumY += sw.y - b.end.y;
    }

    // Last branch: scale its sway contribution by branchT
    var lastBranch = slot.branchPath[slot.branchPath.length - 1];
    var lastSway = applySway(lastBranch, time, 6);
    accumX += (lastSway.x - lastBranch.end.x) * branchT;
    accumY += (lastSway.y - lastBranch.end.y) * branchT;

    return {
      x: slot.x + accumX,
      y: slot.y + accumY
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
    // Pre-compute swayed+accumulated positions for each segment
    var totalLen = 0;
    var segLens = [];
    var segData = [];
    var accumX = 0, accumY = 0;

    for (var i = 0; i < branchPath.length; i++) {
      var b = branchPath[i];
      var swayEnd = applySway(b, time, 6);
      var swayCP = applySwayCP(b, time, 6);
      var ownEndOX = swayEnd.x - b.end.x;
      var ownEndOY = swayEnd.y - b.end.y;

      var sX = b.start.x + accumX;
      var sY = b.start.y + accumY;
      var cpX = swayCP.x + accumX;
      var cpY = swayCP.y + accumY;
      var eX = swayEnd.x + accumX;
      var eY = swayEnd.y + accumY;

      segData.push({ sX: sX, sY: sY, cpX: cpX, cpY: cpY, eX: eX, eY: eY });
      var len = TreeGenerator.quadBezierLength(sX, sY, cpX, cpY, eX, eY);
      segLens.push(len);
      totalLen += len;

      accumX += ownEndOX;
      accumY += ownEndOY;
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
      var seg = segData[j];
      var segLen = segLens[j];
      var s = toScreen(seg.sX, seg.sY);
      var cp = toScreen(seg.cpX, seg.cpY);

      if (accumulated + segLen <= drawnLen) {
        // Full curved segment
        var e = toScreen(seg.eX, seg.eY);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(cp.x, cp.y, e.x, e.y);
        ctx.stroke();
        accumulated += segLen;
      } else {
        // Partial segment: draw up to parameter t
        var remain = drawnLen - accumulated;
        var t = remain / segLen;
        var px = TreeGenerator.quadBezierAt(seg.sX, seg.cpX, seg.eX, t);
        var py = TreeGenerator.quadBezierAt(seg.sY, seg.cpY, seg.eY, t);
        var cp1x = lerp(seg.sX, seg.cpX, t);
        var cp1y = lerp(seg.sY, seg.cpY, t);
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

  // ── Draw chart labels near each cluster ──
  function drawChartLabels(labels, chartAlpha) {
    if (!labels || labels.length === 0 || chartAlpha <= 0.01) return;

    ctx.save();

    var fontSize = Math.max(10, 12 * scale);
    ctx.font = '500 ' + fontSize + 'px Gotham, Helvetica Neue, Arial, sans-serif';

    for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      var text = label.pillar.name + ' (' + label.count + ')';
      var pos = toScreen(label.cx, label.cy - label.radius - 25);

      ctx.globalAlpha = chartAlpha * 0.85;
      ctx.fillStyle = label.pillar.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, pos.x, pos.y);
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
