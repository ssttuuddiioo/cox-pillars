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
      var ssTarget = (treeData.screensaverMode && treeData.ssShowRadial !== false) ? 1 : 0;
      if (treeData.screensaverTransition < ssTarget) {
        treeData.screensaverTransition = Math.min(ssTarget, treeData.screensaverTransition + 0.013);
      } else if (treeData.screensaverTransition > ssTarget) {
        treeData.screensaverTransition = Math.max(ssTarget, treeData.screensaverTransition - 0.024);
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
      var SS_PILLAR_HOLD = 13;
      var SS_PILLAR_FADE = 2;
      var SS_PILLAR_CYCLE = SS_PILLAR_HOLD + SS_PILLAR_FADE; // 15s per pillar
      var SS_TREE_HOLD = 58;
      var SS_TREE_FADE = 2;
      var SS_TREE_CYCLE = SS_TREE_HOLD + SS_TREE_FADE; // 60s for tree
      var SS_TOTAL_LOOP = 4 * SS_PILLAR_CYCLE + SS_TREE_CYCLE; // 120s

      // First 5 seconds: show blue
      var cycleTime = ssElapsed - 5;
      var activeIdx = 0;
      var fadeOut = false;
      var withinSlot = 0;
      if (cycleTime > 0) {
        var pos = cycleTime % SS_TOTAL_LOOP;
        if (pos < 4 * SS_PILLAR_CYCLE) {
          activeIdx = Math.floor(pos / SS_PILLAR_CYCLE);
          withinSlot = pos - activeIdx * SS_PILLAR_CYCLE;
          fadeOut = withinSlot > SS_PILLAR_HOLD;
        } else {
          activeIdx = 4;
          withinSlot = pos - 4 * SS_PILLAR_CYCLE;
          fadeOut = withinSlot > SS_TREE_HOLD;
        }
      }
      // Toggle ssShowRadial during fade periods so leaf transition
      // starts at the same time as the background crossfade (not after it)
      if (activeIdx === 3 && fadeOut) {
        treeData.ssShowRadial = false;  // Orange fading to tree: start leaves→tree now
      } else if (activeIdx === 4 && fadeOut) {
        treeData.ssShowRadial = true;   // Tree fading to blue: start leaves→radial now
      } else {
        treeData.ssShowRadial = (activeIdx !== 4);
      }

      var currentHold = (activeIdx === 4) ? SS_TREE_HOLD : SS_PILLAR_HOLD;
      var currentFade = 2;

      // SVG overlays (only 4 — tree phase has none)
      for (var si = 0; si < ssSvgs.length; si++) {
        var svgOpacity = 0;
        if (activeIdx < 4 && si === activeIdx) {
          if (fadeOut) {
            // Gradual fade out for ALL pillar transitions
            svgOpacity = 1 - (withinSlot - currentHold) / currentFade;
          } else {
            svgOpacity = 1;
          }
        } else if (activeIdx < 4 && fadeOut) {
          var nextIdx = (activeIdx + 1) % 5;
          if (nextIdx < 4 && si === nextIdx) {
            // Gradual fade in for ALL pillar transitions
            svgOpacity = (withinSlot - currentHold) / currentFade;
          }
        } else if (activeIdx === 4 && fadeOut && si === 0) {
          // Tree fading into Blue — fade blue SVG in
          svgOpacity = (withinSlot - currentHold) / currentFade;
        }
        if (ssSvgs[si]) ssSvgs[si].style.opacity = String(svgOpacity);
      }

      // Header blocks — cycle pillar icons during tree phase
      var ICON_CYCLE = 3, ICON_FADE = 0.5, ICON_HOLD = ICON_CYCLE - ICON_FADE;
      var blockOpacities = [0, 0, 0, 0, 0];
      var iconOnly = [false, false, false, false, false];

      if (activeIdx === 4 && !fadeOut) {
        // Tree hold: cycle 4 pillar icons every 3s with crossfade
        var iconIdx = Math.floor(withinSlot / ICON_CYCLE) % 4;
        var iconWithin = withinSlot - Math.floor(withinSlot / ICON_CYCLE) * ICON_CYCLE;
        var iconFading = iconWithin > ICON_HOLD;
        blockOpacities[iconIdx] = iconFading ? 1 - (iconWithin - ICON_HOLD) / ICON_FADE : 1;
        iconOnly[iconIdx] = true;
        if (iconFading) {
          var nextIcon = (iconIdx + 1) % 4;
          blockOpacities[nextIcon] = (iconWithin - ICON_HOLD) / ICON_FADE;
          iconOnly[nextIcon] = true;
        }
      } else if (activeIdx === 3 && fadeOut) {
        // Orange→tree fade: orange (full) out, first icon (icon-only) in
        var fp = (withinSlot - currentHold) / currentFade;
        blockOpacities[3] = 1 - fp;
        blockOpacities[0] = fp;
        iconOnly[0] = true; // incoming icon is icon-only
      } else if (activeIdx === 4 && fadeOut) {
        // Tree→blue fade: last cycling icon out (icon-only), blue in (full)
        var fp = (withinSlot - currentHold) / currentFade;
        var lastIcon = Math.floor(SS_TREE_HOLD / ICON_CYCLE) % 4;
        blockOpacities[lastIcon] = 1 - fp;
        iconOnly[lastIcon] = true;
        blockOpacities[0] = fp; // blue comes in full (iconOnly stays false)
      } else {
        // Normal pillar cycling (pillars 0-3)
        blockOpacities[activeIdx] = 1;
        if (fadeOut) {
          blockOpacities[activeIdx] = 1 - (withinSlot - currentHold) / currentFade;
          var nextIdx = (activeIdx + 1) % 5;
          if (nextIdx < 5) blockOpacities[nextIdx] = (withinSlot - currentHold) / currentFade;
        }
      }

      for (var si = 0; si < ssBlocks.length; si++) {
        if (!ssBlocks[si]) continue;
        ssBlocks[si].style.opacity = String(blockOpacities[si]);
        var hideText = blockOpacities[si] > 0 && iconOnly[si];
        var tEl = ssBlocks[si].querySelector('.ss-header-title');
        var bEl = ssBlocks[si].querySelector('.ss-header-blurb');
        if (tEl) tEl.style.display = hideText ? 'none' : '';
        if (bEl) bEl.style.display = hideText ? 'none' : '';
      }

      // Hide ABOUT link during tree phase
      var ssAboutEl = document.getElementById('ss-about');
      if (ssAboutEl) {
        ssAboutEl.style.opacity = (activeIdx === 4 && !fadeOut) ? '0' : '';
        ssAboutEl.style.pointerEvents = (activeIdx === 4 && !fadeOut) ? 'none' : '';
      }

      // Show pledge count only during tree phase (idx 4) + idle tree view
      var ssPledgeEl = document.getElementById('ss-pledge-count');
      if (ssPledgeEl) {
        if (activeIdx === 4 && !fadeOut) {
          ssPledgeEl.style.opacity = '1';
        } else if (activeIdx === 4 && fadeOut) {
          // Fade out as tree transitions to blue
          var fadeOutVal = 1 - (withinSlot - currentHold) / currentFade;
          ssPledgeEl.style.opacity = String(fadeOutVal);
        } else if (activeIdx === 3 && fadeOut) {
          // Fade in as we transition from orange to tree
          var fadeIn = (withinSlot - currentHold) / currentFade;
          ssPledgeEl.style.opacity = String(fadeIn);
        } else {
          ssPledgeEl.style.opacity = '0';
        }
      }

      // Cycle 5 tooltips during tree phase (60s total, ~12s each)
      if (activeIdx === 4 && !fadeOut && typeof Tooltip !== 'undefined' && treeData) {
        var treeTimeInPhase = withinSlot;
        var TT_COUNT = 5;
        var TT_CYCLE = SS_TREE_HOLD / TT_COUNT; // ~11.6s each
        var TT_HOLD = TT_CYCLE - 3; // visible time
        var TT_FADE_IN = 1;
        var TT_FADE_OUT = 1;
        var ttIdx = Math.floor(treeTimeInPhase / TT_CYCLE);
        var ttWithin = treeTimeInPhase - ttIdx * TT_CYCLE;

        if (!treeData._ssTooltipSlots || treeData._ssTooltipCycle !== true) {
          // Pick 5 random occupied leaf slots for tooltip cycling
          var occupied = [];
          for (var oi = 0; oi < treeData.leafSlots.length; oi++) {
            if (treeData.leafSlots[oi].occupied && treeData.leafSlots[oi].leaf) {
              occupied.push(treeData.leafSlots[oi]);
            }
          }
          // Shuffle and pick up to 5
          for (var sh = occupied.length - 1; sh > 0; sh--) {
            var rj = Math.floor(Math.random() * (sh + 1));
            var tmp = occupied[sh]; occupied[sh] = occupied[rj]; occupied[rj] = tmp;
          }
          treeData._ssTooltipSlots = occupied.slice(0, TT_COUNT);
          treeData._ssTooltipCycle = true;
          treeData._ssTooltipLastIdx = -1;
        }

        if (ttIdx < TT_COUNT && treeData._ssTooltipSlots.length > 0) {
          var slotIdx = ttIdx % treeData._ssTooltipSlots.length;
          var ttSlot = treeData._ssTooltipSlots[slotIdx];

          if (ttWithin < TT_FADE_IN + TT_HOLD + TT_FADE_OUT) {
            // Show this tooltip
            if (treeData._ssTooltipLastIdx !== ttIdx) {
              treeData._ssTooltipLastIdx = ttIdx;
              var frame = document.getElementById('app-frame');
              var frameRect = frame ? frame.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
              var screenPos = Renderer.toScreen(ttSlot.x, ttSlot.y);
              Tooltip.show(screenPos.x, screenPos.y, ttSlot.leaf, TT_HOLD * 1000 + TT_FADE_OUT * 1000);
            }
          }
        }
      } else if (activeIdx !== 4) {
        // Reset tooltip cycle when leaving tree phase
        if (treeData) {
          treeData._ssTooltipCycle = false;
          treeData._ssTooltipSlots = null;
          treeData._ssTooltipLastIdx = -1;
        }
        Tooltip.hide();
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
        var blend = (withinSlot - currentHold) / currentFade;
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
          var blend = (withinSlot - currentHold) / currentFade;
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
      // Hide all overlays when not in screensaver
      var ssSvgEls = document.querySelectorAll('#ss-overlays > img');
      for (var si = 0; si < ssSvgEls.length; si++) {
        ssSvgEls[si].style.opacity = '0';
      }
      // Restore default background
      document.body.style.background = '';
      // Restore pledge count visibility for idle tree view
      var ssPledgeEl = document.getElementById('ss-pledge-count');
      if (ssPledgeEl) ssPledgeEl.style.opacity = '';

      // Cycle pillar icons above tree (same as screensaver tree phase)
      var ssHeaderEl = document.getElementById('ss-header');
      if (ssHeaderEl) ssHeaderEl.style.opacity = '1';
      var IDLE_CYCLE = 3, IDLE_FADE = 0.5, IDLE_HOLD = IDLE_CYCLE - IDLE_FADE;
      var idleBlocks = document.querySelectorAll('#ss-header .ss-pillar-block');
      var idleIdx = Math.floor(time / IDLE_CYCLE) % 4;
      var idleWithin = time - Math.floor(time / IDLE_CYCLE) * IDLE_CYCLE;
      var idleFading = idleWithin > IDLE_HOLD;
      for (var si = 0; si < idleBlocks.length; si++) {
        if (!idleBlocks[si]) continue;
        var op = 0;
        if (si === idleIdx) op = idleFading ? 1 - (idleWithin - IDLE_HOLD) / IDLE_FADE : 1;
        if (idleFading && si === (idleIdx + 1) % 4) op = (idleWithin - IDLE_HOLD) / IDLE_FADE;
        idleBlocks[si].style.opacity = String(op);
        // Icon only — hide title and blurb
        var tEl = idleBlocks[si].querySelector('.ss-header-title');
        var bEl = idleBlocks[si].querySelector('.ss-header-blurb');
        if (tEl) tEl.style.display = 'none';
        if (bEl) bEl.style.display = 'none';
      }
    }

    var chartT = treeData ? (treeData.chartTransition || 0) : 0;
    var ssT = treeData ? (treeData.screensaverTransition || 0) : 0;
    var treeAlpha = 1 - Math.max(chartT, ssT);

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
