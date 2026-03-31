const authService = require('../services/authService');
const { userRepository } = require('../repositories/userRepository');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const usersController = {
  register: async (req, res, next) => {
    try {
      const result = await authService.registerStaff(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  },

  login: async (req, res, next) => {
    try {
      const { userName, passWord } = req.body;
      const { accessToken, refreshToken } = await authService.loginStaff(userName, passWord);
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

  getUserById: async (req, res, next) => {
    try {
      const user = await userRepository.findById('idNhanVien', req.user.idNhanVien);
      if (!user) return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
      const { passWord, ...safeUser } = user;
      res.status(200).json(safeUser);
    } catch (err) { next(err); }
  },

  deleteUser: async (req, res, next) => {
    try {
      const idNhanVien = req.body.idNhanVien || req.params.idNhanVien;
      if (!req.user.admin) return res.status(403).json({ message: 'Bạn không có quyền xóa nhân viên.' });
      const existing = await userRepository.findById('idNhanVien', idNhanVien);
      if (!existing) return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
      await userRepository.delete('idNhanVien', idNhanVien);
      res.status(200).json({ message: 'Xóa nhân viên thành công.' });
    } catch (err) { next(err); }
  },

  changePassword: async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = await userRepository.findById('idNhanVien', req.user.idNhanVien);
      if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
      const match = await bcrypt.compare(oldPassword, user.passWord);
      if (!match) return res.status(401).json({ message: 'Mật khẩu cũ không đúng.' });
      const hashed = await bcrypt.hash(newPassword, 10);
      await userRepository.update('idNhanVien', req.user.idNhanVien, { passWord: hashed });
      logger.info(`[Auth] Nhân viên ${req.user.idNhanVien} đổi mật khẩu thành công`);
      res.status(200).json({ message: 'Đổi mật khẩu thành công.' });
    } catch (err) { next(err); }
  },

  // ─── CUSTOMER ────────────────────────────────────────────────────────────────
  deleteCustomer: async (req, res, next) => {
    try {
      const { idUser } = req.body;
      const BaseRepo = require('../repositories/baseRepository');
      const khRepo = new BaseRepo('taikhoankh');
      const existing = await khRepo.findById('idUser', idUser);
      if (!existing) return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
      await khRepo.delete('idUser', idUser);
      res.status(200).json({ message: 'Xóa khách hàng thành công.' });
    } catch (err) { next(err); }
  },
};

module.exports = usersController;
