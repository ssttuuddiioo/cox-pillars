var express = require('express');
var path = require('path');
var app = express();
var PORT = process.env.PORT || 3333;

app.use(express.static(path.join(__dirname)));

app.listen(PORT, function() {
  console.log('Cox Pillars Tree running on http://localhost:' + PORT);
});
