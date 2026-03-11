const jwt = require("jsonwebtoken");

const middlewareController = {
  verifyToken: (req, res, next) => {
    const token = req.headers.token;

    if (token) {
      const accessToken = token.split(" ")[1];
      jwt.verify(accessToken, process.env.JWT_ACCESS_KEY, (err, user) => {
        if (err) {
          return res.status(403).json({ message: "Token hết hạn hoặc không hợp lệ." });
        }
        req.user = user;// Lưu thông tin người dùng từ token vào req.user để sử dụng trong các route sau
        next(); // Cho phép tiếp tục vào route kế tiếp
      });
    } else {
      return res.status(401).json({ message: "Chưa được xác thực." });
    }
  },
  verifyTokenAndIsAdmin: (req, res, next) => {
    middlewareController.verifyToken(req, res, () => {
      if (req.user && req.user.admin) {
        next(); // Nếu là admin, cho phép tiếp tục vào route kế tiếp
      } else {
        return res.status(400).json({ message: "Vai trò của bạn không thể thực hiện chức năng này" });
      }
    });
  },
  verifyTokenAndIsEmployee: (req, res, next) => {
    middlewareController.verifyToken(req, res, () => {
      if (req.user && req.user.admin) {
        next(); // Nếu là admin, cho phép tiếp tục vào route kế tiếp
      } else if (req.user && req.user.admin === 0) {
        next(); // Nếu là nhân viên, cho phép tiếp tục vào route kế tiếp
      } else {
        return res.status(403).json({ message: "Bạn không có quyền truy cập." });
      }
    });
  }
};

module.exports = middlewareController;
