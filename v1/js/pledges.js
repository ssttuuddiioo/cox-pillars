/* ── pledges.js ── Pillar definitions, pledge model, dummy generator ── */

var PILLARS = [
  { id: 'climate',     name: 'Climate & Carbon',    color: '#4CAF50', icon: '\uD83C\uDF3F' },
  { id: 'circularity', name: 'Circularity & Waste', color: '#26A69A', icon: '\u267B' },
  { id: 'water',       name: 'Water',               color: '#42A5F5', icon: '\uD83D\uDCA7' },
  { id: 'habitat',     name: 'Habitat & Species',   color: '#EF5350', icon: '\uD83D\uDC3E' }
];

var pledgeIdCounter = 0;

var PledgeStore = {
  pledges: [],

  add: function(pledge) {
    this.pledges.push(pledge);
    return pledge;
  },

  getBySlotId: function(slotId) {
    for (var i = 0; i < this.pledges.length; i++) {
      if (this.pledges[i].slotId === slotId) return this.pledges[i];
    }
    return null;
  },

  count: function() {
    return this.pledges.length;
  }
};

function createPledge(name, pillar, message) {
  return {
    id: ++pledgeIdCounter,
    name: name,
    pillar: pillar,
    message: message || '',
    timestamp: Date.now(),
    slotId: null
  };
}

// ── Server-side persistence for pledge entries (name + email) ──

var EntryStore = {
  _count: 0,

  load: function() {
    var self = this;
    fetch('/api/entries')
      .then(function(r) { return r.json(); })
      .then(function(data) { self._count = data.count || 0; })
      .catch(function() { self._count = 0; });
  },

  add: function(name, email) {
    var self = this;
    fetch('/api/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email || '' })
    })
      .then(function(r) { return r.json(); })
      .then(function(data) { self._count = data.count || self._count + 1; })
      .catch(function() { self._count++; });
  },

  count: function() {
    return this._count;
  }
};

// ── Dummy Data ──

var DUMMY_NAMES = [
  'Alex R.', 'Maria S.', 'James T.', 'Priya K.', 'Carlos M.',
  'Sarah L.', 'David W.', 'Emma C.', 'Michael B.', 'Lisa H.',
  'Jordan P.', 'Ana G.', 'Chris F.', 'Nina D.', 'Tom V.',
  'Rachel Q.', 'Kevin Z.', 'Olivia N.', 'Sam Y.', 'Laura X.',
  'Diego A.', 'Sophie E.', 'Ryan I.', 'Maya O.', 'Jake U.',
  'Zoe R.', 'Ethan J.', 'Chloe W.', 'Noah M.', 'Ava B.'
];

var DUMMY_MESSAGES = [
  'Hoping for a cleaner future!',
  'Reducing my carbon footprint',
  'Committed to zero waste',
  'Conserving water daily',
  'Protecting local wildlife',
  'For the next generation',
  'Small steps, big change',
  'Every drop counts',
  'Think green, live green',
  '',
  '',
  '',
  ''
];

function generateRandomPledge() {
  var pillar = PILLARS[Math.floor(Math.random() * PILLARS.length)];
  var name = DUMMY_NAMES[Math.floor(Math.random() * DUMMY_NAMES.length)];
  var message = DUMMY_MESSAGES[Math.floor(Math.random() * DUMMY_MESSAGES.length)];
  return createPledge(name, pillar, message);
}
