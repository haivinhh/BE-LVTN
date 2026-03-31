const connection = require('../models/db');

/**
 * Base Repository – promisify tất cả query callback-based
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Wrapper chuyển callback-based query → Promise
   */
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }

  async findAll(conditions = {}, columns = '*') {
    const keys = Object.keys(conditions);
    if (keys.length === 0) {
      return this.query(`SELECT ${columns} FROM ${this.tableName}`);
    }
    const where = keys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
    return this.query(`SELECT ${columns} FROM ${this.tableName} WHERE ${where}`, Object.values(conditions));
  }

  async findOne(conditions = {}) {
    const results = await this.findAll(conditions);
    return results[0] || null;
  }

  async findById(idColumn, id) {
    const results = await this.query(`SELECT * FROM ${this.tableName} WHERE "${idColumn}" = $1`, [id]);
    return results[0] || null;
  }

  async insert(data) {
    const keys = Object.keys(data);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(data);
    const result = await this.query(
      `INSERT INTO ${this.tableName} (${cols}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return result[0];
  }

  async update(idColumn, id, data) {
    const keys = Object.keys(data);
    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = [...Object.values(data), id];
    const result = await this.query(
      `UPDATE ${this.tableName} SET ${sets} WHERE "${idColumn}" = $${keys.length + 1} RETURNING *`,
      values,
    );
    return result[0] || null;
  }

  async delete(idColumn, id) {
    const result = await this.query(
      `DELETE FROM ${this.tableName} WHERE "${idColumn}" = $1 RETURNING *`,
      [id],
    );
    return result[0] || null;
  }

  async count(conditions = {}) {
    const keys = Object.keys(conditions);
    let sql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    let params = [];
    if (keys.length > 0) {
      const where = keys.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
      sql += ` WHERE ${where}`;
      params = Object.values(conditions);
    }
    const result = await this.query(sql, params);
    return parseInt(result[0]?.total || 0, 10);
  }
}

module.exports = BaseRepository;
