const bcrypt = require("bcrypt");
const connection = require("../models/db");
const validator = require("validator");

const adminController = {
  // Lấy tất cả nhân viên
  getAllUsers: (req, res) => {
    const query = "SELECT * FROM tknhanvien";

    connection.query(query, (error, results) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi lấy danh sách nhân viên." });
      }

      res.status(200).json(results);
    });
  },

  // Thêm nhân viên
  addUser: async (req, res) => {
    const { hoTen, userName, email, SDT, diaChi, chucVu } = req.body;
  
    // Kiểm tra tính hợp lệ của các trường
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Email không đúng định dạng." });
    }
  
    if (!/^\d+$/.test(SDT)) {
      return res
        .status(400)
        .json({ message: "Số điện thoại chỉ được chứa kí tự số." });
    }
  
    // Mật khẩu mặc định
    const defaultPassword = "123123a";
  
    // Mã hóa mật khẩu mặc định
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
    // Kiểm tra userName duy nhất
    const checkUserNameQuery = "SELECT * FROM tknhanvien WHERE userName = ?";
    connection.query(checkUserNameQuery, [userName], async (error, results) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi kiểm tra tên đăng nhập." });
      }
  
      if (results.length > 0) {
        return res.status(400).json({ message: "Tên đăng nhập đã tồn tại." });
      }
  
      const query =
        "INSERT INTO tknhanvien (hoTen, userName, email, SDT, diaChi, admin, password) VALUES (?, ?, ?, ?, ?, ?, ?)";
      connection.query(
        query,
        [hoTen, userName, email, SDT, diaChi, chucVu, hashedPassword],
        (error, results) => {
          if (error) {
            console.error(error);
            return res
              .status(500)
              .json({ message: "Lỗi server khi thêm nhân viên." });
          }
  
          res.status(201).json({ message: "Thêm nhân viên thành công." });
        }
      );
    });
  },
  

  // Cập nhật thông tin nhân viên
  updateUser: (req, res) => {
    const { idNhanVien } = req.params;
    const { hoTen, userName, email, SDT, diaChi, chucVu } = req.body;

    // Kiểm tra tính hợp lệ của các trường
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Email không đúng định dạng." });
    }

    if (!/^\d+$/.test(SDT)) {
      return res
        .status(400)
        .json({ message: "Số điện thoại chỉ được chứa kí tự số." });
    }

    // Kiểm tra userName duy nhất
    const checkUserNameQuery =
      "SELECT * FROM tknhanvien WHERE userName = ? AND idNhanVien != ?";
    connection.query(
      checkUserNameQuery,
      [userName, idNhanVien],
      (error, results) => {
        if (error) {
          console.error(error);
          return res
            .status(500)
            .json({ message: "Lỗi server khi kiểm tra tên đăng nhập." });
        }

        if (results.length > 0) {
          return res.status(400).json({ message: "Tên đăng nhập đã tồn tại." });
        }

        const query = `
        UPDATE tknhanvien 
        SET hoTen = ?, userName = ?, email = ?, SDT = ?, diaChi = ?, admin = ?
        WHERE idNhanVien = ?
      `;

        connection.query(
          query,
          [hoTen, userName, email, SDT, diaChi, chucVu, idNhanVien],
          (error, results) => {
            if (error) {
              console.error(error);
              return res
                .status(500)
                .json({
                  message: "Lỗi server khi cập nhật thông tin nhân viên.",
                });
            }

            res
              .status(200)
              .json({ message: "Cập nhật thông tin nhân viên thành công." });
          }
        );
      }
    );
  },

  // Xóa nhân viên
  deleteUser: (req, res) => {
    const { idNhanVien } = req.params;

    const query = "DELETE FROM tknhanvien WHERE idNhanVien = ?";

    connection.query(query, [idNhanVien], (error, results) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi xóa nhân viên." });
      }

      res.status(200).json({ message: "Xóa nhân viên thành công." });
    });
  },

  // Đổi mật khẩu nhân viên
  changePassword: async (req, res) => {
    const { idNhanVien, newPassword } = req.body;
  
    // Validate input
    if (!idNhanVien || !newPassword) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết để thay đổi mật khẩu.' });
    }
  
    try {
      // Generate salt and hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      // SQL query to update the password
      const updateQuery = 'UPDATE tknhanvien SET passWord = ? WHERE idNhanVien = ?';
  
      // Execute the query
      await new Promise((resolve, reject) => {
        connection.query(updateQuery, [hashedPassword, idNhanVien], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
  
      res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công.' });
    } catch (error) {
      console.error('Lỗi server khi thay đổi mật khẩu:', error);
      res.status(500).json({ message: 'Lỗi server khi thay đổi mật khẩu' });
    }
  },
  
  
  getConfirmedOrdersByEmployee: (req, res) => {
    const { idNhanVien } = req.params;
    console.log('Fetching orders for employee:', idNhanVien); // Log ID for debugging
  
    const query = `
      SELECT 
        dh.idDonHang,
        dh.tenNguoiNhan,
        dh.diaChi,
        dh.SDT,
        dh.phuongThucTT,
        dh.ngayDatHang,
        dh.tongTienDH,
        dh.trangThai,
        dv.tenDonVi AS donViVanChuyen
      FROM donHang dh
      LEFT JOIN donViVanChuyen dv ON dh.idDonViVanChuyen = dv.idDonViVanChuyen
      WHERE dh.idNhanVien = ?
    `;
    
    connection.query(query, [idNhanVien], (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ message: "Lỗi server khi lấy đơn hàng đã xác nhận." });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng đã xác nhận bởi nhân viên này." });
      }
      res.status(200).json(results);
    });
  },
};

module.exports = adminController;
