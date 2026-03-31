const BaseRepository = require('../repositories/baseRepository');
const { producer } = require('./queueService');
const logger = require('../utils/logger');

const orderRepo = new BaseRepository('donhang');

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price) || 0);

const buildEmailHTML = (order) => `
  <p><b>Xin chào ${order.hoTen},</b></p>
  <p><b>${order.message}</b></p>
  <p><b>Thông tin đơn hàng:</b></p>
  <ul>
    <li><strong>Tên người nhận:</strong> ${order.tenNguoiNhan}</li>
    <li><strong>Số điện thoại:</strong> ${order.SDT}</li>
    <li><strong>Địa chỉ:</strong> ${order.diaChi}</li>
    <li><strong>Tổng tiền:</strong> ${formatPrice(order.tongTienDH)}</li>
  </ul>
  <p>Danh sách sản phẩm:</p>
  <table style="width:100%;border-collapse:collapse;">
    <thead><tr>
      <th style="border:1px solid black;padding:8px;">Tên sản phẩm</th>
      <th style="border:1px solid black;padding:8px;">Giá</th>
      <th style="border:1px solid black;padding:8px;">Số lượng</th>
    </tr></thead>
    <tbody>
      ${order.items.map((item) => `
        <tr>
          <td style="border:1px solid black;padding:8px;">${item.tenSanPham}</td>
          <td style="border:1px solid black;padding:8px;">${formatPrice(item.donGia)}</td>
          <td style="border:1px solid black;padding:8px;">${item.soLuong}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  <p><b>Cảm ơn bạn đã mua sắm!</b></p>
`;

class OrderService {
  async _getOrderDetailsForEmail(idDonHang) {
    return orderRepo.query(
      `SELECT c."tenNguoiNhan",c."SDT",c."diaChi",c."tongTienDH",
              p."tenSanPham",p."donGia",p."hinhSP",dc."soLuong",
              kh."email",kh."hoTen"
       FROM donhang c
       JOIN chitietdonhang dc ON c."idDonHang" = dc."idDonHang"
       JOIN sanpham p ON dc."idSanPham" = p."idSanPham"
       JOIN taikhoankh kh ON c."idUser" = kh."idUser"
       WHERE c."idDonHang" = $1`,
      [idDonHang]
    );
  }

  async _sendOrderEmail(idDonHang, subject, message) {
    try {
      const rows = await this._getOrderDetailsForEmail(idDonHang);
      if (rows.length === 0) return;
      const order = { ...rows[0], items: rows, message };
      const html = buildEmailHTML(order);
      await producer.sendEmail(order.email, subject, html);
    } catch (err) {
      logger.error(`[OrderService] Email error for order #${idDonHang}: ${err.message}`);
    }
  }

  async getAllOrders() {
    return orderRepo.query(`SELECT * FROM donhang WHERE "trangThai" != 'unpaid'`);
  }

  async getAllWaiting() {
    return orderRepo.query(`SELECT * FROM donhang WHERE "trangThai" = 'waiting'`);
  }

  async getAllDelivery() {
    return orderRepo.query(`
      SELECT donhang.*, donvivanchuyen."tenDonVi"
      FROM donhang
      LEFT JOIN donvivanchuyen ON donhang."idDonViVanChuyen" = donvivanchuyen."idDonViVanChuyen"
      WHERE donhang."trangThai" = 'delivery'
    `);
  }

  async getAllDone() {
    return orderRepo.query(`
      SELECT donhang.*, donvivanchuyen."tenDonVi"
      FROM donhang
      LEFT JOIN donvivanchuyen ON donhang."idDonViVanChuyen" = donvivanchuyen."idDonViVanChuyen"
      WHERE donhang."trangThai" = 'success'
    `);
  }

  async confirmOrder(idDonHang, idNhanVien, idDonViVanChuyen) {
    const result = await orderRepo.query(
      `UPDATE donhang SET "trangThai"='delivery',"idDonViVanChuyen"=$1,"idNhanVien"=$2 WHERE "idDonHang"=$3`,
      [idDonViVanChuyen, idNhanVien, idDonHang]
    );
    if (result.affectedRows === 0) {
      const err = new Error('Không tìm thấy đơn hàng'); err.status = 404; throw err;
    }

    // Trừ tồn kho
    const items = await orderRepo.query(
      `SELECT "idSanPham","soLuong" FROM chitietdonhang WHERE "idDonHang"=$1`, [idDonHang]
    );
    for (const item of items) {
      await orderRepo.query(
        `UPDATE sanpham SET "soLuong" = "soLuong" - $1 WHERE "idSanPham" = $2`,
        [item.soLuong, item.idSanPham]
      );
    }

    logger.info(`[Order] #${idDonHang} confirmed → delivery by staff #${idNhanVien}`);
    // Async email qua queue
    this._sendOrderEmail(idDonHang, 'Đơn hàng đã được xác nhận', 'Đơn hàng của bạn đang được giao.');
    return { message: 'Xác nhận đơn hàng thành công' };
  }

  async confirmDelivery(idDonHang, idNhanVien) {
    const result = await orderRepo.query(
      `UPDATE donhang SET "trangThai"='success',"idNhanVien"=$1 WHERE "idDonHang"=$2`,
      [idNhanVien, idDonHang]
    );
    if (result.affectedRows === 0) {
      const err = new Error('Không tìm thấy đơn hàng'); err.status = 404; throw err;
    }

    // Update customer loyalty async
    const orderRows = await orderRepo.query(`SELECT "idUser" FROM donhang WHERE "idDonHang"=$1`, [idDonHang]);
    if (orderRows.length > 0) {
      this._updateCustomerLoyalty(orderRows[0].idUser).catch(logger.error);
    }

    logger.info(`[Order] #${idDonHang} delivered by staff #${idNhanVien}`);
    this._sendOrderEmail(idDonHang, 'Đơn hàng đã được giao', 'Đơn hàng đã giao thành công. Cảm ơn!');
    return { message: 'Xác nhận giao hàng thành công' };
  }

  async deliveryFail(idDonHang, idNhanVien) {
    const result = await orderRepo.query(
      `UPDATE donhang SET "trangThai"='unreceive' WHERE "idDonHang"=$1`, [idDonHang]
    );
    if (result.affectedRows === 0) {
      const err = new Error('Không tìm thấy đơn hàng'); err.status = 404; throw err;
    }

    // Hoàn tồn kho
    const items = await orderRepo.query(
      `SELECT "idSanPham","soLuong" FROM chitietdonhang WHERE "idDonHang"=$1`, [idDonHang]
    );
    for (const item of items) {
      await orderRepo.query(
        `UPDATE sanpham SET "soLuong" = "soLuong" + $1 WHERE "idSanPham" = $2`,
        [item.soLuong, item.idSanPham]
      );
    }

    logger.info(`[Order] #${idDonHang} unreceived — stock restored`);
    this._sendOrderEmail(idDonHang, 'Đơn hàng bị hủy', 'Đơn hàng bị hủy do không nhận hàng.');
    return { message: 'Cập nhật giao hàng thất bại thành công' };
  }

  async _updateCustomerLoyalty(customerId) {
    const orders = await orderRepo.query(
      `SELECT "idDonHang" FROM donhang WHERE "idUser"=$1 AND "trangThai"='success'`, [customerId]
    );
    let total = 0;
    for (const o of orders) {
      const r = await orderRepo.query(
        `SELECT SUM("soLuong") AS c FROM chitietdonhang WHERE "idDonHang"=$1`, [o.idDonHang]
      );
      total += parseInt(r[0]?.c || 0);
    }
    if (total > 9) {
      await orderRepo.query(`UPDATE taikhoankh SET "KHThanThiet"=1 WHERE "idUser"=$1`, [customerId]);
      logger.info(`[Order] Customer #${customerId} upgraded to VIP`);
    }
  }
}

module.exports = new OrderService();
