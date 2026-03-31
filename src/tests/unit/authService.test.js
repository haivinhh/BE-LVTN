// tests/unit/authService.test.js
jest.mock('../../src/repositories/userRepository');
jest.mock('bcryptjs');

const authService = require('../../src/services/authService');
const { userRepository } = require('../../src/repositories/userRepository');
const bcrypt = require('bcryptjs');

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── registerStaff ───────────────────────────────────────────────────────────

  describe('registerStaff', () => {
    it('should register a new staff successfully', async () => {
      userRepository.findByUsername = jest.fn().mockResolvedValue(null);
      userRepository.findByEmail = jest.fn().mockResolvedValue(null);
      userRepository.insert = jest.fn().mockResolvedValue({ idNhanVien: 1 });
      bcrypt.hash = jest.fn().mockResolvedValue('hashed_password');

      const result = await authService.registerStaff({
        userName: 'newuser',
        passWord: 'password123',
        email: 'test@test.com',
        SDT: '0901234567',
        hoTen: 'Test User',
      });

      expect(result).toHaveProperty('message', 'Đăng ký thành công');
      expect(userRepository.insert).toHaveBeenCalledTimes(1);
    });

    it('should throw 409 if username already exists', async () => {
      userRepository.findByUsername = jest.fn().mockResolvedValue({ idNhanVien: 1 });

      await expect(
        authService.registerStaff({ userName: 'existingUser', passWord: 'pass', email: 'e@test.com', SDT: '090', hoTen: 'X' })
      ).rejects.toMatchObject({ status: 409, message: 'Tên đăng nhập đã tồn tại' });
    });
  });

  // ─── loginStaff ──────────────────────────────────────────────────────────────

  describe('loginStaff', () => {
    it('should return tokens on successful login', async () => {
      userRepository.findByUsername = jest.fn().mockResolvedValue({
        idNhanVien: 1, admin: true, passWord: 'hashed',
      });
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await authService.loginStaff('admin', 'correctpassword');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw 401 when user not found', async () => {
      userRepository.findByUsername = jest.fn().mockResolvedValue(null);

      await expect(authService.loginStaff('nouser', 'pass')).rejects.toMatchObject({
        status: 401,
      });
    });

    it('should throw 401 when password is wrong', async () => {
      userRepository.findByUsername = jest.fn().mockResolvedValue({
        idNhanVien: 1, passWord: 'hashed',
      });
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(authService.loginStaff('user', 'wrongpass')).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  // ─── refreshAccessToken ──────────────────────────────────────────────────────

  describe('refreshAccessToken', () => {
    it('should throw 403 when refresh token is missing', async () => {
      await expect(authService.refreshAccessToken(null)).rejects.toMatchObject({
        status: 403,
      });
    });

    it('should throw 403 when refresh token is not in store', async () => {
      await expect(authService.refreshAccessToken('unknown_token')).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should resolve without error', async () => {
      await expect(authService.logout('any_token')).resolves.toHaveProperty('message');
    });
  });
});
