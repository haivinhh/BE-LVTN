const bcrypt = require('bcryptjs');
const { customerRepository } = require('../repositories/userRepository');
const authService = require('./authService');
const logger = require('../utils/logger');

class CustomerAuthService {
  async register(data) {
    const { userName, passWord, SDT, email, diaChi, hoTen } = data;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const err = new Error('Địa chỉ email không hợp lệ');
      err.status = 422;
      throw err;
    }

    const existing = await customerRepository.findByUsername(userName);
    if (existing) {
      const err = new Error('Tên đăng nhập đã tồn tại');
      err.status = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(passWord, 10);
    await customerRepository.insert({ userName, passWord: hashedPassword, SDT, email, diaChi, hoTen });
    logger.info(`[CustomerAuth] Khách hàng đăng ký: ${userName}`);
    return { message: 'Đăng ký thành công' };
  }

  async login(userName, passWord) {
    return authService.loginCustomer(userName, passWord);
  }

  async changePassword(idUser, oldPassword, newPassword) {
    const user = await customerRepository.findById('idUser', idUser);
    if (!user) {
      const err = new Error('Không tìm thấy tài khoản');
      err.status = 404;
      throw err;
    }
    const match = await bcrypt.compare(oldPassword, user.passWord);
    if (!match) {
      const err = new Error('Mật khẩu cũ không đúng');
      err.status = 401;
      throw err;
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await customerRepository.update('idUser', idUser, { passWord: hashed });
    logger.info(`[CustomerAuth] Khách hàng ${idUser} đổi mật khẩu`);
    return { message: 'Đổi mật khẩu thành công' };
  }

  async getProfile(idUser) {
    const user = await customerRepository.findById('idUser', idUser);
    if (!user) {
      const err = new Error('Không tìm thấy tài khoản');
      err.status = 404;
      throw err;
    }
    const { passWord, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(idUser, data) {
    const allowed = ['hoTen', 'SDT', 'diaChi', 'email'];
    const updateData = {};
    allowed.forEach((k) => { if (data[k] !== undefined) updateData[k] = data[k]; });

    if (Object.keys(updateData).length === 0) {
      const err = new Error('Không có dữ liệu cập nhật');
      err.status = 400;
      throw err;
    }
    const updated = await customerRepository.update('idUser', idUser, updateData);
    const { passWord, ...safeUser } = updated;
    return safeUser;
  }
}

module.exports = new CustomerAuthService();
