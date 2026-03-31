const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Normalize admin field từ DB:
 * DB lưu integer (1 = admin, 0 = nhân viên) nhưng JWT có thể encode thành number hoặc boolean
 * - isAdmin:    admin === true  || admin === 1  || admin === '1'
 * - isEmployee: admin === false || admin === 0  || admin === '0' || admin == null (staff không phải admin)
 * - hasStaffAccess: isAdmin OR isEmployee (tức là idNhanVien tồn tại)
 */
const normalizeAdmin = (admin) => {
  if (admin === true  || admin === 1  || admin === '1')  return 'admin';
  if (admin === false || admin === 0  || admin === '0')  return 'employee';
  if (admin === null  || admin === undefined)             return null;
  return null;
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['token'];

  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Chưa được xác thực. Vui lòng đăng nhập.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  jwt.verify(token, process.env.JWT_ACCESS_KEY, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ success: false, message: 'Token đã hết hạn. Vui lòng làm mới token.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(403).json({ success: false, message: 'Token không hợp lệ.', code: 'TOKEN_INVALID' });
    }
    req.user = decoded;
    next();
  });
};

/**
 * RBAC: Chỉ admin (admin = 1 hoặc true)
 */
const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    const role = normalizeAdmin(req.user?.admin);
    if (role === 'admin') return next();
    logger.warn(`[RBAC] Access denied for user ${req.user?.idNhanVien} on ${req.method} ${req.originalUrl} (admin=${req.user?.admin})`);
    return res.status(403).json({ success: false, message: 'Chỉ quản trị viên mới có quyền thực hiện chức năng này.' });
  });
};

/**
 * RBAC: Admin hoặc nhân viên (có idNhanVien trong token)
 */
const requireEmployee = (req, res, next) => {
  verifyToken(req, res, () => {
    const role = normalizeAdmin(req.user?.admin);
    // Bất kỳ staff nào (admin hoặc employee) đều có idNhanVien
    if ((role === 'admin' || role === 'employee') && req.user?.idNhanVien) {
      return next();
    }
    logger.warn(`[RBAC] Access denied for user ${req.user?.idNhanVien} on ${req.method} ${req.originalUrl} (admin=${req.user?.admin})`);
    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập.' });
  });
};

/**
 * RBAC: Chỉ customer đã xác thực (có idUser trong token)
 */
const requireCustomer = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.idUser) return next();
    return res.status(403).json({ success: false, message: 'Yêu cầu đăng nhập tài khoản khách hàng.' });
  });
};

/**
 * RBAC: Owner hoặc admin
 */
const requireSelfOrAdmin = (userIdExtractor) => (req, res, next) => {
  verifyToken(req, res, () => {
    const role = normalizeAdmin(req.user?.admin);
    const resourceUserId = userIdExtractor(req);
    const isSelf = String(req.user?.idNhanVien) === String(resourceUserId)
                || String(req.user?.idUser)     === String(resourceUserId);
    if (role === 'admin' || isSelf) return next();
    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập tài nguyên này.' });
  });
};

// Backward compatible exports
const middlewareController = {
  verifyToken,
  verifyTokenAndIsAdmin:    requireAdmin,
  verifyTokenAndIsEmployee: requireEmployee,
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireEmployee,
  requireCustomer,
  requireSelfOrAdmin,
  middlewareController,
};
