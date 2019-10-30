
const express = require('express');
let app = express();

app.get('/pebble2d', (req, res) => {
    res.download('Pebble2d/Pebble2d.js');
});
