const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const connection = require('../models/db');
const sendEmail = require('../mailService');

const resetTokens = {};

const forgotPasswordController = {
  requestPasswordReset: async (req, res) => {
    const { email, username } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: 'Địa chỉ email không hợp lệ' });

    connection.query(
      `SELECT * FROM taikhoankh WHERE "email" = $1 AND "userName" = $2`,
      [email, username],
      async (error, results) => {
        if (error) return res.status(500).json({ message: 'Lỗi server khi kiểm tra thông tin.' });
        if (results.length === 0) return res.status(404).json({ message: 'Email hoặc tên người dùng không tồn tại.' });

        const resetCode = crypto.randomBytes(20).toString('hex');
        const expiryTime = Date.now() + 10 * 60 * 1000;
        resetTokens[resetCode] = { email, expiryTime };

        const resetLink = `http://localhost:3000/reset-password?code=${resetCode}&username=${encodeURIComponent(username)}`;
        const htmlContent = `<p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấp vào liên kết dưới đây:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Liên kết hết hạn sau 10 phút.</p>`;

        try {
          await sendEmail(email, 'Đặt lại mật khẩu', htmlContent);
          res.status(200).json({ message: 'Email đặt lại mật khẩu đã được gửi.' });
        } catch (error) {
          res.status(500).json({ message: 'Lỗi khi gửi email đặt lại mật khẩu.' });
        }
      }
    );
  },

  resetPassword: async (req, res) => {
    const { resetCode, newPassword } = req.body;
    const username = req.query.username || req.body.username;

    if (!resetCode || !newPassword || !username)
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết để đặt lại mật khẩu.' });

    const tokenData = resetTokens[resetCode];
    if (!tokenData || tokenData.expiryTime < Date.now())
      return res.status(400).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });

    const { email } = tokenData;
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await new Promise((resolve, reject) => {
        connection.query(
          `UPDATE taikhoankh SET "passWord" = $1 WHERE "email" = $2 AND "userName" = $3`,
          [hashedPassword, email, username],
          (err, results) => { if (err) return reject(err); resolve(results); }
        );
      });

      delete resetTokens[resetCode];
      res.status(200).json({ message: 'Mật khẩu đã được đặt lại thành công.' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu' });
    }
  },
};

module.exports = forgotPasswordController;
