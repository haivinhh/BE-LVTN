const cartRepository = require('../repositories/cartRepository');
const productRepository = require('../repositories/productRepository');
const logger = require('../utils/logger');

class CartService {
  async _getOrCreateCart(idUser) {
    let cart = await cartRepository.findUnpaidCart(idUser);
    if (!cart) {
      cart = await cartRepository.createCart(idUser);
    }
    return cart.idDonHang;
  }

  async _recalculate(idDonHang, idSanPham) {
    await cartRepository.updateDetailTotal(idDonHang, idSanPham);
    await cartRepository.updateCartTotal(idDonHang);
  }

  async _calcDiscount(totalQuantity, KHThanThiet) {
    if (totalQuantity > 4) return KHThanThiet === 1 ? 0.3 : 0.1;
    if (KHThanThiet === 1) return 0.2;
    return 0;
  }

  async addToCart(idUser, idSanPham, soLuong) {
    const product = await productRepository.findById('idSanPham', idSanPham);
    if (!product) {
      const err = new Error('Sản phẩm không tồn tại'); err.status = 404; throw err;
    }
    if (product.soLuong < soLuong) {
      const err = new Error(`Kho đã hết hàng. Chỉ còn ${product.soLuong} sản phẩm.`);
      err.status = 400; throw err;
    }

    const idDonHang = await this._getOrCreateCart(idUser);
    const existing = await cartRepository.findCartItem(idDonHang, idSanPham);

    if (existing) {
      await cartRepository.updateCartItemQuantity(existing.idChiTietDH, existing.soLuong + parseInt(soLuong));
      await this._recalculate(idDonHang, idSanPham);
      return { message: 'Cập nhật giỏ hàng thành công', updated: true };
    } else {
      await cartRepository.insertCartItem(idDonHang, idSanPham, soLuong);
      await this._recalculate(idDonHang, idSanPham);
      return { message: 'Thêm vào giỏ hàng thành công', updated: false };
    }
  }

  async getCartDetail(idUser) {
    const items = await cartRepository.getCartDetail(idUser);
    if (items.length === 0) return { items: [], cartId: null };

    const idDonHang = items[0].idDonHang;
    const promo = await cartRepository.getCartItemPromo(idDonHang);
    if (!promo) return { items, cartId: idDonHang };

    const discount = await this._calcDiscount(promo.totalQuantity, promo.KHThanThiet);
    await cartRepository.setDiscount(idDonHang, discount);
    await cartRepository.updateCartTotal(idDonHang);

    return { items, cartId: idDonHang, discount };
  }

  async updateCartItem(idUser, idChiTietDH, soLuong) {
    const item = await cartRepository.getCartItemWithOwner(idChiTietDH, idUser);
    if (!item) {
      const err = new Error('Không tìm thấy mục trong giỏ hàng'); err.status = 404; throw err;
    }

    const product = await productRepository.findById('idSanPham', item.idSanPham);
    const finalQty = Math.min(soLuong, product.soLuong);
    await cartRepository.updateCartItemQuantity(idChiTietDH, finalQty);
    await this._recalculate(item.idDonHang, item.idSanPham);

    if (finalQty < soLuong) {
      return { message: `Kho chỉ còn ${product.soLuong} sản phẩm. Đã cập nhật số lượng.`, adjusted: true };
    }
    return { message: 'Cập nhật số lượng thành công' };
  }

  async deleteCartItem(idUser, idChiTietDH) {
    const item = await cartRepository.getCartItemWithOwner(idChiTietDH, idUser);
    if (!item) {
      const err = new Error('Không tìm thấy mục trong giỏ hàng'); err.status = 404; throw err;
    }
    await cartRepository.deleteCartItem(idChiTietDH);
    await this._recalculate(item.idDonHang, item.idSanPham);
    return { message: 'Xóa sản phẩm khỏi giỏ hàng thành công' };
  }

  async getOrdersByUser(idUser) {
    return cartRepository.getOrdersByUser(idUser);
  }

  async getOrderDetail(idUser, idDonHang) {
    return cartRepository.getOrderDetailOfUser(idUser, idDonHang);
  }

  async payCOD(idUser, idDonHang, recipientName, recipientPhone, recipientAddress) {
    const cart = await cartRepository.findOne({ idDonHang, idUser, trangThai: 'unpaid' });
    if (!cart) {
      const err = new Error('Không tìm thấy đơn hàng'); err.status = 404; throw err;
    }
    await cartRepository.payCOD(idDonHang, recipientName, recipientPhone, recipientAddress);
    logger.info(`[Cart] Đơn hàng #${idDonHang} thanh toán COD`);
    return { message: 'Đặt hàng thành công với phương thức COD' };
  }

  async cancelOrder(idUser, idDonHang) {
    const order = await cartRepository.query(
      `SELECT * FROM donhang WHERE "idDonHang"=$1 AND "idUser"=$2 AND "phuongThucTT"='COD' AND "trangThai"='waiting'`,
      [idDonHang, idUser]
    );
    if (order.length === 0) {
      const err = new Error('Không tìm thấy đơn hàng hoặc đơn hàng không thể hủy'); err.status = 404; throw err;
    }
    await cartRepository.cancelOrder(idDonHang);
    logger.info(`[Cart] Hủy đơn hàng #${idDonHang} bởi user #${idUser}`);
    return { message: 'Hủy đơn hàng thành công' };
  }
}

module.exports = new CartService();
