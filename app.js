const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');
//const session = require('express-session');
const cookieParser = require("cookie-parser");


const app = express();

// Sử dụng middleware
//app.set('trust proxy', 1)
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true  // Cho phép gửi và nhận cookie
  }));
app.use(express.json());
app.use(cookieParser());
    
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
