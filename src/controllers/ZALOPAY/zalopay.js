const axios = require("axios");
const CryptoJS = require("crypto-js");
const moment = require("moment");
const qs = require("qs");
const connection = require("../../models/db"); // Adjust the path as needed

const config = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
  queryEndpoint: "https://sb-openapi.zalopay.vn/v2/query",
  callback_url: "https://5bd9-2405-4803-db42-b870-38a6-810-430-142e.ngrok-free.app/api/callback",
};

const zalopayController = {
  createPayment: async (req, res) => {
    try {
      const userId = req.user.idUser; // Extract userId from the token
      const { tenNguoiNhan, diaChi, SDT } = req.body; // Extract recipient info from request body

      // Query to get user and order information
      const query = `
                SELECT dc.idChiTietDH, dc.idDonHang, dc.idSanPham, dc.soLuong, dc.tongTien,
                       p.tenSanPham AS tenSanPham, p.donGia AS donGia, p.hinhSP,
                       c.tongTienDH AS tongTienDH, tk.userName AS userName
                FROM chitietdonhang dc
                JOIN sanpham p ON dc.idSanPham = p.idSanPham
                JOIN donhang c ON dc.idDonHang = c.idDonHang
                JOIN taikhoankh tk ON c.idUser = tk.idUser
                WHERE c.idUser = ? AND c.trangThai = 'unpaid'
            `;

      connection.query(query, [userId], async (err, results) => {
        if (err) {
          return res.status(500).json({ message: err.message });
        }
        if (results.length === 0) {
          return res
            .status(404)
            .json({ message: "No unpaid orders found for the user." });
        }

        const order = results[0]; // Assuming only one unpaid order
        const embed_data = {
          redirecturl: "http://localhost:3000/cart",
          tenNguoiNhan, // Add recipient info here
          diaChi,
          SDT,
        };
        const formatPrice = (price) =>
          price.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
        const transID = Math.floor(Math.random() * 1000000);
        const orderData = {
          app_id: config.app_id,
          app_trans_id: `${moment().format("YYMMDD")}_${transID}_${
            order.idDonHang
          }`,
          app_user: order.userName,
          app_time: Date.now(),
          item: JSON.stringify(results),
          embed_data: JSON.stringify(embed_data),
          amount: order.tongTienDH,
          callback_url: config.callback_url,
          description: results
            .map(
              (item) =>
                `${item.tenSanPham} (x${item.soLuong}) - ${formatPrice(
                  item.donGia
                )}`
            )
            .join("||"),
          bank_code: "",
        };

        const data = `${config.app_id}|${orderData.app_trans_id}|${orderData.app_user}|${orderData.amount}|${orderData.app_time}|${orderData.embed_data}|${orderData.item}`;
        orderData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

        try {
          const result = await axios.post(config.endpoint, null, {
            params: orderData,
          });

          if (result.data.return_code === 1) {
            const orderUrl = result.data.order_url;
            res.status(200).json({
              order_url: orderUrl,
              app_trans_id: orderData.app_trans_id,
            });
          } else {
            res.status(500).json({ message: "Failed to create payment." });
          }
        } catch (error) {
          res.status(500).json({ message: error.message });
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  callback: (req, res) => {
    console.log('Callback received:', req.body); // Log the incoming request body
    let result = {};
    try {
      const dataStr = req.body.data;
      const reqMac = req.body.mac;
  
      const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
  
      if (reqMac !== mac) {
        result.return_code = -1;
        result.return_message = "mac not equal";
      } else {
        const dataJson = JSON.parse(dataStr);
        const appTransId = dataJson["app_trans_id"];
        const { tenNguoiNhan, diaChi, SDT } = JSON.parse(dataJson["embed_data"]);
  
        // Extract the idDonHang from appTransId
        const idDonHang = appTransId.split("_")[2];
  
        // Update the order's status and details
        const updateQuery = `
                  UPDATE donhang
                  SET trangThai = 'waiting', phuongThucTT = 'ONL', tenNguoiNhan = ?, diaChi = ?, SDT = ?
                  WHERE idDonHang = ?
              `;
  
        connection.query(
          updateQuery,
          [tenNguoiNhan, diaChi, SDT, idDonHang],
          (err, updateResult) => {
            if (err) {
              console.error("Error updating order:", err.message);
              result.return_code = 0;
              result.return_message = err.message;
            } else {
              console.log(`Order ${idDonHang} updated with recipient details and status set to 'waiting'.`);
              result.return_code = 1;
              result.return_message = "success";
            }
            res.json(result);
          }
        );
      }
    } catch (ex) {
      console.log("Error:", ex.message);
      result.return_code = 0;
      result.return_message = ex.message;
      res.json(result);
    }
  },
  

  checkOrderStatus: async (req, res) => {
    try {
      const { app_trans_id } = req.params;

      const postData = {
        app_id: config.app_id,
        app_trans_id,
      };

      const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;
      postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

      const postConfig = {
        method: "post",
        url: config.queryEndpoint,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: qs.stringify(postData),
      };

      const result = await axios(postConfig);

      if (result.data.return_code === 1) {
        // Payment was successful, update the order status
        const idDonHang = app_trans_id.split("_")[2];

        // Retrieve tenNguoiNhan, diaChi, and SDT from the request body
        const { tenNguoiNhan, diaChi, SDT } = req.body;

        const updateQuery = `
                    UPDATE donhang
                    SET trangThai = 'waiting', phuongThucTT = 'ONL', tenNguoiNhan = ?, diaChi = ?, SDT = ?
                    WHERE idDonHang = ?
                `;

        connection.query(
          updateQuery,
          [tenNguoiNhan, diaChi, SDT, idDonHang],
          (err, updateResult) => {
            if (err) {
              console.error("Error updating order:", err.message);
              return res.status(500).json({ message: err.message });
            }

            console.log(
              `Order ${idDonHang} updated with recipient details and status set to 'waiting'.`
            );
            res.status(200).json({
              return_code: 1,
              return_message:
                "Payment confirmed and order status updated successfully.",
              data: result.data,
            });
          }
        );
      } else {
        // Payment was not successful or another status was returned
        res.status(200).json(result.data);
      }
    } catch (error) {
      console.log("Error:", error.message);
      res.status(500).json({ message: error.message });
    }
  },
};
module.exports = zalopayController;
