/* ── main.js ── Bootstrap, state machine, event wiring ── */
/* v1: "Take the pledge" = auto-pledge to all 4 pillars at once */

(function() {

  var treeData;
  var canvas;
  var thankYouTop, thankYouBottom, thankYouCount, thankYouTally;
  var totalPlaced = 0;
  var totalPeople = 0;
  var MAX_PLEDGES = 5000;
  var pendingSlot = null;
  var BRANCH_HIT_RADIUS = 60;
  var thankYouTimer = null;
  var hiddenSlots = [];
  var pledgingFromScreensaver = false;
  var idleTimer = null;
  var IDLE_TIMEOUT = 60000; // 1 minute

  // ── About page content per pillar ──
  var PILLAR_KEYS = ['blue', 'turquoise', 'green', 'orange'];
  var ABOUT_CONTENT = {
    blue: {
      icon: '../assets/svg/blue-icon.svg',
      title: 'COX\nCarbon & Climate',
      subtitle: 'Reducing our carbon footprint through innovation and sustainable energy solutions.',
      body: '<p>Pellentesque et nisi quis ipsum aliquam laoreet ut in elit. Vestibulum id ex magna. Proin eu pharetra eros. Sed id neque odio. Pellentesque aliquam lacus sed mi gravida, sed faucibus odio lacinia. Vestibulum a velit placerat, semper urna in, mollis libero. Suspendisse eget purus condimentum lectus maximus tempor vitae id ligula. Nunc a ornare lorem, ut placerat sapien. Cras cursus massa magna, at porttitor mauris posuere non. Fusce ac odio porttitor, aliquam purus sit amet, blandit lectus. Ut quis nunc ut lectus sodales facilisis.</p><p>Nullam felis lacus, pulvinar non faucibus vitae, elementum eu turpis. Pellentesque rhoncus pellentesque lorem, vel faucibus neque laoreet eget. Vivamus lobortis sed leo et pellentesque. Nunc sollicitudin sollicitudin venenatis. Phasellus est nibh, bibendum id arcu in, tempus dictum urna. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Etiam suscipit non eros at pretium. Aliquam magna elit, mollis quis tellus ac, tempor ullamcorper lectus. Fusce at pharetra ligula, a pretium sem. Integer placerat neque vitae est venenatis congue.</p><p>Cras aliquam ac arcu eu sodales. Phasellus congue pulvinar quam, ut euismod nisl ullamcorper ut. Quisque a placerat orci. Sed ligula libero, mollis vitae dignissim interdum, pretium et ipsum. Duis eu nibh ex. Cras vitae arcu feugiat, sagittis ex vitae, consequat nisl. Donec fringilla arcu ac augue porta tempor sit amet at nisi. Pellentesque molestie justo sed nulla finibus, id placerat sem pharetra. Sed eleifend consectetur ultricies.</p><p>Donec cursus, risus ut maximus rutrum, neque erat facilisis mauris, cursus fermentum augue sem et libero. Curabitur tincidunt diam et arcu posuere lacinia a eu ipsum. Phasellus a est velit. Phasellus rutrum nulla non luctus egestas. Maecenas ut laoreet eros, a convallis augue.</p>'
    },
    turquoise: {
      icon: '../assets/svg/torquois-icon.svg',
      title: 'COX\nWater',
      subtitle: 'Preserving and protecting our most precious natural resource for future generations.',
      body: '<p>Pellentesque et nisi quis ipsum aliquam laoreet ut in elit. Vestibulum id ex magna. Proin eu pharetra eros. Sed id neque odio. Pellentesque aliquam lacus sed mi gravida, sed faucibus odio lacinia. Vestibulum a velit placerat, semper urna in, mollis libero. Suspendisse eget purus condimentum lectus maximus tempor vitae id ligula. Nunc a ornare lorem, ut placerat sapien. Cras cursus massa magna, at porttitor mauris posuere non. Fusce ac odio porttitor, aliquam purus sit amet, blandit lectus. Ut quis nunc ut lectus sodales facilisis.</p><p>Nullam felis lacus, pulvinar non faucibus vitae, elementum eu turpis. Pellentesque rhoncus pellentesque lorem, vel faucibus neque laoreet eget. Vivamus lobortis sed leo et pellentesque. Nunc sollicitudin sollicitudin venenatis. Phasellus est nibh, bibendum id arcu in, tempus dictum urna. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Etiam suscipit non eros at pretium. Aliquam magna elit, mollis quis tellus ac, tempor ullamcorper lectus. Fusce at pharetra ligula, a pretium sem. Integer placerat neque vitae est venenatis congue.</p><p>Cras aliquam ac arcu eu sodales. Phasellus congue pulvinar quam, ut euismod nisl ullamcorper ut. Quisque a placerat orci. Sed ligula libero, mollis vitae dignissim interdum, pretium et ipsum. Duis eu nibh ex. Cras vitae arcu feugiat, sagittis ex vitae, consequat nisl. Donec fringilla arcu ac augue porta tempor sit amet at nisi. Pellentesque molestie justo sed nulla finibus, id placerat sem pharetra. Sed eleifend consectetur ultricies.</p><p>Donec cursus, risus ut maximus rutrum, neque erat facilisis mauris, cursus fermentum augue sem et libero. Curabitur tincidunt diam et arcu posuere lacinia a eu ipsum. Phasellus a est velit. Phasellus rutrum nulla non luctus egestas. Maecenas ut laoreet eros, a convallis augue.</p>'
    },
    green: {
      icon: '../assets/svg/green-icon.svg',
      title: 'COX\nCircularity & Waste',
      subtitle: 'Embracing circular economy principles to minimize waste and maximize resource efficiency.',
      body: '<p>Pellentesque et nisi quis ipsum aliquam laoreet ut in elit. Vestibulum id ex magna. Proin eu pharetra eros. Sed id neque odio. Pellentesque aliquam lacus sed mi gravida, sed faucibus odio lacinia. Vestibulum a velit placerat, semper urna in, mollis libero. Suspendisse eget purus condimentum lectus maximus tempor vitae id ligula. Nunc a ornare lorem, ut placerat sapien. Cras cursus massa magna, at porttitor mauris posuere non. Fusce ac odio porttitor, aliquam purus sit amet, blandit lectus. Ut quis nunc ut lectus sodales facilisis.</p><p>Nullam felis lacus, pulvinar non faucibus vitae, elementum eu turpis. Pellentesque rhoncus pellentesque lorem, vel faucibus neque laoreet eget. Vivamus lobortis sed leo et pellentesque. Nunc sollicitudin sollicitudin venenatis. Phasellus est nibh, bibendum id arcu in, tempus dictum urna. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Etiam suscipit non eros at pretium. Aliquam magna elit, mollis quis tellus ac, tempor ullamcorper lectus. Fusce at pharetra ligula, a pretium sem. Integer placerat neque vitae est venenatis congue.</p><p>Cras aliquam ac arcu eu sodales. Phasellus congue pulvinar quam, ut euismod nisl ullamcorper ut. Quisque a placerat orci. Sed ligula libero, mollis vitae dignissim interdum, pretium et ipsum. Duis eu nibh ex. Cras vitae arcu feugiat, sagittis ex vitae, consequat nisl. Donec fringilla arcu ac augue porta tempor sit amet at nisi. Pellentesque molestie justo sed nulla finibus, id placerat sem pharetra. Sed eleifend consectetur ultricies.</p><p>Donec cursus, risus ut maximus rutrum, neque erat facilisis mauris, cursus fermentum augue sem et libero. Curabitur tincidunt diam et arcu posuere lacinia a eu ipsum. Phasellus a est velit. Phasellus rutrum nulla non luctus egestas. Maecenas ut laoreet eros, a convallis augue.</p>'
    },
    orange: {
      icon: '../assets/svg/orange-icon.svg',
      title: 'COX\nHabitat & Species',
      subtitle: 'Protecting biodiversity and restoring natural habitats across our communities.',
      body: '<p>Pellentesque et nisi quis ipsum aliquam laoreet ut in elit. Vestibulum id ex magna. Proin eu pharetra eros. Sed id neque odio. Pellentesque aliquam lacus sed mi gravida, sed faucibus odio lacinia. Vestibulum a velit placerat, semper urna in, mollis libero. Suspendisse eget purus condimentum lectus maximus tempor vitae id ligula. Nunc a ornare lorem, ut placerat sapien. Cras cursus massa magna, at porttitor mauris posuere non. Fusce ac odio porttitor, aliquam purus sit amet, blandit lectus. Ut quis nunc ut lectus sodales facilisis.</p><p>Nullam felis lacus, pulvinar non faucibus vitae, elementum eu turpis. Pellentesque rhoncus pellentesque lorem, vel faucibus neque laoreet eget. Vivamus lobortis sed leo et pellentesque. Nunc sollicitudin sollicitudin venenatis. Phasellus est nibh, bibendum id arcu in, tempus dictum urna. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Etiam suscipit non eros at pretium. Aliquam magna elit, mollis quis tellus ac, tempor ullamcorper lectus. Fusce at pharetra ligula, a pretium sem. Integer placerat neque vitae est venenatis congue.</p><p>Cras aliquam ac arcu eu sodales. Phasellus congue pulvinar quam, ut euismod nisl ullamcorper ut. Quisque a placerat orci. Sed ligula libero, mollis vitae dignissim interdum, pretium et ipsum. Duis eu nibh ex. Cras vitae arcu feugiat, sagittis ex vitae, consequat nisl. Donec fringilla arcu ac augue porta tempor sit amet at nisi. Pellentesque molestie justo sed nulla finibus, id placerat sem pharetra. Sed eleifend consectetur ultricies.</p><p>Donec cursus, risus ut maximus rutrum, neque erat facilisis mauris, cursus fermentum augue sem et libero. Curabitur tincidunt diam et arcu posuere lacinia a eu ipsum. Phasellus a est velit. Phasellus rutrum nulla non luctus egestas. Maecenas ut laoreet eros, a convallis augue.</p>'
    }
  };

  // ── Initialize ──
  function init() {
    canvas = document.getElementById('tree-canvas');
    Renderer.init(canvas);

    // Generate tree
    treeData = TreeGenerator.generate(42);
    treeData.chartMode = false;
    treeData.chartTransition = 0;
    treeData.chartLabels = [];
    treeData.windActive = true;
    treeData.windStrength = 0;

    // Setup systems
    Animations.setTreeData(treeData);
    Animations.start();
    Tooltip.init();

    // Cache thank-you overlay elements
    thankYouTop = document.getElementById('thank-you-top');
    thankYouBottom = document.getElementById('thank-you-bottom');
    thankYouCount = document.getElementById('thank-you-count');
    thankYouTally = document.getElementById('thank-you-tally');

    PledgeForm.init(function(data) {
      // Called after form submit — data = { name }
      // Create 4 pledges (one per pillar) with colored strokes from trunk base

      // Release the pending slot reservation (we'll find fresh slots for all 4)
      if (pendingSlot) {
        pendingSlot.reserved = false;
        pendingSlot = null;
      }

      // Persist entry locally
      EntryStore.add(data.name, data.email);

      // Hide all existing leaves so they can animate back in
      if (!pledgingFromScreensaver) {
        hideExistingLeaves();
      }

      var slotsPlaced = 0;
      var firstSlot = null;
      var firstPledge = null;
      for (var i = 0; i < PILLARS.length; i++) {
        var slot = TreeGenerator.findAvailableSlot(treeData);
        if (!slot) break;

        var pledge = createPledge(data.name, PILLARS[i], '');
        PledgeStore.add(pledge);

        if (i === 0) { firstSlot = slot; firstPledge = pledge; }

        // Stagger the 4 colored stroke + leaf grow animations
        (function(p, s, delay) {
          setTimeout(function() {
            Animations.animatePledge(p, s);
          }, delay);
        })(pledge, slot, i * 150);

        slotsPlaced++;
        totalPlaced++;
      }

      totalPeople++;
      checkBranchGrowth();
      updateCounter();

      if (slotsPlaced > 0) {
        showPledgeSequence(firstSlot, firstPledge);
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

    // Wire about page
    var ssAbout = document.getElementById('ss-about');
    if (ssAbout) {
      ssAbout.addEventListener('click', function() {
        var idx = getActiveScreensaverPillarIndex();
        openAbout(PILLAR_KEYS[idx]);
      });
    }
    var aboutBackBtn = document.getElementById('about-back-btn');
    if (aboutBackBtn) {
      aboutBackBtn.addEventListener('click', function() {
        closeAbout();
      });
    }

    wireCanvasEvents();
    wireControls();
    wireNavControls();
    wireResize();

    // Load persisted entries from localStorage
    EntryStore.load();

    // Seed 10 pledges on load (appear instantly, no animation)
    for (var si = 0; si < 40; si++) {
      var seedPledge = generateRandomPledge();
      PledgeStore.add(seedPledge);
      var seedSlot = TreeGenerator.findAvailableSlot(treeData);
      if (seedSlot) {
        seedSlot.occupied = true;
        seedSlot.leaf = seedPledge;
        seedSlot.rotation = (Math.random() - 0.5) * 1.2;
        seedPledge.slotId = seedSlot.id;
        totalPlaced++;
      }
    }
    totalPeople = 3 + EntryStore.count(); // seed + previously saved entries

    updateCounter();

    // Start idle timer — activate screensaver after 1 minute of no interaction
    var frame = document.getElementById('app-frame');
    ['click', 'touchstart', 'mousemove'].forEach(function(evt) {
      frame.addEventListener(evt, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();
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
    var count = hiddenSlots.length;
    if (count === 0) return 0;
    treeData.activeBranches = Math.min(5, Math.max(treeData.activeBranches, 3));

    // Sublinear total stagger: scales with sqrt(count) so large counts
    // don't take forever (~2.4s for 40, ~4.4s for 500, ~6.4s for 2000)
    var totalStagger = count <= 1 ? 0
      : Math.min(89 * Math.sqrt(count) + 2400, (count - 1) * 60);

    for (var i = 0; i < count; i++) {
      // Sqrt curve: first leaves arrive gracefully, pace builds up
      var t = count <= 1 ? 0 : i / (count - 1);
      var delay = totalStagger * Math.sqrt(t);
      (function(item, d) {
        setTimeout(function() {
          Animations.animateLeafGrow(item.pledge, item.slot);
        }, d);
      })(hiddenSlots[i], delay);
    }

    var totalDuration = totalStagger + 600;
    hiddenSlots = [];
    return totalDuration;
  }

  // ── Thank-you sequence — leaves first, then tooltip, then overlays ──
  function showPledgeSequence(tooltipSlot, tooltipPledge) {
    if (thankYouTimer) {
      clearTimeout(thankYouTimer);
      thankYouTimer = null;
    }

    var btnPledge = document.getElementById('btn-pledge');
    var ctaText = document.getElementById('cta-text');
    btnPledge.style.opacity = '0';
    btnPledge.style.pointerEvents = 'none';
    ctaText.style.opacity = '0';

    // Populate bottom tally
    thankYouCount.textContent = totalPeople.toString();

    // Reveal all hidden leaves with grow animation
    var revealDuration = revealHiddenLeaves();

    // New pledge anims: last starts at 3*150=450ms, stroke 500ms + grow 600ms = 1550ms
    var newPledgeDuration = 3 * 150 + 500 + 600;
    // Wait for whichever finishes last, shorten by 20%
    var allLeavesDone = Math.max(revealDuration, newPledgeDuration) * 0.8;

    // Phase 1: all leaves animate in
    // Phase 2: tooltip appears after leaves are done
    // Phase 3: thank-you overlays fade in after tooltip
    thankYouTimer = setTimeout(function() {
      // Show tooltip on the first pledge leaf
      if (tooltipSlot && tooltipPledge) {
        var sp = Renderer.toScreen(tooltipSlot.x, tooltipSlot.y);
        Tooltip.show(sp.x, sp.y, tooltipPledge, 6400);
      }

      // Show thank-you overlays shortly after tooltip
      thankYouTimer = setTimeout(function() {
        thankYouTop.classList.remove('hidden');
        thankYouTop.style.opacity = '1';

        thankYouBottom.classList.remove('hidden');
        thankYouBottom.style.opacity = '1';

        // Hold for 8 seconds after appearing, then fade out
        thankYouTimer = setTimeout(function() {
          thankYouTop.style.opacity = '0';
          thankYouBottom.style.opacity = '0';
          thankYouTimer = setTimeout(function() {
            thankYouTop.classList.add('hidden');
            thankYouBottom.classList.add('hidden');
            thankYouTimer = null;
            btnPledge.style.opacity = '';
            btnPledge.style.pointerEvents = '';
            ctaText.style.opacity = '';
            pledgingFromScreensaver = false;
          }, 800);
        }, 6400);
      }, 640);
    }, allLeavesDone);
  }

  // ── Canvas click/touch -> leaf tooltip or open form ──
  function wireCanvasEvents() {
    var LEAF_HIT_RADIUS = 45;

    function handleInteraction(clientX, clientY) {
      if (PledgeForm.isOpen()) return;
      if (isAboutOpen()) return;
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
        hitSlot.flutterStart = performance.now() / 1000;
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
    btn1x.addEventListener('click', function() {
      addSingleAnimatedPledge();
    });

    btn10x.addEventListener('click', function() {
      addBulkPledges(100);
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

  // ── Simple status overlay (for dev buttons / tree full) ──
  function showThankYou(text) {
    if (thankYouTimer) {
      clearTimeout(thankYouTimer);
      thankYouTimer = null;
    }
    thankYouCount.textContent = text;
    thankYouTally.textContent = '';
    thankYouBottom.classList.remove('hidden');
    thankYouBottom.style.opacity = '1';

    thankYouTimer = setTimeout(function() {
      thankYouBottom.style.opacity = '0';
      thankYouTimer = setTimeout(function() {
        thankYouBottom.classList.add('hidden');
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

  // ── About page ──
  function getActiveScreensaverPillarIndex() {
    if (!treeData || !treeData.screensaverMode || !treeData.ssStartTime) return 0;
    var elapsed = performance.now() / 1000 - treeData.ssStartTime;
    var cycleTime = elapsed - 5; // first 5s = blue
    if (cycleTime <= 0) return 0;
    var SS_HOLD = 5, SS_FADE = 2, SS_CYCLE = SS_HOLD + SS_FADE;
    var totalLen = 4 * SS_CYCLE;
    var pos = cycleTime % totalLen;
    return Math.floor(pos / SS_CYCLE) % 4;
  }

  function openAbout(pillarKey) {
    var content = ABOUT_CONTENT[pillarKey];
    if (!content) return;
    document.getElementById('about-pillar-icon').src = content.icon;
    document.getElementById('about-title').textContent = content.title;
    document.getElementById('about-subtitle').textContent = content.subtitle;
    document.getElementById('about-body').innerHTML = content.body;
    document.getElementById('about-modal').classList.remove('hidden');
    document.body.classList.add('about-open');
  }

  function closeAbout() {
    document.getElementById('about-modal').classList.add('hidden');
    document.body.classList.remove('about-open');
  }

  function isAboutOpen() {
    return !document.getElementById('about-modal').classList.contains('hidden');
  }

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function() {
      if (treeData && !treeData.screensaverMode && !PledgeForm.isOpen() && !isAboutOpen()) {
        enterScreensaver();
      }
    }, IDLE_TIMEOUT);
  }

  function enterScreensaver() {
    if (!treeData) return;
    if (PledgeForm.isOpen()) return;
    if (isAboutOpen()) closeAbout();
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
    // Clear dynamic button styles from screensaver cycling
    var btnPledge = document.getElementById('btn-pledge');
    if (btnPledge) {
      btnPledge.style.background = '';
      btnPledge.style.borderColor = '';
      btnPledge.style.boxShadow = '';
    }
    resetIdleTimer();
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

  // ── Chart mode helpers ──
  function exitChartMode() {
    if (!treeData) return;
    treeData.chartMode = false;
  }

  function enterChartMode() {
    if (!treeData) return;
    if (treeData.screensaverMode) exitScreensaver();
    if (PledgeForm.isOpen()) PledgeForm.close();
    treeData.chartMode = true;
  }

  // ── Page/state navigation ──
  function wireNavControls() {
    var navBtns = document.querySelectorAll('.nav-btn');
    var allBtns = Array.prototype.slice.call(navBtns);

    function setActive(state) {
      allBtns.forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-state') === state);
      });
    }

    allBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var state = btn.getAttribute('data-state');
        setActive(state);

        // Reset everything first
        if (isAboutOpen()) closeAbout();
        if (treeData.screensaverMode) exitScreensaver();
        if (PledgeForm.isOpen()) PledgeForm.close();
        if (treeData.chartMode) exitChartMode();
        if (thankYouTimer) {
          clearTimeout(thankYouTimer);
          thankYouTimer = null;
        }
        thankYouTop.classList.add('hidden');
        thankYouTop.style.opacity = '0';
        thankYouBottom.classList.add('hidden');
        thankYouBottom.style.opacity = '0';
        var btnPledge = document.getElementById('btn-pledge');
        var ctaText = document.getElementById('cta-text');
        btnPledge.style.opacity = '';
        btnPledge.style.pointerEvents = '';
        ctaText.style.opacity = '';

        // Then enter the requested state
        switch (state) {
          case 'tree':
            // Already reset to tree above
            break;
          case 'form':
            PledgeForm.open();
            break;
          case 'screensaver':
            enterScreensaver();
            break;
          case 'thankyou':
            // Simulate full post-submit animation: hide leaves, animate 4 new
            // pledges in with tooltip, then reveal everything with thank-you overlays
            hideExistingLeaves();

            var demoName = DUMMY_NAMES[Math.floor(Math.random() * DUMMY_NAMES.length)];
            var demoFirstSlot = null;
            var demoFirstPledge = null;
            for (var pi = 0; pi < PILLARS.length; pi++) {
              var demoSlot = TreeGenerator.findAvailableSlot(treeData);
              if (!demoSlot) break;

              var demoPledge = createPledge(demoName, PILLARS[pi], '');
              PledgeStore.add(demoPledge);

              if (pi === 0) { demoFirstSlot = demoSlot; demoFirstPledge = demoPledge; }

              (function(p, s, delay) {
                setTimeout(function() {
                  Animations.animatePledge(p, s);
                }, delay);
              })(demoPledge, demoSlot, pi * 150);

              totalPlaced++;
            }
            totalPeople++;
            checkBranchGrowth();
            updateCounter();
            showPledgeSequence(demoFirstSlot, demoFirstPledge);
            break;
          case 'about':
            openAbout(PILLAR_KEYS[0]);
            break;
          case 'chart':
            enterChartMode();
            break;
        }
      });
    });
  }

  // ── Boot ──
  document.addEventListener('DOMContentLoaded', init);

})();
