// controllers/customersController.js
const bcrypt = require("bcrypt");
const connection = require("../models/db");
const jwt = require("jsonwebtoken");

let refershTokenCuss = [];
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
        expiresIn: "50s",
      }
    );
  },
  generateRefershToken: (user) => {
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
        const refershTokenCus = customersController.generateRefershToken(results[0]);
        refershTokenCuss.push(refershTokenCus); 
        res.cookie("refershTokenCus", refershTokenCus, {
          httpOnly: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        res.status(200).json({ message: true, accessToken });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: false });
    }
  },
  cuslogout: async (req,res) => {
    res.clearCookie("refershTokenCus");
    refershTokenCuss=refershTokenCuss.filter(token =>token !== req.cookies.refershTokenCus);
    res.status(200).json("logout thành công")
  },
  requestRefershToken: async(req, res) =>{
    const refershTokenCus = req.cookies.refershTokenCus;
    if(!refershTokenCus)
        return res.status(401).json("chưa xác được xác thực");
    if(refershTokenCuss.includes(refershTokenCus)){
        return res.status(403).json("Refersh token không hợp lệ");
    }
    jwt.verify(refershTokenCus, process.env.JWT_REFRESH_KEY,(err,user) => {
        if(err)
            console.log(err);
        refershTokenCus = refershTokenCuss.filter((token)=>token !== refershTokenCus)
        const newAccessTokenCus = customersController.generateAccessToken(user);
        const newRefershTokenCus = customersController.generateRefershToken(user);
        refershTokenCuss.push(newRefershTokenCus);
        res.cookie("refershTokenCus", newRefershTokenCus,{
            httpOnly: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        res.status(200).json({accessToken: "newAccessToken"});
    });
  }
};

module.exports = customersController;
