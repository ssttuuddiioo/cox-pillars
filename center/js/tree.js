/* ── tree.js ── Procedural tree with round canopy and distributed leaves ── */

var TreeGenerator = (function() {

  var NORMALIZED_W = 1000;
  var NORMALIZED_H = 1000;

  function generate(seed) {
    var rng = new SeededRandom(seed || 42);
    var allBranches = [];
    var leafSlots = [];

    var MAX_DEPTH = 6;
    var TRUNK_X = NORMALIZED_W / 2;
    var TRUNK_Y = NORMALIZED_H * 0.78;
    var TRUNK_LEN = NORMALIZED_H * 0.154;
    var TRUNK_ANGLE = Math.PI / 2;

    var root = buildBranch(
      rng, allBranches, leafSlots,
      TRUNK_X, TRUNK_Y, TRUNK_LEN, TRUNK_ANGLE,
      0, MAX_DEPTH, [], -1
    );

    return {
      root: root,
      allBranches: allBranches,
      leafSlots: leafSlots,
      maxDepth: MAX_DEPTH,
      normalizedW: NORMALIZED_W,
      normalizedH: NORMALIZED_H,
      activeBranches: 5
    };
  }

  function buildBranch(rng, allBranches, leafSlots, sx, sy, length, angle, depth, maxDepth, pathSoFar, mainBranchIndex) {
    var ex = sx + Math.cos(angle) * length;
    var ey = sy - Math.sin(angle) * length;

    // Organic curve control point
    var curviness = mapRange(depth, 0, maxDepth, 0.06, 0.28);
    var perpAngle = angle + Math.PI / 2;
    var curveOffset = length * curviness * (rng.next() - 0.5) * 2;
    var midX = (sx + ex) / 2 + Math.cos(perpAngle) * curveOffset;
    var midY = (sy + ey) / 2 - Math.sin(perpAngle) * curveOffset;

    var branch = {
      id: uid(),
      start: { x: sx, y: sy },
      end: { x: ex, y: ey },
      cp: { x: midX, y: midY },
      depth: depth,
      thickness: mapRange(depth, 0, maxDepth, 8, 0.8),
      angle: angle,
      length: length,
      children: [],
      mainBranchIndex: mainBranchIndex
    };

    var currentPath = pathSoFar.concat([branch]);
    allBranches.push(branch);

    // ── Leaf slots distributed along branches ──
    if (depth >= 1) {
      var numLeaves = 5 + depth * 5;

      for (var li = 0; li < numLeaves; li++) {
        var leafT;
        if (numLeaves === 1) {
          leafT = 0.5 + rng.range(-0.1, 0.1);
        } else {
          var baseT = 0.2 + (0.72 * li / (numLeaves - 1));
          leafT = baseT + rng.range(-0.06, 0.06);
        }
        leafT = Math.max(0.15, Math.min(0.95, leafT));
        var lx = quadBezierAt(sx, midX, ex, leafT);
        var ly = quadBezierAt(sy, midY, ey, leafT);
        var offsetDist = rng.range(3, 8 + depth * 4);
        var side = rng.next() < 0.5 ? 1 : -1;
        var offAngle = angle + side * Math.PI / 2;
        lx += Math.cos(offAngle) * offsetDist;
        ly -= Math.sin(offAngle) * offsetDist;

        leafSlots.push({
          id: uid(),
          x: lx, y: ly,
          branchPath: currentPath,
          branchT: leafT,
          occupied: false, reserved: false,
          leaf: null,
          angle: angle + rng.range(-0.8, 0.8),
          depth: depth,
          mainBranchIndex: mainBranchIndex
        });
      }
    }

    // Terminal: leaf at tip
    if (depth === maxDepth) {
      leafSlots.push({
        id: uid(),
        x: ex, y: ey,
        branchPath: currentPath,
        branchT: 1.0,
        occupied: false, reserved: false,
        leaf: null,
        angle: angle + rng.range(-0.5, 0.5),
        depth: depth,
        mainBranchIndex: mainBranchIndex
      });
      return branch;
    }

    // ── Children ──
    if (depth === 0) {
      // 5 clean, evenly spaced main branches
      var fanAngles = [
        Math.PI / 6,        // 30deg - right
        Math.PI / 3,        // 60deg - inner right
        Math.PI / 2,        // 90deg - straight up
        Math.PI * 2 / 3,    // 120deg - inner left
        Math.PI * 5 / 6     // 150deg - left
      ];
      for (var i = 0; i < fanAngles.length; i++) {
        var childAngle = fanAngles[i] + rng.range(-0.06, 0.06);
        var angleFactor = Math.sin(childAngle);
        var childLength = length * (0.50 + angleFactor * 0.35) * rng.range(0.92, 1.08);

        var child = buildBranch(
          rng, allBranches, leafSlots,
          ex, ey, childLength, childAngle,
          depth + 1, maxDepth, currentPath, i
        );
        branch.children.push(child);
      }
    } else {
      var numChildren = 2;
      var spread = mapRange(depth, 1, maxDepth, 0.45, 0.25);

      for (var j = 0; j < numChildren; j++) {
        var t = (j / (numChildren - 1)) - 0.5;

        var cAngle = angle + t * spread * 2 + rng.range(-0.08, 0.08);
        var cAngleFactor = Math.sin(Math.max(0, Math.min(Math.PI, cAngle)));
        var cLength = length * rng.range(0.65, 0.82) * (0.75 + cAngleFactor * 0.25);

        // Gentle clamp: keep above slight-downward
        if (cAngle < -0.35) cAngle = -0.35 + rng.range(0, 0.1);
        if (cAngle > Math.PI + 0.35) cAngle = Math.PI + 0.35 - rng.range(0, 0.1);

        var child = buildBranch(
          rng, allBranches, leafSlots,
          ex, ey, cLength, cAngle,
          depth + 1, maxDepth, currentPath, mainBranchIndex
        );
        branch.children.push(child);
      }
    }

    return branch;
  }

  function quadBezierAt(p0, p1, p2, t) {
    var mt = 1 - t;
    return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
  }

  function quadBezierLength(sx, sy, cpx, cpy, ex, ey) {
    var segments = 8;
    var total = 0;
    var prevX = sx;
    var prevY = sy;
    for (var i = 1; i <= segments; i++) {
      var t = i / segments;
      var x = quadBezierAt(sx, cpx, ex, t);
      var y = quadBezierAt(sy, cpy, ey, t);
      total += dist(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
    return total;
  }

  function pathLength(branchPath) {
    var total = 0;
    for (var i = 0; i < branchPath.length; i++) {
      var b = branchPath[i];
      total += quadBezierLength(b.start.x, b.start.y, b.cp.x, b.cp.y, b.end.x, b.end.y);
    }
    return total;
  }

  function findAvailableSlot(treeData) {
    var available = [];
    for (var i = 0; i < treeData.leafSlots.length; i++) {
      var s = treeData.leafSlots[i];
      if (!s.occupied && !s.reserved && s.mainBranchIndex < treeData.activeBranches) {
        available.push(s);
      }
    }
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  function occupiedCount(treeData) {
    var count = 0;
    for (var i = 0; i < treeData.leafSlots.length; i++) {
      if (treeData.leafSlots[i].occupied) count++;
    }
    return count;
  }

  function findNearestSlot(treeData, nx, ny) {
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < treeData.leafSlots.length; i++) {
      var s = treeData.leafSlots[i];
      if (s.occupied || s.reserved || s.mainBranchIndex >= treeData.activeBranches) continue;
      var d = dist(nx, ny, s.x, s.y);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  return {
    generate: generate,
    pathLength: pathLength,
    findAvailableSlot: findAvailableSlot,
    findNearestSlot: findNearestSlot,
    occupiedCount: occupiedCount,
    quadBezierAt: quadBezierAt,
    quadBezierLength: quadBezierLength
  };
})();
