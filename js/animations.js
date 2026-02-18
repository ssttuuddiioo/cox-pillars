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

    var chartT = treeData ? (treeData.chartTransition || 0) : 0;
    var treeAlpha = 1 - chartT;

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
      Renderer.drawLeaves(treeData.leafSlots, time, treeData.activeBranches, chartT);
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
  }

  LeafGrowAnim.prototype.update = function(timestamp) {
    if (this.startTime === null) this.startTime = timestamp;
    var elapsed = timestamp - this.startTime;
    var t = Math.min(elapsed / this.duration, 1);
    this.scale = easeOutBack(t);
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
      // Start leaf grow animation
      var rotation = (Math.random() - 0.5) * 1.2;
      var growAnim = new LeafGrowAnim(slot, pledge, 500);
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

  return {
    setTreeData: setTreeData,
    start: start,
    addAnimation: addAnimation,
    isAnimating: isAnimating,
    animatePledge: animatePledge,
    BranchStrokeAnim: BranchStrokeAnim,
    LeafGrowAnim: LeafGrowAnim
  };
})();
