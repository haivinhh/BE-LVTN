const axios = require("axios");
const CryptoJS = require("crypto-js");
const moment = require("moment");
const qs = require("qs");
const connection = require("../../models/db"); // Adjust the path as needed

const config = {
  app_id: "2554",
  key1: "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
  key2: "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
  queryEndpoint: "https://sb-openapi.zalopay.vn/v2/query",
  callback_url:
    "https://1c6d-2405-4803-db3a-88a0-c92-f0ef-66c2-82c8.ngrok-free.app/api/callback",
  refund_url: "https://sb-openapi.zalopay.vn/v2/refund",
  query_refund_url: "https://sb-openapi.zalopay.vn/v2/query_refund",
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
        const app_trans_id = `${moment().format("YYMMDD")}_${transID}_${
          order.idDonHang
        }`;
        const orderData = {
          app_id: config.app_id,
          app_trans_id,
          app_user: order.userName,
          app_time: Date.now(),
          item: JSON.stringify(results),
          embed_data: JSON.stringify(embed_data),
          user_fee_amount: 0,
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
            // Respond with payment creation success details
            res.status(200).json({
              return_code: result.data.return_code,
              return_message: result.data.return_message,
              sub_return_code: result.data.sub_return_code,
              sub_return_message: result.data.sub_return_message,
              order_url: result.data.order_url,
              zp_trans_token: result.data.zp_trans_token,
              app_trans_id: orderData.app_trans_id,
              order: {
                amount: orderData.amount,
                description: orderData.description,
                app_user: orderData.app_user,
                embed_data: embed_data,
              },
            });
          } else {
            res.status(500).json({
              return_code: result.data.return_code,
              return_message: result.data.return_message,
              sub_return_code: result.data.sub_return_code,
              sub_return_message: result.data.sub_return_message,
              message: "Failed to create payment.",
            });
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
    console.log("Callback received:", req.body); // Log the incoming request body
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
        const zpTransId = dataJson["zp_trans_id"]; // Extract zp_trans_id
        const { tenNguoiNhan, diaChi, SDT } = JSON.parse(
          dataJson["embed_data"]
        );

        // Extract the idDonHang from appTransId
        const idDonHang = appTransId.split("_")[2];

        // Update the order's status, details, and transaction ID
        const updateQuery = `
                UPDATE donhang
                SET trangThai = 'waiting', phuongThucTT = 'ONL', tenNguoiNhan = ?, diaChi = ?, SDT = ?, maGiaoDich = ?
                WHERE idDonHang = ?
            `;

        connection.query(
          updateQuery,
          [tenNguoiNhan, diaChi, SDT, zpTransId, idDonHang], // Add zpTransId to the query parameters
          (err, updateResult) => {
            if (err) {
              console.error("Error updating order:", err.message);
              result.return_code = 0;
              result.return_message = err.message;
            } else {
              console.log(
                `Order ${idDonHang} updated with recipient details, transaction ID, and status set to 'waiting'.`
              );
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
  RefundOrder: (idDonHang, userId, callback) => {
    try {
      // Query để kiểm tra thông tin đơn hàng
      const query = `
        SELECT dh.idDonHang, dh.phuongThucTT, dh.trangThai, dh.tongTienDH, dh.maGiaoDich
        FROM donhang dh
        WHERE dh.idUser = ? AND dh.idDonHang = ?;
      `;

      connection.query(query, [userId, idDonHang], async (err, results) => {
        if (err) {
          console.error("Lỗi truy vấn cơ sở dữ liệu:", err.message);
          return callback(
            { status: 500, data: { message: err.message } },
            null
          );
        }

        if (results.length === 0) {
          return callback(
            { status: 404, data: { message: "Đơn hàng không tìm thấy." } },
            null
          );
        }

        const order = results[0];

        // Kiểm tra điều kiện hoàn tiền
        if (order.phuongThucTT !== "ONL" || order.trangThai !== "waiting") {
          return callback(
            { status: 400, data: { message: "Đơn hàng không thể hoàn tiền." } },
            null
          );
        }

        // Xử lý hoàn tiền
        const timestamp = Date.now();
        const uid = `${timestamp}${Math.floor(111 + Math.random() * 999)}`; // id duy nhất

        let params = {
          app_id: config.app_id,
          m_refund_id: `${moment().format("YYMMDD")}_${config.app_id}_${uid}`,
          timestamp, // milliseconds
          zp_trans_id: order.maGiaoDich, // Lấy zp_trans_id từ cột maGiaoDich
          amount: order.tongTienDH,
          description: `Hoàn tiền cho đơn hàng #${idDonHang}`,
        };

        // Sinh MAC (Message Authentication Code)
        let data = `${params.app_id}|${params.zp_trans_id}|${params.amount}|${params.description}|${params.timestamp}`;
        params.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

        console.log("Gửi yêu cầu hoàn tiền với các tham số:", params);

        try {
          const result = await axios.post(
            config.refund_url,
            new URLSearchParams(params).toString(),
            {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
          );

          console.log("Phản hồi hoàn tiền ZaloPay:", result.data);

          if (result.data.return_code === 1 || result.data.return_code === 3) {
            // Cập nhật mã hoàn tiền vào cơ sở dữ liệu
            const updateRefundIdQuery = `
              UPDATE donhang
              SET maHoanTien = ?
              WHERE idDonHang = ?
            `;

            connection.query(
              updateRefundIdQuery,
              [params.m_refund_id, idDonHang],
              (updateErr) => {
                if (updateErr) {
                  console.error(
                    "Lỗi khi cập nhật mã hoàn tiền:",
                    updateErr.message
                  );
                  return callback(
                    {
                      status: 500,
                      data: { message: "Lỗi khi cập nhật mã hoàn tiền." },
                    },
                    null
                  );
                }

                callback(null, {
                  status: result.data.return_code === 1 ? 200 : 202,
                  data: {
                    message:
                      result.data.return_code === 1
                        ? "Đơn hàng đã được hoàn tiền thành công."
                        : "Hoàn tiền đang được xử lý. Vui lòng kiểm tra trạng thái hoàn tiền sau.",
                    refund_data: result.data,
                  },
                });
              }
            );
          } else {
            callback(
              {
                status: 500,
                data: {
                  message: "Không thể xử lý hoàn tiền.",
                  refund_response: result.data,
                },
              },
              null
            );
          }
        } catch (error) {
          console.error("Lỗi trong quá trình hoàn tiền:", error.message);
          callback(
            {
              status: 500,
              data: {
                message: "Lỗi trong quá trình hoàn tiền.",
                error: error.message,
              },
            },
            null
          );
        }
      });
    } catch (error) {
      console.error("Lỗi khi xử lý hoàn tiền:", error.message);
      callback(
        {
          status: 500,
          data: {
            message: "Lỗi khi xử lý hoàn tiền.",
            error: error.message,
          },
        },
        null
      );
    }
  },

  checkOrderStatusAndCancelOrder: (idDonHang, callback) => {
    try {
      // Query để lấy mã hoàn tiền từ cơ sở dữ liệu dựa trên idDonHang
      const getOrderDetailsQuery = `
        SELECT maHoanTien
        FROM donhang
        WHERE idDonHang = ?
      `;

      connection.query(
        getOrderDetailsQuery,
        [idDonHang],
        async (err, results) => {
          if (err) {
            console.error("Lỗi khi lấy thông tin đơn hàng:", err.message);
            return callback(
              {
                status: 500,
                data: {
                  message: "Lỗi khi lấy thông tin đơn hàng",
                  error: err.message,
                },
              },
              null
            );
          }

          if (results.length === 0) {
            console.error("Không tìm thấy đơn hàng:", idDonHang);
            return callback(
              { status: 404, data: { message: "Đơn hàng không tìm thấy" } },
              null
            );
          }

          const { maHoanTien } = results[0];

          // Nếu không có mã hoàn tiền, trả về lỗi
          if (!maHoanTien) {
            console.error(
              "Không tìm thấy yêu cầu hoàn tiền cho đơn hàng này:",
              idDonHang
            );
            return callback(
              {
                status: 400,
                data: {
                  message: "Không tìm thấy yêu cầu hoàn tiền cho đơn hàng này.",
                },
              },
              null
            );
          }

          // Chuẩn bị tham số để kiểm tra trạng thái hoàn tiền
          const timestamp = Date.now();
          const postData = {
            app_id: config.app_id,
            m_refund_id: maHoanTien,
            timestamp,
          };

          // Sinh MAC (Message Authentication Code)
          const data = `${postData.app_id}|${postData.m_refund_id}|${postData.timestamp}`;
          postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

          const postConfig = {
            method: "post",
            url: config.query_refund_url, // Thay bằng URL kiểm tra trạng thái hoàn tiền thực tế
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            data: qs.stringify(postData),
          };

          try {
            const result = await axios(postConfig);

            console.log("Phản hồi trạng thái hoàn tiền:", result.data);

            if (result.data.return_code === 1) {
              // Hoàn tiền thành công, cập nhật đơn hàng
              const updateOrderQuery = `
              UPDATE donhang
              SET phuongThucTT = NULL,
                  tenNguoiNhan = NULL,
                  SDT = NULL,
                  diaChi = NULL,
                  maGiaoDich = NULL,
                  maHoanTien = NULL,
                  trangThai = 'unpaid'
              WHERE idDonHang = ?
            `;

              connection.query(updateOrderQuery, [idDonHang], (updateErr) => {
                if (updateErr) {
                  console.error(
                    "Lỗi khi cập nhật đơn hàng:",
                    updateErr.message
                  );
                  return callback(
                    {
                      status: 500,
                      data: {
                        message: "Lỗi khi cập nhật trạng thái đơn hàng.",
                      },
                    },
                    null
                  );
                }

                callback(null, {
                  status: 200,
                  data: {
                    return_code: 1,
                    return_message:
                      "Hoàn tiền đã được xác nhận và đơn hàng đã được cập nhật thành công.",
                    data: result.data,
                  },
                });
              });
            } else if (result.data.return_code === 3) {
              // Hoàn tiền đang được xử lý, trả về trạng thái chờ
              callback(null, {
                status: 202,
                data: {
                  return_code: 3,
                  return_message:
                    "Hoàn tiền đang được xử lý. Vui lòng kiểm tra trạng thái sau.",
                  refund_response: result.data,
                },
              });
            } else {
              // Xử lý các trường hợp khác
              callback(
                {
                  status: 500,
                  data: {
                    message: "Không thể lấy trạng thái hoàn tiền.",
                    refund_response: result.data,
                  },
                },
                null
              );
            }
          } catch (error) {
            console.error(
              "Lỗi khi kiểm tra trạng thái hoàn tiền:",
              error.message
            );
            callback(
              {
                status: 500,
                data: {
                  message: "Lỗi khi kiểm tra trạng thái hoàn tiền.",
                  error: error.message,
                },
              },
              null
            );
          }
        }
      );
    } catch (error) {
      console.log("Lỗi:", error.message);
      callback(
        {
          status: 500,
          data: {
            message: "Lỗi khi kiểm tra trạng thái hoàn tiền.",
            error: error.message,
          },
        },
        null
      );
    }
  },

  processRefundAndCheckStatus: async (req, res) => {
    try {
      const { idDonHang } = req.body;
      const userId = req.user.idUser; // Lấy userId từ token

      // Gọi hàm RefundOrder đầu tiên
      zalopayController.RefundOrder(
        idDonHang,
        userId,
        async (refundError, refundResult) => {
          if (refundError) {
            return res.status(refundResult.status).json(refundResult.data);
          }

          if (refundResult.data.message !== "Order cannot be cancelled.") {
            // Đợi 2 giây trước khi tiếp tục
            setTimeout(() => {
              zalopayController.checkOrderStatusAndCancelOrder(
                idDonHang,
                (checkStatusError, checkStatusResult) => {
                  if (checkStatusError) {
                    console.error(
                      "Lỗi khi kiểm tra trạng thái đơn hàng:",
                      checkStatusError.message
                    );
                    return res
                      .status(checkStatusResult.status)
                      .json(checkStatusResult.data);
                  }

                  res
                    .status(checkStatusResult.status)
                    .json(checkStatusResult.data);
                }
              );
            }, 2000);
          } else {
            res.status(refundResult.status).json(refundResult.data);
          }
        }
      );
    } catch (error) {
      console.log(
        "Lỗi khi xử lý hoàn tiền và kiểm tra trạng thái:",
        error.message
      );
      res
        .status(500)
        .json({
          message: "Lỗi khi xử lý hoàn tiền và kiểm tra trạng thái.",
          error: error.message,
        });
    }
  },
};
module.exports = zalopayController;
