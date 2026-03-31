const orderService = require('../services/orderService');

const orderController = {
  getAllCart: async (req, res, next) => {
    try { res.json(await orderService.getAllOrders()); } catch (err) { next(err); }
  },
  getAllCartWaiting: async (req, res, next) => {
    try { res.json(await orderService.getAllWaiting()); } catch (err) { next(err); }
  },
  getAllCartDelivery: async (req, res, next) => {
    try { res.json(await orderService.getAllDelivery()); } catch (err) { next(err); }
  },
  getAllCartDone: async (req, res, next) => {
    try { res.json(await orderService.getAllDone()); } catch (err) { next(err); }
  },

  confirmOrder: async (req, res, next) => {
    try {
      const { idDonHang, idDonViVanChuyen } = req.body;
      const result = await orderService.confirmOrder(idDonHang, req.user.idNhanVien, idDonViVanChuyen);
      res.json(result);
    } catch (err) { next(err); }
  },

  confirmDelivery: async (req, res, next) => {
    try {
      const result = await orderService.confirmDelivery(req.body.idDonHang, req.user.idNhanVien);
      res.json(result);
    } catch (err) { next(err); }
  },

  deliveryfailCOD: async (req, res, next) => {
    try {
      const result = await orderService.deliveryFail(req.body.idDonHang, req.user.idNhanVien);
      res.json(result);
    } catch (err) { next(err); }
  },
};

module.exports = orderController;
