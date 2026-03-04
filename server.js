var express = require('express');
var path = require('path');
var fs = require('fs');
var app = express();
var PORT = process.env.PORT || 3000;

app.use(express.json());

// ── Shared brand assets ──
app.use('/shared', express.static(path.join(__dirname, 'shared')));

// ════════════════════════════════════════
//  CENTER APP  →  /center/
// ════════════════════════════════════════
var centerRouter = express.Router();
var CENTER_CSV = path.join(__dirname, 'center', 'data', 'entries.csv');
var CSV_HEADER = 'Name,Email,Date\n';

function ensureCSV() {
  var dir = path.dirname(CENTER_CSV);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CENTER_CSV)) fs.writeFileSync(CENTER_CSV, CSV_HEADER);
}

function countEntries() {
  if (!fs.existsSync(CENTER_CSV)) return 0;
  var content = fs.readFileSync(CENTER_CSV, 'utf8').trim();
  var lines = content.split('\n');
  return Math.max(0, lines.length - 1);
}

centerRouter.use(express.static(path.join(__dirname, 'center')));
centerRouter.use('/shared', express.static(path.join(__dirname, 'shared')));

centerRouter.post('/api/entry', function(req, res) {
  var name = (req.body.name || '').trim();
  var email = (req.body.email || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  ensureCSV();
  var date = new Date().toISOString();
  var row = '"' + name.replace(/"/g, '""') + '","' + email.replace(/"/g, '""') + '","' + date + '"\n';
  fs.appendFileSync(CENTER_CSV, row);
  res.json({ ok: true, count: countEntries() });
});

centerRouter.get('/api/entries', function(req, res) {
  res.json({ count: countEntries() });
});

app.use('/center', centerRouter);

// ════════════════════════════════════════
//  PILLAR APP  →  /pillar/?p=carbon
// ════════════════════════════════════════
var pillarRouter = express.Router();
var MEDIA_PATH = process.env.MEDIA_PATH || path.join(__dirname, 'pillar', 'media');

pillarRouter.use(express.static(path.join(__dirname, 'pillar')));
pillarRouter.use('/shared', express.static(path.join(__dirname, 'shared')));
pillarRouter.use('/media', express.static(MEDIA_PATH));

pillarRouter.get('/api/config', function(req, res) {
  var pillar = req.query.p || process.env.PILLAR || 'carbon';
  var jsonPath = path.join(__dirname, 'pillar', 'content', pillar + '.json');
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: 'Pillar config not found: ' + pillar });
  }
  var data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  res.json(data);
});

app.use('/pillar', pillarRouter);

// ── Root redirect ──
app.get('/', function(req, res) {
  res.send(
    '<h2>Cox Conserves</h2>' +
    '<ul>' +
    '<li><a href="/center/">Center App</a></li>' +
    '<li><a href="/pillar/?p=carbon">Pillar: Carbon &amp; Climate</a></li>' +
    '<li><a href="/pillar/?p=water">Pillar: Water</a></li>' +
    '<li><a href="/pillar/?p=circularity">Pillar: Circularity &amp; Waste</a></li>' +
    '<li><a href="/pillar/?p=habitat">Pillar: Habitat &amp; Species</a></li>' +
    '</ul>'
  );
});

app.listen(PORT, function() {
  console.log('Cox Conserves running on http://localhost:' + PORT);
  console.log('  Center:  http://localhost:' + PORT + '/center/');
  console.log('  Pillar:  http://localhost:' + PORT + '/pillar/?p=carbon');
});
