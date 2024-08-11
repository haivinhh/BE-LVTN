const connection = require("../models/db");
const cartController = {
  // Function to create an order if the user doesn't already have an unpaid order
  createOrUpdateCart: (req, res) => {
    const idUser = req.user.idUser;
    const { idSanPham, soLuong } = req.body;

    if (!idUser) {
      return res
        .status(400)
        .json({ message: "Missing required field: idUser" });
    }
    if (!idSanPham || !soLuong) {
      return res
        .status(400)
        .json({ message: "Missing required fields: idSanPham, soLuong" });
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
        processCart(idDonHang, idSanPham, soLuong);
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
          processCart(idDonHang, idSanPham, soLuong);
        });
      }
    });

    function processCart(idDonHang, idSanPham, soLuong) {
      // Check available stock for the product
      const checkStockQuery = `
        SELECT soLuong FROM sanpham WHERE idSanPham = ?
      `;

      connection.query(checkStockQuery, [idSanPham], (err, stockResults) => {
        if (err) {
          return res.status(500).json({ message: err.message });
        }

        if (stockResults.length === 0) {
          return res.status(404).json({ message: "Product not found" });
        }

        const availableStock = stockResults[0].soLuong;

        if (availableStock < soLuong) {
          // If stock is less than requested quantity, update quantity to available stock
          soLuong = availableStock;
          return res.status(400).json({
            message: `Kho đã hết hàng. Chỉ còn ${availableStock} sản phẩm trong kho.`,
          });
        }

        // Proceed to add or update item in the cart
        addItemToCart(idDonHang, idSanPham, soLuong);
      });
    }

    function addItemToCart(idDonHang, idSanPham, soLuong) {
      // Check if the product is already in the cart
      const checkCartItemQuery = `
        SELECT * FROM chitietdonhang
        WHERE idDonHang = ? AND idSanPham = ?
      `;

      connection.query(
        checkCartItemQuery,
        [idDonHang, idSanPham],
        (err, results) => {
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
            connection.query(
              updateCartItemQuery,
              [newQuantity, existingCartItem.idChiTietDH],
              (err, result) => {
                if (err) {
                  return res.status(500).json({ message: err.message });
                }

                // Update cart totals
                cartController.updateDetailCartTotal(
                  idDonHang,
                  idSanPham,
                  () => {
                    cartController.updateCartTotal(idDonHang);
                  }
                );

                res.status(200).json({
                  success: true,
                  message: "Cart updated successfully",
                });
              }
            );
          } else {
            // Product does not exist in the cart, add it
            const insertDetailCartQuery = `
            INSERT INTO chitietdonhang (idDonHang, idSanPham, soLuong)
            VALUES (?, ?, ?)
          `;
            connection.query(
              insertDetailCartQuery,
              [idDonHang, idSanPham, soLuong],
              (err, result) => {
                if (err) {
                  return res.status(500).json({ message: err.message });
                }

                // Update cart totals
                cartController.updateDetailCartTotal(
                  idDonHang,
                  idSanPham,
                  () => {
                    cartController.updateCartTotal(idDonHang);
                  }
                );

                res.status(201).json({
                  success: true,
                  message: "Item added to cart successfully",
                });
              }
            );
          }
        }
      );
    }
  },

  getDetailCart: (req, res) => {
    const idUser = req.user.idUser;
    if (!idUser) {
      return res
        .status(400)
        .json({ message: "Missing required field: idUser" });
    }

    const query = `
        SELECT dc.idChiTietDH, dc.idDonHang, dc.idSanPham, dc.soLuong, dc.tongTien,
       p.tenSanPham AS tenSanPham, p.donGia AS donGia, p.hinhSP,
       c.tongTienDH AS tongTienDH, c.khuyenMai AS khuyenMai
FROM chitietdonhang dc
JOIN sanpham p ON dc.idSanPham = p.idSanPham
JOIN donhang c ON dc.idDonHang = c.idDonHang
WHERE c.idUser = ? AND c.trangThai = 'unpaid'
    `;

    connection.query(query, [idUser], (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      // Extract the cart ID from the results (assuming results contain the cart ID)
      const cart_id = results.length > 0 ? results[0].idDonHang : null;

      if (cart_id) {
        // Call setPromotion to apply discounts
        cartController.setPromotion(cart_id, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Failed to apply promotion" });
          }

          // Return cart details after applying promotion
          res.json(results);
        });
      } else {
        // No cart found
        res.status(404).json({ message: "No cart found" });
      }
    });
  },

  // Function to set promotion
  setPromotion: (cart_id, callback) => {
    const query = `
      SELECT SUM(dc.soLuong) AS totalQuantity, c.idUser, k.KHThanThiet
      FROM chitietdonhang dc
      JOIN donhang c ON dc.idDonHang = c.idDonHang
      JOIN taiKhoanKH k ON c.idUser = k.idUser
      WHERE dc.idDonHang = ?
      GROUP BY c.idUser, k.KHThanThiet
    `;

    connection.query(query, [cart_id], (err, results) => {
      if (err) {
        console.error("Error fetching order details:", err);
        return callback(err);
      }

      if (results.length === 0) {
        return callback(new Error("No such order found"));
      }

      const { totalQuantity, KHThanThiet } = results[0];
      let discount = 0;

      if (totalQuantity >= 5) {
        if (KHThanThiet === 1) {
          discount = 0.3; // 30% discount for loyal customers with 5 or more products
        } else {
          discount = 0.1; // 10% discount for orders with 5 or more products
        }
      } else if (KHThanThiet === 1) {
        discount = 0.2; // 20% discount for loyal customers with fewer than 5 products
      }

      console.log("Total Quantity:", totalQuantity);
      console.log("Discount:", discount);

      const updateQuery = `
        UPDATE donhang
        SET khuyenMai = ?
        WHERE idDonHang = ? AND trangThai = 'unpaid'
      `;

      connection.query(updateQuery, [discount, cart_id], (err, result) => {
        if (err) {
          console.error("Error updating promotion:", err);
          return callback(err);
        }
        if (result.affectedRows === 0) {
          console.log(
            "No rows updated. Check if the cart_id and status match."
          );
        } else {
          console.log("Promotion updated successfully");
        }
        callback(null);
      });
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
    const getTotalAndDiscountQuery = `
      SELECT 
        SUM(dc.tongTien) AS totalBeforeDiscount, 
        c.khuyenMai
      FROM chitietdonhang dc
      JOIN donhang c ON dc.idDonHang = c.idDonHang
      WHERE dc.idDonHang = ? AND c.trangThai = 'unpaid'
      GROUP BY c.idDonHang
    `;

    connection.query(getTotalAndDiscountQuery, [cart_id], (err, results) => {
      if (err) {
        console.error("Error fetching total and discount:", err);
        return;
      }

      if (results.length === 0) {
        console.error("No such order found or order is not unpaid.");
        return;
      }

      const { totalBeforeDiscount, khuyenMai } = results[0];
      const discountAmount = totalBeforeDiscount * khuyenMai; // Calculate discount amount
      const totalAfterDiscount = totalBeforeDiscount - discountAmount; // Calculate total after discount

      const updateTotalQuery = `
        UPDATE donhang
        SET tongTienDH = ?
        WHERE idDonHang = ? AND trangThai = 'unpaid'
      `;

      connection.query(
        updateTotalQuery,
        [totalAfterDiscount, cart_id],
        (err) => {
          if (err) {
            console.error("Error updating cart total:", err);
            return;
          }
          console.log(
            "Cart total updated successfully after applying discount."
          );
        }
      );
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
  cancelOrder: (req, res) => {
    const idUser = req.user.idUser; // User ID từ token
    const { idDonHang } = req.body; // ID đơn hàng cần hủy

    // Kiểm tra các trường bắt buộc
    if (!idUser || !idDonHang) {
      return res.status(400).json({
        message: "Missing required fields: idDonHang or idUser",
      });
    }

    // Kiểm tra trạng thái và phương thức thanh toán của đơn hàng
    const checkOrderQuery = `
      SELECT * FROM donhang
      WHERE idDonHang = ? AND idUser = ? AND phuongThucTT = 'COD' AND trangThai = 'waiting'
    `;

    connection.query(checkOrderQuery, [idDonHang, idUser], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res
          .status(500)
          .json({ message: "Internal server error while checking the order." });
      }

      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: "Order not found or not valid for cancellation." });
      }

      // Cập nhật thông tin đơn hàng và trạng thái
      const updateOrderQuery = `
        UPDATE donhang
        SET tenNguoiNhan = NULL, diaChi = NULL, SDT = NULL, trangThai = 'unpaid'
        WHERE idDonHang = ?
      `;

      connection.query(updateOrderQuery, [idDonHang], (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({
            message: "Internal server error while updating the order.",
          });
        }

        // Kiểm tra số lượng hàng bị ảnh hưởng
        if (result.affectedRows === 0) {
          return res.status(404).json({
            message:
              "Failed to cancel the order. It might have been already processed.",
          });
        }

        res.status(200).json({ message: "Order canceled successfully." });
      });
    });
  },

  updateCartItem: (req, res) => {
    const idUser = req.user.idUser;
    const { idChiTietDH, soLuong } = req.body;

    try {
      // Validate required fields
      if (!idUser || !idChiTietDH || !soLuong) {
        return res.status(400).json({
          message: "Missing required fields: idUser, idChiTietDH, soLuong",
        });
      }

      // Check if the cart item belongs to the user and the order is unpaid
      const checkCartItemQuery = `
        SELECT dc.idDonHang, dc.idSanPham, dc.soLuong AS cartQuantity, c.trangThai
        FROM chitietdonhang dc
        JOIN donhang c ON dc.idDonHang = c.idDonHang
        WHERE dc.idChiTietDH = ? AND c.idUser = ? AND c.trangThai = 'unpaid'
      `;
      connection.query(
        checkCartItemQuery,
        [idChiTietDH, idUser],
        (err, results) => {
          if (err) {
            return res.status(500).json({ message: err.message });
          }

          if (results.length === 0) {
            return res
              .status(404)
              .json({ message: "Cart item not found for the current user" });
          }

          const cartItem = results[0];
          const idDonHang = cartItem.idDonHang;
          const idSanPham = cartItem.idSanPham;

          // Check stock availability
          const checkStockQuery = `
          SELECT soLuong FROM sanpham WHERE idSanPham = ?
        `;
          connection.query(
            checkStockQuery,
            [idSanPham],
            (err, stockResults) => {
              if (err) {
                return res.status(500).json({ message: err.message });
              }

              if (stockResults.length === 0) {
                return res.status(404).json({ message: "Product not found" });
              }

              const availableStock = stockResults[0].soLuong;

              // Ensure the new quantity does not exceed available stock
              const updatedQuantity = Math.min(soLuong, availableStock);

              // Update the quantity of the cart item
              const updateCartItemQuery = `
            UPDATE chitietdonhang
            SET soLuong = ?
            WHERE idChiTietDH = ?
          `;
              connection.query(
                updateCartItemQuery,
                [updatedQuantity, idChiTietDH],
                (err, result) => {
                  if (err) {
                    return res.status(500).json({ message: err.message });
                  }

                  // Update cart totals
                  cartController.updateDetailCartTotal(
                    idDonHang,
                    idSanPham,
                    () => {
                      cartController.updateCartTotal(idDonHang);
                    }
                  );

                  if (updatedQuantity < soLuong) {
                    return res.status(400).json({
                      success: true,
                      message: `Kho đã hết hàng. Cập nhật số lượng sản phẩm còn ${availableStock}.`,
                    });
                  } else {
                    return res.status(200).json({
                      success: true,
                      message: "Cart item quantity updated successfully",
                    });
                  }
                }
              );
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
    const { idDonHang, recipientName, recipientPhone, recipientAddress } =
      req.body;

    console.log("id user cart : ", idUser);

    if (
      !idUser ||
      !idDonHang ||
      !recipientName ||
      !recipientPhone ||
      !recipientAddress
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: idDonHang, recipientName, recipientPhone, recipientAddress",
      });
    }

    // Check if the order belongs to the user and is in 'unpaid' status
    const checkOrderQuery = `
      SELECT * FROM donhang
      WHERE idDonHang = ? AND idUser = ? AND trangThai = 'unpaid'
    `;

    connection.query(checkOrderQuery, [idDonHang, idUser], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res
          .status(500)
          .json({ message: "Internal server error while checking the order." });
      }

      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: "Order not found or not valid for the user" });
      }

      // Update order status to 'waiting' and add recipient details
      const updateOrderQuery = `
  UPDATE donhang
  SET trangThai = 'waiting',
      tenNguoiNhan = ?, 
      SDT = ?, 
      diaChi = ?, 
      phuongThucTT = 'COD'
  WHERE idDonHang = ?
`;

      connection.query(
        updateOrderQuery,
        [recipientName, recipientPhone, recipientAddress, idDonHang],
        (err, result) => {
          if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({
              message: "Internal server error while updating the order.",
            });
          }

          // Optionally, you can check if any rows were affected
          if (result.affectedRows === 0) {
            return res.status(404).json({
              message:
                "Failed to update the order. It might have been already processed.",
            });
          }

          res.status(200).json({
            message:
              "Order status updated to waiting with recipient details and payment method set to COD",
          });
        }
      );
    });
  },
};
module.exports = cartController;
