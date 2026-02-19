/* ── main.js ── Bootstrap, state machine, event wiring ── */
/* v1: "Take the pledge" = auto-pledge to all 4 pillars at once */

(function() {

  var treeData;
  var canvas;
  var ctaText = document.getElementById('cta-text');
  var thankYou = document.getElementById('thank-you');
  var thankYouText = document.getElementById('thank-you-text');
  var totalPlaced = 0;
  var totalPeople = 0;
  var MAX_PLEDGES = 5000;
  var pendingSlot = null;
  var BRANCH_HIT_RADIUS = 60;
  var thankYouTimer = null;
  var hiddenSlots = [];
  var pledgingFromScreensaver = false;

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

    PledgeForm.init(function(data) {
      // Called after form submit — data = { name }
      // Create 4 pledges (one per pillar) with colored strokes from trunk base
      exitChartMode();

      // Release the pending slot reservation (we'll find fresh slots for all 4)
      if (pendingSlot) {
        pendingSlot.reserved = false;
        pendingSlot = null;
      }

      var slotsPlaced = 0;
      for (var i = 0; i < PILLARS.length; i++) {
        var slot = TreeGenerator.findAvailableSlot(treeData);
        if (!slot) break;

        var pledge = createPledge(data.name, PILLARS[i], '');
        PledgeStore.add(pledge);

        // Stagger the 4 colored stroke + leaf grow animations
        (function(p, s, delay) {
          setTimeout(function() {
            Animations.animatePledge(p, s);
          }, delay);
        })(pledge, slot, i * 400);

        slotsPlaced++;
        totalPlaced++;
      }

      totalPeople++;
      checkBranchGrowth();
      updateCounter();

      if (slotsPlaced > 0) {
        // Phase 1: Thank-you message appears immediately
        showPledgeSequence(data.name);
      } else {
        showThankYou('The tree is fully grown!');
      }
    }, function() {
      // Called when modal dismissed without submit — unreserve slot
      if (pendingSlot) {
        pendingSlot.reserved = false;
        pendingSlot = null;
      }
      if (pledgingFromScreensaver) {
        restoreHiddenLeaves();
        pledgingFromScreensaver = false;
      }
    });

    // Screensaver state
    treeData.screensaverMode = false;
    treeData.screensaverTransition = 0;

    wireCanvasEvents();
    wireControls();
    wireResize();
    updateCounter();
  }

  // ── Hide/restore/reveal helpers for screensaver→pledge flow ──
  function hideExistingLeaves() {
    hiddenSlots = [];
    for (var i = 0; i < treeData.leafSlots.length; i++) {
      var slot = treeData.leafSlots[i];
      if (slot.occupied && slot.leaf) {
        hiddenSlots.push({ slot: slot, pledge: slot.leaf });
        slot.occupied = false;
        // Keep reserved = true so new pledge doesn't steal this slot
        slot.reserved = true;
      }
    }
  }

  function restoreHiddenLeaves() {
    for (var i = 0; i < hiddenSlots.length; i++) {
      hiddenSlots[i].slot.occupied = true;
    }
    hiddenSlots = [];
  }

  function revealHiddenLeaves() {
    if (hiddenSlots.length === 0) return;
    treeData.activeBranches = Math.min(5, Math.max(treeData.activeBranches, 3));
    var stagger = Math.max(10, Math.min(60, 3000 / hiddenSlots.length));
    for (var i = 0; i < hiddenSlots.length; i++) {
      (function(item, delay) {
        setTimeout(function() {
          Animations.animateLeafGrow(item.pledge, item.slot);
        }, delay);
      })(hiddenSlots[i], i * stagger);
    }
    hiddenSlots = [];
  }

  // ── Thank-you sequence with dynamic tally ──
  function showPledgeSequence(name) {
    if (thankYouTimer) {
      clearTimeout(thankYouTimer);
      thankYouTimer = null;
    }

    var btnPledge = document.getElementById('btn-pledge');
    btnPledge.style.opacity = '0';
    btnPledge.style.pointerEvents = 'none';

    var previousPeople = totalPeople - 1;

    function finish() {
      thankYou.style.opacity = '0';
      thankYouTimer = setTimeout(function() {
        thankYou.classList.add('hidden');
        thankYouTimer = null;
        btnPledge.style.opacity = '';
        btnPledge.style.pointerEvents = '';
        pledgingFromScreensaver = false;
      }, 1000);
    }

    thankYou.classList.remove('hidden');

    if (previousPeople === 0) {
      // First person ever
      thankYouText.textContent = 'Congrats, you\'re the first person to pledge!';
      thankYou.style.opacity = '1';
      thankYouTimer = setTimeout(finish, 5000);
    } else {
      // Phase 1: Personal thank-you
      thankYouText.textContent = 'Thank you for pledging.';
      thankYou.style.opacity = '1';

      thankYouTimer = setTimeout(function() {
        // Crossfade
        thankYou.style.opacity = '0';

        thankYouTimer = setTimeout(function() {
          // Phase 2: Tally + bloom wave (if from screensaver)
          thankYouText.textContent = totalPeople + ' people have also taken the pledge.';
          thankYou.style.opacity = '1';

          if (pledgingFromScreensaver) {
            revealHiddenLeaves();
          }

          thankYouTimer = setTimeout(finish, 5500);
        }, 800);
      }, 3500);
    }
  }

  // ── Canvas click/touch -> leaf tooltip or open form ──
  function wireCanvasEvents() {
    var LEAF_HIT_RADIUS = 45;

    function handleInteraction(clientX, clientY) {
      if (PledgeForm.isOpen()) return;
      if (treeData.chartMode) return;
      if (pendingSlot) return; // stroke animation in progress

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
        if (totalPlaced >= MAX_PLEDGES) {
          showThankYou('The tree is fully grown!');
          return;
        }
        // Find nearest available slot to the click
        var nearestSlot = TreeGenerator.findNearestSlot(treeData, norm.x, norm.y);
        if (nearestSlot) {
          var slotDist = dist(norm.x, norm.y, nearestSlot.x, nearestSlot.y);
          if (slotDist < BRANCH_HIT_RADIUS) {
            // Near a branch — yellow stroke animation, then open modal
            pendingSlot = nearestSlot;
            Animations.animateStrokeToSlot(nearestSlot, function() {
              PledgeForm.open();
            });
            return;
          }
        }
        // Not near a branch — open modal immediately
        if (isNearTree(norm.x, norm.y)) {
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

    var btnPledge = document.getElementById('btn-pledge');
    btnPledge.addEventListener('click', function() {
      if (totalPlaced >= MAX_PLEDGES) {
        showThankYou('The tree is fully grown!');
        return;
      }
      if (treeData && treeData.screensaverMode) {
        pledgingFromScreensaver = true;
        exitScreensaver();
        hideExistingLeaves();
      }
      PledgeForm.open();
    });

    var btnSS = document.getElementById('btn-screensaver');
    btnSS.addEventListener('click', function() {
      if (treeData.screensaverMode) {
        exitScreensaver();
        btnSS.classList.remove('active');
      } else {
        enterScreensaver();
        btnSS.classList.add('active');
      }
    });
  }

  // Add 4 pledges (one per pillar) with staggered colored strokes
  function addSingleAnimatedPledge() {
    exitChartMode();
    if (totalPlaced >= MAX_PLEDGES) {
      showThankYou('The tree is fully grown!');
      return;
    }

    var slotsPlaced = 0;
    var name = DUMMY_NAMES[Math.floor(Math.random() * DUMMY_NAMES.length)];

    for (var i = 0; i < PILLARS.length; i++) {
      var slot = TreeGenerator.findAvailableSlot(treeData);
      if (!slot) break;

      var pledge = createPledge(name, PILLARS[i], '');
      PledgeStore.add(pledge);

      (function(p, s, delay) {
        setTimeout(function() {
          Animations.animatePledge(p, s);
        }, delay);
      })(pledge, slot, i * 400);

      slotsPlaced++;
      totalPlaced++;
    }

    totalPeople++;
    checkBranchGrowth();
    updateCounter();

    if (slotsPlaced > 0) {
      showThankYou('+' + slotsPlaced + ' leaves (' + totalPlaced + ' total)');
    } else {
      showThankYou('The tree is fully grown!');
    }
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

    totalPeople += added;
    checkBranchGrowth();
    updateCounter();

    if (added <= 0) {
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

    // Filter to active groups
    var activeGroups = [];
    for (var g = 0; g < groups.length; g++) {
      if (groups[g].slots.length > 0) activeGroups.push(groups[g]);
    }

    // Cluster centers spread around the canvas organically
    var clusterCenters = [
      { x: 300, y: 350 },
      { x: 700, y: 350 },
      { x: 300, y: 650 },
      { x: 700, y: 650 }
    ];

    // Adaptive leaf spacing based on count
    var spacing;
    if (totalOccupied > 5000) {
      spacing = 7;
    } else if (totalOccupied > 2000) {
      spacing = 9;
    } else if (totalOccupied > 500) {
      spacing = 13;
    } else if (totalOccupied > 100) {
      spacing = 18;
    } else {
      spacing = 24;
    }

    // Use seeded random for stable layout
    var chartRng = new SeededRandom(7);

    treeData.chartLabels = [];

    for (var gi = 0; gi < activeGroups.length; gi++) {
      var group = activeGroups[gi];
      var cx = clusterCenters[gi % clusterCenters.length].x;
      var cy = clusterCenters[gi % clusterCenters.length].y;

      // Place leaves in an organic spiral with jitter
      var leafIdx = 0;
      var angle = chartRng.next() * Math.PI * 2;
      var radius = 0;
      var maxR = 0;

      while (leafIdx < group.slots.length) {
        var jitterR = chartRng.range(-spacing * 0.3, spacing * 0.3);
        var jitterA = chartRng.range(-0.3, 0.3);
        var lx = cx + Math.cos(angle + jitterA) * (radius + jitterR);
        var ly = cy + Math.sin(angle + jitterA) * (radius + jitterR);

        group.slots[leafIdx].chartX = lx;
        group.slots[leafIdx].chartY = ly;

        if (radius + jitterR > maxR) maxR = radius + jitterR;
        leafIdx++;

        // Advance along a loose spiral
        angle += spacing / Math.max(radius, spacing) * 1.2;
        radius += spacing / (Math.PI * 2) * (spacing / Math.max(radius, spacing)) * 3;
      }

      treeData.chartLabels.push({
        pillar: group.pillar,
        cx: cx,
        cy: cy,
        radius: Math.max(maxR, 30),
        count: group.slots.length
      });
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

  // ── Simple thank you overlay (for dev buttons / tree full) ──
  function showThankYou(text) {
    if (thankYouTimer) {
      clearTimeout(thankYouTimer);
      thankYouTimer = null;
    }
    thankYouText.textContent = text;
    thankYou.classList.remove('hidden');
    thankYou.style.opacity = '1';

    thankYouTimer = setTimeout(function() {
      thankYou.style.opacity = '0';
      thankYouTimer = setTimeout(function() {
        thankYou.classList.add('hidden');
        thankYouTimer = null;
      }, 600);
    }, 2000);
  }

  // ── Resize ──
  function wireResize() {
    window.addEventListener('resize', debounce(function() {
      Renderer.resize();
    }, 200));
  }

  function enterScreensaver() {
    if (!treeData) return;
    if (PledgeForm.isOpen()) return;
    if (treeData.chartMode) exitChartMode();

    treeData.screensaverMode = true;
    treeData.ssStartTime = performance.now() / 1000;
    computeScreensaverLayout();
    document.body.classList.add('screensaver-active');
  }

  function exitScreensaver() {
    if (!treeData) return;
    treeData.screensaverMode = false;
    document.body.classList.remove('screensaver-active');
    var btnSS = document.getElementById('btn-screensaver');
    if (btnSS) btnSS.classList.remove('active');
  }

  function computeScreensaverLayout() {
    var rng = new SeededRandom(13);
    var centerX = 500;
    var centerY = 470;
    var SS_LEAF_COUNT = 200;

    // 3 blue shades
    var BLUES = ['#1a3366', '#2d6bc4', '#7ab5eb'];

    // Collect all occupied slots
    var occupied = [];
    for (var i = 0; i < treeData.leafSlots.length; i++) {
      var slot = treeData.leafSlots[i];
      if (slot.occupied && slot.leaf) {
        occupied.push(slot);
      }
    }

    // Always show exactly SS_LEAF_COUNT leaves — fill with virtual slots if needed
    var virtualSlots = [];
    while (occupied.length + virtualSlots.length < SS_LEAF_COUNT) {
      // Pick a random real slot to clone visuals from, or use defaults
      var donor = occupied.length > 0
        ? occupied[Math.floor(rng.next() * occupied.length)]
        : null;
      var pillar = donor ? donor.leaf.pillar : PILLARS[Math.floor(rng.next() * PILLARS.length)];
      virtualSlots.push({
        id: 90000 + virtualSlots.length,
        x: centerX + rng.range(-80, 80),
        y: centerY + rng.range(-80, 80),
        occupied: true,
        reserved: false,
        mainBranchIndex: -1,
        rotation: rng.range(-0.7, 0.7),
        branchPath: donor ? donor.branchPath : [],
        branchT: 1,
        leaf: { pillar: pillar, name: '', message: '' },
        _virtual: true
      });
    }
    var allSlots = occupied.concat(virtualSlots);
    if (allSlots.length === 0) return;

    // ── Concentric ring layout ──
    var leafSpacing = 20;
    var ringGap = leafSpacing * 1.5;  // radial distance between rings

    // Build complete rings only (no partial rings = no stragglers)
    var positions = [];
    // Ring 0: center point
    positions.push({ x: centerX, y: centerY, ring: 0, distFromCenter: 0 });

    var ringIndex = 2;
    while (positions.length < allSlots.length) {
      var ringRadius = ringIndex * ringGap;
      var circumference = 1.5 * Math.PI * ringRadius;
      var countInRing = Math.max(6, Math.floor(circumference / leafSpacing));

      // Only add this ring if we can complete it or need it
      // If adding the full ring would overshoot, only add if we need most of it
      var remaining = allSlots.length - positions.length;
      if (remaining < countInRing * 0.5 && positions.length > 1) break;

      var angleOffset = (ringIndex % 2 === 1) ? (Math.PI / countInRing) : 0;

      for (var ci = 0; ci < countInRing; ci++) {
        var angle = (ci / countInRing) * Math.PI * 2 + angleOffset;
        positions.push({
          x: centerX + Math.cos(angle) * ringRadius,
          y: centerY + Math.sin(angle) * ringRadius,
          ring: ringIndex,
          distFromCenter: ringRadius
        });
      }
      ringIndex++;
    }

    // Trim allSlots to match available complete-ring positions
    if (allSlots.length > positions.length) {
      allSlots.length = positions.length;
    }

    // The disc radius is determined by the outermost ring
    var discRadius = (ringIndex - 1) * ringGap + leafSpacing * 0.5;

    // Scale pattern: alternate bigger/smaller per ring, tapering outward
    // Ring 0 (center): large. Even rings: medium-large. Odd rings: medium-small.
    var maxRing = ringIndex - 1;

    // Assign positions to slots in ring order (center first = depth behind)
    for (var j = 0; j < allSlots.length; j++) {
      var slot = allSlots[j];
      var pt = positions[j];

      slot.ssX = pt.x + rng.range(-0.5, 0.5);
      slot.ssY = pt.y + rng.range(-0.5, 0.5);

      // Color: distribute evenly across rings for balance
      var ringFrac = maxRing > 0 ? pt.ring / maxRing : 0;
      var colorIdx;
      if (ringFrac < 0.35) colorIdx = 0;       // navy
      else if (ringFrac < 0.7) colorIdx = 1;    // medium blue
      else colorIdx = 2;                        // light blue
      if (rng.next() < 0.25) colorIdx = Math.floor(rng.next() * BLUES.length);
      slot.ssColor = BLUES[colorIdx];
      slot.ssColorIndex = colorIdx;

      // Scale: dramatic gradient — large center, small edges
      var baseFalloff = maxRing > 0 ? lerp(1.6, 0.6, ringFrac) : 1.5;
      var ringMod = (pt.ring % 2 === 0) ? 1.08 : 0.92;
      slot.ssScale = baseFalloff * ringMod * rng.range(0.93, 1.07);

      // Rotation: radial outward (sunburst) with slight organic jitter
      var radialAngle = Math.atan2(pt.y - centerY, pt.x - centerX);
      slot.ssRotation = radialAngle + Math.PI / 2 + rng.range(-0.15, 0.15);

      // Depth index (center = highest index = drawn last = on top)
      slot.ssDepthIndex = j;

      // Wind seed
      slot.ssWindSeed = rng.range(0.3, 1.0);

      // Shadow offset
      slot.ssShadowDx = 3;
      slot.ssShadowDy = 4;
    }

    // Pre-sort for renderer (edges first / center on top)
    allSlots.sort(function(a, b) { return (b.ssDepthIndex || 0) - (a.ssDepthIndex || 0); });
    treeData.ssSortedSlots = allSlots;

    // Store disc params
    treeData.ssRadius = discRadius;
    treeData.ssCenterX = centerX;
    treeData.ssCenterY = centerY;

    // Generate stem lines extending past boundary
    treeData.ssStems = [];
    var stemCount = Math.min(8, Math.floor(allSlots.length / 30) + 3);
    for (var s = 0; s < stemCount; s++) {
      var stemAngle = rng.next() * Math.PI * 2;
      var stemStartR = discRadius * rng.range(0.7, 0.95);
      var stemEndR = discRadius * rng.range(1.05, 1.35);
      treeData.ssStems.push({
        x1: centerX + Math.cos(stemAngle) * stemStartR,
        y1: centerY + Math.sin(stemAngle) * stemStartR,
        x2: centerX + Math.cos(stemAngle + rng.range(-0.08, 0.08)) * stemEndR,
        y2: centerY + Math.sin(stemAngle + rng.range(-0.08, 0.08)) * stemEndR,
        width: rng.range(0.5, 1.5)
      });
    }
  }

  // ── Boot ──
  document.addEventListener('DOMContentLoaded', init);

})();
