// controllers/customersController.js
const bcrypt = require("bcrypt");
const connection = require("../models/db");
const jwt = require("jsonwebtoken");

let refreshTokenCuss = [];
const customersController = {
  cusregister : async (req, res) => {
    const { userName, passWord, SDT, email, hoTen } = req.body;
  
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Địa chỉ email không hợp lệ" });
    }
  
    // Check if userName already exists
    const checkUserQuery = 'SELECT * FROM taikhoankh WHERE userName = ?';
    connection.query(checkUserQuery, [userName], (err, results) => {
      if (err) {
        console.error("Lỗi khi kiểm tra tên người dùng:", err);
        return res.status(500).json({ message: "Đăng ký thất bại" });
      }
  
      if (results.length > 0) {
        return res.status(400).json({ message: "Tên người dùng đã tồn tại" });
      }
  
      // Generate salt and hash the password
      bcrypt.genSalt(10, (err, salt) => {
        if (err) throw err;
  
        bcrypt.hash(passWord, salt, (err, hashedPassword) => {
          if (err) throw err;
  
          // Store hashedPassword in your database
          const user = {
            userName,
            passWord: hashedPassword,
            SDT,
            email,
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
    });
  },
  generateAccessToken: (user) => {
    return jwt.sign(
      {
        idUser: user.idUser,
      },
      process.env.JWT_ACCESS_KEY,
      {
        expiresIn: "120s",
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
  },
  getCusbyId: async (req, res) => {
    const idUser = req.user.idUser;
    if (!idUser) {
        return res
            .status(400)
            .json({ message: "Missing required field: idUser" });
    }
    const query = `SELECT * FROM taikhoankh WHERE idUser = ?`
    connection.query(query, [idUser], (err, results) => {
      if (err) {
          return res.status(500).json({ message: err.message });
      }
      console.log("thanh cong")
      res.json(results);
  });
  },
  changePassword : async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const idUser = req.user.idUser; // Extract idUser from the token
  
    if (!idUser) {
      return res.status(400).json({ message: "Missing required field: idUser" });
    }
  
    try {
      // Check if idUser exists in the database
      const query = `SELECT * FROM taikhoankh WHERE idUser = ?`;
      connection.query(query, [idUser], async (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "Server error during password change." });
        }
  
        // If idUser is not found
        if (results.length === 0) {
          return res.status(404).json({ message: "User not found." });
        }
  
        const user = results[0];
  
        // Compare current password with the hashed password in the database
        const match = await bcrypt.compare(currentPassword, user.passWord);
        if (!match) {
          return res.status(401).json({ message: "Current password is incorrect." });
        }
  
        // Check if the new password is the same as the current password
        const newPasswordMatch = await bcrypt.compare(newPassword, user.passWord);
        if (newPasswordMatch) {
          return res.status(400).json({ message: "New password cannot be the same as the current password." });
        }
  
        // Hash the new password
        bcrypt.genSalt(10, (err, salt) => {
          if (err) throw err;
  
          bcrypt.hash(newPassword, salt, (err, hashedNewPassword) => {
            if (err) throw err;
  
            // Update the password in the database
            const updateQuery = `UPDATE taikhoankh SET passWord = ? WHERE idUser = ?`;
            connection.query(updateQuery, [hashedNewPassword, idUser], (err, result) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error updating password." });
              }
  
              res.status(200).json({ message: "Password changed successfully." });
            });
          });
        });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error." });
    }

  },
  updateUser: async (req, res) => {
    const { hoTen, SDT, email } = req.body;
    const idUser = req.user.idUser; // Lấy idUser từ token
  
    if (!idUser) {
      console.log("Thiếu trường bắt buộc: idUser");
      return res.status(400).json({ message: "Thiếu trường bắt buộc: idUser" });
    }
  
    // Kiểm tra định dạng email nếu email được cung cấp
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log("Địa chỉ email không hợp lệ");
        return res.status(400).json({ message: "Địa chỉ email không hợp lệ" });
      }
    }
  
    const fieldsToUpdate = [];
    const values = [];
  
    if (hoTen) {
      fieldsToUpdate.push("hoTen = ?");
      values.push(hoTen);
    }
  
    if (SDT) {
      fieldsToUpdate.push("SDT = ?");
      values.push(SDT);
    }
  
    if (email) {
      fieldsToUpdate.push("email = ?");
      values.push(email);
    }
  
  
    if (fieldsToUpdate.length === 0) {
      console.log("Không có trường nào được cung cấp để cập nhật");
      return res.status(400).json({ message: "Không có trường nào được cung cấp để cập nhật" });
    }
  
    values.push(idUser);
  
    const updateQuery = `UPDATE taikhoankh SET ${fieldsToUpdate.join(", ")} WHERE idUser = ?`;
    connection.query(updateQuery, values, (err, result) => {
      if (err) {
        console.error(err);
        console.log("Lỗi khi cập nhật thông tin.");
        return res.status(500).json({ success:false,message: "Lỗi khi cập nhật thông tin." });
      }
  
      res.status(200).json({ success:false,message: "Cập nhật thông tin thành công." });
    });
  },
  getAddressCus: async (req, res) => {
    const idUser = req.user.idUser;
    if (!idUser) {
      return res.status(400).json({ message: "Missing required field: idUser" });
    }
    
    // Thay đổi bảng và cột nếu cần
    const query = `SELECT diaChi FROM taikhoankh WHERE idUser = ?`;
    connection.query(query, [idUser], (err, results) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: "Address not found" });
      }
      
      res.json(results[0]); // Trả về thông tin địa chỉ
    });
  },
  // Hàm sửa địa chỉ khách hàng
  updateAddressCus: async (req, res) => {
    const idUser = req.user.idUser;
    const { newAddress } = req.body; // Chỉ cần địa chỉ mới để cập nhật
  
    if (!idUser || !newAddress) {
      return res.status(400).json({ message: "Missing required fields: idUser or newAddress" });
    }
  
    const updateQuery = `UPDATE taikhoankh SET diaChi = ? WHERE idUser = ?`;
    connection.query(updateQuery, [newAddress, idUser], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error updating address." });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Address update failed. User not found." });
      }
  
      res.status(200).json({ message: "Address updated successfully." });
    });
  },
  

};

module.exports = customersController;
