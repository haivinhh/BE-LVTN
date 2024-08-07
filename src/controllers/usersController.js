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
        admin: user.admin,
      },
      process.env.JWT_ACCESS_KEY,
      {
        expiresIn: "1200s",
      }
    );
  },
  generateRefreshToken: (user) => {
    return jwt.sign(
      {
        idNhanVien: user.idNhanVien,
        admin: user.admin,
      },
      process.env.JWT_REFRESH_KEY,
      {
        expiresIn: "365d",
      }
    );
    ``;
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
        console.log("usertoken: ", accessToken);
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
  logout: async (req, res) => {
    res.clearCookie("refreshToken");
    refreshTokens = refreshTokens.filter(
      (token) => token !== req.cookies.refreshToken
    );
    res.status(200).json("logout thành công");
  },
  requestRefreshToken: async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json("chưa được xác thực");
    jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, (err, user) => {
      if (err) {
        console.log(err);
      }
      refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
      const newAccessToken = usersController.generateAccessToken(user);
      const newRefreshToken = usersController.generateRefreshToken(user);
      refreshTokens.push(newRefreshToken);
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: false,
        path: "/",
        sameSite: "strict",
      });
      res.status(200).json({ accessToken: newAccessToken });
      console.log("refreshtokennew: ", newRefreshToken);
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
  getUserById: (req, res) => {
    const idNhanVien = req.user.idNhanVien; // Get ID from URL parameters

    const query = "SELECT * FROM tknhanvien WHERE idNhanVien = ?";

    connection.query(query, [idNhanVien], (error, results) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi lấy thông tin nhân viên." });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy nhân viên." });
      }

      res.status(200).json(results[0]);
    });
  },
  updateUser: (req, res) => {
    const idNhanVien = req.user.idNhanVien;
    const { userName, passWord, SDT, email, diaChi, hoTen } = req.body;

    let updates = [];
    let values = [];

    // Validate userName uniqueness
    if (userName) {
      const query =
        "SELECT * FROM tknhanvien WHERE userName = ? AND idNhanVien != ?";
      connection.query(query, [userName, idNhanVien], (error, results) => {
        if (error) {
          console.error(error);
          return res
            .status(500)
            .json({
              message: "Lỗi server khi kiểm tra tính duy nhất của userName.",
            });
        }
        if (results.length > 0) {
          return res.status(400).json({ message: "Tên đăng nhập đã tồn tại." });
        } else {
          updates.push("userName = ?");
          values.push(userName);
        }
      });
    }

    // Validate email format
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Địa chỉ email không hợp lệ" });
      } else {
        updates.push("email = ?");
        values.push(email);
      }
    }

    // Validate phone number format
    if (SDT) {
      const phoneRegex = /^\d+$/;
      if (!phoneRegex.test(SDT)) {
        return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
      } else {
        updates.push("SDT = ?");
        values.push(SDT);
      }
    }

    // Validate and hash password
    if (passWord) {
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
      if (!passwordRegex.test(passWord)) {
        return res
          .status(400)
          .json({
            message:
              "Mật khẩu phải chứa ít nhất một chữ cái, một số và có ít nhất 6 ký tự.",
          });
      } else {
        bcrypt.genSalt(10, (err, salt) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Lỗi server khi mã hóa mật khẩu." });

          bcrypt.hash(passWord, salt, (err, hashedPassword) => {
            if (err)
              return res
                .status(500)
                .json({ message: "Lỗi server khi mã hóa mật khẩu." });

            updates.push("passWord = ?");
            values.push(hashedPassword);
            updateDatabase();
          });
        });
        return;
      }
    }

    if (diaChi) {
      updates.push("diaChi = ?");
      values.push(diaChi);
    }
    if (hoTen) {
      updates.push("hoTen = ?");
      values.push(hoTen);
    }

    if (updates.length > 0) {
      updateDatabase();
    } else {
      res.status(400).json({ message: "Không có thông tin để cập nhật." });
    }

    function updateDatabase() {
      values.push(idNhanVien);
      const query = `UPDATE tknhanvien SET ${updates.join(
        ", "
      )} WHERE idNhanVien = ?`;

      connection.query(query, values, (error, result) => {
        if (error) {
          console.error(error);
          return res
            .status(500)
            .json({ message: "Lỗi server khi cập nhật thông tin nhân viên." });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Không tìm thấy nhân viên để cập nhật." });
        }

        res
          .status(200)
          .json({ message: "Cập nhật thông tin nhân viên thành công." });
      });
    }
  },
  getConfirmedOrdersByEmployee: (req, res) => {
    const idNhanVien = req.user.idNhanVien; // Get the employee ID from the request (assumes authentication middleware is in place)

    const query = `
        SELECT 
            dh.idDonHang,
            dh.tenNguoiNhan,
            dh.diaChi,
            dh.SDT,
            dh.phuongThucTT,
            dh.ngayDatHang,
            dh.tongTienDH,
            dh.trangThai,
            dv.tenDonVi AS donViVanChuyen
        FROM donHang dh
        LEFT JOIN donViVanChuyen dv ON dh.idDonViVanChuyen = dv.idDonViVanChuyen
        WHERE dh.idNhanVien = ?
    `;

    connection.query(query, [idNhanVien], (error, results) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi lấy đơn hàng đã xác nhận." });
      }
      if (results.length === 0) {
        return res
          .status(404)
          .json({
            message: "Không tìm thấy đơn hàng đã xác nhận bởi nhân viên này.",
          });
      }
      res.status(200).json(results);
    });
  },
  addUser: (req, res) => {
    const { userName, passWord, SDT, email, diaChi, hoTen, isAdmin } = req.body;

    // Validate input fields
    if (!userName || !passWord || !SDT || !email || !diaChi || !hoTen) {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp đầy đủ thông tin." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Địa chỉ email không hợp lệ" });
    }

    // Validate phone number format
    const phoneRegex = /^\d+$/;
    if (!phoneRegex.test(SDT)) {
      return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
    }

    // Validate and hash password
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(passWord)) {
      return res
        .status(400)
        .json({
          message:
            "Mật khẩu phải chứa ít nhất một chữ cái, một số và có ít nhất 6 ký tự.",
        });
    }

    // Check for userName and email uniqueness
    const checkUniqueQuery =
      "SELECT * FROM tknhanvien WHERE userName = ? OR email = ?";
    connection.query(checkUniqueQuery, [userName, email], (error, results) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi kiểm tra tính duy nhất." });
      }

      if (results.length > 0) {
        return res
          .status(400)
          .json({ message: "Tên đăng nhập hoặc email đã tồn tại." });
      }

      // Hash the password
      bcrypt.genSalt(10, (err, salt) => {
        if (err)
          return res
            .status(500)
            .json({ message: "Lỗi server khi mã hóa mật khẩu." });

        bcrypt.hash(passWord, salt, (err, hashedPassword) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Lỗi server khi mã hóa mật khẩu." });

          // Insert new user into the database
          const insertQuery =
            "INSERT INTO tknhanvien (userName, passWord, SDT, email, diaChi, hoTen, isAdmin) VALUES (?, ?, ?, ?, ?, ?, ?)";
          connection.query(
            insertQuery,
            [userName, hashedPassword, SDT, email, diaChi, hoTen, isAdmin],
            (error, results) => {
              if (error) {
                console.error(error);
                return res
                  .status(500)
                  .json({ message: "Lỗi server khi thêm nhân viên." });
              }

              res.status(201).json({ message: "Thêm nhân viên thành công." });
            }
          );
        });
      });
    });
  },
  deleteUser: (req, res) => {
    const { idNhanVien } = req.params;

    // Check if the user exists
    const checkUserQuery = "SELECT * FROM tknhanvien WHERE idNhanVien = ?";
    connection.query(checkUserQuery, [idNhanVien], (error, results) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi kiểm tra nhân viên." });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy nhân viên." });
      }

      // Delete the user
      const deleteQuery = "DELETE FROM tknhanvien WHERE idNhanVien = ?";
      connection.query(deleteQuery, [idNhanVien], (error, results) => {
        if (error) {
          console.error(error);
          return res
            .status(500)
            .json({ message: "Lỗi server khi xóa nhân viên." });
        }

        res.status(200).json({ message: "Xóa nhân viên thành công." });
      });
    });
  },
  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const idNhanVien = req.user.idNhanVien; // Assume req.user is populated by your authentication middleware

    // Validate input fields
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({
          message: "Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.",
        });
    }

    // Validate new password format
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res
        .status(400)
        .json({
          message:
            "Mật khẩu phải chứa ít nhất một chữ cái, một số và có ít nhất 6 ký tự.",
        });
    }

    // Check if the current password is correct
    const checkQuery = "SELECT passWord FROM tknhanvien WHERE idNhanVien = ?";
    connection.query(checkQuery, [idNhanVien], (error, results) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Lỗi server khi kiểm tra mật khẩu hiện tại." });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy nhân viên." });
      }

      const storedPassword = results[0].passWord;

      // Compare current password with the stored hashed password
      bcrypt.compare(currentPassword, storedPassword, (err, isMatch) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ message: "Lỗi server khi so sánh mật khẩu." });
        }

        if (!isMatch) {
          return res
            .status(401)
            .json({ message: "Mật khẩu hiện tại không chính xác." });
        }

        // Check if the new password is the same as the current password
        bcrypt.compare(newPassword, storedPassword, (err, isSame) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ message: "Lỗi server khi so sánh mật khẩu." });
          }

          if (isSame) {
            return res
              .status(400)
              .json({
                message: "Mật khẩu mới không được giống mật khẩu hiện tại.",
              });
          }

          // Hash the new password
          bcrypt.genSalt(10, (err, salt) => {
            if (err)
              return res
                .status(500)
                .json({ message: "Lỗi server khi mã hóa mật khẩu mới." });

            bcrypt.hash(newPassword, salt, (err, hashedPassword) => {
              if (err)
                return res
                  .status(500)
                  .json({ message: "Lỗi server khi mã hóa mật khẩu mới." });

              // Update the password in the database
              const updateQuery =
                "UPDATE tknhanvien SET passWord = ? WHERE idNhanVien = ?";
              connection.query(
                updateQuery,
                [hashedPassword, idNhanVien],
                (error, result) => {
                  if (error) {
                    console.error(error);
                    return res
                      .status(500)
                      .json({ message: "Lỗi server khi cập nhật mật khẩu." });
                  }

                  if (result.affectedRows === 0) {
                    return res
                      .status(404)
                      .json({
                        message:
                          "Không tìm thấy nhân viên để cập nhật mật khẩu.",
                      });
                  }

                  res.status(200).json({ message: "Đổi mật khẩu thành công." });
                }
              );
            });
          });
        });
      });
    });
  },
};

module.exports = usersController;
