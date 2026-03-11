const connection = require("../models/db");
const sendEmail = require("../mailService");

const executeQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    connection.query(query, params || [], (err, results) => {
      if (err) { console.error("Query error:", err.message); reject(err); }
      else resolve(results);
    });
  });
};

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

const getOrderDetailsForEmail = async (idDonHang) => {
  const query = `
    SELECT c."tenNguoiNhan", c."SDT", c."diaChi", c."tongTienDH",
           p."tenSanPham", p."donGia", p."hinhSP", dc."soLuong",
           kh."email", kh."hoTen"
    FROM donhang c
    JOIN chitietdonhang dc ON c."idDonHang" = dc."idDonHang"
    JOIN sanpham p ON dc."idSanPham" = p."idSanPham"
    JOIN taikhoankh kh ON c."idUser" = kh."idUser"
    WHERE c."idDonHang" = $1
  `;
  const results = await executeQuery(query, [idDonHang]);
  results.forEach((item) => {
    item.tongTienDH = formatPrice(item.tongTienDH);
    item.donGia = formatPrice(item.donGia);
  });
  return results;
};

const sendOrderEmail = async (order, idDonHang, subject, message) => {
  const emailHTML = `
    <p><b style="color:black;">Xin chào ${order.hoTen},</b></p>
    <p><b style="color:black;">${message}</b></p>
    <p><b style="color:black;">Thông tin đơn hàng:</b></p>
    <ul>
      <li><strong>Tên người nhận:</strong> ${order.tenNguoiNhan}</li>
      <li><strong>Số điện thoại:</strong> ${order.SDT}</li>
      <li><strong>Địa chỉ:</strong> ${order.diaChi}</li>
      <li><strong>Tổng tiền:</strong> ${order.tongTienDH}</li>
    </ul>
    <p>Danh sách sản phẩm:</p>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="border:1px solid black;padding:8px;">Tên sản phẩm</th>
        <th style="border:1px solid black;padding:8px;">Giá</th>
        <th style="border:1px solid black;padding:8px;">Số lượng</th>
        <th style="border:1px solid black;padding:8px;">Hình ảnh</th>
      </tr></thead>
      <tbody>
        ${order.items.map((item) => `
          <tr>
            <td style="border:1px solid black;padding:8px;">${item.tenSanPham}</td>
            <td style="border:1px solid black;padding:8px;">${item.donGia}</td>
            <td style="border:1px solid black;padding:8px;">${item.soLuong}</td>
            <td style="border:1px solid black;padding:8px;text-align:center;">
              <img src="${item.hinhSP}" style="max-width:100px;">
            </td>
          </tr>`).join("")}
      </tbody>
    </table>
    <p><b>Cảm ơn bạn đã mua sắm!</b></p>
  `;
  await sendEmail(order.email, subject, emailHTML);
};

const orderController = {
  getAllCart: async (req, res) => {
    try {
      const results = await executeQuery(`SELECT * FROM donhang WHERE "trangThai" != 'unpaid'`);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getDetailCart: async (req, res) => {
    const { idDonHang } = req.params;
    if (!idDonHang) return res.status(400).json({ message: "Missing idDonHang" });
    try {
      const query = `
        SELECT dc."idChiTietDH", dc."idDonHang", dc."idSanPham", dc."soLuong", dc."tongTien",
               p."tenSanPham", p."donGia", p."hinhSP",
               c."idUser", c."ngayDatHang", c."tenNguoiNhan", c."SDT", c."diaChi",
               c."phuongThucTT", c."tongTienDH", c."trangThai",
               n."hoTen" AS "tenNhanVien", dv."tenDonVi"
        FROM chitietdonhang dc
        JOIN sanpham p ON dc."idSanPham" = p."idSanPham"
        JOIN donhang c ON dc."idDonHang" = c."idDonHang"
        LEFT JOIN tknhanvien n ON c."idNhanVien" = n."idNhanVien"
        LEFT JOIN donvivanchuyen dv ON c."idDonViVanChuyen" = dv."idDonViVanChuyen"
        WHERE dc."idDonHang" = $1
      `;
      const results = await executeQuery(query, [idDonHang]);
      if (results.length === 0) return res.status(404).json({ message: "Order not found" });
      const order = {
        idDonHang: results[0].idDonHang,
        idUser: results[0].idUser,
        ngayDatHang: results[0].ngayDatHang,
        tenNguoiNhan: results[0].tenNguoiNhan,
        SDT: results[0].SDT,
        diaChi: results[0].diaChi,
        phuongThucTT: results[0].phuongThucTT,
        tongTienDH: results[0].tongTienDH,
        trangThai: results[0].trangThai,
        tenNhanVien: results[0].tenNhanVien,
        tenDonVi: results[0].tenDonVi,
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
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getCusbyId: async (req, res) => {
    const { idUser } = req.params;
    if (!idUser) return res.status(400).json({ message: "Missing idUser" });
    try {
      const results = await executeQuery(`SELECT * FROM taikhoankh WHERE "idUser" = $1`, [idUser]);
      if (results.length === 0) return res.status(404).json({ message: "Customer not found" });
      res.json(results[0]);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  confirmOrder: async (req, res) => {
    const { idDonHang, idDonViVanChuyen } = req.body;
    if (!idDonHang || !idDonViVanChuyen)
      return res.status(400).json({ message: "Missing idDonHang or idDonViVanChuyen" });
    const idNhanVien = req.user.idNhanVien;
    if (!idNhanVien) return res.status(403).json({ message: "User not authorized" });
    try {
      const updateResult = await executeQuery(
        `UPDATE donhang SET "trangThai" = 'delivery', "idDonViVanChuyen" = $1, "idNhanVien" = $2 WHERE "idDonHang" = $3`,
        [idDonViVanChuyen, idNhanVien, idDonHang]
      );
      if (updateResult.affectedRows === 0) return res.status(404).json({ message: "Order not found" });

      const orderDetails = await executeQuery(
        `SELECT "idSanPham", "soLuong" FROM chitietdonhang WHERE "idDonHang" = $1`, [idDonHang]
      );
      for (const item of orderDetails) {
        await executeQuery(
          `UPDATE sanpham SET "soLuong" = "soLuong" - $1 WHERE "idSanPham" = $2`,
          [item.soLuong, item.idSanPham]
        );
      }
      res.json({ message: "Order confirmed successfully" });

      const orderResults = await getOrderDetailsForEmail(idDonHang);
      if (orderResults.length > 0) {
        const order = { ...orderResults[0], items: orderResults };
        await sendOrderEmail(order, idDonHang, "Đơn hàng đã được xác nhận", "Đơn hàng của bạn đang được giao.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getAllCartWaiting: async (req, res) => {
    try {
      const results = await executeQuery(`SELECT * FROM donhang WHERE "trangThai" = 'waiting'`);
      res.json(results);
    } catch (error) { res.status(500).json({ message: "Internal Server Error" }); }
  },

  getAllCartDelivery: async (req, res) => {
    try {
      const query = `
        SELECT donhang.*, donvivanchuyen."tenDonVi"
        FROM donhang
        LEFT JOIN donvivanchuyen ON donhang."idDonViVanChuyen" = donvivanchuyen."idDonViVanChuyen"
        WHERE donhang."trangThai" = 'delivery'
      `;
      const results = await executeQuery(query);
      res.json(results);
    } catch (error) { res.status(500).json({ message: "Internal Server Error" }); }
  },

  updateCustomerLoyalty: async (customerId) => {
    try {
      const orders = await executeQuery(
        `SELECT * FROM donhang WHERE "idUser" = $1 AND "trangThai" = 'success'`, [customerId]
      );
      let totalProductCount = 0;
      for (const order of orders) {
        const details = await executeQuery(
          `SELECT SUM("soLuong") AS "productCount" FROM chitietdonhang WHERE "idDonHang" = $1`, [order.idDonHang]
        );
        totalProductCount += parseInt(details[0].productCount) || 0;
      }
      if (totalProductCount > 9) {
        await executeQuery(`UPDATE taikhoankh SET "KHThanThiet" = 1 WHERE "idUser" = $1`, [customerId]);
      }
    } catch (error) {
      console.error('Error updating customer loyalty:', error);
      throw error;
    }
  },

  confirmDelivery: async (req, res) => {
    const { idDonHang } = req.body;
    if (!idDonHang) return res.status(400).json({ message: "Missing idDonHang" });
    const idNhanVien = req.user.idNhanVien;
    if (!idNhanVien) return res.status(403).json({ message: "User not authorized" });
    try {
      const results = await executeQuery(
        `UPDATE donhang SET "trangThai" = 'success', "idNhanVien" = $1 WHERE "idDonHang" = $2`,
        [idNhanVien, idDonHang]
      );
      if (results.affectedRows === 0) return res.status(404).json({ message: "Order not found" });
      res.json({ message: "Delivery confirmed successfully" });

      const orderResults = await executeQuery(
        `SELECT "idUser" FROM donhang WHERE "idDonHang" = $1`, [idDonHang]
      );
      if (orderResults.length > 0) {
        await orderController.updateCustomerLoyalty(orderResults[0].idUser);
      }
      const orderDetails = await getOrderDetailsForEmail(idDonHang);
      if (orderDetails.length > 0) {
        const order = { ...orderDetails[0], items: orderDetails };
        await sendOrderEmail(order, idDonHang, "Đơn hàng đã được giao", "Đơn hàng đã giao thành công. Cảm ơn!");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getAllCartDone: async (req, res) => {
    try {
      const query = `
        SELECT donhang.*, donvivanchuyen."tenDonVi"
        FROM donhang
        LEFT JOIN donvivanchuyen ON donhang."idDonViVanChuyen" = donvivanchuyen."idDonViVanChuyen"
        WHERE donhang."trangThai" = 'success'
      `;
      const results = await executeQuery(query);
      res.json(results);
    } catch (error) { res.status(500).json({ message: "Internal Server Error" }); }
  },

  deliveryfailCOD: async (req, res) => {
    const { idDonHang } = req.body;
    if (!idDonHang) return res.status(400).json({ message: "Missing idDonHang" });
    const idNhanVien = req.user.idNhanVien;
    if (!idNhanVien) return res.status(403).json({ message: "User not authorized" });
    try {
      const updateResult = await executeQuery(
        `UPDATE donhang SET "trangThai" = 'unreceive' WHERE "idDonHang" = $1`, [idDonHang]
      );
      if (updateResult.affectedRows === 0) return res.status(404).json({ message: "Order not found" });

      const orderDetails = await executeQuery(
        `SELECT "idSanPham", "soLuong" FROM chitietdonhang WHERE "idDonHang" = $1`, [idDonHang]
      );
      for (const item of orderDetails) {
        await executeQuery(
          `UPDATE sanpham SET "soLuong" = "soLuong" + $1 WHERE "idSanPham" = $2`,
          [item.soLuong, item.idSanPham]
        );
      }
      res.json({ message: "Order unreceived and products restocked" });

      const orderDetailss = await getOrderDetailsForEmail(idDonHang);
      if (orderDetailss.length > 0) {
        const order = { ...orderDetailss[0], items: orderDetailss };
        await sendOrderEmail(order, idDonHang, "Đơn hàng bị hủy", "Đơn hàng bị hủy do không nhận hàng.");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
};

module.exports = orderController;
