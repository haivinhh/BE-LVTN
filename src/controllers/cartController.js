const connection = require("../models/db");
const cartController = {
  createOrder: (req, res) => {
    const idUser = req.user.idUser;

    try {
      if (!idUser) {
        throw new Error("Missing required field: idUser");
      }

      const insertCartQuery =
        "INSERT INTO donhang (idUser, trangThai, ngayDatHang) VALUES (?, 'unpaid', NOW())";
      connection.query(insertCartQuery, [idUser], (err, result) => {
        if (err) {
          throw err;
        }
        const cart_id = result.insertId;
        res.status(201).json({ message: "Tạo đơn hàng thành công", cart_id });
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  addToCart: (req, res) => {
    const { idUser, idSanPham, soLuong } = req.body;

    try {
      if (!idUser || !idSanPham || !soLuong) {
        throw new Error("Missing required fields: idUser, idSanPham, soLuong");
      }

      // Query to get the unpaid order of the user
      const getUnpaidOrderQuery = `
        SELECT idDonHang FROM donhang WHERE idUser = ? AND trangThai = 'unpaid'
      `;
      connection.query(getUnpaidOrderQuery, [idUser], (err, results) => {
        if (err) {
          throw err;
        }

        // Check if there is an unpaid order
        if (results.length === 0) {
          return res.status(404).json({ message: "No unpaid order found for this user" });
        }

        const idDonHang = results[0].idDonHang;

        // Insert detail cart record
        const insertDetailCartQuery = `
          INSERT INTO chitietdonhang (idDonHang, idSanPham, soLuong)
          VALUES (?, ?, ?)
        `;
        connection.query(
          insertDetailCartQuery,
          [idDonHang, idSanPham, soLuong],
          (err, result) => {
            if (err) {
              throw err;
            }

            // Update detail cart total and cart total
            cartController.updateDetailCartTotal(idDonHang, idSanPham, () => {
              cartController.updateCartTotal(idDonHang);
            });

            res.status(201).json({ message: "Thêm vào giỏ hàng thành công", idDonHang });
          }
        );
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getCart: (req, res) => {
    const  idUser  = req.user.idUser;
    console.log(idUser);
    if (!idUser) {
      return res
        .status(400)
        .json({ message: "Missing required field: idUser" });
    }

    const query = `
    SELECT dc.idChiTietDH, dc.idDonHang, dc.idSanPham, dc.soLuong, dc.tongTienDH,
           p.tenSanPham AS tenSanPham, p.donGia AS donGia, p.hinhSP
    FROM chitietdonhang dc
    JOIN sanpham p ON dc.idSanPham = p.idSanPham
    JOIN donhang c ON dc.idDonHang = c.idDonHang
    WHERE c.idUser = ? AND c.trangThai = 'unpaid'
  `;

    connection.query(query, [idUser], (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json(results);
    });
  },

  updateDetailCartTotal: (cart_id, idSanPham, callback) => {
    const query = `
    UPDATE chitietdonhang dc
    JOIN sanpham p ON dc.idSanPham = p.idSanPham
    SET dc.tongTienDH = dc.soLuong * p.donGia
    WHERE dc.idDonHang = ? AND dc.idSanPham = ?
  `;

    connection.query(query, [cart_id, idSanPham], (err, result) => {
      if (err) {
        console.error("Error updating detail cart total:", err);
        return;
      }
      console.log("Detail cart total updated successfully");
      callback();
    });
  },

  updateCartTotal: (cart_id) => {
    const query = `
    UPDATE donhang c
    SET c.tongTien = (
      SELECT SUM(dc.tongTienDH) AS total
      FROM chitietdonhang dc
      WHERE dc.idDonHang = ? AND c.idDonHang = dc.idDonHang AND c.trangThai = 'unpaid'
    )
    WHERE c.idDonHang = ? AND c.trangThai = 'unpaid'
  `;

    connection.query(query, [cart_id, cart_id], (err, result) => {
      if (err) {
        console.error("Error updating cart total:", err);
        return;
      }
      console.log("Cart total updated successfully");
    });
  },

  clearCart: (req, res) => {
    const { idUser } = req.body;

    if (!idUser) {
      return res
        .status(400)
        .json({ message: "Missing required field: idUser" });
    }

    const deleteCartQuery =
      "DELETE FROM donhang WHERE idUser = ? AND trangThai = 'unpaid'";
    connection.query(deleteCartQuery, [idUser], (err, result) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json({ message: "Cart has been cleared" });
    });
  },
};
module.exports = cartController;
