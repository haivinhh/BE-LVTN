const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { customerRepository } = require('../repositories/userRepository');
const { producer } = require('../services/queueService');
const logger = require('../utils/logger');

// In-memory reset token store (TTL 10 min)
// Production: use Redis with TTL
const resetTokens = {};

const RESET_LINK_BASE = process.env.FE_URL || 'http://localhost:3000';

const forgotPasswordController = {
  requestPasswordReset: async (req, res, next) => {
    try {
      const { email, username } = req.body;
      const user = await customerRepository.query(
        `SELECT * FROM taikhoankh WHERE "email"=$1 AND "userName"=$2`,
        [email, username]
      );
      if (user.length === 0)
        return res.status(404).json({ message: 'Email hoặc tên người dùng không tồn tại.' });

      const resetCode = crypto.randomBytes(20).toString('hex');
      resetTokens[resetCode] = { email, expiryTime: Date.now() + 10 * 60 * 1000 };

      const resetLink = `${RESET_LINK_BASE}/reset-password?code=${resetCode}&username=${encodeURIComponent(username)}`;
      const html = `
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấp vào liên kết bên dưới:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Liên kết hết hạn sau 10 phút.</p>
      `;

      await producer.sendEmail(email, 'Đặt lại mật khẩu', html);
      logger.info(`[ForgotPW] Reset email sent to: ${email}`);
      res.status(200).json({ message: 'Email đặt lại mật khẩu đã được gửi.' });
    } catch (err) { next(err); }
  },

  resetPassword: async (req, res, next) => {
    try {
      const { resetCode, newPassword } = req.body;
      const username = req.query.username || req.body.username;

      if (!resetCode || !newPassword || !username)
        return res.status(400).json({ message: 'Thiếu thông tin để đặt lại mật khẩu.' });

      const tokenData = resetTokens[resetCode];
      if (!tokenData || tokenData.expiryTime < Date.now())
        return res.status(400).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await customerRepository.query(
        `UPDATE taikhoankh SET "passWord"=$1 WHERE "email"=$2 AND "userName"=$3`,
        [hashedPassword, tokenData.email, username]
      );

      delete resetTokens[resetCode];
      logger.info(`[ForgotPW] Password reset for: ${username}`);
      res.status(200).json({ message: 'Mật khẩu đã được đặt lại thành công.' });
    } catch (err) { next(err); }
  },
};

module.exports = forgotPasswordController;
