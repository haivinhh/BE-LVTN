// controllers/customersController.js
const bcrypt = require("bcrypt");
const connection = require("../models/db");
const jwt = require("jsonwebtoken");

let refreshTokenCuss = [];
const customersController = {
  cusregister: async (req, res) => {
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

        const sql = "INSERT INTO taikhoankh SET ?";

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
        idUser: user.idUser,
      },
      process.env.JWT_ACCESS_KEY,
      {
        expiresIn: "10s",
      }
    );
  },
  generateRefreshToken: (user) => {
    return jwt.sign(
      {
        idUser: user.idUser,
      },
      process.env.JWT_REFRESH_KEY,
      {
        expiresIn: "365d",
      }
    );
  },
  cuslogin: async (req, res) => {
    const { userName, passWord } = req.body;

    try {
      // Kiểm tra xem userName có tồn tại trong database không
      const query = `SELECT * FROM taikhoankh WHERE userName = ?`;
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
        const accessToken = customersController.generateAccessToken(results[0]);
        const refreshTokenCus = customersController.generateRefreshToken(results[0]);
        refreshTokenCuss.push(refreshTokenCus); 
        res.cookie("refreshTokenCus", refreshTokenCus, {
          httpOnly: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        res.status(200).json({ message: true, accessToken });
        console.log("gaaa: ",refreshTokenCus)
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: false });
    }
  },
  cuslogout: async (req,res) => {
    res.clearCookie("refreshTokenCus");
    refreshTokenCuss=refreshTokenCuss.filter(token =>token !== req.cookies.refreshTokenCus);
    res.status(200).json("logout thành công")
  },
  requestRefreshToken: async(req, res) =>{
    const refreshTokenCus = req.cookies.refreshTokenCus;
    console.log("asd:" ,refreshTokenCus)
    if(!refreshTokenCus)
        return res.status(401).json("chưa được xác thực");
    
    jwt.verify(refreshTokenCus, process.env.JWT_REFRESH_KEY,(err,user) => {
        if(err){
            console.log(err);
        }
        refreshTokenCuss = refreshTokenCuss.filter((token)=>token !== refreshTokenCus)
        const newAccessTokenCus = customersController.generateAccessToken(user);
        const newRefreshTokenCus = customersController.generateRefreshToken(user);
        refreshTokenCuss.push(newRefreshTokenCus);
        res.cookie("refreshTokenCus", newRefreshTokenCus,{
            httpOnly: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        res.status(200).json({accessToken: newAccessTokenCus});
        console.log("refreshtokencusnew: " ,newRefreshTokenCus);
    });
  }
};

module.exports = customersController;
