const BaseRepository = require('../repositories/baseRepository');
const cacheService = require('./cacheService');

/**
 * Generic CRUD service for simple lookup tables
 */
class CategoryService {
  constructor(tableName, idColumn, nameColumn, cachePrefix) {
    this.repo = new BaseRepository(tableName);
    this.idColumn = idColumn;
    this.nameColumn = nameColumn;
    this.cachePrefix = cachePrefix;
  }

  async getAll() {
    return cacheService.remember(
      `${this.cachePrefix}:all`,
      600, // 10 min — categories change rarely
      () => this.repo.findAll()
    );
  }

  async add(data) {
    const result = await this.repo.insert(data);
    await cacheService.del(`${this.cachePrefix}:all`);
    return result;
  }

  async update(id, data) {
    const existing = await this.repo.findById(this.idColumn, id);
    if (!existing) {
      const err = new Error('Không tìm thấy bản ghi'); err.status = 404; throw err;
    }
    const updated = await this.repo.update(this.idColumn, id, data);
    await cacheService.del(`${this.cachePrefix}:all`);
    return updated;
  }

  async delete(id) {
    // Check if safe to delete (no child products)
    let count = 0;
    if (this.cachePrefix === 'danhmuc') {
      const r = await this.repo.query(`SELECT COUNT(*) AS c FROM sanpham WHERE "danhMucSP" = $1`, [id]);
      count = parseInt(r[0]?.c || 0);
    } else if (this.cachePrefix === 'dongdt') {
      const r = await this.repo.query(`SELECT COUNT(*) AS c FROM sanpham WHERE "dongDT" = $1`, [id]);
      count = parseInt(r[0]?.c || 0);
    } else if (this.cachePrefix === 'loaidt') {
      const r = await this.repo.query(`SELECT COUNT(*) AS c FROM dongdt WHERE "loaiDienThoai" = $1`, [id]);
      count = parseInt(r[0]?.c || 0);
    }

    if (count > 0) {
      const err = new Error('Không thể xóa vì vẫn còn dữ liệu liên quan');
      err.status = 400; throw err;
    }

    const deleted = await this.repo.delete(this.idColumn, id);
    if (!deleted) {
      const err = new Error('Không tìm thấy bản ghi'); err.status = 404; throw err;
    }
    await cacheService.del(`${this.cachePrefix}:all`);
    return { message: 'Xóa thành công' };
  }
}

module.exports = {
  danhMucService: new CategoryService('danhmucsp', 'idDanhMuc', 'tenDanhMuc', 'danhmuc'),
  dongDTService:  new CategoryService('dongdt',    'idDongDT',  'tenDongDT',  'dongdt'),
  loaiDTService:  new CategoryService('loaidienthoai', 'idLoaiDT', 'tenLoaiDT', 'loaidt'),
};
