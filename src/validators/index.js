const Joi = require('joi');

/**
 * Generic validation middleware factory
 * @param {Joi.Schema} schema - Joi schema
 * @param {'body'|'params'|'query'} source - where to validate
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(422).json({ success: false, message: 'Dữ liệu không hợp lệ', errors: messages });
  }
  req[source] = value; // replace with sanitized value
  next();
};

// ─── AUTH / USER ───────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  userName: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Tên đăng nhập phải có ít nhất 3 ký tự',
    'any.required': 'Tên đăng nhập là bắt buộc',
  }),
  passWord: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
  SDT: Joi.string().pattern(/^[0-9]{9,11}$/).required().messages({
    'string.pattern.base': 'Số điện thoại không hợp lệ (9-11 chữ số)',
    'any.required': 'Số điện thoại là bắt buộc',
  }),
  email: Joi.string().email().required(),
  diaChi: Joi.string().max(255).optional().allow(''),
  hoTen: Joi.string().max(100).required(),
});

const loginSchema = Joi.object({
  userName: Joi.string().required(),
  passWord: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

// ─── PRODUCT ───────────────────────────────────────────────────────────────────

const productSchema = Joi.object({
  tenSanPham: Joi.string().max(200).required(),
  danhMucSP: Joi.number().integer().required(),
  dongDT: Joi.number().integer().required(),
  donGia: Joi.number().min(0).required(),
  soLuong: Joi.number().integer().min(0).required(),
  moTa: Joi.string().optional().allow(''),
  hinhSP: Joi.string().uri().optional().allow(''),
});

const productFilterSchema = Joi.object({
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().optional(),
  idDanhMuc: Joi.number().integer().optional(),
  idDongDT: Joi.number().integer().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// ─── CART / ORDER ──────────────────────────────────────────────────────────────

const cartItemSchema = Joi.object({
  idSanPham: Joi.number().integer().required(),
  soLuong: Joi.number().integer().min(1).required(),
});

const orderSchema = Joi.object({
  tenNguoiNhan: Joi.string().max(100).required(),
  SDT: Joi.string().pattern(/^[0-9]{9,11}$/).required(),
  diaChi: Joi.string().max(255).required(),
  ghiChu: Joi.string().max(500).optional().allow(''),
  phuongThucTT: Joi.string().valid('COD', 'zalopay', 'banking').required(),
});

// ─── CATEGORIES / TYPES ────────────────────────────────────────────────────────

const danhMucSchema = Joi.object({
  tenDanhMuc: Joi.string().max(100).required(),
});

const dongDTSchema = Joi.object({
  tenDongDT: Joi.string().max(100).required(),
  loaiDienThoai: Joi.number().integer().required(),
});

const loaiDTSchema = Joi.object({
  tenLoaiDT: Joi.string().max(100).required(),
});

// ─── PARAMS ────────────────────────────────────────────────────────────────────

const idParamSchema = Joi.object({
  // generic id param – route handlers use their own param names
}).unknown(true).custom((obj, helpers) => {
  const ids = Object.values(obj);
  for (const id of ids) {
    if (isNaN(id) || parseInt(id) <= 0) {
      return helpers.error('any.invalid');
    }
  }
  return obj;
}).messages({ 'any.invalid': 'ID phải là số nguyên dương' });

module.exports = {
  validate,
  schemas: {
    registerSchema,
    loginSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    productSchema,
    productFilterSchema,
    cartItemSchema,
    orderSchema,
    danhMucSchema,
    dongDTSchema,
    loaiDTSchema,
    idParamSchema,
  },
};
