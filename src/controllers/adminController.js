const bcrypt = require('bcryptjs');
const connection = require('../models/db');
const validator = require('validator');

const adminController = {
  getAllUsers: (req, res) => {
    connection.query('SELECT * FROM tknhanvien', (error, results) => {
      if (error) return res.status(500).json({ message: 'Lỗi server khi lấy danh sách nhân viên.' });
      res.status(200).json(results);
    });
  },

  addUser: async (req, res) => {
    const { hoTen, userName, email, SDT, diaChi, admin, chucVu, password } = req.body;
    const adminValue = admin !== undefined ? admin : chucVu; // hỗ trợ cả 2 field tên

    if (!validator.isEmail(email))
      return res.status(400).json({ message: 'Email không đúng định dạng.' });
    if (!/^\d+$/.test(SDT))
      return res.status(400).json({ message: 'Số điện thoại chỉ được chứa kí tự số.' });
    if (!/(?=.*[a-zA-Z])(?=.*\d).{6,}/.test(password))
      return res.status(400).json({ message: 'Mật khẩu phải chứa ít nhất một chữ cái, một số và có ít nhất 6 ký tự.' });
    if (adminValue === undefined || adminValue === null)
      return res.status(400).json({ message: 'Vui lòng chọn chức vụ cho nhân viên.' });

    connection.query(
      'SELECT * FROM tknhanvien WHERE "userName" = $1',
      [userName],
      async (error, results) => {
        if (error) return res.status(500).json({ message: 'Lỗi server khi kiểm tra tên đăng nhập.' });
        if (results.length > 0) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        connection.query(
          'INSERT INTO tknhanvien ("hoTen","userName","email","SDT","diaChi","admin","passWord") VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [hoTen, userName, email, SDT, diaChi, adminValue, hashedPassword],
          (error) => {
            if (error) return res.status(500).json({ message: 'Lỗi server khi thêm nhân viên.' });
            res.status(201).json({ message: 'Thêm nhân viên thành công.' });
          }
        );
      }
    );
  },

  updateUser: (req, res) => {
    const { idNhanVien } = req.params;
    const { hoTen, userName, email, SDT, diaChi, chucVu } = req.body;

    if (!validator.isEmail(email))
      return res.status(400).json({ message: 'Email không đúng định dạng.' });
    if (!/^\d+$/.test(SDT))
      return res.status(400).json({ message: 'Số điện thoại chỉ được chứa kí tự số.' });

    connection.query(
      'SELECT * FROM tknhanvien WHERE "userName" = $1 AND "idNhanVien" != $2',
      [userName, idNhanVien],
      (error, results) => {
        if (error) return res.status(500).json({ message: 'Lỗi server khi kiểm tra tên đăng nhập.' });
        if (results.length > 0) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });

        connection.query(
          'UPDATE tknhanvien SET "hoTen"=$1,"userName"=$2,"email"=$3,"SDT"=$4,"diaChi"=$5,"admin"=$6 WHERE "idNhanVien"=$7',
          [hoTen, userName, email, SDT, diaChi, chucVu, idNhanVien],
          (error) => {
            if (error) return res.status(500).json({ message: 'Lỗi server khi cập nhật thông tin nhân viên.' });
            res.status(200).json({ message: 'Cập nhật thông tin nhân viên thành công.' });
          }
        );
      }
    );
  },

  deleteUser: (req, res) => {
    const { idNhanVien } = req.params;
    connection.query(
      'DELETE FROM tknhanvien WHERE "idNhanVien" = $1',
      [idNhanVien],
      (error) => {
        if (error) return res.status(500).json({ message: 'Lỗi server khi xóa nhân viên.' });
        res.status(200).json({ message: 'Xóa nhân viên thành công.' });
      }
    );
  },

  changePassword: async (req, res) => {
    const { idNhanVien } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.' });

    try {
      const results = await new Promise((resolve, reject) => {
        connection.query(
          'SELECT "passWord" FROM tknhanvien WHERE "idNhanVien" = $1',
          [idNhanVien],
          (error, results) => { if (error) return reject(error); resolve(results); }
        );
      });

      if (results.length === 0) return res.status(404).json({ message: 'Nhân viên không tồn tại.' });

      const validPassword = await bcrypt.compare(currentPassword, results[0].passWord);
      if (!validPassword) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });

      if (!/(?=.*[a-zA-Z])(?=.*\d).{6,}/.test(newPassword))
        return res.status(400).json({ message: 'Mật khẩu mới phải chứa ít nhất một chữ cái, một số và có ít nhất 6 ký tự.' });

      const isSame = await bcrypt.compare(newPassword, results[0].passWord);
      if (isSame) return res.status(400).json({ message: 'Mật khẩu mới không được giống mật khẩu hiện tại.' });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await new Promise((resolve, reject) => {
        connection.query(
          'UPDATE tknhanvien SET "passWord" = $1 WHERE "idNhanVien" = $2',
          [hashedPassword, idNhanVien],
          (error, results) => { if (error) return reject(error); resolve(results); }
        );
      });

      res.status(200).json({ message: 'Đổi mật khẩu thành công.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi thay đổi mật khẩu.' });
    }
  },

  getConfirmedOrdersByEmployee: (req, res) => {
    const { idNhanVien } = req.params;
    connection.query(
      `SELECT dh."idDonHang",dh."tenNguoiNhan",dh."diaChi",dh."SDT",
              dh."phuongThucTT",dh."ngayDatHang",dh."tongTienDH",dh."trangThai",
              dv."tenDonVi" AS "donViVanChuyen"
       FROM donhang dh
       LEFT JOIN donvivanchuyen dv ON dh."idDonViVanChuyen" = dv."idDonViVanChuyen"
       WHERE dh."idNhanVien" = $1`,
      [idNhanVien],
      (error, results) => {
        if (error) return res.status(500).json({ message: 'Lỗi server khi lấy đơn hàng.' });
        if (results.length === 0) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        res.status(200).json(results);
      }
    );
  },
};

module.exports = adminController;
