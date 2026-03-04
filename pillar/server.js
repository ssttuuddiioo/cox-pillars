var express = require('express');
var path = require('path');
var fs = require('fs');
var app = express();
var PORT = process.env.PORT || 3333;
var PILLAR = process.env.PILLAR || 'carbon';
var MEDIA_PATH = process.env.MEDIA_PATH || path.join(__dirname, 'media');

// Serve app static files
app.use(express.static(path.join(__dirname)));

// Serve shared brand assets
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// Serve media files (video, photos) from configurable local path
app.use('/media', express.static(MEDIA_PATH));

// API: return the pillar config JSON
app.get('/api/config', function(req, res) {
  var pillar = req.query.p || PILLAR;
  var jsonPath = path.join(__dirname, 'content', pillar + '.json');
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: 'Pillar config not found: ' + PILLAR });
  }
  var data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  res.json(data);
});

app.listen(PORT, function() {
  console.log('Cox Pillars [' + PILLAR + '] running on http://localhost:' + PORT);
});
