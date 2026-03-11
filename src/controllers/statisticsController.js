const connection = require("../models/db");

const statisticsController = {
  getMostSoldProducts: (req, res) => {
    const { year, month } = req.body;

    let query = `
      SELECT 
        sanpham."idSanPham",
        sanpham."tenSanPham",
        COALESCE(SUM(chitietdonhang."soLuong"), 0) AS "totalQuantitySold",
        COALESCE(SUM(chitietdonhang."soLuong" * sanpham."donGia"), 0) AS "totalRevenue"
      FROM sanpham
      LEFT JOIN chitietdonhang ON sanpham."idSanPham" = chitietdonhang."idSanPham"
      LEFT JOIN donhang ON chitietdonhang."idDonHang" = donhang."idDonHang"
      WHERE (donhang."trangThai" = 'success' OR donhang."trangThai" IS NULL)
    `;

    const params = [];
    if (year && !month) {
      params.push(year);
      query += ` AND EXTRACT(YEAR FROM donhang."ngayDatHang") = $${params.length}`;
    }
    if (month && !year) {
      params.push(month);
      query += ` AND EXTRACT(MONTH FROM donhang."ngayDatHang") = $${params.length}`;
    }
    if (year && month) {
      params.push(year);
      query += ` AND EXTRACT(YEAR FROM donhang."ngayDatHang") = $${params.length}`;
      params.push(month);
      query += ` AND EXTRACT(MONTH FROM donhang."ngayDatHang") = $${params.length}`;
    }

    query += `
      GROUP BY sanpham."idSanPham", sanpham."tenSanPham"
      ORDER BY "totalRevenue" DESC
    `;

    connection.query(query, params, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  },

  getTopCustomers: (req, res) => {
    const { year, month } = req.body;

    let query = `
      SELECT 
        taikhoankh."idUser",
        taikhoankh."hoTen",
        taikhoankh."userName",
        COALESCE(SUM(donhang."tongTienDH"), 0) AS "tongTienDaMua"
      FROM taikhoankh
      LEFT JOIN donhang ON taikhoankh."idUser" = donhang."idUser"
        AND donhang."trangThai" = 'success'
    `;

    const params = [];
    if (year && month) {
      params.push(year); query += ` AND EXTRACT(YEAR FROM donhang."ngayDatHang") = $${params.length}`;
      params.push(month); query += ` AND EXTRACT(MONTH FROM donhang."ngayDatHang") = $${params.length}`;
    } else if (year) {
      params.push(year); query += ` AND EXTRACT(YEAR FROM donhang."ngayDatHang") = $${params.length}`;
    } else if (month) {
      params.push(month); query += ` AND EXTRACT(MONTH FROM donhang."ngayDatHang") = $${params.length}`;
    }

    query += `
      GROUP BY taikhoankh."idUser", taikhoankh."hoTen", taikhoankh."userName"
      ORDER BY "tongTienDaMua" DESC
    `;

    connection.query(query, params, (err, results) => {
      if (err) { console.error(err); return res.status(500).send("Server error"); }
      res.json(results);
    });
  },

  getRevenueByYear: (req, res) => {
    const { year } = req.body;
    const params = [year];
    const query = `
      SELECT 
        EXTRACT(MONTH FROM donhang."ngayDatHang")::int AS month,
        COALESCE(SUM(donhang."tongTienDH"), 0) AS "totalRevenue"
      FROM donhang
      WHERE donhang."trangThai" = 'success'
        AND EXTRACT(YEAR FROM donhang."ngayDatHang") = $1
      GROUP BY EXTRACT(MONTH FROM donhang."ngayDatHang")
      ORDER BY month
    `;
    connection.query(query, params, (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  },
};

module.exports = statisticsController;
