const connection = require("../models/db");
const cartController = {
  // Function to create an order if the user doesn't already have an unpaid order
  createOrUpdateCart: (req, res) => {
    const idUser = req.user.idUser;
    const { idSanPham, soLuong } = req.body;

    if (!idUser) {
      return res.status(400).json({ message: "Missing required field: idUser" });
    }
    if (!idSanPham || !soLuong) {
      return res.status(400).json({ message: "Missing required fields: idSanPham, soLuong" });
    }

    // Check if the user has any unpaid orders
    const checkUnpaidOrderQuery = `
      SELECT idDonHang FROM donhang WHERE idUser = ? AND trangThai = 'unpaid'
    `;
    
    connection.query(checkUnpaidOrderQuery, [idUser], (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      let idDonHang;

      if (results.length > 0) {
        // User already has an unpaid order
        idDonHang = results[0].idDonHang;
      } else {
        // User does not have an unpaid order, create a new one
        const insertOrderQuery = `
          INSERT INTO donhang (idUser, trangThai, ngayDatHang) VALUES (?, 'unpaid', NOW())
        `;
        
        connection.query(insertOrderQuery, [idUser], (err, result) => {
          if (err) {
            return res.status(500).json({ message: err.message });
          }
          idDonHang = result.insertId;

          // Add the item to the newly created order
          addItemToCart(idDonHang, idSanPham, soLuong);
        });
        return;
      }

      // Add the item to the existing unpaid order
      addItemToCart(idDonHang, idSanPham, soLuong);
    });

    function addItemToCart(idDonHang, idSanPham, soLuong) {
      // Check if the product is already in the cart
      const checkCartItemQuery = `
        SELECT * FROM chitietdonhang
        WHERE idDonHang = ? AND idSanPham = ?
      `;
      
      connection.query(checkCartItemQuery, [idDonHang, idSanPham], (err, results) => {
        if (err) {
          return res.status(500).json({ message: err.message });
        }

        if (results.length > 0) {
          // Product already exists in the cart, update the quantity
          const existingCartItem = results[0];
          const newQuantity = existingCartItem.soLuong + parseInt(soLuong);

          const updateCartItemQuery = `
            UPDATE chitietdonhang
            SET soLuong = ?
            WHERE idChiTietDH = ?
          `;
          connection.query(updateCartItemQuery, [newQuantity, existingCartItem.idChiTietDH], (err, result) => {
            if (err) {
              return res.status(500).json({ message: err.message });
            }

            // Update cart totals
            cartController.updateDetailCartTotal(idDonHang, idSanPham, () => {
              cartController.updateCartTotal(idDonHang);
            });

            res.status(200).json({ success: true, message: "Cart updated successfully" });
          });
        } else {
          // Product does not exist in the cart, add it
          const insertDetailCartQuery = `
            INSERT INTO chitietdonhang (idDonHang, idSanPham, soLuong)
            VALUES (?, ?, ?)
          `;
          connection.query(insertDetailCartQuery, [idDonHang, idSanPham, soLuong], (err, result) => {
            if (err) {
              return res.status(500).json({ message: err.message });
            }

            // Update cart totals
            cartController.updateDetailCartTotal(idDonHang, idSanPham, () => {
              cartController.updateCartTotal(idDonHang);
            });

            res.status(201).json({ success: true, message: "Item added to cart successfully" });
          });
        }
      });
    }
  },


  getDetailCart: (req, res) => {
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
  getCart: (req, res) => {
    const idUser = req.user.idUser;
    console.log(idUser);
    if (!idUser) {
      return res
        .status(400)
        .json({ message: "Missing required field: idUser" });
    }
    const query = `SELECT * FROM donhang WHERE idUser = ?`;
    connection.query(query, [idUser], (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      console.log("thanh cong");
      res.json(results);
    });
  },
  getDetailCartOfUser: (req, res) => {
    const idUser = req.user.idUser;
    const { idDonHang } = req.params; // Extract idDonHang from the request body
    console.log("User ID:", idUser);
    console.log("Order ID:", idDonHang);

    if (!idUser) {
      return res
        .status(400)
        .json({ message: "Missing required field: idUser" });
    }

    if (!idDonHang) {
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
        WHERE c.idUser = ? AND dc.idDonHang = ? 
    `;

    connection.query(query, [idUser, idDonHang], (err, results) => {
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
        throw new Error(
          "Missing required fields: idUser, idChiTietDH, soLuong"
        );
      }

      // First, check if the cart item belongs to the current user
      const checkCartItemQuery = `
            SELECT * FROM chitietdonhang dc
            JOIN donhang c ON dc.idDonHang = c.idDonHang
            WHERE dc.idChiTietDH = ? AND c.idUser = ? AND c.trangThai = 'unpaid'
        `;
      connection.query(
        checkCartItemQuery,
        [idChiTietDH, idUser],
        (err, results) => {
          if (err) {
            throw err;
          }

          if (results.length === 0) {
            return res
              .status(404)
              .json({ message: "Cart item not found for the current user" });
          }

          // Update the quantity of the cart item
          const updateCartItemQuery = `
                UPDATE chitietdonhang
                SET soLuong = ?
                WHERE idChiTietDH = ?
            `;
          connection.query(
            updateCartItemQuery,
            [soLuong, idChiTietDH],
            (err, result) => {
              if (err) {
                throw err;
              }

              // After updating quantity, update the total price of the cart item and the total cart price
              cartController.updateDetailCartTotal(
                results[0].idDonHang,
                results[0].idSanPham,
                () => {
                  cartController.updateCartTotal(results[0].idDonHang);
                }
              );

              res.status(200).json({
                success: true,
                message: "Cart item quantity updated successfully",
              });
            }
          );
        }
      );
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
      connection.query(
        checkCartItemQuery,
        [idChiTietDH, idUser],
        (err, results) => {
          if (err) {
            throw err;
          }

          if (results.length === 0) {
            return res
              .status(404)
              .json({ message: "Cart item not found for the current user" });
          }

          // Delete the cart item
          const deleteCartItemQuery = `
              DELETE FROM chitietdonhang
              WHERE idChiTietDH = ?
          `;
          connection.query(
            deleteCartItemQuery,
            [idChiTietDH],
            (err, result) => {
              if (err) {
                throw err;
              }

              // After deleting, update the total price of the cart item and the total cart price
              cartController.updateDetailCartTotal(
                results[0].idDonHang,
                results[0].idSanPham,
                () => {
                  cartController.updateCartTotal(results[0].idDonHang);
                }
              );

              res.status(200).json({
                success: true,
                message: "Cart item deleted successfully",
              });
            }
          );
        }
      );
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  payCOD: (req, res) => {
    const idUser = req.user.idUser;
    const { idDonHang } = req.body;

    if (!idUser || !idDonHang) {
      return res.status(400).json({ message: "Missing required fields: idUser, idDonHang" });
    }

    // Kiểm tra xem đơn hàng có thuộc về người dùng và có trạng thái 'unpaid' không
    const checkOrderQuery = `
      SELECT * FROM donhang
      WHERE idDonHang = ? AND idUser = ? AND trangThai = 'unpaid'
    `;
    
    connection.query(checkOrderQuery, [idDonHang, idUser], (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Order not found or not valid for the user" });
      }

      // Cập nhật trạng thái đơn hàng thành 'waiting'
      const updateOrderQuery = `
        UPDATE donhang
        SET trangThai = 'waiting'
        WHERE idDonHang = ?
      `;
      
      connection.query(updateOrderQuery, [idDonHang], (err, result) => {
        if (err) {
          return res.status(500).json({ message: err.message });
        }

        res.status(200).json({ message: "Order status updated to waiting" });
      });
    });
  },
};
module.exports = cartController;
