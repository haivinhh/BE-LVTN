const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');
//const session = require('express-session');
const cookieParser = require("cookie-parser");


const app = express();

// Sử dụng middleware
//app.set('trust proxy', 1)
const allowedOrigins = [
  'http://localhost:3000',
  /\.vercel\.app$/,  // cho phép tất cả subdomain của vercel.app
];

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép request không có origin (mobile app, curl, Postman...)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
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
