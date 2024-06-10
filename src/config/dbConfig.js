const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lvtn'
});

connection.connect((err) => {
  if (err) {
    console.error('Kết nối thất bại: ' + err.stack);
    return;
  }
  console.log('Kết nối thành công với ID: ' + connection.threadId);
});

module.exports = connection;
