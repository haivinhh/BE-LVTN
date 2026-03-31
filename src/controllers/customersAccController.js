const customerService = require('../services/customerService');
const authService = require('../services/authService');
const BaseRepository = require('../repositories/baseRepository');

const khRepo = new BaseRepository('taikhoankh');

const customersAccController = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  register: async (req, res, next) => {
    try {
      const result = await customerService.register(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  },

  login: async (req, res, next) => {
    try {
      const { userName, passWord } = req.body;
      const { accessToken, refreshToken } = await customerService.login(userName, passWord);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/', sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ message: 'Đăng nhập thành công.', accessToken });
    } catch (err) { next(err); }
  },

  logout: async (req, res, next) => {
    try {
      await authService.logout(req.cookies.refreshToken);
      res.clearCookie('refreshToken');
      res.status(200).json({ message: 'Đăng xuất thành công' });
    } catch (err) { next(err); }
  },

  requestRefreshToken: async (req, res, next) => {
    try {
      const { accessToken, refreshToken } = await authService.refreshAccessToken(req.cookies.refreshToken);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        path: '/', sameSite: 'none', maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ accessToken });
    } catch (err) { next(err); }
  },

  // ─── Profile ───────────────────────────────────────────────────────────────
  getProfile: async (req, res, next) => {
    try {
      const profile = await customerService.getProfile(req.user.idUser);
      res.status(200).json(profile);
    } catch (err) { next(err); }
  },

  updateProfile: async (req, res, next) => {
    try {
      const updated = await customerService.updateProfile(req.user.idUser, req.body);
      res.status(200).json({ message: 'Cập nhật thành công', user: updated });
    } catch (err) { next(err); }
  },

  changePassword: async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const result = await customerService.changePassword(req.user.idUser, oldPassword, newPassword);
      res.status(200).json(result);
    } catch (err) { next(err); }
  },

  // ─── Admin management ──────────────────────────────────────────────────────
  getAllCustomers: async (req, res, next) => {
    try {
      const customers = await khRepo.findAll();
      const safe = customers.map(({ passWord, ...c }) => c);
      res.status(200).json(safe);
    } catch (err) { next(err); }
  },

  getOrdersByCustomerId: async (req, res, next) => {
    try {
      const { idUser } = req.params;
      const orderRepo = new BaseRepository('donhang');
      const orders = await orderRepo.findAll({ idUser });
      res.status(200).json(orders);
    } catch (err) { next(err); }
  },

  addCustomer: async (req, res, next) => {
    try {
      const result = await customerService.register(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  },

  updateCustomer: async (req, res, next) => {
    try {
      const { idUser } = req.params;
      const allowed = ['hoTen', 'SDT', 'diaChi', 'email', 'userName'];
      const data = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
      const updated = await khRepo.update('idUser', idUser, data);
      if (!updated) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
      const { passWord, ...safe } = updated;
      res.status(200).json({ message: 'Cập nhật thành công', user: safe });
    } catch (err) { next(err); }
  },

  deleteCustomer: async (req, res, next) => {
    try {
      const idUser = req.params.idUser || req.body.idUser;
      const deleted = await khRepo.delete('idUser', idUser);
      if (!deleted) return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
      res.status(200).json({ message: 'Xóa khách hàng thành công' });
    } catch (err) { next(err); }
  },
};

module.exports = customersAccController;
