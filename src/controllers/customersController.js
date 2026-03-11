const bcrypt = require('bcryptjs');
const connection = require("../models/db");
const jwt = require("jsonwebtoken");

const customersController = {
  cusregister: async (req, res) => {
    const { userName, passWord, SDT, email, hoTen } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Địa chỉ email không hợp lệ" });

    connection.query('SELECT * FROM taikhoankh WHERE "userName" = $1', [userName], (err, results) => {
      if (err) return res.status(500).json({ message: "Đăng ký thất bại" });
      if (results.length > 0)
        return res.status(400).json({ message: "Tên người dùng đã tồn tại" });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(passWord, salt, (err, hashedPassword) => {
          if (err) throw err;
          const sql = `INSERT INTO taikhoankh ("userName","passWord","SDT","email","hoTen") VALUES ($1,$2,$3,$4,$5)`;
          connection.query(sql, [userName, hashedPassword, SDT, email, hoTen], (err) => {
            if (err) { console.error(err); return res.status(500).json({ message: "Đăng ký thất bại" }); }
            res.status(200).json({ message: "Đăng ký thành công" });
          });
        });
      });
    });
  },

  generateAccessToken: (user) =>
    jwt.sign({ idUser: user.idUser }, process.env.JWT_ACCESS_KEY, { expiresIn: "120s" }),

  generateRefreshToken: (user) =>
    jwt.sign({ idUser: user.idUser }, process.env.JWT_REFRESH_KEY, { expiresIn: "365d" }),

  cuslogin: async (req, res) => {
    const { userName, passWord } = req.body;
    try {
      connection.query(`SELECT * FROM taikhoankh WHERE "userName" = $1`, [userName], async (error, results) => {
        if (error) return res.status(500).json({ message: "Lỗi server khi đăng nhập." });
        if (results.length === 0)
          return res.status(404).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng." });

        const match = await bcrypt.compare(passWord, results[0].passWord);
        if (!match)
          return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng." });

        const accessToken = customersController.generateAccessToken(results[0]);
        const refreshTokenCus = customersController.generateRefreshToken(results[0]);
        res.cookie("refreshTokenCus", refreshTokenCus, { httpOnly: true, secure: false, path: "/", sameSite: "strict" });
        res.status(200).json({ message: true, accessToken });
      });
    } catch (error) {
      res.status(500).json({ message: false });
    }
  },

  cuslogout: async (req, res) => {
    res.clearCookie("refreshTokenCus");
    res.status(200).json("logout thành công");
  },

  requestRefreshToken: async (req, res) => {
    const refreshTokenCus = req.cookies.refreshTokenCus;
    if (!refreshTokenCus) return res.status(401).json("chưa được xác thực");
    jwt.verify(refreshTokenCus, process.env.JWT_REFRESH_KEY, (err, user) => {
      if (err) { console.log(err); return res.status(403).json("Token không hợp lệ"); }
      const newAccessTokenCus = customersController.generateAccessToken(user);
      const newRefreshTokenCus = customersController.generateRefreshToken(user);
      res.cookie("refreshTokenCus", newRefreshTokenCus, { httpOnly: true, secure: false, path: "/", sameSite: "strict" });
      res.status(200).json({ accessToken: newAccessTokenCus });
    });
  },

  getCusbyId: async (req, res) => {
    const idUser = req.user.idUser;
    if (!idUser) return res.status(400).json({ message: "Missing idUser" });
    connection.query(`SELECT * FROM taikhoankh WHERE "idUser" = $1`, [idUser], (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    });
  },

  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const idUser = req.user.idUser;
    if (!idUser) return res.status(400).json({ message: "Missing idUser" });
    try {
      connection.query(`SELECT * FROM taikhoankh WHERE "idUser" = $1`, [idUser], async (error, results) => {
        if (error) return res.status(500).json({ message: "Server error." });
        if (results.length === 0) return res.status(404).json({ message: "User not found." });
        const user = results[0];
        const match = await bcrypt.compare(currentPassword, user.passWord);
        if (!match) return res.status(401).json({ message: "Current password is incorrect." });
        const same = await bcrypt.compare(newPassword, user.passWord);
        if (same) return res.status(400).json({ message: "New password cannot be the same." });
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newPassword, salt, (err, hashed) => {
            connection.query(`UPDATE taikhoankh SET "passWord" = $1 WHERE "idUser" = $2`, [hashed, idUser], (err) => {
              if (err) return res.status(500).json({ message: "Error updating password." });
              res.status(200).json({ message: "Password changed successfully." });
            });
          });
        });
      });
    } catch (error) { res.status(500).json({ message: "Server error." }); }
  },

  updateUser: async (req, res) => {
    const { hoTen, SDT, email } = req.body;
    const idUser = req.user.idUser;
    if (!idUser) return res.status(400).json({ message: "Thiếu idUser" });
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ message: "Email không hợp lệ" });
    }
    const fields = []; const values = [];
    if (hoTen) { fields.push(`"hoTen" = $${fields.length + 1}`); values.push(hoTen); }
    if (SDT)   { fields.push(`"SDT" = $${fields.length + 1}`);   values.push(SDT); }
    if (email) { fields.push(`"email" = $${fields.length + 1}`); values.push(email); }
    if (fields.length === 0) return res.status(400).json({ message: "Không có trường nào để cập nhật" });
    values.push(idUser);
    connection.query(`UPDATE taikhoankh SET ${fields.join(", ")} WHERE "idUser" = $${values.length}`, values, (err) => {
      if (err) return res.status(500).json({ success: false, message: "Lỗi khi cập nhật." });
      res.status(200).json({ success: true, message: "Cập nhật thành công." });
    });
  },

  getAddressCus: async (req, res) => {
    const idUser = req.user.idUser;
    if (!idUser) return res.status(400).json({ message: "Missing idUser" });
    connection.query(`SELECT "diaChi" FROM taikhoankh WHERE "idUser" = $1`, [idUser], (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      if (results.length === 0) return res.status(404).json({ message: "Address not found" });
      res.json(results[0]);
    });
  },

  updateAddressCus: async (req, res) => {
    const idUser = req.user.idUser;
    const { newAddress } = req.body;
    if (!idUser || !newAddress) return res.status(400).json({ message: "Missing idUser or newAddress" });
    connection.query(`UPDATE taikhoankh SET "diaChi" = $1 WHERE "idUser" = $2`, [newAddress, idUser], (err, result) => {
      if (err) return res.status(500).json({ message: "Error updating address." });
      if (result.affectedRows === 0) return res.status(404).json({ message: "User not found." });
      res.status(200).json({ message: "Address updated successfully." });
    });
  },
};

module.exports = customersController;
