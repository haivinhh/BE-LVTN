const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');

const app = express();

// Sử dụng middleware
app.use(cors());
app.use(express.json());

// Sử dụng các định tuyến
app.use('/api', routes);

module.exports = app;
