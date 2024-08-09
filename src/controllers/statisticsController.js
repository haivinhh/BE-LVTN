const connection = require("../models/db");

const statisticsController = {
  getMostSoldProducts: (req, res) => {
    // Query to get the total quantity of each product sold
    const query = `
      SELECT 
        sanPham.idSanPham,
        sanPham.tenSanPham,
        SUM(chiTietDonHang.soLuong) AS totalQuantitySold
      FROM
        donHang
      JOIN 
        chiTietDonHang ON donHang.idDonHang = chiTietDonHang.idDonHang
      JOIN
        sanPham ON chiTietDonHang.idSanPham = sanPham.idSanPham
      WHERE
        donHang.trangThai = 'success'
      GROUP BY
        sanPham.idSanPham, sanPham.tenSanPham
      ORDER BY
        totalQuantitySold DESC
    `;

    connection.query(query, (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
  getTopCustomers: (req, res) => {
    const query = `
      SELECT 
    taiKhoanKH.idUser,
    taiKhoanKH.hoTen,
    taiKhoanKH.userName,
    SUM(chiTietDonHang.soLuong) AS totalProductsPurchased,
    SUM(donHang.tongTienDH) AS totalAmountSpent
FROM
    donHang
JOIN 
    chiTietDonHang ON donHang.idDonHang = chiTietDonHang.idDonHang
JOIN
    taiKhoanKH ON donHang.idUser = taiKhoanKH.idUser
WHERE
    donHang.trangThai = 'success'
GROUP BY
    taiKhoanKH.idUser, taiKhoanKH.hoTen, taiKhoanKH.userName
ORDER BY
    totalProductsPurchased DESC, totalAmountSpent DESC;

    `;

    connection.query(query, (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
  },
};

module.exports = statisticsController;
