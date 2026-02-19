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
    var groundY = treeData.normalizedH * 0.80;
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

  // ── Draw a simplified screensaver leaf (solid fill, no glow/vein) ──
  function drawScreensaverLeaf(x, y, color, leafScale, rotation, alpha) {
    leafScale = leafScale !== undefined ? leafScale : 1;
    rotation = rotation || 0;
    alpha = alpha !== undefined ? alpha : 1;
    if (alpha <= 0.01) return;

    var p = toScreen(x, y);
    var sz = 10 * scale * leafScale;
    if (sz < 1) sz = 1;

    ctx.save();
    ctx.translate(p.x, p.y);
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

  // ── Draw a shadow behind a screensaver leaf ──
  function drawScreensaverShadow(x, y, leafScale, rotation, dx, dy, alpha) {
    leafScale = leafScale !== undefined ? leafScale : 1;
    rotation = rotation || 0;
    alpha = alpha !== undefined ? alpha : 0.25;
    if (alpha <= 0.01) return;

    var p = toScreen(x + dx, y + dy);
    var sz = 10 * scale * leafScale;
    if (sz < 1) sz = 1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rotation);

    ctx.beginPath();
    ctx.moveTo(0, -sz * 1.3);
    ctx.bezierCurveTo(sz * 0.9, -sz * 0.7, sz * 0.9, sz * 0.5, 0, sz * 1.3);
    ctx.bezierCurveTo(-sz * 0.9, sz * 0.5, -sz * 0.9, -sz * 0.7, 0, -sz * 1.3);
    ctx.closePath();

    ctx.fillStyle = '#0a1628';
    ctx.globalAlpha = alpha;
    ctx.fill();

    ctx.restore();
  }

  // ── Draw stem lines extending past screensaver disc ──
  function drawScreensaverStems(stems, alpha) {
    if (!stems || stems.length === 0 || alpha <= 0.01) return;

    ctx.save();
    ctx.lineCap = 'round';

    for (var i = 0; i < stems.length; i++) {
      var stem = stems[i];
      var s = toScreen(stem.x1, stem.y1);
      var e = toScreen(stem.x2, stem.y2);

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.15 * alpha).toFixed(3) + ')';
      ctx.lineWidth = Math.max(stem.width * scale, 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Compute interpolated leaf position for any mode ──
  function computeLeafPos(slot, time, easedChart, easedSS) {
    var treePos;
    if (easedSS >= 0.95) {
      treePos = { x: slot.x, y: slot.y };
    } else {
      treePos = getSwayedSlotPos(slot, time);
    }

    var x = treePos.x;
    var y = treePos.y;

    if (easedChart > 0 && slot.chartX !== undefined) {
      x = lerp(treePos.x, slot.chartX, easedChart);
      y = lerp(treePos.y, slot.chartY, easedChart);
    }

    if (easedSS > 0 && slot.ssX !== undefined) {
      x = lerp(treePos.x, slot.ssX, easedSS);
      y = lerp(treePos.y, slot.ssY, easedSS);

      // Wind-like sway — gusts + per-leaf variation, blends in with transition
      var seed = slot.ssWindSeed || 0.5;
      var id = slot.id || 0;
      // Gust envelope (shared across all leaves, like tree wind)
      var gust = Math.sin(time * 0.4) * 0.4 + Math.sin(time * 0.7) * 0.3 + 0.3;
      // Per-leaf sway amplitude (varies by seed so leaves don't move in lockstep)
      var amp = (4 + seed * 6) * gust;
      // Blend sway in as screensaver settles
      var swayBlend = Math.min(1, Math.max(0, (easedSS - 0.5) * 2));
      x += Math.sin(time * (0.35 + seed * 0.15) + id * 0.4) * amp * swayBlend;
      y += Math.cos(time * (0.25 + seed * 0.1) + id * 0.3) * amp * 0.4 * swayBlend;
      // Gentle directional push (like wind from the left)
      x += gust * 3 * swayBlend;
    }

    return { x: x, y: y };
  }

  // ── Color palettes for screensaver cycling ──
  var SS_PALETTES = [
    ['#1a3366', '#2d6bc4', '#7ab5eb'],  // Blues — Climate & Carbon
    ['#0d4f5a', '#1a9aaa', '#5ccedd'],  // Turquoise — Water
    ['#1e5c1e', '#48af4c', '#80d248'],  // Greens — Circularity & Recycling
    ['#8b2f1a', '#e05a2b', '#f4a68a'],  // Oranges — Habitat & Species
  ];
  var SS_HOLD = 5;   // seconds to hold each palette
  var SS_FADE = 2;   // seconds to crossfade between palettes
  var SS_CYCLE = SS_HOLD + SS_FADE;

  function getSSColor(colorIndex, time, treeDataRef) {
    var ssStart = (treeDataRef && treeDataRef.ssStartTime) || 0;
    var elapsed = time - ssStart;

    // First 5 seconds: stay on initial blue palette
    var cycleTime = elapsed - 5;
    if (cycleTime <= 0) {
      return SS_PALETTES[0][colorIndex];
    }

    // Cycling phase
    var totalCycleLen = SS_PALETTES.length * SS_CYCLE;
    var pos = cycleTime % totalCycleLen;
    var curIdx = Math.floor(pos / SS_CYCLE) % SS_PALETTES.length;
    var withinSlot = pos - curIdx * SS_CYCLE;

    if (withinSlot <= SS_HOLD) {
      // Holding on current palette
      return SS_PALETTES[curIdx][colorIndex];
    } else {
      // Crossfading to next palette
      var nxtIdx = (curIdx + 1) % SS_PALETTES.length;
      var blend = easeInOutQuad((withinSlot - SS_HOLD) / SS_FADE);
      return lerpColor(SS_PALETTES[curIdx][colorIndex], SS_PALETTES[nxtIdx][colorIndex], blend);
    }
  }

  // ── Draw all occupied leaves ──
  function drawLeaves(leafSlots, time, activeBranches, chartT, ssT, treeDataRef) {
    chartT = chartT || 0;
    ssT = ssT || 0;
    var easedChart = easeInOutQuad(chartT);
    var easedSS = easeInOutQuad(ssT);

    // Use depth-sorted slots throughout the entire screensaver transition
    // to avoid draw-order pop at the old 0.5 threshold
    var slots = (easedSS > 0 && treeDataRef && treeDataRef.ssSortedSlots)
      ? treeDataRef.ssSortedSlots
      : leafSlots;

    // ── Leaf pass — smooth crossfade between tree style and screensaver style ──
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (!slot.occupied || !slot.leaf) continue;
      if (slot.mainBranchIndex >= 0 && slot.mainBranchIndex >= activeBranches) continue;

      var pos = computeLeafPos(slot, time, easedChart, easedSS);
      var baseRot = slot.rotation || 0;
      var rot;
      if (easedSS > 0) {
        rot = lerp(baseRot, slot.ssRotation || 0, easedSS);
      } else {
        rot = lerp(baseRot, 0, easedChart);
      }
      var leafScale = lerp(1, slot.ssScale || 1, easedSS);

      // Color: crossfade from pillar color to screensaver palette color
      var color = slot.leaf.pillar.color;
      if (easedSS > 0) {
        var ssTargetColor = getSSColor(slot.ssColorIndex || 0, time, treeDataRef);
        color = lerpColor(color, ssTargetColor, easedSS);
      }

      // Wind-driven rotation wobble (matches position sway)
      if (easedSS > 0.5) {
        var seed = slot.ssWindSeed || 0.5;
        var gust = Math.sin(time * 0.4) * 0.4 + Math.sin(time * 0.7) * 0.3 + 0.3;
        var wobbleBlend = Math.min(1, (easedSS - 0.5) * 2);
        rot += Math.sin(time * (0.35 + seed * 0.15) + (slot.id || 0) * 0.4) * 0.12 * gust * wobbleBlend;
      }

      // Crossfade: draw tree-style leaf fading out, screensaver-style leaf fading in
      if (easedSS < 1) {
        var glow = Math.sin(time * 1.2 + slot.id * 0.5) * 0.06 + 0.94;
        drawLeaf(pos.x, pos.y, color, leafScale, rot, glow * (1 - easedSS));
      }
      if (easedSS > 0) {
        drawScreensaverLeaf(pos.x, pos.y, color, leafScale, rot, easedSS);
      }
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
    drawScreensaverLeaf: drawScreensaverLeaf,
    drawScreensaverShadow: drawScreensaverShadow,
    drawScreensaverStems: drawScreensaverStems,
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
