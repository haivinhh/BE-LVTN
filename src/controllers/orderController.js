const connection = require("../models/db");

const orderController = {
  getAllCart: (req, res) => {
    try {
      const query = `
        SELECT * FROM donhang
      `;

      connection.query(query, (err, results) => {
        if (err) {
          console.error("Error executing query:", err.message);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        res.json(results);
      });
    } catch (error) {
      console.error("Unexpected error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getDetailCart: (req, res) => {
    const { idDonHang } = req.params;
    if (!idDonHang) {
      console.error("Missing required field: idDonHang");
      return res
        .status(400)
        .json({ message: "Missing required field: idDonHang" });
    }
  
    const query = `
      SELECT dc.idChiTietDH, dc.idDonHang, dc.idSanPham, dc.soLuong, dc.tongTien,
             p.tenSanPham AS tenSanPham, p.donGia AS donGia, p.hinhSP,
             c.tongTienDH AS tongTienDH
      FROM chitietdonhang dc
      JOIN sanpham p ON dc.idSanPham = p.idSanPham
      JOIN donhang c ON dc.idDonHang = c.idDonHang
      WHERE dc.idDonHang = ?
    `;
  
    connection.query(query, [idDonHang], (err, results) => {
      if (err) {
        console.error("Error executing query:", err.message);
        return res.status(500).json({ message: "Internal Server Error" });
      }
  
      // Check if any results were returned
      if (results.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      // Aggregate details for the order
      const order = {
        idDonHang: results[0].idDonHang,
        tongTienDH: results[0].tongTienDH,
        details: results.map((item) => ({
          idChiTietDH: item.idChiTietDH,
          idSanPham: item.idSanPham,
          tenSanPham: item.tenSanPham,
          donGia: item.donGia,
          hinhSP: item.hinhSP,
          soLuong: item.soLuong,
          tongTien: item.tongTien,
        })),
      };
  
      res.json(order);
    });
  },
  

  getCusbyId: (req, res) => {
    const { idUser } = req.params;
    if (!idUser) {
      return res
        .status(400)
        .json({ message: "Missing required field: idUser" });
    }

    const query = `SELECT hoTen FROM taikhoankh WHERE idUser = ?`;
    connection.query(query, [idUser], (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(results[0]);
    });
  },
};

module.exports = orderController;
