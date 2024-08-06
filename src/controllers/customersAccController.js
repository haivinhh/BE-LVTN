const connection = require("../models/db");
const bcrypt = require("bcrypt");

const customersAccController = {
  getAllCustomers: async (req, res) => {
    try {
      // Bước 1: Lấy tất cả khách hàng
      const queryCustomers = 'SELECT * FROM taikhoankh';
      connection.query(queryCustomers, async (err, customers) => {
        if (err) {
          console.error('Lỗi khi lấy thông tin khách hàng:', err);
          return res.status(500).json({ message: 'Lỗi khi lấy thông tin khách hàng' });
        }

        // Bước 2: Xử lý từng khách hàng để kiểm tra xem có nên đánh dấu là khách hàng thân thiết không
        for (const customer of customers) {
          const customerId = customer.idUser;

          // Bước 2.1: Lấy tất cả đơn hàng thành công của khách hàng hiện tại
          const queryOrders = 'SELECT * FROM donHang WHERE idUser = ? AND trangThai = "success"';
          let orders = [];
          try {
            orders = await new Promise((resolve, reject) => {
              connection.query(queryOrders, [customerId], (err, results) => {
                if (err) return reject(err);
                resolve(results);
              });
            });
          } catch (error) {
            console.error('Lỗi khi lấy thông tin đơn hàng:', error);
            continue; // Bỏ qua khách hàng này và tiếp tục với khách hàng khác
          }

          // Bước 2.2: Đếm tổng số sản phẩm trong tất cả các đơn hàng thành công
          let totalProductCount = 0;
          for (const order of orders) {
            const orderId = order.idDonHang;
            let orderDetails = [];
            try {
              orderDetails = await new Promise((resolve, reject) => {
                connection.query('SELECT SUM(soLuong) AS productCount FROM chiTietDonHang WHERE idDonHang = ?', [orderId], (err, results) => {
                  if (err) return reject(err);
                  resolve(results);
                });
              });
            } catch (error) {
              console.error('Lỗi khi lấy chi tiết đơn hàng:', error);
              continue; // Bỏ qua đơn hàng này và tiếp tục với đơn hàng khác
            }

            totalProductCount += orderDetails[0].productCount || 0;
          }

          // Bước 2.3: Cập nhật khThanThiet nếu tổng số sản phẩm >= 10
          if (totalProductCount >= 10) {
            try {
              await new Promise((resolve, reject) => {
                connection.query('UPDATE taikhoankh SET khThanThiet = 1 WHERE idUser = ?', [customerId], (err) => {
                  if (err) return reject(err);
                  resolve();
                });
              });
            } catch (error) {
              console.error('Lỗi khi cập nhật khách hàng thân thiết:', error);
              continue; // Bỏ qua khách hàng này và tiếp tục với khách hàng khác
            }
          }
        }

        // Bước 3: Lấy lại tất cả khách hàng để trả về dữ liệu đã cập nhật
        connection.query(queryCustomers, (err, updatedCustomers) => {
          if (err) {
            console.error('Lỗi khi lấy thông tin khách hàng đã cập nhật:', err);
            return res.status(500).json({ message: 'Lỗi khi lấy thông tin khách hàng đã cập nhật' });
          }
          res.status(200).json(updatedCustomers);
        });
      });
    } catch (error) {
      console.error('Lỗi server:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },
  getOrdersByCustomerId: async (req, res) => {
    const { idUser } = req.params;
    try {
      const query = 'SELECT * FROM donHang WHERE idUser = ? AND trangThai = "success"';
      connection.query(query, [idUser], (err, results) => {
        if (err) {
          console.error('Lỗi khi lấy thông tin đơn hàng:', err);
          return res.status(500).json({ message: 'Lỗi khi lấy thông tin đơn hàng' });
        }
        res.status(200).json(results);
      });
    } catch (error) {
      console.error('Lỗi server:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },
  getOrderDetailsById: async (req, res) => {
    const { idDonHang } = req.params;
    try {
      // Query to get order details including product information and quantities
      const query = `
        SELECT ct.idDonHang, ct.idSanPham, sp.tenSanPham, ct.soLuong, ct.donGia
        FROM chiTietDonHang AS ct
        JOIN sanPham AS sp ON ct.idSanPham = sp.idSanPham
        WHERE ct.idDonHang = ?
      `;
      connection.query(query, [idDonHang], (err, results) => {
        if (err) {
          console.error('Lỗi khi lấy chi tiết đơn hàng:', err);
          return res.status(500).json({ message: 'Lỗi khi lấy chi tiết đơn hàng' });
        }
        res.status(200).json(results);
      });
    } catch (error) {
      console.error('Lỗi server:', error);
      res.status(500).json({ message: 'Lỗi server' });
    }
  },
  deleteCustomer : async (req, res) => {
    const { idUser } = req.params;
    try {
      // Step 1: Check if the customer exists
      const checkCustomerQuery = 'SELECT COUNT(*) AS customerCount FROM taikhoankh WHERE idUser = ?';
      const [customerResults] = await new Promise((resolve, reject) => {
        connection.query(checkCustomerQuery, [idUser], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
  
      if (customerResults.customerCount === 0) {
        return res.status(404).json({ message: 'Khách hàng không tồn tại.' });
      }
  
      // Step 2: Check if the customer has any unpaid, delivery, or waiting orders
      const checkOrdersQuery = 'SELECT COUNT(*) AS orderCount FROM donHang WHERE idUser = ? AND trangThai IN ("unpaid", "delivery", "waiting")';
      const [orderResults] = await new Promise((resolve, reject) => {
        connection.query(checkOrdersQuery, [idUser], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
  
      if (orderResults.orderCount > 0) {
        return res.status(400).json({ message: 'Không thể xóa khách hàng vì khách hàng này đang có sản phẩm trong giỏ hàng hoặc có đơn hàng' });
      }
  
      // Step 3: If no such orders, delete the customer
      const deleteCustomerQuery = 'DELETE FROM taikhoankh WHERE idUser = ?';
      await new Promise((resolve, reject) => {
        connection.query(deleteCustomerQuery, [idUser], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
  
      res.status(200).json({ message: 'Khách hàng đã được xóa thành công.' });
    } catch (error) {
      console.error('Lỗi server khi xóa khách hàng:', error);
      res.status(500).json({ message: 'Lỗi server khi xóa khách hàng' });
    }
  },
  updateCustomer : async (req, res) => {
    const { idUser } = req.params;
    const { email, SDT, hoTen, userName } = req.body;
  
    // Kiểm tra thông tin đầu vào
    if (!email || !SDT || !hoTen || !userName) {
      return res.status(400).json({ message: 'Thiếu thông tin cần cập nhật' });
    }
  
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email không đúng định dạng' });
    }
  
    // Validate phone number
    const phoneRegex = /^\d+$/;
    if (!phoneRegex.test(SDT)) {
      return res.status(400).json({ message: 'Số điện thoại chỉ được chứa ký tự số' });
    }
  
    try {
      // Kiểm tra xem username mới có tồn tại chưa
      const checkQuery = 'SELECT * FROM taikhoankh WHERE userName = ? AND idUser != ?';
      const existingUser = await new Promise((resolve, reject) => {
        connection.query(checkQuery, [userName, idUser], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
  
      if (existingUser && existingUser.length > 0) {
        return res.status(400).json({ message: 'Username đã tồn tại' });
      }
  
      // Câu lệnh SQL để cập nhật thông tin khách hàng
      const updateQuery = `
        UPDATE taikhoankh
        SET email = ?, SDT = ?, hoTen = ?, userName = ?
        WHERE idUser = ?
      `;
  
      // Thực hiện cập nhật thông tin khách hàng
      await new Promise((resolve, reject) => {
        connection.query(
          updateQuery,
          [email, SDT, hoTen, userName, idUser],
          (err, results) => {
            if (err) return reject(err);
            resolve(results);
          }
        );
      });
  
      res.status(200).json({ message: 'Thông tin khách hàng đã được cập nhật thành công.' });
    } catch (error) {
      console.error('Lỗi server khi cập nhật thông tin khách hàng:', error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật thông tin khách hàng' });
    }
  },
  
  addCustomer : async (req, res) => {
    const { email, SDT, hoTen, userName, passWord } = req.body;
  
    // Kiểm tra thông tin đầu vào
    if (!email || !SDT || !hoTen || !userName || !passWord) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết để tạo tài khoản.' });
    }
  
    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Định dạng email không hợp lệ.' });
    }
  
    // Kiểm tra định dạng số điện thoại (chỉ chấp nhận các ký tự số)
    const phoneRegex = /^[0-9]+$/;
    if (!phoneRegex.test(SDT)) {
      return res.status(400).json({ message: 'Số điện thoại chỉ được chứa các ký tự số.' });
    }
  
    try {
      // Kiểm tra xem username đã tồn tại chưa
      const checkQuery = 'SELECT * FROM taikhoankh WHERE userName = ?';
      const existingUser = await new Promise((resolve, reject) => {
        connection.query(checkQuery, [userName], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
  
      if (existingUser && existingUser.length > 0) {
        return res.status(400).json({ message: 'Username đã tồn tại.' });
      }
  
      // Generate salt and hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(passWord, salt);
  
      // Câu lệnh SQL để thêm tài khoản khách hàng
      const insertQuery = `
        INSERT INTO taikhoankh (email, hoTen, passWord, SDT, userName)
        VALUES (?, ?, ?, ?, ?)
      `;
  
      // Thực hiện thêm tài khoản khách hàng
      await new Promise((resolve, reject) => {
        connection.query(insertQuery, [email, hoTen, hashedPassword, SDT, userName], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
  
      res.status(200).json({ message: 'Tài khoản khách hàng đã được tạo thành công.' });
    } catch (error) {
      console.error('Lỗi server khi thêm tài khoản khách hàng:', error);
      res.status(500).json({ message: 'Lỗi server khi thêm tài khoản khách hàng' });
    }
  },
   changePassword: async (req, res) => {
    const { idUser, newPassword } = req.body;
  
    // Kiểm tra thông tin đầu vào
    if (!idUser || !newPassword) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết để thay đổi mật khẩu.' });
    }
  
    try {
      // Generate salt and hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      // Câu lệnh SQL để cập nhật mật khẩu
      const updateQuery = 'UPDATE taikhoankh SET passWord = ? WHERE idUser = ?';
  
      // Thực hiện cập nhật mật khẩu
      await new Promise((resolve, reject) => {
        connection.query(updateQuery, [hashedPassword, idUser], (err, results) => {
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
};

module.exports = customersAccController;
