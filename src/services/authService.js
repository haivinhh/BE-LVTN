const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userRepository, customerRepository } = require('../repositories/userRepository');
const logger = require('../utils/logger');

/**
 * In-memory refresh token store.
 * In production → store in Redis (xem tokenStore bên dưới).
 */
const inMemoryRefreshTokens = new Set();

const tokenStore = {
  add: (token) => inMemoryRefreshTokens.add(token),
  remove: (token) => inMemoryRefreshTokens.delete(token),
  has: (token) => inMemoryRefreshTokens.has(token),
};

class AuthService {
  // ─── TOKEN HELPERS ──────────────────────────────────────────────────────────

  generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_KEY, { expiresIn: '20m' });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_KEY, { expiresIn: '30d' });
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_KEY);
  }

  // ─── STAFF AUTH ─────────────────────────────────────────────────────────────

  async registerStaff(data) {
    const { userName, passWord, SDT, email, diaChi, hoTen } = data;

    const existing = await userRepository.findByUsername(userName);
    if (existing) {
      const err = new Error('Tên đăng nhập đã tồn tại');
      err.status = 409;
      throw err;
    }

    const emailUser = await userRepository.findByEmail(email);
    if (emailUser) {
      const err = new Error('Email đã được sử dụng');
      err.status = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(passWord, 10);
    await userRepository.insert({ userName, passWord: hashedPassword, SDT, email, diaChi, hoTen });
    logger.info(`[Auth] Nhân viên đăng ký: ${userName}`);
    return { message: 'Đăng ký thành công' };
  }

  async loginStaff(userName, passWord) {
    const user = await userRepository.findByUsername(userName);
    if (!user) {
      const err = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      err.status = 401;
      throw err;
    }

    const match = await bcrypt.compare(passWord, user.passWord);
    if (!match) {
      const err = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      err.status = 401;
      throw err;
    }

    // Normalize admin: DB lưu integer (1/0), chuẩn hóa thành number để JWT nhất quán
    const adminValue = user.admin === true || user.admin === 1 || user.admin === '1' ? 1 : 0;
    const payload = { idNhanVien: user.idNhanVien, admin: adminValue };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    tokenStore.add(refreshToken);

    logger.info(`[Auth] Nhân viên đăng nhập: ${userName}`);
    return { accessToken, refreshToken };
  }

  // ─── CUSTOMER AUTH ──────────────────────────────────────────────────────────

  async loginCustomer(userName, passWord) {
    const user = await customerRepository.findByUsername(userName);
    if (!user) {
      const err = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      err.status = 401;
      throw err;
    }

    const match = await bcrypt.compare(passWord, user.passWord);
    if (!match) {
      const err = new Error('Tên đăng nhập hoặc mật khẩu không đúng');
      err.status = 401;
      throw err;
    }

    const payload = { idUser: user.idUser, userName: user.userName };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    tokenStore.add(refreshToken);

    logger.info(`[Auth] Khách hàng đăng nhập: ${userName}`);
    return { accessToken, refreshToken };
  }

  // ─── REFRESH TOKEN ──────────────────────────────────────────────────────────

  async refreshAccessToken(oldRefreshToken) {
    if (!oldRefreshToken || !tokenStore.has(oldRefreshToken)) {
      const err = new Error('Refresh token không hợp lệ hoặc đã hết hạn');
      err.status = 403;
      throw err;
    }

    let decoded;
    try {
      decoded = this.verifyRefreshToken(oldRefreshToken);
    } catch {
      tokenStore.remove(oldRefreshToken);
      const err = new Error('Refresh token không hợp lệ');
      err.status = 403;
      throw err;
    }

    tokenStore.remove(oldRefreshToken);

    const payload = decoded.idNhanVien
      ? { idNhanVien: decoded.idNhanVien, admin: decoded.admin }
      : { idUser: decoded.idUser, userName: decoded.userName };

    const newAccessToken = this.generateAccessToken(payload);
    const newRefreshToken = this.generateRefreshToken(payload);
    tokenStore.add(newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken) {
    tokenStore.remove(refreshToken);
    return { message: 'Đăng xuất thành công' };
  }
}

module.exports = new AuthService();
