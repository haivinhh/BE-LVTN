const connection = require("../models/db");
const sendEmail = require("../mailService");

const executeQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    connection.query(query, params, (err, results) => {
      if (err) {
        console.error("Error executing query:", err.message);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};
const formatPrice = (price) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};
const getOrderDetailsForEmail = async (idDonHang) => {
  const query = `
    SELECT c.tenNguoiNhan, c.SDT, c.diaChi, c.tongTienDH, p.tenSanPham, p.donGia, p.hinhSP, dc.soLuong, kh.email
    FROM donhang c
    JOIN chitietdonhang dc ON c.idDonHang = dc.idDonHang
    JOIN sanpham p ON dc.idSanPham = p.idSanPham
    JOIN taikhoankh kh ON c.idUser = kh.idUser
    WHERE c.idDonHang = ?
  `;
  const results = await executeQuery(query, [idDonHang]);

  // Format the prices in the results
  results.forEach((item) => {
    item.tongTienDH = formatPrice(item.tongTienDH);
    item.donGia = formatPrice(item.donGia);
  });

  return results;
};

const sendOrderEmail = async (order, idDonHang, subject, message) => {
  const emailHTML = `
    <p><b style="color: black;">Xin chào ${order.tenNguoiNhan},</b></p>
    <p><b style="color: black;">${message}</b></p>
    <p><b style="color: black;">Thông tin đơn hàng:</b></p>
    <ul>
      <li><strong style="color: black;">Tên người nhận:</strong> ${
        order.tenNguoiNhan
      }</li>
      <li><strong style="color: black;">Số điện thoại:</strong> ${
        order.SDT
      }</li>
      <li><strong style="color: black;">Địa chỉ:</strong> ${order.diaChi}</li>
      <li><strong style="color: black;">Tổng tiền:</strong> ${
        order.tongTienDH
      }</li>
    </ul>
    <p style="color: black;">Danh sách sản phẩm:</p>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border: 1px solid black; padding: 8px; text-align: left; color: black;">Tên sản phẩm</th>
          <th style="border: 1px solid black; padding: 8px; text-align: left; color: black;">Giá</th>
          <th style="border: 1px solid black; padding: 8px; text-align: left; color: black;">Số lượng</th>
          <th style="border: 1px solid black; padding: 8px; text-align: left; color: black;">Hình ảnh</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            (item) => `
          <tr>
            <td style="border: 1px solid black; padding: 8px; color: black;">${item.tenSanPham}</td>
            <td style="border: 1px solid black; padding: 8px; color: black;">${item.donGia}</td>
            <td style="border: 1px solid black; padding: 8px; color: black;">${item.soLuong}</td>
            <td style="border: 1px solid black; padding: 8px; text-align: center;">
              <img src="${item.hinhSP}" alt="Product Image" style="max-width: 100px; height: auto;">
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    <p><b style="color: black;">Cảm ơn bạn đã mua sắm ở cửa hàng chúng tôi!</b></p>
    <p><b style="color: black;">Trân trọng,<br>Nguyen Hai Vinh</b></p>
  `;
  await sendEmail(order.email, subject, emailHTML);
};

const orderController = {
  getAllCart: async (req, res) => {
    try {
      const query = "SELECT * FROM donhang WHERE trangThai != 'unpaid'";
      const results = await executeQuery(query);
      res.json(results);
    } catch (error) {
      console.error("Unexpected error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getDetailCart: async (req, res) => {
    const { idDonHang } = req.params;
    if (!idDonHang) {
      console.error("Missing required field: idDonHang");
      return res
        .status(400)
        .json({ message: "Missing required field: idDonHang" });
    }

    try {
      const query = `
        SELECT dc.idChiTietDH, dc.idDonHang, dc.idSanPham, dc.soLuong, dc.tongTien,
               p.tenSanPham, p.donGia, p.hinhSP,
               c.idUser, c.ngayDatHang, c.tenNguoiNhan, c.SDT, c.diaChi, c.phuongThucTT, c.tongTienDH, c.trangThai,
               n.hoTen AS tenNhanVien, dv.tenDonVi AS tenDonVi
        FROM chitietdonhang dc
        JOIN sanpham p ON dc.idSanPham = p.idSanPham
        JOIN donhang c ON dc.idDonHang = c.idDonHang
        LEFT JOIN tknhanvien n ON c.idNhanVien = n.idNhanVien
        LEFT JOIN donvivanchuyen dv ON c.idDonViVanChuyen = dv.idDonViVanChuyen
        WHERE dc.idDonHang = ?
      `;
      const results = await executeQuery(query, [idDonHang]);

      if (results.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

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
      console.error("Unexpected error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getCusbyId: async (req, res) => {
    const { idUser } = req.params;
    if (!idUser) {
      return res
        .status(400)
        .json({ message: "Missing required field: idUser" });
    }

    try {
      const query = "SELECT * FROM taikhoankh WHERE idUser = ?";
      const results = await executeQuery(query, [idUser]);

      if (results.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(results[0]);
    } catch (error) {
      console.error("Unexpected error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  confirmOrder: async (req, res) => {
    const { idDonHang, idDonViVanChuyen } = req.body;
    if (!idDonHang || !idDonViVanChuyen) {
      return res.status(400).json({
        message: "Missing required fields: idDonHang or idDonViVanChuyen",
      });
    }

    const idNhanVien = req.user.idNhanVien;
    if (!idNhanVien) {
      return res.status(403).json({ message: "User not authorized" });
    }

    try {
      // Update order status
      const updateOrderQuery =
        "UPDATE donhang SET trangThai = 'delivery', idDonViVanChuyen = ?, idNhanVien = ? WHERE idDonHang = ?";
      const updateOrderResult = await executeQuery(updateOrderQuery, [
        idDonViVanChuyen,
        idNhanVien,
        idDonHang,
      ]);

      if (updateOrderResult.affectedRows === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get order details for updating product quantities
      const orderDetailsQuery = `
        SELECT dc.idChiTietDH, dc.idSanPham, dc.soLuong
        FROM chitietdonhang dc
        WHERE dc.idDonHang = ?
      `;
      const orderDetails = await executeQuery(orderDetailsQuery, [idDonHang]);

      // Update product quantities
      const updateProductQueries = orderDetails.map((item) => {
        return {
          sql: "UPDATE sanpham SET soLuong = soLuong - ? WHERE idSanPham = ?",
          params: [item.soLuong, item.idSanPham],
        };
      });

      for (const query of updateProductQueries) {
        await executeQuery(query.sql, query.params);
      }

      // Get order details for email
      const orderResults = await getOrderDetailsForEmail(idDonHang);
      if (orderResults.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      const order = orderResults[0];
      order.items = orderResults;

      // Send order email
      await sendOrderEmail(
        order,
        idDonHang,
        "Đơn hàng của bạn đã được xác nhận",
        "Đơn hàng của bạn đã được xác nhận và đang được giao."
      );

      res.json({ message: "Order confirmed successfully" });
    } catch (error) {
      console.error("Unexpected error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getAllCartWaiting: async (req, res) => {
    try {
      const query = "SELECT * FROM donhang WHERE trangThai = 'waiting'";
      const results = await executeQuery(query);
      res.json(results);
    } catch (error) {
      console.error("Unexpected error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getAllCartDelivery: async (req, res) => {
    try {
      const query = `
            SELECT 
                donhang.*, 
                donViVanChuyen.tenDonVi
            FROM 
                donhang
            LEFT JOIN 
                donViVanChuyen 
            ON 
                donhang.idDonViVanChuyen = donViVanChuyen.idDonViVanChuyen
            WHERE 
                donhang.trangThai = 'delivery'
        `;
      const results = await executeQuery(query);
      res.json(results);
    } catch (error) {
      console.error("Unexpected error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  confirmDelivery: async (req, res) => {
    const { idDonHang } = req.body;
    if (!idDonHang) {
      return res
        .status(400)
        .json({ message: "Missing required field: idDonHang" });
    }

    const idNhanVien = req.user.idNhanVien;
    if (!idNhanVien) {
      return res.status(403).json({ message: "User not authorized" });
    }

    try {
      const query =
        "UPDATE donhang SET trangThai = 'success', idNhanVien = ? WHERE idDonHang = ?";
      const results = await executeQuery(query, [idNhanVien, idDonHang]);

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      const orderResults = await getOrderDetailsForEmail(idDonHang);
      if (orderResults.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      const order = orderResults[0];
      order.items = orderResults;
      await sendOrderEmail(
        order,
        idDonHang,
        "Đơn hàng của bạn đã được giao",
        "Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã mua sắm với chúng tôi!"
      );

      res.json({ message: "Delivery confirmed successfully" });
    } catch (error) {
      console.error("Unexpected error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getAllCartDone: async (req, res) => {
    try {
      const query = `
            SELECT 
                donhang.*, 
                donViVanChuyen.tenDonVi
            FROM 
                donhang
            LEFT JOIN 
                donViVanChuyen 
            ON 
                donhang.idDonViVanChuyen = donViVanChuyen.idDonViVanChuyen
            WHERE 
                donhang.trangThai = 'success'
        `;
      const results = await executeQuery(query);
      res.json(results);
    } catch (error) {
      console.error("Unexpected error:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
};

module.exports = orderController;
