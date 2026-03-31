const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const danhMucSPController = require('../controllers/danhMucSPController');
const dongDTController = require('../controllers/dongDTController');
const loaiDienThoaiController = require('../controllers/loaiDienThoaiController');
const cartController = require('../controllers/cartController');
const customersController = require('../controllers/customersController');
const usersController = require('../controllers/usersController');
const shipController = require('../controllers/ShipController');
const orderController = require('../controllers/orderController');
const customersAccController = require('../controllers/customersAccController');
const adminController = require('../controllers/adminController');
const forgotPasswordController = require('../controllers/forgotPasswordController');
const zalopayController = require('../controllers/ZALOPAY/zalopay');
const statisticsController = require('../controllers/statisticsController');

const { verifyToken, requireAdmin, requireEmployee } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../validators');

// ─── PUBLIC ROUTES ─────────────────────────────────────────────────────────────

// Products (public)
router.get('/sanpham', productController.getAllProducts);
router.get('/sanpham/danhmuc/:idDanhMuc', productController.getProductsByIDDanhMucSP);
router.get('/sanpham/detail/:idSanPham', productController.getProductById);
router.get('/sanpham/search/:productName', productController.searchProductByName);
router.get('/sanpham/getdongdtbyidsp/:idSanPham', productController.getPhoneModelsByPhoneType);
router.get('/sanpham/dongdt/:idDongDT', productController.getProductsByIDDongDT);
router.get('/sanpham/loaiDT/:idLoaiDT', productController.getProductsByIDLoaiDT);
router.get('/sanpham/filter', productController.getFilteredProducts);

// Categories (public)
router.get('/danhmucsp', danhMucSPController.getAlldanhMucSP);
router.get('/dongdt', dongDTController.getAlldongDT);
router.get('/loaidt', loaiDienThoaiController.getAllloaiDT);

// Auth — Staff
router.post('/register', validate(schemas.loginSchema), usersController.register);
router.post('/login', validate(schemas.loginSchema), usersController.login);
router.post('/refreshtoken', usersController.requestRefreshToken);

// Auth — Customer
router.post('/cusregister', validate(schemas.registerSchema), customersController.cusregister);
router.post('/cuslogin', validate(schemas.loginSchema), customersController.cuslogin);
router.post('/refreshtokencus', customersController.requestRefreshToken);

// Forgot password
router.post('/forgot-password', forgotPasswordController.requestPasswordReset);
router.post('/reset-password', forgotPasswordController.resetPassword);

// ─── AUTHENTICATED CUSTOMER ROUTES ─────────────────────────────────────────────

router.post('/cuslogout', verifyToken, customersController.cuslogout);
router.get('/getcusbyid', verifyToken, customersController.getCustomerById);
router.put('/updateuser', verifyToken, customersController.updateCustomer);
router.post('/changepassword', verifyToken, customersController.changePassword);

// Cart
router.post('/cart', verifyToken, validate(schemas.cartItemSchema), cartController.createOrUpdateCart);
router.get('/cart/detail', verifyToken, cartController.getDetailCart);
router.get('/cart/orders', verifyToken, cartController.getCart);
router.get('/cart/orders/:idDonHang', verifyToken, cartController.getDetailCartOfUser);
router.put('/cart/updatecartitem', verifyToken, cartController.updateCartItem);
router.delete('/cart/deletecartitem', verifyToken, cartController.deleteCartItem);
router.delete('/cart/clear', verifyToken, cartController.clearCart);
router.post('/paycod', verifyToken, cartController.payCOD);
router.post('/cancelorder', verifyToken, cartController.cancelOrder);

// ZaloPay
router.post('/createpayment', verifyToken, zalopayController.createPayment);
router.post('/callback', zalopayController.callback);
router.post('/check-order-status/:app_trans_id', zalopayController.checkOrderStatus);
router.post('/refund', verifyToken, zalopayController.RefundOrder);
router.post('/cancelorderonl', verifyToken, zalopayController.checkOrderStatusAndCancelOrder);
router.post('/processRefundAndCheckStatus', verifyToken, zalopayController.processRefundAndCheckStatus);
router.post('/checko', verifyToken, zalopayController.checkOrder);

// ─── AUTHENTICATED STAFF ROUTES ────────────────────────────────────────────────

router.post('/logout', requireEmployee, usersController.logout);
router.get('/getuserbyid', requireEmployee, usersController.getUserById);
router.put('/user/changepassword', requireEmployee, usersController.changePassword);

// Product management
router.get('/sanphamql', requireEmployee, productController.getAllProducts);
router.post('/sanpham', requireEmployee, validate(schemas.productSchema), productController.addProduct);
router.put('/sanpham/:idSanPham', requireEmployee, validate(schemas.productSchema), productController.updateProduct);
router.delete('/sanpham/:idSanPham', requireEmployee, productController.deleteProduct);

// Category management
router.get('/danhmucspql', requireEmployee, danhMucSPController.getAlldanhMucSP);
router.post('/danhmucspql/add', requireEmployee, danhMucSPController.addDanhMucSP);
router.put('/danhmucspql/put/:idDanhMuc', requireEmployee, danhMucSPController.updateDanhMucSP);
router.delete('/danhmucspql/del/:idDanhMuc', requireEmployee, danhMucSPController.deleteDanhMucSP);

router.get('/dongdtql', requireEmployee, dongDTController.getAlldongDT);
router.post('/dongdtql/add', requireEmployee, dongDTController.addDongDT);
router.put('/dongdtql/put/:idDongDT', requireEmployee, dongDTController.updateDongDT);
router.delete('/dongdtql/del/:idDongDT', requireEmployee, dongDTController.deleteDongDT);

router.get('/loaidtql', requireEmployee, loaiDienThoaiController.getAllloaiDT);
router.post('/loaidtql/add', requireEmployee, loaiDienThoaiController.addLoaiDT);
router.put('/loaidtql/put/:idLoaiDT', requireEmployee, loaiDienThoaiController.updateLoaiDT);
router.delete('/loaidtql/del/:idLoaiDT', requireEmployee, loaiDienThoaiController.deleteLoaiDT);

// Shipping
router.get('/ship', requireEmployee, shipController.getAllDVVC);
router.post('/ship/add', requireEmployee, shipController.addDVVC);
router.put('/ship/put/:idDonViVanChuyen', requireEmployee, shipController.updateDVVC);
router.delete('/ship/del/:idDonViVanChuyen', requireEmployee, shipController.deleteDVVC);

// Order management
router.get('/getallcart', requireEmployee, orderController.getAllCart);
router.get('/getallcartwaiting', requireEmployee, orderController.getAllCartWaiting);
router.get('/getallcartdelivery', requireEmployee, orderController.getAllCartDelivery);
router.get('/getallcartdone', requireEmployee, orderController.getAllCartDone);
router.post('/confirmorder', requireEmployee, orderController.confirmOrder);
router.post('/confirmdone', requireEmployee, orderController.confirmDelivery);
router.post('/deliveryfailcod', requireEmployee, orderController.deliveryfailCOD);

// Customer account management
router.get('/getallcustomers', requireEmployee, customersAccController.getAllCustomers);
router.post('/customer/add', requireEmployee, customersAccController.register);
router.put('/customer/put/:idUser', requireEmployee, customersAccController.updateProfile);
router.delete('/customer/del/:idUser', requireAdmin, usersController.deleteCustomer);
router.put('/customer/changepassword', requireEmployee, customersAccController.changePassword);

// Statistics
router.post('/getmostsoldproducts', requireEmployee, statisticsController.getMostSoldProducts);
router.post('/gettopcustomers', requireEmployee, statisticsController.getTopCustomers);
router.post('/getrevenuebyyear', requireEmployee, statisticsController.getRevenueByYear);

// ─── ADMIN-ONLY ROUTES ─────────────────────────────────────────────────────────

router.get('/getallusers', requireAdmin, adminController.getAllUsers);
router.get('/getallcustomersadmin', requireAdmin, adminController.getAllCustomers);
router.post('/user/add', requireAdmin, adminController.addUser);
router.put('/users/:idNhanVien', requireAdmin, adminController.updateUser);
router.delete('/users/:idNhanVien', requireAdmin, adminController.deleteUser);
router.delete('/deleteuser', requireAdmin, usersController.deleteUser);


// ─── BACKWARD COMPAT ALIASES ──────────────────────────────────────────────────
// Admin order detail (legacy FE uses /api/detailcart/:idDonHang)
router.get('/detailcart/:idDonHang', requireEmployee, async (req, res, next) => {
  try {
    const BaseRepository = require('../repositories/baseRepository');
    const repo = new BaseRepository('donhang');
    const items = await repo.query(
      `SELECT dc."idChiTietDH",dc."idDonHang",dc."idSanPham",dc."soLuong",dc."tongTien",
              p."tenSanPham",p."donGia",p."hinhSP",c."tongTienDH"
       FROM chitietdonhang dc
       JOIN sanpham p ON dc."idSanPham"=p."idSanPham"
       JOIN donhang c ON dc."idDonHang"=c."idDonHang"
       WHERE c."idDonHang"=$1`,
      [req.params.idDonHang]
    );
    res.json(items);
  } catch(err) { next(err); }
});

// Legacy: /api/changePassword (PascalCase alias)
router.post('/changePassword', verifyToken, (req, res, next) => {
  req.url = '/changepassword';
  next('router');
});

// Legacy: /api/user/put
router.put('/user/put', requireEmployee, async (req, res, next) => {
  try {
    const { userRepository } = require('../repositories/userRepository');
    const { idNhanVien, ...data } = req.body;
    const id = idNhanVien || req.user.idNhanVien;
    await userRepository.update('idNhanVien', id, data);
    res.json({ message: 'Cập nhật thông tin nhân viên thành công.' });
  } catch(err) { next(err); }
});

module.exports = router;
