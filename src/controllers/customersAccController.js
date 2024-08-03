const connection = require("../models/db");

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
      const query = 'SELECT * FROM donHang WHERE idUser = ?';
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
};

module.exports = customersAccController;
