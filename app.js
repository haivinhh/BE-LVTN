const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');
//const session = require('express-session');


const app = express();

// Sử dụng middleware
//app.set('trust proxy', 1)
app.use(cors());
app.use(express.json());
//app.use(express.static('puplic'));

// app.use(session({
//     secret: 'keyboard cat',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false }
//   }));

// Sử dụng các định tuyến
app.use('/api', routes);

module.exports = app;
