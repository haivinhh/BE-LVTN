const crypto = require('crypto');
const bcrypt = require('bcrypt');
const connection = require("../models/db");
const sendEmail = require("../mailService"); // Đảm bảo đường dẫn chính xác

// Bộ nhớ tạm thời để lưu trữ mã xác thực và thời gian hết hạn
const resetTokens = {};

// Controller forgotPasswordController.js
const forgotPasswordController = {
  requestPasswordReset: async (req, res) => {
    const { email, username } = req.body;

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Địa chỉ email không hợp lệ" });
    }

    // Kiểm tra xem email và username có tồn tại trong database không
    const query = `SELECT * FROM taikhoankh WHERE email = ? AND userName = ?`;
    connection.query(query, [email, username], async (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi server khi kiểm tra thông tin." });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Email hoặc tên người dùng không tồn tại." });
      }

      // Tạo mã xác thực ngẫu nhiên
      const resetCode = crypto.randomBytes(20).toString('hex');
      const expiryTime = Date.now() + 10 * 60 * 1000; // Hết hạn sau 10 phút

      // Lưu mã xác thực và thời gian hết hạn vào bộ nhớ tạm thời
      resetTokens[resetCode] = { email, expiryTime };

      // Gửi email đặt lại mật khẩu (include username in the reset link)
      const resetLink = `http://localhost:3000/reset-password?code=${resetCode}&username=${encodeURIComponent(username)}`;
      const mailOptions = {
        to: email,
        subject: "Đặt lại mật khẩu",
        htmlContent: `<p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấp vào liên kết dưới đây để đặt lại mật khẩu của bạn:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Liên kết này sẽ hết hạn sau 10 phút.</p>`
      };

      try {
        await sendEmail(mailOptions.to, mailOptions.subject, mailOptions.htmlContent);
        res.status(200).json({ message: "Email đặt lại mật khẩu đã được gửi." });
      } catch (error) {
        console.error('Lỗi khi gửi email đặt lại mật khẩu:', error);
        res.status(500).json({ message: "Lỗi khi gửi email đặt lại mật khẩu." });
      }
    });
  },

  resetPassword: async (req, res) => {
    const { resetCode, newPassword } = req.body;
    const username = req.query.username || req.body.username; // Retrieve username from query or body

    // Kiểm tra thông tin đầu vào
    if (!resetCode || !newPassword || !username) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết để đặt lại mật khẩu.' });
    }

    // Kiểm tra mã xác thực và thời gian hết hạn
    const tokenData = resetTokens[resetCode];
    if (!tokenData || tokenData.expiryTime < Date.now()) {
      return res.status(400).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });
    }

    // Lấy email từ mã xác thực
    const { email } = tokenData;

    try {
      // Tạo salt và hash mật khẩu mới
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Cập nhật mật khẩu mới vào cơ sở dữ liệu
      const updateQuery = 'UPDATE taikhoankh SET passWord = ? WHERE email = ? AND userName = ?';
      await new Promise((resolve, reject) => {
        connection.query(updateQuery, [hashedPassword, email, username], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });

      // Xóa mã xác thực khỏi bộ nhớ tạm thời
      delete resetTokens[resetCode];

      res.status(200).json({ message: 'Mật khẩu đã được đặt lại thành công.' });
    } catch (error) {
      console.error('Lỗi server khi đặt lại mật khẩu:', error);
      res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu' });
    }
  }

};

module.exports = forgotPasswordController;
