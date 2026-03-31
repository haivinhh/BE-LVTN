const BaseRepository = require('../repositories/baseRepository');
const logger = require('../utils/logger');

const repo = new BaseRepository('donhang');

const buildDateFilter = (params, year, month, alias = 'donhang') => {
  if (year) { params.push(year); return ` AND EXTRACT(YEAR FROM ${alias}."ngayDatHang") = $${params.length}`; }
  if (month) { params.push(month); return ` AND EXTRACT(MONTH FROM ${alias}."ngayDatHang") = $${params.length}`; }
  return '';
};

const statisticsController = {
  getMostSoldProducts: async (req, res, next) => {
    try {
      const { year, month } = req.body;
      const params = [];
      let filter = '';
      if (year) { params.push(year); filter += ` AND EXTRACT(YEAR FROM donhang."ngayDatHang") = $${params.length}`; }
      if (month) { params.push(month); filter += ` AND EXTRACT(MONTH FROM donhang."ngayDatHang") = $${params.length}`; }

      const results = await repo.query(`
        SELECT sanpham."idSanPham", sanpham."tenSanPham",
               COALESCE(SUM(chitietdonhang."soLuong"), 0) AS "totalQuantitySold",
               COALESCE(SUM(chitietdonhang."soLuong" * sanpham."donGia"), 0) AS "totalRevenue"
        FROM sanpham
        LEFT JOIN chitietdonhang ON sanpham."idSanPham" = chitietdonhang."idSanPham"
        LEFT JOIN donhang ON chitietdonhang."idDonHang" = donhang."idDonHang"
        WHERE (donhang."trangThai" = 'success' OR donhang."trangThai" IS NULL) ${filter}
        GROUP BY sanpham."idSanPham", sanpham."tenSanPham"
        ORDER BY "totalRevenue" DESC
      `, params);
      res.json(results);
    } catch (err) { next(err); }
  },

  getTopCustomers: async (req, res, next) => {
    try {
      const { year, month } = req.body;
      const params = [];
      let filter = '';
      if (year) { params.push(year); filter += ` AND EXTRACT(YEAR FROM donhang."ngayDatHang") = $${params.length}`; }
      if (month) { params.push(month); filter += ` AND EXTRACT(MONTH FROM donhang."ngayDatHang") = $${params.length}`; }

      const results = await repo.query(`
        SELECT taikhoankh."idUser", taikhoankh."hoTen", taikhoankh."userName",
               COALESCE(SUM(donhang."tongTienDH"), 0) AS "tongTienDaMua"
        FROM taikhoankh
        LEFT JOIN donhang ON taikhoankh."idUser" = donhang."idUser"
          AND donhang."trangThai" = 'success' ${filter}
        GROUP BY taikhoankh."idUser", taikhoankh."hoTen", taikhoankh."userName"
        ORDER BY "tongTienDaMua" DESC
      `, params);
      res.json(results);
    } catch (err) { next(err); }
  },

  getRevenueByYear: async (req, res, next) => {
    try {
      const { year } = req.body;
      const results = await repo.query(`
        SELECT EXTRACT(MONTH FROM donhang."ngayDatHang")::int AS month,
               COALESCE(SUM(donhang."tongTienDH"), 0) AS "totalRevenue"
        FROM donhang
        WHERE donhang."trangThai" = 'success'
          AND EXTRACT(YEAR FROM donhang."ngayDatHang") = $1
        GROUP BY EXTRACT(MONTH FROM donhang."ngayDatHang")
        ORDER BY month
      `, [year]);
      res.json(results);
    } catch (err) { next(err); }
  },
};

module.exports = statisticsController;
