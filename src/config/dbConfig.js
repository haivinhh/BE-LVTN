const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:      { rejectUnauthorized: false },
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Kết nối thất bại:', err.stack);
    return;
  }
  release();
  console.log('Kết nối Supabase/PostgreSQL thành công!');
});

const connection = {
  query: (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    if (!params) params = [];

    pool.query(sql, params.length ? params : undefined, (err, result) => {
      if (err) {
        console.error('Query error:', err.message);
        console.error('SQL:', sql);
        return callback(err, null);
      }
      const rows = result.rows || [];
      Object.defineProperty(rows, 'affectedRows', { value: result.rowCount || 0, enumerable: false });
      if (rows.length > 0) {
        const firstRow = rows[0];
        const idKey = Object.keys(firstRow).find(k => k.toLowerCase().startsWith('id'));
        if (idKey) {
          Object.defineProperty(rows, 'insertId', { value: firstRow[idKey], enumerable: false });
        }
      }
      callback(null, rows);
    });
  },

  escape: (val) => {
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
    if (val === null || val === undefined) return 'NULL';
    return val;
  },
};

module.exports = connection;
