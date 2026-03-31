const bcrypt = require('bcryptjs');
const { userRepository } = require('../repositories/userRepository');
const logger = require('../utils/logger');

const adminController = {
  getAllUsers: async (req, res, next) => {
    try {
      const users = await userRepository.findAll();
      const safe = users.map(({ passWord, ...u }) => u);
      res.status(200).json(safe);
    } catch (err) { next(err); }
  },

  addUser: async (req, res, next) => {
    try {
      const { hoTen, userName, email, SDT, diaChi, admin, chucVu, password } = req.body;
      const adminValue = admin !== undefined ? admin : chucVu;

      const existing = await userRepository.findByUsername(userName);
      if (existing) return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      await userRepository.insert({ hoTen, userName, email, SDT, diaChi, admin: adminValue, passWord: hashedPassword });
      logger.info(`[Admin] Thêm nhân viên: ${userName}`);
      res.status(201).json({ message: 'Thêm nhân viên thành công.' });
    } catch (err) { next(err); }
  },

  updateUser: async (req, res, next) => {
    try {
      const { idNhanVien } = req.params;
      const { hoTen, userName, email, SDT, diaChi, chucVu } = req.body;

      const conflict = await userRepository.query(
        'SELECT * FROM tknhanvien WHERE "userName"=$1 AND "idNhanVien"!=$2',
        [userName, idNhanVien]
      );
      if (conflict.length > 0) return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.' });

      await userRepository.update('idNhanVien', idNhanVien, { hoTen, userName, email, SDT, diaChi, admin: chucVu });
      res.status(200).json({ message: 'Cập nhật thông tin nhân viên thành công.' });
    } catch (err) { next(err); }
  },

  deleteUser: async (req, res, next) => {
    try {
      const deleted = await userRepository.delete('idNhanVien', req.params.idNhanVien);
      if (!deleted) return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
      logger.info(`[Admin] Xóa nhân viên #${req.params.idNhanVien}`);
      res.status(200).json({ message: 'Xóa nhân viên thành công.' });
    } catch (err) { next(err); }
  },

  getAllCustomers: async (req, res, next) => {
    try {
      const BaseRepository = require('../repositories/baseRepository');
      const khRepo = new BaseRepository('taikhoankh');
      const customers = await khRepo.findAll();
      const safe = customers.map(({ passWord, ...c }) => c);
      res.status(200).json(safe);
    } catch (err) { next(err); }
  },
};

module.exports = adminController;
