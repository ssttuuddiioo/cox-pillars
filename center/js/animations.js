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
        treeData.screensaverTransition = Math.min(ssTarget, treeData.screensaverTransition + 0.013);
      } else if (treeData.screensaverTransition > ssTarget) {
        treeData.screensaverTransition = Math.max(ssTarget, treeData.screensaverTransition - 0.024);
      }
    }

    // Animate ssTreePhase (ramps up when pillar index = 4, down otherwise)
    if (treeData && treeData.screensaverMode && treeData.ssStartTime) {
      if (treeData.ssTreePhase === undefined) treeData.ssTreePhase = 0;
      var tpElapsed = time - treeData.ssStartTime;
      var tpCycleTime = tpElapsed - 5;
      var ssTreeTarget = 0;
      if (tpCycleTime > 0) {
        var TP_CYCLE = 7; // 5s hold + 2s fade
        var tpPos = tpCycleTime % (5 * TP_CYCLE);
        var tpActiveIdx = Math.floor(tpPos / TP_CYCLE) % 5;
        if (tpActiveIdx === 4) ssTreeTarget = 1;
      }
      if (treeData.ssTreePhase < ssTreeTarget) {
        treeData.ssTreePhase = Math.min(ssTreeTarget, treeData.ssTreePhase + 0.015);
      } else if (treeData.ssTreePhase > ssTreeTarget) {
        treeData.ssTreePhase = Math.max(ssTreeTarget, treeData.ssTreePhase - 0.020);
      }
    }

    // Sync screensaver SVG overlays and titles with palette cycling
    if (treeData && treeData.screensaverMode && treeData.ssStartTime) {
      var ssElapsed = time - treeData.ssStartTime;
      var ssSvgs = [
        document.getElementById('ss-svg-blue'),
        document.getElementById('ss-svg-green'),
        document.getElementById('ss-svg-turquoise'),
        document.getElementById('ss-svg-orange')
      ];
      var ssBlocks = [
        document.getElementById('ss-block-blue'),
        document.getElementById('ss-block-green'),
        document.getElementById('ss-block-turquoise'),
        document.getElementById('ss-block-orange'),
        document.getElementById('ss-block-tree')
      ];
      var SS_SVG_HOLD = 5;
      var SS_SVG_FADE = 2;
      var SS_SVG_CYCLE = SS_SVG_HOLD + SS_SVG_FADE;
      var SS_PHASE_COUNT = 5;

      // First 5 seconds: show blue
      var cycleTime = ssElapsed - 5;
      var activeIdx = 0;
      var fadeOut = false;
      var withinSlot = 0;
      if (cycleTime > 0) {
        var totalLen = SS_PHASE_COUNT * SS_SVG_CYCLE;
        var pos = cycleTime % totalLen;
        activeIdx = Math.floor(pos / SS_SVG_CYCLE) % SS_PHASE_COUNT;
        withinSlot = pos - activeIdx * SS_SVG_CYCLE;
        fadeOut = withinSlot > SS_SVG_HOLD;
      }

      // SVG overlays (only 4 — tree phase has none)
      for (var si = 0; si < ssSvgs.length; si++) {
        var svgOpacity = 0;
        if (activeIdx < 4 && si === activeIdx) {
          if (fadeOut) {
            var nextIdx = (activeIdx + 1) % SS_PHASE_COUNT;
            if (nextIdx === 4) {
              // Fading into tree phase — smoothly fade out current SVG
              svgOpacity = 1 - (withinSlot - SS_SVG_HOLD) / SS_SVG_FADE;
            } else {
              svgOpacity = 0;
            }
          } else {
            svgOpacity = 1;
          }
        } else if (activeIdx < 4 && fadeOut) {
          var nextIdx = (activeIdx + 1) % SS_PHASE_COUNT;
          if (nextIdx < 4 && si === nextIdx) svgOpacity = 1;
        } else if (activeIdx === 4 && fadeOut && si === 0) {
          // Tree fading into Blue — fade blue SVG in
          svgOpacity = (withinSlot - SS_SVG_HOLD) / SS_SVG_FADE;
        }
        if (ssSvgs[si]) ssSvgs[si].style.opacity = String(svgOpacity);
      }

      // Header blocks (5 — includes tree block)
      for (var si = 0; si < ssBlocks.length; si++) {
        var blockOpacity = 0;
        if (si === activeIdx) {
          if (fadeOut) {
            var nextIdx = (activeIdx + 1) % SS_PHASE_COUNT;
            // Smoothly fade out into tree or from tree
            blockOpacity = 1 - (withinSlot - SS_SVG_HOLD) / SS_SVG_FADE;
          } else {
            blockOpacity = 1;
          }
        } else if (fadeOut) {
          var nextIdx = (activeIdx + 1) % SS_PHASE_COUNT;
          if (si === nextIdx) {
            blockOpacity = (withinSlot - SS_SVG_HOLD) / SS_SVG_FADE;
          }
        }
        if (ssBlocks[si]) ssBlocks[si].style.opacity = String(blockOpacity);
      }

      // Hide ABOUT link during tree phase
      var ssAboutEl = document.getElementById('ss-about');
      if (ssAboutEl) {
        ssAboutEl.style.opacity = (activeIdx === 4 && !fadeOut) ? '0' : '';
        ssAboutEl.style.pointerEvents = (activeIdx === 4 && !fadeOut) ? 'none' : '';
      }

      // Cycle background color per pillar
      var SS_BG = [
        [12, 22, 38],   // Blue/Carbon & Climate: #0C1626
        [14, 60, 27],   // Green: #0E3C1B
        [22, 48, 45],   // Turquoise: dark teal
        [52, 18, 12],   // Orange: dark brown
        [1, 69, 24]     // Tree: #014518
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

      // Dynamic button color cycling to match active pillar
      var btnPledge = document.getElementById('btn-pledge');
      if (btnPledge) {
        var SS_BTN_COLORS = ['#0043D5', '#468E00', '#00CFE3', '#FF6121', '#468E00'];
        var btnColor = SS_BTN_COLORS[activeIdx];
        if (fadeOut) {
          var nxtBtn = (activeIdx + 1) % SS_BTN_COLORS.length;
          var blend = (withinSlot - SS_SVG_HOLD) / SS_SVG_FADE;
          btnColor = lerpColor(SS_BTN_COLORS[activeIdx], SS_BTN_COLORS[nxtBtn], blend);
        }
        btnPledge.style.background = btnColor;
        btnPledge.style.borderColor = btnColor;
        btnPledge.style.boxShadow =
          '0 0 0 5px transparent, ' +
          '0 0 0 7px ' + btnColor + '73, ' +
          '0 0 0 12px transparent, ' +
          '0 0 0 14px ' + btnColor + '4D';
      }
    } else {
      // Hide all overlays and pillar blocks when not in screensaver
      var ssSvgEls = document.querySelectorAll('#ss-overlays > img');
      for (var si = 0; si < ssSvgEls.length; si++) {
        ssSvgEls[si].style.opacity = '0';
      }
      var ssBlockEls = document.querySelectorAll('#ss-header .ss-pillar-block');
      for (var si = 0; si < ssBlockEls.length; si++) {
        ssBlockEls[si].style.opacity = '0';
      }
      // Restore default background
      document.body.style.background = '';
    }

    var chartT = treeData ? (treeData.chartTransition || 0) : 0;
    var ssT = treeData ? (treeData.screensaverTransition || 0) : 0;
    var ssTreePhaseVal = treeData ? (treeData.ssTreePhase || 0) : 0;
    var effectiveSS = ssT * (1 - ssTreePhaseVal);
    var treeAlpha = 1 - Math.max(chartT, effectiveSS);

    Renderer.clear();

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
    this.fadeDuration = 400;
    this.startTime = null;
    this.progress = 0;
    this.alpha = 1;
    this.fading = false;
    this.fadeStart = null;
    this.onComplete = null;
    this.completeFired = false;
  }

  BranchStrokeAnim.prototype.update = function(timestamp) {
    if (this.startTime === null) this.startTime = timestamp;
    var elapsed = timestamp - this.startTime;
    this.progress = Math.min(elapsed / this.duration, 1);
    this.progress = easeOutCubic(this.progress);

    // Fire onComplete once when stroke finishes, then begin fade
    if (this.progress >= 1 && !this.completeFired) {
      this.completeFired = true;
      this.fading = true;
      this.fadeStart = timestamp;
      if (this.onComplete) this.onComplete();
    }

    if (this.fading) {
      var fadeElapsed = timestamp - this.fadeStart;
      this.alpha = Math.max(0, 1 - fadeElapsed / this.fadeDuration);
    }
  };

  BranchStrokeAnim.prototype.draw = function(time) {
    if (this.alpha > 0) {
      Renderer.drawStrokePath(this.branchPath, this.color, this.progress, time, this.alpha);
    }
  };

  BranchStrokeAnim.prototype.isComplete = function() {
    return this.fading && this.alpha <= 0;
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
  function animatePledge(pledge, slot, onLeafComplete) {
    // Reserve the slot immediately so no other pledge takes it
    // But don't mark as occupied yet (so static renderer doesn't draw it)
    slot.reserved = true;

    var strokeAnim = new BranchStrokeAnim(slot.branchPath, pledge.pillar.color, 500);

    strokeAnim.onComplete = function() {
      // Start leaf grow animation — smooth unfurl at the stroke endpoint
      var rotation = (Math.random() - 0.5) * 1.2;
      var growAnim = new LeafGrowAnim(slot, pledge, 600);
      growAnim.rotation = rotation;

      growAnim.onComplete = function() {
        // Now mark as occupied so static renderer takes over
        slot.occupied = true;
        slot.leaf = pledge;
        slot.rotation = rotation;
        pledge.slotId = slot.id;
        if (onLeafComplete) onLeafComplete(slot, pledge);
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

  // Jump screensaver to a specific pillar (0-3)
  function jumpToPillar(pillarIndex) {
    if (!treeData) return;
    // Offset ssStartTime so elapsed time lands on the target pillar
    // Cycle: 5s initial hold, then 7s per pillar (5s hold + 2s fade)
    var now = performance.now() / 1000;
    var targetElapsed = 5 + pillarIndex * 7 + 0.1;
    treeData.ssStartTime = now - targetElapsed;
  }

  return {
    setTreeData: setTreeData,
    start: start,
    addAnimation: addAnimation,
    isAnimating: isAnimating,
    animatePledge: animatePledge,
    animateStrokeToSlot: animateStrokeToSlot,
    animateLeafGrow: animateLeafGrow,
    jumpToPillar: jumpToPillar,
    BranchStrokeAnim: BranchStrokeAnim,
    LeafGrowAnim: LeafGrowAnim
  };
})();
