const cartService = require('../services/cartService');

const cartController = {
  createOrUpdateCart: async (req, res, next) => {
    try {
      const { idSanPham, soLuong } = req.body;
      const result = await cartService.addToCart(req.user.idUser, idSanPham, soLuong);
      res.status(result.updated ? 200 : 201).json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  getDetailCart: async (req, res, next) => {
    try {
      const data = await cartService.getCartDetail(req.user.idUser);
      if (!data.cartId) return res.status(404).json({ message: 'Chưa có giỏ hàng' });
      res.json(data.items);
    } catch (err) { next(err); }
  },

  getCart: async (req, res, next) => {
    try {
      const orders = await cartService.getOrdersByUser(req.user.idUser);
      res.json(orders);
    } catch (err) { next(err); }
  },

  getDetailCartOfUser: async (req, res, next) => {
    try {
      const items = await cartService.getOrderDetail(req.user.idUser, req.params.idDonHang);
      res.json(items);
    } catch (err) { next(err); }
  },

  updateCartItem: async (req, res, next) => {
    try {
      const { idChiTietDH, soLuong } = req.body;
      const result = await cartService.updateCartItem(req.user.idUser, idChiTietDH, soLuong);
      res.status(result.adjusted ? 400 : 200).json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  deleteCartItem: async (req, res, next) => {
    try {
      const result = await cartService.deleteCartItem(req.user.idUser, req.body.idChiTietDH);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  payCOD: async (req, res, next) => {
    try {
      const { idDonHang, recipientName, recipientPhone, recipientAddress } = req.body;
      const result = await cartService.payCOD(req.user.idUser, idDonHang, recipientName, recipientPhone, recipientAddress);
      res.json(result);
    } catch (err) { next(err); }
  },

  cancelOrder: async (req, res, next) => {
    try {
      const result = await cartService.cancelOrder(req.user.idUser, req.body.idDonHang);
      res.json(result);
    } catch (err) { next(err); }
  },

  // Internal helpers (used by orderController if needed)
  updateDetailCartTotal: (cart_id, idSanPham, callback) => {
    const cartRepo = require('../repositories/cartRepository');
    cartRepo.updateDetailTotal(cart_id, idSanPham)
      .then(() => cartRepo.updateCartTotal(cart_id))
      .then(callback)
      .catch(console.error);
  },
  updateCartTotal: (cart_id) => {
    const cartRepo = require('../repositories/cartRepository');
    cartRepo.updateCartTotal(cart_id).catch(console.error);
  },
  clearCart: async (req, res, next) => {
    try {
      const { idUser } = req.body;
      const cartRepo = require('../repositories/cartRepository');
      await cartRepo.query(`DELETE FROM donhang WHERE "idUser" = $1 AND "trangThai" = 'unpaid'`, [idUser]);
      res.json({ message: 'Giỏ hàng đã được xóa' });
    } catch (err) { next(err); }
  },
};

module.exports = cartController;
