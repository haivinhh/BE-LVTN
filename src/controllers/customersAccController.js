const connection = require("../models/db");
const bcrypt = require('bcryptjs');

const customersAccController = {
  getAllCustomers: async (req, res) => {
    try {
      connection.query('SELECT * FROM taikhoankh', (err, customers) => {
        if (err) return res.status(500).json({ message: 'Error fetching customer information' });
        res.status(200).json(customers);
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  },

  getOrdersByCustomerId: async (req, res) => {
    const { idUser } = req.params;
    try {
      const query = `SELECT * FROM donhang WHERE "idUser" = $1 AND "trangThai" = 'success'`;
      connection.query(query, [idUser], (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi khi lấy thông tin đơn hàng' });
        res.status(200).json(results);
      });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  getOrderDetailsById: async (req, res) => {
    const { idDonHang } = req.params;
    try {
      const query = `
        SELECT ct."idDonHang", ct."idSanPham", sp."tenSanPham", ct."soLuong", ct."tongTien"
        FROM chitietdonhang AS ct
        JOIN sanpham AS sp ON ct."idSanPham" = sp."idSanPham"
        WHERE ct."idDonHang" = $1
      `;
      connection.query(query, [idDonHang], (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi khi lấy chi tiết đơn hàng' });
        res.status(200).json(results);
      });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  deleteCustomer: async (req, res) => {
    const { idUser } = req.params;
    try {
      const customerResults = await new Promise((resolve, reject) => {
        connection.query(
          `SELECT COUNT(*) AS "customerCount" FROM taikhoankh WHERE "idUser" = $1`,
          [idUser], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          }
        );
      });

      if (parseInt(customerResults[0].customerCount) === 0) {
        return res.status(404).json({ message: 'Khách hàng không tồn tại.' });
      }

      const orderResults = await new Promise((resolve, reject) => {
        connection.query(
          `SELECT COUNT(*) AS "orderCount" FROM donhang WHERE "idUser" = $1 AND "trangThai" IN ('unpaid','delivery','waiting')`,
          [idUser], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          }
        );
      });

      if (parseInt(orderResults[0].orderCount) > 0) {
        return res.status(400).json({ message: 'Không thể xóa khách hàng vì có đơn hàng đang xử lý.' });
      }

      await new Promise((resolve, reject) => {
        connection.query(`DELETE FROM taikhoankh WHERE "idUser" = $1`, [idUser], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      res.status(200).json({ message: 'Khách hàng đã được xóa thành công.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi xóa khách hàng' });
    }
  },

  updateCustomer: async (req, res) => {
    const { idUser } = req.params;
    const { email, SDT, hoTen, userName } = req.body;

    if (!email || !SDT || !hoTen || !userName)
      return res.status(400).json({ message: 'Thiếu thông tin cần cập nhật' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: 'Email không đúng định dạng' });

    if (!/^\d+$/.test(SDT))
      return res.status(400).json({ message: 'Số điện thoại chỉ được chứa ký tự số' });

    try {
      const existing = await new Promise((resolve, reject) => {
        connection.query(
          `SELECT * FROM taikhoankh WHERE "userName" = $1 AND "idUser" != $2`,
          [userName, idUser], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          }
        );
      });

      if (existing && existing.length > 0)
        return res.status(400).json({ message: 'Username đã tồn tại' });

      await new Promise((resolve, reject) => {
        connection.query(
          `UPDATE taikhoankh SET "email" = $1, "SDT" = $2, "hoTen" = $3, "userName" = $4 WHERE "idUser" = $5`,
          [email, SDT, hoTen, userName, idUser],
          (err, results) => {
            if (err) return reject(err);
            resolve(results);
          }
        );
      });

      res.status(200).json({ message: 'Thông tin khách hàng đã được cập nhật thành công.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật thông tin khách hàng' });
    }
  },

  addCustomer: async (req, res) => {
    const { email, SDT, hoTen, userName, passWord } = req.body;

    if (!email || !SDT || !hoTen || !userName || !passWord)
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Định dạng email không hợp lệ.' });

    if (!/^[0-9]+$/.test(SDT))
      return res.status(400).json({ message: 'Số điện thoại chỉ được chứa ký tự số.' });

    try {
      const existing = await new Promise((resolve, reject) => {
        connection.query(
          `SELECT * FROM taikhoankh WHERE "userName" = $1`,
          [userName], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          }
        );
      });

      if (existing && existing.length > 0)
        return res.status(400).json({ message: 'Username đã tồn tại.' });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(passWord, salt);

      await new Promise((resolve, reject) => {
        connection.query(
          `INSERT INTO taikhoankh ("email","hoTen","passWord","SDT","userName") VALUES ($1,$2,$3,$4,$5)`,
          [email, hoTen, hashedPassword, SDT, userName],
          (err, results) => {
            if (err) return reject(err);
            resolve(results);
          }
        );
      });

      res.status(200).json({ message: 'Tài khoản khách hàng đã được tạo thành công.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi thêm tài khoản khách hàng' });
    }
  },

  changePassword: async (req, res) => {
    const { idUser, newPassword } = req.body;

    if (!idUser || !newPassword)
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết.' });

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await new Promise((resolve, reject) => {
        connection.query(
          `UPDATE taikhoankh SET "passWord" = $1 WHERE "idUser" = $2`,
          [hashedPassword, idUser],
          (err, results) => {
            if (err) return reject(err);
            resolve(results);
          }
        );
      });

      res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi thay đổi mật khẩu' });
    }
  },
};

module.exports = customersAccController;
