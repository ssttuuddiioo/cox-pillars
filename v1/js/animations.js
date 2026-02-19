/* ── animations.js ── Animation loop, stroke trace, leaf grow, ambient sway ── */

var Animations = (function() {

  var queue = [];
  var running = false;
  var treeData = null;

  function setTreeData(td) {
    treeData = td;
  }

  // Start the main render loop
  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(loop);
  }

  function loop(timestamp) {
    if (!running) return;

    var time = timestamp * 0.001; // seconds

    // Animate chart transition
    if (treeData) {
      var target = treeData.chartMode ? 1 : 0;
      if (treeData.chartTransition < target) {
        treeData.chartTransition = Math.min(target, treeData.chartTransition + 0.025);
      } else if (treeData.chartTransition > target) {
        treeData.chartTransition = Math.max(target, treeData.chartTransition - 0.025);
      }
    }

    // Animate wind strength
    if (treeData) {
      var wTarget = treeData.windActive ? 1 : 0;
      if (treeData.windStrength < wTarget) {
        treeData.windStrength = Math.min(wTarget, treeData.windStrength + 0.015);
      } else if (treeData.windStrength > wTarget) {
        treeData.windStrength = Math.max(wTarget, treeData.windStrength - 0.015);
      }
      Renderer.setWindStrength(treeData.windStrength);
    }

    // Animate screensaver transition (slow wind-whisk in, moderate out)
    if (treeData) {
      if (treeData.screensaverTransition === undefined) treeData.screensaverTransition = 0;
      var ssTarget = treeData.screensaverMode ? 1 : 0;
      if (treeData.screensaverTransition < ssTarget) {
        treeData.screensaverTransition = Math.min(ssTarget, treeData.screensaverTransition + 0.004);
      } else if (treeData.screensaverTransition > ssTarget) {
        treeData.screensaverTransition = Math.max(ssTarget, treeData.screensaverTransition - 0.012);
      }
    }

    // Sync screensaver SVG overlays and titles with palette cycling
    if (treeData && treeData.screensaverMode && treeData.ssStartTime) {
      var ssElapsed = time - treeData.ssStartTime;
      var ssSvgs = [
        document.getElementById('ss-svg-blue'),
        document.getElementById('ss-svg-turquoise'),
        document.getElementById('ss-svg-green'),
        document.getElementById('ss-svg-orange')
      ];
      var ssTitles = [
        document.getElementById('ss-title-blue'),
        document.getElementById('ss-title-turquoise'),
        document.getElementById('ss-title-green'),
        document.getElementById('ss-title-orange')
      ];
      var SS_SVG_HOLD = 5;
      var SS_SVG_FADE = 2;
      var SS_SVG_CYCLE = SS_SVG_HOLD + SS_SVG_FADE;

      // First 5 seconds: show blue
      var cycleTime = ssElapsed - 5;
      var activeIdx = 0;
      var fadeOut = false;
      var withinSlot = 0;
      if (cycleTime > 0) {
        var totalLen = ssSvgs.length * SS_SVG_CYCLE;
        var pos = cycleTime % totalLen;
        activeIdx = Math.floor(pos / SS_SVG_CYCLE) % ssSvgs.length;
        withinSlot = pos - activeIdx * SS_SVG_CYCLE;
        fadeOut = withinSlot > SS_SVG_HOLD;
      }

      for (var si = 0; si < ssSvgs.length; si++) {
        var svgOpacity, titleOpacity;
        if (si === activeIdx) {
          svgOpacity = fadeOut ? '0' : '1';
          titleOpacity = svgOpacity;
        } else {
          var nextIdx = (activeIdx + 1) % ssSvgs.length;
          svgOpacity = (si === nextIdx && fadeOut) ? '1' : '0';
          titleOpacity = svgOpacity;
        }
        if (ssSvgs[si]) ssSvgs[si].style.opacity = svgOpacity;
        if (ssTitles[si]) ssTitles[si].style.opacity = titleOpacity;
      }

      // Cycle background color per pillar
      var SS_BG = [
        [12, 20, 32],   // Blue: dark navy
        [22, 48, 45],   // Turquoise: dark teal
        [42, 85, 22],   // Green: dark forest
        [52, 18, 12]    // Orange: dark brown
      ];
      var bgR, bgG, bgB;
      if (fadeOut) {
        var nxtBg = (activeIdx + 1) % SS_BG.length;
        var blend = (withinSlot - SS_SVG_HOLD) / SS_SVG_FADE;
        bgR = Math.round(SS_BG[activeIdx][0] + (SS_BG[nxtBg][0] - SS_BG[activeIdx][0]) * blend);
        bgG = Math.round(SS_BG[activeIdx][1] + (SS_BG[nxtBg][1] - SS_BG[activeIdx][1]) * blend);
        bgB = Math.round(SS_BG[activeIdx][2] + (SS_BG[nxtBg][2] - SS_BG[activeIdx][2]) * blend);
      } else {
        bgR = SS_BG[activeIdx][0];
        bgG = SS_BG[activeIdx][1];
        bgB = SS_BG[activeIdx][2];
      }
      document.body.style.background = 'rgb(' + bgR + ',' + bgG + ',' + bgB + ')';
    } else {
      // Hide all overlays and titles when not in screensaver
      var ssSvgEls = document.querySelectorAll('#ss-overlays img');
      for (var si = 0; si < ssSvgEls.length; si++) {
        ssSvgEls[si].style.opacity = '0';
      }
      var ssTitleEls = document.querySelectorAll('#ss-overlays .ss-title');
      for (var si = 0; si < ssTitleEls.length; si++) {
        ssTitleEls[si].style.opacity = '0';
      }
      // Restore default background
      document.body.style.background = '';
    }

    var chartT = treeData ? (treeData.chartTransition || 0) : 0;
    var ssT = treeData ? (treeData.screensaverTransition || 0) : 0;
    var treeAlpha = 1 - Math.max(chartT, ssT);

    Renderer.clear();

    // Draw ground line
    if (treeData) {
      Renderer.drawGround(treeData, treeAlpha);
    }

    // Draw bare tree with ambient sway (only active branches)
    if (treeData) {
      Renderer.drawTree(treeData.root, time, treeData.maxDepth, treeData.activeBranches, treeAlpha);
    }

    // Draw all placed leaves (only on active branches)
    if (treeData) {
      Renderer.drawLeaves(treeData.leafSlots, time, treeData.activeBranches, chartT, ssT, treeData);
    }

    // Draw chart labels
    if (treeData && chartT > 0) {
      Renderer.drawChartLabels(treeData.chartLabels || [], chartT);
    }

    // Process animation queue
    for (var i = queue.length - 1; i >= 0; i--) {
      var anim = queue[i];
      anim.update(timestamp);
      anim.draw(time);
      if (anim.isComplete()) {
        if (anim.onComplete) anim.onComplete();
        queue.splice(i, 1);
      }
    }

    requestAnimationFrame(loop);
  }

  function addAnimation(anim) {
    queue.push(anim);
  }

  function isAnimating() {
    return queue.length > 0;
  }

  // ── Branch Stroke Animation ──
  function BranchStrokeAnim(branchPath, color, duration) {
    this.branchPath = branchPath;
    this.color = color;
    this.duration = duration || 1200;
    this.startTime = null;
    this.progress = 0;
    this.onComplete = null;
  }

  BranchStrokeAnim.prototype.update = function(timestamp) {
    if (this.startTime === null) this.startTime = timestamp;
    var elapsed = timestamp - this.startTime;
    this.progress = Math.min(elapsed / this.duration, 1);
    this.progress = easeOutCubic(this.progress);
  };

  BranchStrokeAnim.prototype.draw = function(time) {
    Renderer.drawStrokePath(this.branchPath, this.color, this.progress, time);
  };

  BranchStrokeAnim.prototype.isComplete = function() {
    return this.progress >= 1;
  };

  // ── Leaf Grow Animation ──
  function LeafGrowAnim(slot, pledge, duration) {
    this.slot = slot;
    this.pledge = pledge;
    this.duration = duration || 600;
    this.startTime = null;
    this.scale = 0;
    this.onComplete = null;
    this.rotation = (Math.random() - 0.5) * 1.2;
    this.elastic = false;
  }

  LeafGrowAnim.prototype.update = function(timestamp) {
    if (this.startTime === null) this.startTime = timestamp;
    var elapsed = timestamp - this.startTime;
    var t = Math.min(elapsed / this.duration, 1);
    this.scale = easeOutCubic(t);
  };

  LeafGrowAnim.prototype.draw = function(time) {
    var pos = Renderer.getSwayedSlotPos(this.slot, time);
    Renderer.drawLeaf(pos.x, pos.y, this.pledge.pillar.color, this.scale, this.rotation, 1);
  };

  LeafGrowAnim.prototype.isComplete = function() {
    return this.scale >= 1;
  };

  // ── Animate a pledge (stroke + leaf grow sequence) ──
  function animatePledge(pledge, slot) {
    // Reserve the slot immediately so no other pledge takes it
    // But don't mark as occupied yet (so static renderer doesn't draw it)
    slot.reserved = true;

    var strokeAnim = new BranchStrokeAnim(slot.branchPath, pledge.pillar.color, 1000);

    strokeAnim.onComplete = function() {
      // Start leaf grow animation — smooth unfurl at the stroke endpoint
      var rotation = (Math.random() - 0.5) * 1.2;
      var growAnim = new LeafGrowAnim(slot, pledge, 1200);
      growAnim.rotation = rotation;

      growAnim.onComplete = function() {
        // Now mark as occupied so static renderer takes over
        slot.occupied = true;
        slot.leaf = pledge;
        slot.rotation = rotation;
        pledge.slotId = slot.id;
      };

      addAnimation(growAnim);
    };

    addAnimation(strokeAnim);
  }

  // ── Animate only the stroke (yellow) to a slot, call onDone when complete ──
  function animateStrokeToSlot(slot, onDone) {
    slot.reserved = true;
    var strokeAnim = new BranchStrokeAnim(slot.branchPath, '#FFD54F', 1500);
    strokeAnim.onComplete = function() {
      if (onDone) onDone();
    };
    addAnimation(strokeAnim);
  }

  // ── Animate only the leaf grow at a slot (no stroke) ──
  function animateLeafGrow(pledge, slot) {
    var rotation = (Math.random() - 0.5) * 1.2;
    var growAnim = new LeafGrowAnim(slot, pledge, 2700);
    growAnim.rotation = rotation;
    growAnim.elastic = true;

    growAnim.onComplete = function() {
      slot.occupied = true;
      slot.leaf = pledge;
      slot.rotation = rotation;
      pledge.slotId = slot.id;
    };

    addAnimation(growAnim);
  }

  return {
    setTreeData: setTreeData,
    start: start,
    addAnimation: addAnimation,
    isAnimating: isAnimating,
    animatePledge: animatePledge,
    animateStrokeToSlot: animateStrokeToSlot,
    animateLeafGrow: animateLeafGrow,
    BranchStrokeAnim: BranchStrokeAnim,
    LeafGrowAnim: LeafGrowAnim
  };
})();
