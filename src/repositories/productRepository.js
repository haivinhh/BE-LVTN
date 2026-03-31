const BaseRepository = require('./baseRepository');

class ProductRepository extends BaseRepository {
  constructor() {
    super('sanpham');
  }

  async findAllWithFilter({ minPrice, maxPrice, idDanhMuc, idDongDT, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (minPrice !== undefined) { conditions.push(`sp."donGia" >= $${idx++}`); params.push(minPrice); }
    if (maxPrice !== undefined) { conditions.push(`sp."donGia" <= $${idx++}`); params.push(maxPrice); }
    if (idDanhMuc !== undefined) { conditions.push(`sp."danhMucSP" = $${idx++}`); params.push(idDanhMuc); }
    if (idDongDT !== undefined) { conditions.push(`sp."dongDT" = $${idx++}`); params.push(idDongDT); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    params.push(limit, offset);
    const sql = `
      SELECT sp.*, d."tenDongDT", dm."tenDanhMuc"
      FROM sanpham sp
      LEFT JOIN dongdt d ON sp."dongDT" = d."idDongDT"
      LEFT JOIN danhmucsp dm ON sp."danhMucSP" = dm."idDanhMuc"
      ${where}
      ORDER BY sp."idSanPham" DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    return this.query(sql, params);
  }

  async searchByName(name) {
    return this.query(
      `SELECT * FROM sanpham WHERE "tenSanPham" ILIKE $1 ORDER BY "idSanPham" DESC`,
      [`%${name}%`],
    );
  }

  async findByDanhMuc(idDanhMuc) {
    return this.query(`SELECT * FROM sanpham WHERE "danhMucSP" = $1`, [idDanhMuc]);
  }

  async findByDongDT(idDongDT) {
    return this.query(`SELECT * FROM sanpham WHERE "dongDT" = $1`, [idDongDT]);
  }

  async findByLoaiDT(idLoaiDT) {
    return this.query(`
      SELECT sp.*
      FROM sanpham sp
      JOIN dongdt d ON sp."dongDT" = d."idDongDT"
      WHERE d."loaiDienThoai" = $1
    `, [idLoaiDT]);
  }

  async getPhoneModelsByPhoneType(idSanPham) {
    return this.query(`
      SELECT d2.*
      FROM sanpham sp
      JOIN dongdt d1 ON sp."dongDT" = d1."idDongDT"
      JOIN dongdt d2 ON d1."loaiDienThoai" = d2."loaiDienThoai"
      WHERE sp."idSanPham" = $1
    `, [idSanPham]);
  }
}

module.exports = new ProductRepository();
