
let PORT = process.env.PORT || 8000;
const express = require('express');
let app = express();

app.get('/', (req, res) => {
    res.send('lol');
});

app.get('/pebble2d', (req, res) => {
    res.download('Pebble2d/Pebble2d.js');
});

app.listen(PORT);
