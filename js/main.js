/* ── main.js ── Bootstrap, state machine, event wiring ── */

(function() {

  var treeData;
  var canvas;
  var ctaText = document.getElementById('cta-text');
  var thankYou = document.getElementById('thank-you');
  var thankYouText = document.getElementById('thank-you-text');
  var totalPlaced = 0;
  var MAX_PLEDGES = 5000;
  var pendingClickPos = null;

  // ── Initialize ──
  function init() {
    canvas = document.getElementById('tree-canvas');
    Renderer.init(canvas);

    // Generate tree
    treeData = TreeGenerator.generate(42);
    treeData.chartMode = false;
    treeData.chartTransition = 0;
    treeData.chartLabels = [];
    treeData.windActive = false;
    treeData.windStrength = 0;

    // Setup systems
    Animations.setTreeData(treeData);
    Animations.start();
    Tooltip.init();

    PledgeForm.init(function(pledge) {
      // Called after form submit — place leaf near where user clicked
      exitChartMode();
      var slot;
      if (pendingClickPos) {
        slot = TreeGenerator.findNearestSlot(treeData, pendingClickPos.x, pendingClickPos.y);
        pendingClickPos = null;
      } else {
        slot = TreeGenerator.findAvailableSlot(treeData);
      }
      if (!slot) {
        showThankYou('The tree is fully grown!');
        return;
      }
      Animations.animatePledge(pledge, slot);
      totalPlaced++;
      checkBranchGrowth();
      updateCounter();
      showThankYou('Thank you, ' + pledge.name + '!');
    });

    wireCanvasEvents();
    wireControls();
    wireResize();
    updateCounter();
  }

  // ── Canvas click/touch -> leaf tooltip or open form ──
  function wireCanvasEvents() {
    var LEAF_HIT_RADIUS = 45;

    function handleInteraction(clientX, clientY) {
      if (PledgeForm.isOpen()) return;
      if (treeData.chartMode) return;

      var rect = canvas.getBoundingClientRect();
      var sx = clientX - rect.left;
      var sy = clientY - rect.top;
      var norm = Renderer.toNormalized(sx, sy);

      // Check if a leaf was hit
      var hitSlot = null;
      var hitDist = Infinity;

      for (var i = 0; i < treeData.leafSlots.length; i++) {
        var slot = treeData.leafSlots[i];
        if (!slot.occupied) continue;
        var d = dist(norm.x, norm.y, slot.x, slot.y);
        if (d < LEAF_HIT_RADIUS && d < hitDist) {
          hitSlot = slot;
          hitDist = d;
        }
      }

      if (hitSlot && hitSlot.leaf) {
        var screenPos = Renderer.toScreen(hitSlot.x, hitSlot.y);
        Tooltip.show(screenPos.x, screenPos.y, hitSlot.leaf);
      } else if (Tooltip.isVisible()) {
        Tooltip.hide();
      } else {
        if (isNearTree(norm.x, norm.y)) {
          pendingClickPos = { x: norm.x, y: norm.y };
          PledgeForm.open();
        }
      }
    }

    canvas.addEventListener('click', function(e) {
      handleInteraction(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var touch = e.touches[0];
      handleInteraction(touch.clientX, touch.clientY);
    }, { passive: false });
  }

  function isNearTree(nx, ny) {
    return nx > 100 && nx < 900 && ny > 100 && ny < 900;
  }

  // Place an animated leaf at the nearest slot to the click position
  function addPledgeAtPosition(nx, ny) {
    if (totalPlaced >= MAX_PLEDGES) {
      showThankYou('The tree is fully grown!');
      return;
    }

    var slot = TreeGenerator.findNearestSlot(treeData, nx, ny);
    if (!slot) {
      showThankYou('The tree is fully grown!');
      return;
    }

    var pledge = generateRandomPledge();
    PledgeStore.add(pledge);
    Animations.animatePledge(pledge, slot);
    totalPlaced++;
    checkBranchGrowth();
    updateCounter();
  }

  // ── Controls ──
  function wireControls() {
    var btn1x = document.getElementById('btn-1x');
    var btn10x = document.getElementById('btn-10x');
    var btnChart = document.getElementById('btn-chart');

    btn1x.addEventListener('click', function() {
      addSingleAnimatedPledge();
    });

    btn10x.addEventListener('click', function() {
      addBulkPledges(100);
    });

    btnChart.addEventListener('click', function() {
      toggleChart();
    });

    var btnWind = document.getElementById('btn-wind');
    btnWind.addEventListener('click', function() {
      treeData.windActive = !treeData.windActive;
      btnWind.classList.toggle('active', treeData.windActive);
    });
  }

  // Add a single pledge with full stroke + leaf grow animation
  function addSingleAnimatedPledge() {
    exitChartMode();
    if (totalPlaced >= MAX_PLEDGES) {
      showThankYou('The tree is fully grown!');
      return;
    }

    var slot = TreeGenerator.findAvailableSlot(treeData);
    if (!slot) {
      showThankYou('The tree is fully grown!');
      return;
    }

    var pledge = generateRandomPledge();
    PledgeStore.add(pledge);
    Animations.animatePledge(pledge, slot);
    totalPlaced++;
    checkBranchGrowth();
    updateCounter();
    showThankYou('+1 pledge (' + totalPlaced + ' total)');
  }

  // Check if we should grow new main branches based on total pledges
  function checkBranchGrowth() {
    var newActive = Math.min(5, Math.floor(totalPlaced / 100) + 1);
    if (newActive > treeData.activeBranches) {
      treeData.activeBranches = newActive;
    }
  }

  // Add pledges instantly (no per-pledge animation), capped at MAX_PLEDGES
  function addBulkPledges(count) {
    exitChartMode();
    var added = 0;
    for (var i = 0; i < count; i++) {
      if (totalPlaced >= MAX_PLEDGES) break;

      // Check growth so newly-opened branches get filled in same batch
      checkBranchGrowth();

      var slot = TreeGenerator.findAvailableSlot(treeData);
      if (!slot) break;

      var pledge = generateRandomPledge();
      PledgeStore.add(pledge);

      // Place immediately, no animation
      slot.occupied = true;
      slot.reserved = true;
      slot.leaf = pledge;
      slot.rotation = (Math.random() - 0.5) * 1.4;
      pledge.slotId = slot.id;

      totalPlaced++;
      added++;
    }

    checkBranchGrowth();
    updateCounter();

    if (added > 0) {
      showThankYou('+' + added + ' pledges (' + totalPlaced + ' total)');
    } else {
      showThankYou('The tree is fully grown!');
    }
  }

  // ── Chart toggle ──
  function exitChartMode() {
    if (treeData.chartMode) {
      treeData.chartMode = false;
      document.getElementById('btn-chart').classList.remove('active');
      ctaText.style.opacity = '1';
    }
  }

  function toggleChart() {
    treeData.chartMode = !treeData.chartMode;
    var btnChart = document.getElementById('btn-chart');
    if (treeData.chartMode) {
      computeChartLayout();
      btnChart.classList.add('active');
      ctaText.style.opacity = '0';
    } else {
      btnChart.classList.remove('active');
      ctaText.style.opacity = '1';
    }
  }

  function computeChartLayout() {
    var centerX = 500;
    var centerY = 500;

    // Group occupied slots by pillar
    var groups = [];
    for (var p = 0; p < PILLARS.length; p++) {
      groups.push({ pillar: PILLARS[p], slots: [] });
    }

    for (var i = 0; i < treeData.leafSlots.length; i++) {
      var slot = treeData.leafSlots[i];
      if (!slot.occupied || !slot.leaf) continue;
      for (var g = 0; g < groups.length; g++) {
        if (groups[g].pillar.id === slot.leaf.pillar.id) {
          groups[g].slots.push(slot);
          break;
        }
      }
    }

    var totalOccupied = 0;
    for (var g = 0; g < groups.length; g++) {
      totalOccupied += groups[g].slots.length;
    }

    if (totalOccupied === 0) return;

    // Adaptive spacing based on count
    var leafSpacing, ringGap;
    if (totalOccupied > 5000) {
      leafSpacing = 6; ringGap = 8;
    } else if (totalOccupied > 2000) {
      leafSpacing = 8; ringGap = 10;
    } else if (totalOccupied > 500) {
      leafSpacing = 12; ringGap = 14;
    } else if (totalOccupied > 200) {
      leafSpacing = 18; ringGap = 20;
    } else {
      leafSpacing = 22; ringGap = 24;
    }

    // Filter to active groups
    var activeGroups = [];
    for (var g = 0; g < groups.length; g++) {
      if (groups[g].slots.length > 0) activeGroups.push(groups[g]);
    }

    var GAP_ANGLE = 0.08;
    var totalGap = GAP_ANGLE * activeGroups.length;
    var availableAngle = Math.PI * 2 - totalGap;

    treeData.chartLabels = [];
    var startAngle = -Math.PI / 2;

    for (var gi = 0; gi < activeGroups.length; gi++) {
      var group = activeGroups[gi];
      var sectorAngle = (group.slots.length / totalOccupied) * availableAngle;
      var sectorMid = startAngle + sectorAngle / 2;

      // Pack leaves in concentric arcs within sector
      var leafIdx = 0;
      var ringRadius = 30;
      var maxRingRadius = 30;

      while (leafIdx < group.slots.length) {
        var arcLen = ringRadius * sectorAngle;
        var leavesInRing = Math.max(1, Math.floor(arcLen / leafSpacing));
        leavesInRing = Math.min(leavesInRing, group.slots.length - leafIdx);

        for (var li = 0; li < leavesInRing; li++) {
          var t = leavesInRing === 1 ? 0.5 : li / (leavesInRing - 1);
          var angle = startAngle + sectorAngle * (0.1 + t * 0.8);
          var cSlot = group.slots[leafIdx];
          cSlot.chartX = centerX + Math.cos(angle) * ringRadius;
          cSlot.chartY = centerY + Math.sin(angle) * ringRadius;
          leafIdx++;
        }

        maxRingRadius = ringRadius;
        ringRadius += ringGap;
      }

      treeData.chartLabels.push({
        pillar: group.pillar,
        angle: sectorMid,
        radius: maxRingRadius + 40,
        count: group.slots.length
      });

      startAngle += sectorAngle + GAP_ANGLE;
    }
  }

  function updateCounter() {
    var btn1x = document.getElementById('btn-1x');
    var btn10x = document.getElementById('btn-10x');
    if (totalPlaced >= MAX_PLEDGES) {
      btn10x.textContent = 'Full!';
      btn10x.disabled = true;
      btn1x.disabled = true;
    } else {
      btn10x.textContent = '+100';
    }
  }

  // ── Thank you overlay ──
  function showThankYou(text) {
    thankYouText.textContent = text;
    thankYou.classList.remove('hidden');
    thankYou.style.opacity = '1';

    setTimeout(function() {
      thankYou.style.opacity = '0';
      setTimeout(function() {
        thankYou.classList.add('hidden');
      }, 600);
    }, 2000);
  }

  // ── Resize ──
  function wireResize() {
    window.addEventListener('resize', debounce(function() {
      Renderer.resize();
    }, 200));
  }

  // ── Boot ──
  document.addEventListener('DOMContentLoaded', init);

})();
