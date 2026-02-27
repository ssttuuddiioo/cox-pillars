var express = require('express');
var path = require('path');
var fs = require('fs');
var app = express();
var PORT = process.env.PORT || 3333;

var CSV_PATH = path.join(__dirname, 'v1', 'data', 'entries.csv');
var CSV_HEADER = 'Name,Email,Date\n';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Ensure data directory and CSV header exist
function ensureCSV() {
  var dir = path.dirname(CSV_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CSV_PATH)) fs.writeFileSync(CSV_PATH, CSV_HEADER);
}

// Count data rows in the CSV (excluding header)
function countEntries() {
  if (!fs.existsSync(CSV_PATH)) return 0;
  var content = fs.readFileSync(CSV_PATH, 'utf8').trim();
  var lines = content.split('\n');
  return Math.max(0, lines.length - 1); // subtract header
}

app.post('/api/entry', function(req, res) {
  var name = (req.body.name || '').trim();
  var email = (req.body.email || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });

  ensureCSV();
  var date = new Date().toISOString();
  var row = '"' + name.replace(/"/g, '""') + '","' + email.replace(/"/g, '""') + '","' + date + '"\n';
  fs.appendFileSync(CSV_PATH, row);

  res.json({ ok: true, count: countEntries() });
});

app.get('/api/entries', function(req, res) {
  res.json({ count: countEntries() });
});

app.listen(PORT, function() {
  console.log('Cox Pillars Tree running on http://localhost:' + PORT);
});
