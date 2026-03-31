const customerService = require('../services/customerService');
const authService = require('../services/authService');

// This controller mirrors customersAccController but keeps backward compat
// for routes that use cuslogin, cuslogout naming
const customersController = {
  cusregister: async (req, res, next) => {
    try {
      const result = await customerService.register(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  },

  cuslogin: async (req, res, next) => {
    try {
      const { userName, passWord } = req.body;
      const { accessToken, refreshToken } = await customerService.login(userName, passWord);
      res.cookie('refreshTokenCus', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/', sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ message: true, accessToken });
    } catch (err) { next(err); }
  },

  cuslogout: async (req, res, next) => {
    try {
      await authService.logout(req.cookies.refreshTokenCus);
      res.clearCookie('refreshTokenCus');
      res.status(200).json({ message: 'Đăng xuất thành công' });
    } catch (err) { next(err); }
  },

  requestRefreshToken: async (req, res, next) => {
    try {
      const { accessToken, refreshToken } = await authService.refreshAccessToken(req.cookies.refreshTokenCus);
      res.cookie('refreshTokenCus', refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        path: '/', sameSite: 'none', maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ accessToken });
    } catch (err) { next(err); }
  },

  getCustomerById: async (req, res, next) => {
    try {
      const profile = await customerService.getProfile(req.user.idUser);
      res.status(200).json(profile);
    } catch (err) { next(err); }
  },

  updateCustomer: async (req, res, next) => {
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
};

module.exports = customersController;
