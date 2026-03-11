const connection = require('../models/db');

const cartController = {
  createOrUpdateCart: (req, res) => {
    const idUser = req.user.idUser;
    const { idSanPham, soLuong } = req.body;

    if (!idUser) return res.status(400).json({ message: 'Missing required field: idUser' });
    if (!idSanPham || !soLuong) return res.status(400).json({ message: 'Missing required fields: idSanPham, soLuong' });

    connection.query(
      `SELECT "idDonHang" FROM donhang WHERE "idUser" = $1 AND "trangThai" = 'unpaid'`,
      [idUser],
      (err, results) => {
        if (err) return res.status(500).json({ message: err.message });

        if (results.length > 0) {
          processCart(results[0].idDonHang, idSanPham, soLuong);
        } else {
          connection.query(
            `INSERT INTO donhang ("idUser","trangThai","ngayDatHang") VALUES ($1,'unpaid',NOW()) RETURNING "idDonHang"`,
            [idUser],
            (err, result) => {
              if (err) return res.status(500).json({ message: err.message });
              processCart(result[0].idDonHang, idSanPham, soLuong);
            }
          );
        }
      }
    );

    function processCart(idDonHang, idSanPham, soLuong) {
      connection.query(
        `SELECT "soLuong" FROM sanpham WHERE "idSanPham" = $1`,
        [idSanPham],
        (err, stockResults) => {
          if (err) return res.status(500).json({ message: err.message });
          if (stockResults.length === 0) return res.status(404).json({ message: 'Product not found' });

          const availableStock = stockResults[0].soLuong;
          if (availableStock < soLuong) {
            return res.status(400).json({ message: `Kho đã hết hàng. Chỉ còn ${availableStock} sản phẩm trong kho.` });
          }
          addItemToCart(idDonHang, idSanPham, soLuong);
        }
      );
    }

    function addItemToCart(idDonHang, idSanPham, soLuong) {
      connection.query(
        `SELECT * FROM chitietdonhang WHERE "idDonHang" = $1 AND "idSanPham" = $2`,
        [idDonHang, idSanPham],
        (err, results) => {
          if (err) return res.status(500).json({ message: err.message });

          if (results.length > 0) {
            const newQuantity = results[0].soLuong + parseInt(soLuong);
            connection.query(
              `UPDATE chitietdonhang SET "soLuong" = $1 WHERE "idChiTietDH" = $2`,
              [newQuantity, results[0].idChiTietDH],
              (err) => {
                if (err) return res.status(500).json({ message: err.message });
                cartController.updateDetailCartTotal(idDonHang, idSanPham, () => cartController.updateCartTotal(idDonHang));
                res.status(200).json({ success: true, message: 'Cart updated successfully' });
              }
            );
          } else {
            connection.query(
              `INSERT INTO chitietdonhang ("idDonHang","idSanPham","soLuong") VALUES ($1,$2,$3)`,
              [idDonHang, idSanPham, soLuong],
              (err) => {
                if (err) return res.status(500).json({ message: err.message });
                cartController.updateDetailCartTotal(idDonHang, idSanPham, () => cartController.updateCartTotal(idDonHang));
                res.status(201).json({ success: true, message: 'Item added to cart successfully' });
              }
            );
          }
        }
      );
    }
  },

  getDetailCart: (req, res) => {
    const idUser = req.user.idUser;
    if (!idUser) return res.status(400).json({ message: 'Missing required field: idUser' });

    connection.query(
      `SELECT dc."idChiTietDH",dc."idDonHang",dc."idSanPham",dc."soLuong",dc."tongTien",
              p."tenSanPham",p."donGia",p."hinhSP",
              c."tongTienDH",c."khuyenMai"
       FROM chitietdonhang dc
       JOIN sanpham p ON dc."idSanPham" = p."idSanPham"
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       WHERE c."idUser" = $1 AND c."trangThai" = 'unpaid'`,
      [idUser],
      (err, results) => {
        if (err) return res.status(500).json({ message: err.message });

        const cart_id = results.length > 0 ? results[0].idDonHang : null;
        if (!cart_id) return res.status(404).json({ message: 'No cart found' });

        connection.query(
          `SELECT SUM(dc."soLuong") AS "totalQuantity", c."idUser", k."KHThanThiet"
           FROM chitietdonhang dc
           JOIN donhang c ON dc."idDonHang" = c."idDonHang"
           JOIN taikhoankh k ON c."idUser" = k."idUser"
           WHERE dc."idDonHang" = $1
           GROUP BY c."idUser", k."KHThanThiet"`,
          [cart_id],
          (err, promoResults) => {
            if (err) return res.status(500).json({ message: 'Failed to apply promotion' });
            if (promoResults.length === 0) return res.status(404).json({ message: 'No such order found' });

            const { totalQuantity, KHThanThiet } = promoResults[0];
            let discount = 0;
            if (totalQuantity > 4) {
              discount = KHThanThiet === 1 ? 0.3 : 0.1;
            } else if (KHThanThiet === 1) {
              discount = 0.2;
            }

            connection.query(
              `UPDATE donhang SET "khuyenMai" = $1 WHERE "idDonHang" = $2 AND "trangThai" = 'unpaid'`,
              [discount, cart_id],
              (err) => {
                if (err) return res.status(500).json({ message: 'Failed to apply promotion' });
                cartController.updateCartTotal(cart_id);
                res.json(results);
              }
            );
          }
        );
      }
    );
  },

  getCart: (req, res) => {
    const idUser = req.user.idUser;
    if (!idUser) return res.status(400).json({ message: 'Missing required field: idUser' });
    connection.query(
      `SELECT * FROM donhang WHERE "idUser" = $1 AND "trangThai" != 'unpaid'`,
      [idUser],
      (err, results) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(results);
      }
    );
  },

  getDetailCartOfUser: (req, res) => {
    const idUser = req.user.idUser;
    const { idDonHang } = req.params;
    if (!idUser) return res.status(400).json({ message: 'Missing required field: idUser' });
    if (!idDonHang) return res.status(400).json({ message: 'Missing required field: idDonHang' });

    connection.query(
      `SELECT dc."idChiTietDH",dc."idDonHang",dc."idSanPham",dc."soLuong",dc."tongTien",
              p."tenSanPham",p."donGia",p."hinhSP",c."tongTienDH"
       FROM chitietdonhang dc
       JOIN sanpham p ON dc."idSanPham" = p."idSanPham"
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       WHERE c."idUser" = $1 AND dc."idDonHang" = $2`,
      [idUser, idDonHang],
      (err, results) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(results);
      }
    );
  },

  updateDetailCartTotal: (cart_id, idSanPham, callback) => {
    connection.query(
      `UPDATE chitietdonhang
       SET "tongTien" = chitietdonhang."soLuong" * sanpham."donGia"
       FROM sanpham
       WHERE chitietdonhang."idSanPham" = sanpham."idSanPham"
         AND chitietdonhang."idDonHang" = $1
         AND chitietdonhang."idSanPham" = $2`,
      [cart_id, idSanPham],
      (err) => {
        if (err) { console.error('Error updating detail cart total:', err); return; }
        callback();
      }
    );
  },

  updateCartTotal: (cart_id) => {
    connection.query(
      `SELECT SUM(dc."tongTien") AS "totalBeforeDiscount", c."khuyenMai"
       FROM chitietdonhang dc
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       WHERE dc."idDonHang" = $1 AND c."trangThai" = 'unpaid'
       GROUP BY c."idDonHang"`,
      [cart_id],
      (err, results) => {
        if (err || results.length === 0) return;
        const { totalBeforeDiscount, khuyenMai } = results[0];
        const totalAfterDiscount = totalBeforeDiscount - totalBeforeDiscount * khuyenMai;
        connection.query(
          `UPDATE donhang SET "tongTienDH" = $1 WHERE "idDonHang" = $2 AND "trangThai" = 'unpaid'`,
          [totalAfterDiscount, cart_id],
          (err) => { if (err) console.error('Error updating cart total:', err); }
        );
      }
    );
  },

  clearCart: (req, res) => {
    const { idUser } = req.body;
    if (!idUser) return res.status(400).json({ message: 'Missing required field: idUser' });
    connection.query(
      `DELETE FROM donhang WHERE "idUser" = $1 AND "trangThai" = 'unpaid'`,
      [idUser],
      (err) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ message: 'Cart has been cleared' });
      }
    );
  },

  cancelOrder: (req, res) => {
    const idUser = req.user.idUser;
    const { idDonHang } = req.body;
    if (!idUser || !idDonHang) return res.status(400).json({ message: 'Missing required fields' });

    connection.query(
      `SELECT * FROM donhang WHERE "idDonHang" = $1 AND "idUser" = $2 AND "phuongThucTT" = 'COD' AND "trangThai" = 'waiting'`,
      [idDonHang, idUser],
      (err, results) => {
        if (err) return res.status(500).json({ message: 'Internal server error.' });
        if (results.length === 0) return res.status(404).json({ message: 'Order not found or not valid for cancellation.' });

        connection.query(
          `UPDATE donhang SET "tenNguoiNhan"=NULL,"diaChi"=NULL,"SDT"=NULL,"trangThai"='unpaid' WHERE "idDonHang" = $1`,
          [idDonHang],
          (err, result) => {
            if (err) return res.status(500).json({ message: 'Internal server error.' });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Failed to cancel the order.' });
            res.status(200).json({ message: 'Order canceled successfully.' });
          }
        );
      }
    );
  },

  updateCartItem: (req, res) => {
    const idUser = req.user.idUser;
    const { idChiTietDH, soLuong } = req.body;
    if (!idUser || !idChiTietDH || !soLuong)
      return res.status(400).json({ message: 'Missing required fields' });

    connection.query(
      `SELECT dc."idDonHang",dc."idSanPham",dc."soLuong" AS "cartQuantity",c."trangThai"
       FROM chitietdonhang dc
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       WHERE dc."idChiTietDH" = $1 AND c."idUser" = $2 AND c."trangThai" = 'unpaid'`,
      [idChiTietDH, idUser],
      (err, results) => {
        if (err) return res.status(500).json({ message: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Cart item not found' });

        const { idDonHang, idSanPham } = results[0];
        connection.query(
          `SELECT "soLuong" FROM sanpham WHERE "idSanPham" = $1`,
          [idSanPham],
          (err, stockResults) => {
            if (err) return res.status(500).json({ message: err.message });
            if (stockResults.length === 0) return res.status(404).json({ message: 'Product not found' });

            const updatedQuantity = Math.min(soLuong, stockResults[0].soLuong);
            connection.query(
              `UPDATE chitietdonhang SET "soLuong" = $1 WHERE "idChiTietDH" = $2`,
              [updatedQuantity, idChiTietDH],
              (err) => {
                if (err) return res.status(500).json({ message: err.message });
                cartController.updateDetailCartTotal(idDonHang, idSanPham, () => cartController.updateCartTotal(idDonHang));
                if (updatedQuantity < soLuong) {
                  return res.status(400).json({ success: true, message: `Kho đã hết hàng. Cập nhật số lượng còn ${stockResults[0].soLuong}.` });
                }
                res.status(200).json({ success: true, message: 'Cart item quantity updated successfully' });
              }
            );
          }
        );
      }
    );
  },

  deleteCartItem: (req, res) => {
    const idUser = req.user.idUser;
    const { idChiTietDH } = req.body;
    if (!idUser || !idChiTietDH) return res.status(400).json({ message: 'Missing required fields' });

    connection.query(
      `SELECT dc.*,c."idUser" FROM chitietdonhang dc
       JOIN donhang c ON dc."idDonHang" = c."idDonHang"
       WHERE dc."idChiTietDH" = $1 AND c."idUser" = $2 AND c."trangThai" = 'unpaid'`,
      [idChiTietDH, idUser],
      (err, results) => {
        if (err) return res.status(500).json({ message: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Cart item not found' });

        const { idDonHang, idSanPham } = results[0];
        connection.query(
          `DELETE FROM chitietdonhang WHERE "idChiTietDH" = $1`,
          [idChiTietDH],
          (err) => {
            if (err) return res.status(500).json({ message: err.message });
            cartController.updateDetailCartTotal(idDonHang, idSanPham, () => cartController.updateCartTotal(idDonHang));
            res.status(200).json({ success: true, message: 'Cart item deleted successfully' });
          }
        );
      }
    );
  },

  payCOD: (req, res) => {
    const idUser = req.user.idUser;
    const { idDonHang, recipientName, recipientPhone, recipientAddress } = req.body;
    if (!idUser || !idDonHang || !recipientName || !recipientPhone || !recipientAddress)
      return res.status(400).json({ message: 'Missing required fields' });

    connection.query(
      `SELECT * FROM donhang WHERE "idDonHang" = $1 AND "idUser" = $2 AND "trangThai" = 'unpaid'`,
      [idDonHang, idUser],
      (err, results) => {
        if (err) return res.status(500).json({ message: 'Internal server error.' });
        if (results.length === 0) return res.status(404).json({ message: 'Order not found.' });

        connection.query(
          `UPDATE donhang SET "trangThai"='waiting',"tenNguoiNhan"=$1,"SDT"=$2,"diaChi"=$3,"phuongThucTT"='COD',"ngayDatHang"=$4 WHERE "idDonHang"=$5`,
          [recipientName, recipientPhone, recipientAddress, new Date(), idDonHang],
          (err, result) => {
            if (err) return res.status(500).json({ message: 'Internal server error.' });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Failed to update the order.' });
            res.status(200).json({ message: 'Order updated to waiting with COD payment.' });
          }
        );
      }
    );
  },
};

module.exports = cartController;
