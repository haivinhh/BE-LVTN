const axios = require('axios');
const CryptoJS = require('crypto-js');
const moment = require('moment');
const qs = require('qs');
const connection = require('../../models/db'); // Adjust the path as needed

const config = {
    app_id: '2553',
    key1: 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
    key2: 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz',
    endpoint: 'https://sb-openapi.zalopay.vn/v2/create',
    queryEndpoint: 'https://sb-openapi.zalopay.vn/v2/query',
    callback_url: 'https://b074-1-53-37-194.ngrok-free.app/callback'
};

const zalopayController = {
    createPayment: async (req, res) => {
        try {
            const userId = req.user.idUser; // Extract userId from the token

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
                    return res.status(404).json({ message: "No unpaid orders found for the user." });
                }

                const order = results[0]; // Assuming only one unpaid order

                const embed_data = {
                    redirecturl: 'https://phongthuytaman.com',
                };

                const transID = Math.floor(Math.random() * 1000000);
                const orderData = {
                    app_id: config.app_id,
                    app_trans_id: `${moment().format('YYMMDD')}_${transID}`,
                    app_user: order.userName, // Use the fetched userName
                    app_time: Date.now(),
                    item: JSON.stringify(results), // Serialize order details
                    embed_data: JSON.stringify(embed_data),
                    amount: order.tongTienDH, // Use the total amount from the order
                    callback_url: config.callback_url,
                    description: `Lazada - Payment for the order #${transID}`,
                    bank_code: ''
                };

                const data = `${config.app_id}|${orderData.app_trans_id}|${orderData.app_user}|${orderData.amount}|${orderData.app_time}|${orderData.embed_data}|${orderData.item}`;
                orderData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

                try {
                    const result = await axios.post(config.endpoint, null, { params: orderData });
                    res.status(200).json(result.data);
                } catch (error) {
                    res.status(500).json({ message: error.message });
                }
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    callback: (req, res) => {
        let result = {};
        try {
            const dataStr = req.body.data;
            const reqMac = req.body.mac;

            const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

            if (reqMac !== mac) {
                result.return_code = -1;
                result.return_message = 'mac not equal';
            } else {
                const dataJson = JSON.parse(dataStr);
                console.log(`Update order's status = success where app_trans_id = ${dataJson['app_trans_id']}`);

                result.return_code = 1;
                result.return_message = 'success';
            }
        } catch (ex) {
            console.log('Error: ' + ex.message);
            result.return_code = 0;
            result.return_message = ex.message;
        }

        res.json(result);
    },

    checkOrderStatus: async (req, res) => {
        try {
            const { app_trans_id } = req.body;

            const postData = {
                app_id: config.app_id,
                app_trans_id
            };

            const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;
            postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

            const postConfig = {
                method: 'post',
                url: config.queryEndpoint,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: qs.stringify(postData)
            };

            const result = await axios(postConfig);
            res.status(200).json(result.data);
        } catch (error) {
            console.log('Error:', error.message);
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = zalopayController;
