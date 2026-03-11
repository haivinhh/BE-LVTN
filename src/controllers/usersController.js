const bcrypt = require('bcryptjs');
const connection = require("../models/db");
const jwt = require("jsonwebtoken");

let refreshTokens = [];

const usersController = {
  register: async (req, res) => {
    const { userName, passWord, SDT, email, diaChi, hoTen } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Địa chỉ email không hợp lệ" });

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(passWord, salt, (err, hashedPassword) => {
        if (err) throw err;
        const sql = `INSERT INTO tknhanvien ("userName","passWord","SDT","email","diaChi","hoTen") VALUES ($1,$2,$3,$4,$5,$6)`;
        connection.query(sql, [userName, hashedPassword, SDT, email, diaChi, hoTen], (err) => {
          if (err) { console.error(err); return res.status(500).json({ message: "Đăng ký thất bại" }); }
          res.status(200).json({ message: "Đăng ký thành công" });
        });
      });
    });
  },

  generateAccessToken: (user) =>
    jwt.sign({ idNhanVien: user.idNhanVien, admin: user.admin }, process.env.JWT_ACCESS_KEY, { expiresIn: "1200s" }),

  generateRefreshToken: (user) =>
    jwt.sign({ idNhanVien: user.idNhanVien, admin: user.admin }, process.env.JWT_REFRESH_KEY, { expiresIn: "365d" }),

  login: async (req, res) => {
    const { userName, passWord } = req.body;
    try {
      connection.query(`SELECT * FROM tknhanvien WHERE "userName" = $1`, [userName], async (error, results) => {
        if (error) return res.status(500).json({ message: "Lỗi server khi đăng nhập." });
        if (results.length === 0)
          return res.status(404).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng." });

        const match = await bcrypt.compare(passWord, results[0].passWord);
        if (!match)
          return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng." });

        const accessToken = usersController.generateAccessToken(results[0]);
        const refreshToken = usersController.generateRefreshToken(results[0]);
        refreshTokens.push(refreshToken);
        res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, path: "/", sameSite: "none" });
        res.status(200).json({ message: "Đăng nhập thành công.", accessToken });
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server khi đăng nhập." });
    }
  },

  logout: async (req, res) => {
    res.clearCookie("refreshToken");
    refreshTokens = refreshTokens.filter((token) => token !== req.cookies.refreshToken);
    res.status(200).json("logout thành công");
  },

  requestRefreshToken: async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json("chưa được xác thực");
    jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, (err, user) => {
      if (err) { console.log(err); return res.status(403).json("Token không hợp lệ"); }
      refreshTokens = refreshTokens.filter((t) => t !== refreshToken);
      const newAccessToken = usersController.generateAccessToken(user);
      const newRefreshToken = usersController.generateRefreshToken(user);
      refreshTokens.push(newRefreshToken);
      res.cookie("refreshToken", newRefreshToken, { httpOnly: true, secure: true, path: "/", sameSite: "none" });
      res.status(200).json({ accessToken: newAccessToken });
    });
  },

  getUserById: (req, res) => {
    const idNhanVien = req.user.idNhanVien;
    connection.query(`SELECT * FROM tknhanvien WHERE "idNhanVien" = $1`, [idNhanVien], (error, results) => {
      if (error) return res.status(500).json({ message: "Lỗi server." });
      if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy nhân viên." });
      res.status(200).json(results[0]);
    });
  },

  deleteUser: (req, res) => {
    const idNhanVien = req.body.idNhanVien || req.params.idNhanVien;
    if (req.user && !req.user.admin)
      return res.status(403).json({ message: "Bạn không có quyền xóa nhân viên." });
    const checkQuery = `SELECT * FROM tknhanvien WHERE "idNhanVien" = $1`;
    connection.query(checkQuery, [idNhanVien], (error, results) => {
      if (error) return res.status(500).json({ message: "Lỗi server." });
      if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy nhân viên." });
      connection.query(`DELETE FROM tknhanvien WHERE "idNhanVien" = $1`, [idNhanVien], (error) => {
        if (error) return res.status(500).json({ message: "Lỗi server khi xóa nhân viên." });
        res.status(200).json({ message: "Xóa nhân viên thành công." });
      });
    });
  },

  deleteCustomer: (req, res) => {
    const { idUser } = req.body;
    connection.query(`SELECT COUNT(*) AS "orderCount" FROM donhang WHERE "idUser" = $1`, [idUser], (error, results) => {
      if (error) return res.status(500).json({ message: "Lỗi server." });
      if (parseInt(results[0].orderCount) > 0)
        return res.status(400).json({ message: "Không thể xóa vì khách hàng có đơn hàng." });
      connection.query(`DELETE FROM taikhoankh WHERE "idUser" = $1`, [idUser], (error, result) => {
        if (error) return res.status(500).json({ message: "Lỗi server." });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy khách hàng." });
        res.status(200).json({ message: "Xóa khách hàng thành công." });
      });
    });
  },

  updateUser: (req, res) => {
    const idNhanVien = req.user.idNhanVien;
    const { userName, passWord, SDT, email, diaChi, hoTen } = req.body;
    let updates = []; let values = [];

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ message: "Email không hợp lệ" });
      updates.push(`"email" = $${updates.length + 1}`); values.push(email);
    }
    if (SDT) {
      if (!/^\d+$/.test(SDT)) return res.status(400).json({ message: "SDT không hợp lệ" });
      updates.push(`"SDT" = $${updates.length + 1}`); values.push(SDT);
    }
    if (diaChi) { updates.push(`"diaChi" = $${updates.length + 1}`); values.push(diaChi); }
    if (hoTen)  { updates.push(`"hoTen" = $${updates.length + 1}`);  values.push(hoTen); }

    if (passWord) {
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(passWord, salt, (err, hashed) => {
          updates.push(`"passWord" = $${updates.length + 1}`); values.push(hashed);
          values.push(idNhanVien);
          connection.query(`UPDATE tknhanvien SET ${updates.join(", ")} WHERE "idNhanVien" = $${values.length}`, values, (error, result) => {
            if (error) return res.status(500).json({ message: "Lỗi server." });
            res.status(200).json({ message: "Cập nhật thành công." });
          });
        });
      });
      return;
    }

    if (updates.length === 0) return res.status(400).json({ message: "Không có thông tin để cập nhật." });
    values.push(idNhanVien);
    connection.query(`UPDATE tknhanvien SET ${updates.join(", ")} WHERE "idNhanVien" = $${values.length}`, values, (error, result) => {
      if (error) return res.status(500).json({ message: "Lỗi server." });
      res.status(200).json({ message: "Cập nhật thành công." });
    });
  },

  getConfirmedOrdersByEmployee: (req, res) => {
    const idNhanVien = req.user.idNhanVien;
    const query = `
      SELECT dh."idDonHang", dh."tenNguoiNhan", dh."diaChi", dh."SDT",
             dh."phuongThucTT", dh."ngayDatHang", dh."tongTienDH", dh."trangThai",
             dv."tenDonVi" AS "donViVanChuyen"
      FROM donhang dh
      LEFT JOIN donvivanchuyen dv ON dh."idDonViVanChuyen" = dv."idDonViVanChuyen"
      WHERE dh."idNhanVien" = $1
    `;
    connection.query(query, [idNhanVien], (error, results) => {
      if (error) return res.status(500).json({ message: "Lỗi server." });
      if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
      res.status(200).json(results);
    });
  },

  addUser: (req, res) => {
    const { userName, passWord, SDT, email, diaChi, hoTen, isAdmin } = req.body;
    if (!userName || !passWord || !SDT || !email || !diaChi || !hoTen)
      return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin." });
    connection.query(`SELECT * FROM tknhanvien WHERE "userName" = $1 OR "email" = $2`, [userName, email], (error, results) => {
      if (error) return res.status(500).json({ message: "Lỗi server." });
      if (results.length > 0) return res.status(400).json({ message: "Tên đăng nhập hoặc email đã tồn tại." });
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(passWord, salt, (err, hashed) => {
          connection.query(
            `INSERT INTO tknhanvien ("userName","passWord","SDT","email","diaChi","hoTen","admin") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [userName, hashed, SDT, email, diaChi, hoTen, isAdmin || 0],
            (error) => {
              if (error) return res.status(500).json({ message: "Lỗi server." });
              res.status(201).json({ message: "Thêm nhân viên thành công." });
            }
          );
        });
      });
    });
  },

  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const idNhanVien = req.user.idNhanVien;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Vui lòng cung cấp đủ thông tin." });
    connection.query(`SELECT "passWord" FROM tknhanvien WHERE "idNhanVien" = $1`, [idNhanVien], (error, results) => {
      if (error) return res.status(500).json({ message: "Lỗi server." });
      if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy nhân viên." });
      bcrypt.compare(currentPassword, results[0].passWord, (err, isMatch) => {
        if (!isMatch) return res.status(401).json({ message: "Mật khẩu hiện tại không chính xác." });
        bcrypt.compare(newPassword, results[0].passWord, (err, isSame) => {
          if (isSame) return res.status(400).json({ message: "Mật khẩu mới không được giống hiện tại." });
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newPassword, salt, (err, hashed) => {
              connection.query(`UPDATE tknhanvien SET "passWord" = $1 WHERE "idNhanVien" = $2`, [hashed, idNhanVien], (error) => {
                if (error) return res.status(500).json({ message: "Lỗi server." });
                res.status(200).json({ message: "Đổi mật khẩu thành công." });
              });
            });
          });
        });
      });
    });
  },
};

module.exports = usersController;
