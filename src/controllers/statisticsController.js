const connection = require("../models/db");

const statisticsController = {
  getMostSoldProducts : (req, res) => {
    const { year, month } = req.body; // Get year and month from request body

    // Build SQL query with conditions to filter by year and month
    let query = `
      SELECT 
        sanPham.idSanPham,
        sanPham.tenSanPham,
        COALESCE(SUM(chiTietDonHang.soLuong), 0) AS totalQuantitySold,
        COALESCE(SUM(chiTietDonHang.soLuong * sanPham.donGia), 0) AS totalRevenue
      FROM
        sanPham
      LEFT JOIN 
        chiTietDonHang ON sanPham.idSanPham = chiTietDonHang.idSanPham
      LEFT JOIN
        donHang ON chiTietDonHang.idDonHang = donHang.idDonHang
      WHERE
        donHang.trangThai = 'success'
    `;

    // Add year filter if provided
    if (year && !month) {
      query += ` AND YEAR(donHang.ngayDatHang) = ${connection.escape(year)}`;
    }

    // Add month filter if provided
    if (month && !year) {
      query += ` AND MONTH(donHang.ngayDatHang) = ${connection.escape(month)}`;
    }

    // Add year and month filter if both are provided
    if (year && month) {
      query += ` AND YEAR(donHang.ngayDatHang) = ${connection.escape(year)}`;
      query += ` AND MONTH(donHang.ngayDatHang) = ${connection.escape(month)}`;
    }

    // Continue with GROUP BY and ORDER BY
    query += `
      GROUP BY
        sanPham.idSanPham, sanPham.tenSanPham
      ORDER BY
        totalRevenue DESC
    `;

    console.log(year, month);
    connection.query(query, (err, results) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.json(results);
    });
},



  
getTopCustomers : (req, res) => {
  const { year, month } = req.body; // Lấy năm và tháng từ request body

  let query = `
      SELECT 
          taiKhoanKH.idUser,
          taiKhoanKH.hoTen,
          taiKhoanKH.userName,
          COALESCE(SUM(donHang.tongTienDH), 0) AS tongTienDaMua
      FROM
          taiKhoanKH
      LEFT JOIN
          donHang ON taiKhoanKH.idUser = donHang.idUser 
          AND donHang.trangThai = 'success'
  `;
  
  // Thêm điều kiện lọc năm và tháng
  if (year && month) {
      query += `
          AND YEAR(donHang.ngayDatHang) = ? 
          AND MONTH(donHang.ngayDatHang) = ?
      `;
  } else if (year) {
      query += `
          AND YEAR(donHang.ngayDatHang) = ?
      `;
  } else if (month) {
      query += `
          AND MONTH(donHang.ngayDatHang) = ?
      `;
  }

  query += `
      GROUP BY
          taiKhoanKH.idUser, taiKhoanKH.hoTen, taiKhoanKH.userName
      ORDER BY
          tongTienDaMua DESC;
  `;

  const params = [];
  if (year) params.push(year);
  if (month) params.push(month);

  connection.query(query, params, (err, results) => {
      if (err) {
          console.error("Error executing query:", err);
          return res.status(500).send("Server error");
      }
      res.json(results);
  });
},
getRevenueByYear : (req, res) => {
  const { year } = req.body; // Get year from request body

  // Build SQL query to get revenue by month for the specified year
  const query = `
    SELECT 
      MONTH(donHang.ngayDatHang) AS month,
      COALESCE(SUM(donHang.tongTienDH), 0) AS totalRevenue
    FROM
      donHang
    WHERE
      donHang.trangThai = 'success'
      AND YEAR(donHang.ngayDatHang) = ${connection.escape(year)}
    GROUP BY
      MONTH(donHang.ngayDatHang)
    ORDER BY
      MONTH(donHang.ngayDatHang)
  `;

  console.log(year);
  connection.query(query, (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(results);
  });
}



};

module.exports = statisticsController;
