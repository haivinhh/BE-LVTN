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
    // Lấy thông tin idUser từ accessToken
    const idUser = req.user.idUser;
    console.log("idUser: ", idUser);
  
    try {
      if (!idUser) {
        throw new Error("Missing required field: idUser");
      }
  
      const { idSanPham, soLuong } = req.body;
  
      if (!idSanPham || !soLuong) {
        throw new Error("Missing required fields: idSanPham, soLuong");
      }
  
      // Query để kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
      const checkCartItemQuery = `
        SELECT * FROM chitietdonhang
        WHERE idDonHang IN (
          SELECT idDonHang FROM donhang
          WHERE idUser = ? AND trangThai = 'unpaid'
        ) AND idSanPham = ?
      `;
      connection.query(checkCartItemQuery, [idUser, idSanPham], (err, results) => {
        if (err) {
          throw err;
        }
  
        if (results.length > 0) {
          // Nếu sản phẩm đã có trong giỏ hàng, cập nhật số lượng
          const existingCartItem = results[0];
          const newQuantity = existingCartItem.soLuong + parseInt(soLuong);
  
          const updateCartItemQuery = `
            UPDATE chitietdonhang
            SET soLuong = ?
            WHERE idChiTietDH = ?
          `;
          connection.query(updateCartItemQuery, [newQuantity, existingCartItem.idChiTietDH], (err, result) => {
            if (err) {
              throw err;
            }
  
            // Sau khi cập nhật số lượng, cập nhật lại tổng tiền của đơn hàng và chi tiết đơn hàng
            cartController.updateDetailCartTotal(existingCartItem.idDonHang, idSanPham, () => {
              cartController.updateCartTotal(existingCartItem.idDonHang);
            });
  
            res.status(200).json({ success: true, message: "Cập nhật giỏ hàng thành công" });
          });
        } else {
          // Nếu sản phẩm chưa có trong giỏ hàng, thêm mới
          const getUnpaidOrderQuery = `
            SELECT idDonHang FROM donhang WHERE idUser = ? AND trangThai = 'unpaid'
          `;
          connection.query(getUnpaidOrderQuery, [idUser], (err, results) => {
            if (err) {
              throw err;
            }
  
            if (results.length === 0) {
              return res.status(404).json({ message: "Không tìm thấy đơn hàng chưa thanh toán cho người dùng này" });
            }
  
            const idDonHang = results[0].idDonHang;
  
            // Query để thêm chi tiết đơn hàng mới
            const insertDetailCartQuery = `
              INSERT INTO chitietdonhang (idDonHang, idSanPham, soLuong)
              VALUES (?, ?, ?)
            `;
            connection.query(insertDetailCartQuery, [idDonHang, idSanPham, soLuong], (err, result) => {
              if (err) {
                throw err;
              }
  
              // Sau khi thêm mới, cập nhật lại tổng tiền của đơn hàng và chi tiết đơn hàng
              cartController.updateDetailCartTotal(idDonHang, idSanPham, () => {
                cartController.updateCartTotal(idDonHang);
              });
  
              res.status(201).json({ success: true, message: "Thêm vào giỏ hàng thành công" });
            });
          });
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  
  

  getCart: (req, res) => {
    const idUser = req.user.idUser;
    console.log(idUser);
    if (!idUser) {
        return res
            .status(400)
            .json({ message: "Missing required field: idUser" });
    }

    const query = `
        SELECT dc.idChiTietDH, dc.idDonHang, dc.idSanPham, dc.soLuong, dc.tongTien,
               p.tenSanPham AS tenSanPham, p.donGia AS donGia, p.hinhSP,
               c.tongTienDH AS tongTienDH
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
    SET dc.tongTien = dc.soLuong * p.donGia
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
    SET c.tongTienDH = (
      SELECT SUM(dc.tongTien) AS total
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
  updateCartItem: (req, res) => {
    const idUser = req.user.idUser;
    const { idChiTietDH, soLuong } = req.body;

    try {
        if (!idUser || !idChiTietDH || !soLuong) {
            throw new Error("Missing required fields: idUser, idChiTietDH, soLuong");
        }

        // First, check if the cart item belongs to the current user
        const checkCartItemQuery = `
            SELECT * FROM chitietdonhang dc
            JOIN donhang c ON dc.idDonHang = c.idDonHang
            WHERE dc.idChiTietDH = ? AND c.idUser = ? AND c.trangThai = 'unpaid'
        `;
        connection.query(checkCartItemQuery, [idChiTietDH, idUser], (err, results) => {
            if (err) {
                throw err;
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "Cart item not found for the current user" });
            }

            // Update the quantity of the cart item
            const updateCartItemQuery = `
                UPDATE chitietdonhang
                SET soLuong = ?
                WHERE idChiTietDH = ?
            `;
            connection.query(updateCartItemQuery, [soLuong, idChiTietDH], (err, result) => {
                if (err) {
                    throw err;
                }

                // After updating quantity, update the total price of the cart item and the total cart price
                cartController.updateDetailCartTotal(results[0].idDonHang, results[0].idSanPham, () => {
                    cartController.updateCartTotal(results[0].idDonHang);
                });

                res.status(200).json({ success: true, message: "Cart item quantity updated successfully" });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
},
deleteCartItem: (req, res) => {
  const idUser = req.user.idUser;
  const { idChiTietDH } = req.body;

  try {
      if (!idUser || !idChiTietDH) {
          throw new Error("Missing required fields: idUser, idChiTietDH");
      }

      // First, check if the cart item belongs to the current user
      const checkCartItemQuery = `
          SELECT * FROM chitietdonhang dc
          JOIN donhang c ON dc.idDonHang = c.idDonHang
          WHERE dc.idChiTietDH = ? AND c.idUser = ? AND c.trangThai = 'unpaid'
      `;
      connection.query(checkCartItemQuery, [idChiTietDH, idUser], (err, results) => {
          if (err) {
              throw err;
          }

          if (results.length === 0) {
              return res.status(404).json({ message: "Cart item not found for the current user" });
          }

          // Delete the cart item
          const deleteCartItemQuery = `
              DELETE FROM chitietdonhang
              WHERE idChiTietDH = ?
          `;
          connection.query(deleteCartItemQuery, [idChiTietDH], (err, result) => {
              if (err) {
                  throw err;
              }

              // After deleting, update the total price of the cart item and the total cart price
              cartController.updateDetailCartTotal(results[0].idDonHang, results[0].idSanPham, () => {
                  cartController.updateCartTotal(results[0].idDonHang);
              });

              res.status(200).json({ success: true, message: "Cart item deleted successfully" });
          });
      });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
},


};
module.exports = cartController;
