const bcrypt = require("bcrypt");
const connection = require("../models/db");
const jwt = require("jsonwebtoken");

let refreshTokens = [];
const usersController = {
  register: async (req, res) => {
    const { userName, passWord, SDT, email, diaChi, hoTen } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Địa chỉ email không hợp lệ" });
    }

    // Generate salt and hash the password
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(passWord, salt, (err, hashedPassword) => {
        if (err) throw err;

        // Store hashedPassword in your database
        const user = {
          userName,
          passWord: hashedPassword,
          SDT,
          email,
          diaChi,
          hoTen,
        };

        const sql = "INSERT INTO tknhanvien SET ?";

        connection.query(sql, user, (err, result) => {
          if (err) {
            console.error("Đăng ký thất bại:", err);
            res.status(500).json({ message: "Đăng ký thất bại" });
          } else {
            console.log("Đăng ký thành công");
            res.status(200).json({ message: "Đăng ký thành công" });
          }
        });
      });
    });
  },
  generateAccessToken: (user) => {
    return jwt.sign(
      {
        idNhanVien: user.idNhanVien,
        admin: user.admin 
      },
      process.env.JWT_ACCESS_KEY,
      {
        expiresIn: "20s",
      }
    );
  },
  generateRefreshToken: (user) => {
    return jwt.sign(
      {
        idNhanVien: user.idNhanVien,
        admin: user.admin 
      },
      process.env.JWT_REFRESH_KEY,
      {
        expiresIn: "365d",
      }
    );
  },
  login: async (req, res) => {
    const { userName, passWord } = req.body;

    try {
      // Kiểm tra xem userName có tồn tại trong database không
      const query = `SELECT * FROM tknhanvien WHERE userName = ?`;
      connection.query(query, [userName], async (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "Lỗi server khi đăng nhập." });
        }

        // Nếu không tìm thấy userName
        if (results.length === 0) {
          return res
            .status(404)
            .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng." });
        }

        // So sánh mật khẩu đã mã hóa với mật khẩu gửi từ client
        const match = await bcrypt.compare(passWord, results[0].passWord);
        if (!match) {
          return res
            .status(401)
            .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng." });
        }

        // Gửi phản hồi thành công về client
        const accessToken = usersController.generateAccessToken(results[0]);
        console.log("usertoken: ",accessToken);
        const refreshToken = usersController.generateRefreshToken(results[0]);
        refreshTokens.push(refreshToken);
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        res.status(200).json({ message: "Đăng nhập thành công.", accessToken });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi server khi đăng nhập." });
    }
  },
  logout: async (req,res) => {
    res.clearCookie("refreshToken");
    refreshTokens=refreshTokens.filter(token =>token !== req.cookies.refreshToken);
    res.status(200).json("logout thành công")
  },
  requestRefreshToken: async(req, res) =>{
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken)
        return res.status(401).json("chưa được xác thực");
    jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY,(err,user) => {
        if(err){
            console.log(err);
        }
        refreshTokens = refreshTokens.filter((token)=>token !== refreshToken)
        const newAccessToken = usersController.generateAccessToken(user);
        const newRefreshToken = usersController.generateRefreshToken(user);
        refreshTokens.push(newRefreshToken);
        res.cookie("refreshToken", newRefreshToken,{
            httpOnly: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        res.status(200).json({accessToken: newAccessToken});
        console.log("refreshtokennew: " ,newRefreshToken);
    });
  },

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

  deleteUser: (req, res) => {
    const { idNhanVien } = req.body; // Get ID from URL

    // Check if the request is coming from an admin
    if (!req.user.admin) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa nhân viên này." });
    }

    // Proceed with deleting the user
    const deleteQuery = "DELETE FROM tknhanvien WHERE idNhanVien = ?";

    connection.query(deleteQuery, [idNhanVien], (error, result) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi xóa nhân viên." });
      }

      // Check if any user was deleted
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy nhân viên để xóa." });
      }

      res.status(200).json({ message: "Xóa nhân viên thành công." });
    });
  },
  getAllCustomers: (req, res) => {
    const query = "SELECT * FROM taikhoankh";

    connection.query(query, (error, results) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi lấy danh sách khách hàng." });
      }

      res.status(200).json(results);
    });
  },

  deleteCustomer: (req, res) => {
    const { idUser } = req.body; // Lấy ID từ URL

    // Truy vấn kiểm tra xem có đơn hàng nào của khách hàng này không
    const checkOrdersQuery =
      "SELECT COUNT(*) AS orderCount FROM donHang WHERE idUser = ?";

    connection.query(checkOrdersQuery, [idUser], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          message: "Lỗi server khi kiểm tra đơn hàng của khách hàng.",
        });
      }

      const orderCount = results[0].orderCount;

      // Nếu có đơn hàng tồn tại
      if (orderCount > 0) {
        return res.status(400).json({
          message: "Không thể xóa khách hàng này vì đã có đơn hàng liên quan.",
        });
      }

      // Nếu không có đơn hàng, tiến hành xóa khách hàng
      const deleteCustomerQuery = "DELETE FROM taikhoankh WHERE idUser = ?";

      connection.query(deleteCustomerQuery, [idUser], (error, result) => {
        if (error) {
          console.error(error);
          return res
            .status(500)
            .json({ message: "Lỗi server khi xóa khách hàng." });
        }

        // Kiểm tra xem có khách hàng nào bị xóa hay không
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Không tìm thấy khách hàng để xóa." });
        }

        res.status(200).json({ message: "Xóa khách hàng thành công." });
      });
    });
  },
};

module.exports = usersController;
