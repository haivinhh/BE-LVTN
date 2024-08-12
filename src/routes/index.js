const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const danhMucSPController = require("../controllers/danhMucSPController");
const dongDTController = require("../controllers/dongDTController");
const loaiDienThoaiController = require("../controllers/loaiDienThoaiController");
const cartController = require("../controllers/cartController");
const customersController = require("../controllers/customersController");
const usersController = require("../controllers/usersController");
const midddlewareController = require("../controllers/middlewareController");
const middlewareController = require("../controllers/middlewareController");
const shipController = require("../controllers/ShipController");
const orderController = require("../controllers/orderController");
const customersAccController = require("../controllers/customersAccController");
const adminController = require("../controllers/adminController");
const forgotPasswordController = require("../controllers/forgotPasswordController");
const zalopayController = require("../controllers/ZALOPAY/zalopay");

//sanpham
router.get("/sanpham", productController.getAllProducts);
router.get("/sanpham/danhmuc/:idDanhMuc", productController.getProductsByIDDanhMucSP);
router.get("/sanpham/detail/:idSanPham", productController.getProductById);
router.get("/sanpham/search/:productName", productController.searchProductByName);
router.get("/sanpham/getdongdtbyidsp/:idSanPham", productController.getPhoneModelsByPhoneType);
router.get("/sanpham/dongdt/:idDongDT", productController.getProductsByIDDongDT);
router.get("/sanpham/loaiDT/:idLoaiDT", productController.getProductsByIDLoaiDT);
router.get("/sanpham/filter", productController.getFilteredProducts);

//qlsp

router.get("/sanphamql",midddlewareController.verifyTokenAndIsEmployee,productController.getAllProducts);
router.post("/sanpham", midddlewareController.verifyTokenAndIsEmployee,productController.addProduct);
router.put("/sanpham/:idSanPham", midddlewareController.verifyTokenAndIsEmployee,productController.updateProduct);
router.delete("/sanpham/:idSanPham", midddlewareController.verifyTokenAndIsEmployee,productController.deleteProduct);

//danhmucsp
router.get("/danhmucsp", danhMucSPController.getAlldanhMucSP);
//qldanhmuc
router.get("/danhmucspql", midddlewareController.verifyTokenAndIsEmployee, danhMucSPController.getAlldanhMucSP);
router.post("/danhmucspql/add", midddlewareController.verifyTokenAndIsEmployee, danhMucSPController.addDanhMucSP);
router.put("/danhmucspql/put/:idDanhMuc", midddlewareController.verifyTokenAndIsEmployee,danhMucSPController.updateDanhMucSP);
router.delete("/danhmucspql/del/:idDanhMuc", midddlewareController.verifyTokenAndIsEmployee,danhMucSPController.deleteDanhMucSP);

//dongdt
router.get("/dongdt", dongDTController.getAlldongDT);
//qldongdt
router.get("/dongdtql", midddlewareController.verifyTokenAndIsEmployee,dongDTController.getAlldongDT);
router.post('/dongdtql/add', midddlewareController.verifyTokenAndIsEmployee,dongDTController.addDongDT);
router.put('/dongdtql/put/:idDongDT', midddlewareController.verifyTokenAndIsEmployee,dongDTController.updateDongDT);
router.delete('/dongdtql/del/:idDongDT', midddlewareController.verifyTokenAndIsEmployee,dongDTController.deleteDongDT);


//loaidt
router.get("/loaidt", loaiDienThoaiController.getAllloaiDT);
//qlloaitdt
router.get("/loaidtql", midddlewareController.verifyTokenAndIsEmployee,loaiDienThoaiController.getAllloaiDT);
router.post("/loaidtql/add", middlewareController.verifyTokenAndIsEmployee,loaiDienThoaiController.addLoaiDT);
router.put("/loaidtql/put/:idLoaiDT",middlewareController.verifyTokenAndIsEmployee,loaiDienThoaiController.updateLoaiDT);
router.delete("/loaidtql/del/:idLoaiDT",middlewareController.verifyTokenAndIsEmployee,loaiDienThoaiController.deleteLoaiDT);

//qldonvivanchuyen
router.get("/dvvc",midddlewareController.verifyTokenAndIsEmployee,shipController.getAllDVVC);
router.post("/dvvc/add", middlewareController.verifyTokenAndIsEmployee,shipController.addDVVC);
router.put("/dvvc/put/:idDonViVanChuyen",middlewareController.verifyTokenAndIsEmployee,shipController.updateDVVC);

//giohang
router.post("/cart/add", midddlewareController.verifyToken,cartController.createOrUpdateCart);
//router.post("/cart/createorder", midddlewareController.verifyToken,cartController.createOrder);
router.get("/detailcart", midddlewareController.verifyToken,cartController.getDetailCart);
router.get("/cart", midddlewareController.verifyToken,cartController.getCart);
router.get("/getdetailcart/:idDonHang", midddlewareController.verifyToken,cartController.getDetailCartOfUser);
router.delete("/cart/clear", cartController.clearCart);
router.post("/cancelorder", midddlewareController.verifyToken, cartController.cancelOrder);
router.put("/cart/updatecartitem", midddlewareController.verifyToken,cartController.updateCartItem);
router.delete("/cart/deletecartitem", midddlewareController.verifyToken,cartController.deleteCartItem);
router.post("/paycod", midddlewareController.verifyToken,cartController.payCOD);


//taikhoankh
router.get("/getcusbyid", midddlewareController.verifyToken,customersController.getCusbyId);
router.post("/cusregister", customersController.cusregister);
router.post("/cuslogin", customersController.cuslogin);
router.post("/cuslogout", midddlewareController.verifyToken,customersController.cuslogout);
router.post("/refreshtokencus", customersController.requestRefreshToken);
router.post("/changepassword", midddlewareController.verifyToken, customersController.changePassword);
router.put("/updateuser", midddlewareController.verifyToken, customersController.updateUser);
router.get('/address', midddlewareController.verifyToken,customersController.getAddressCus);
router.put('/address', midddlewareController.verifyToken,customersController.updateAddressCus);

// Route để yêu cầu đặt lại mật khẩu
router.post('/forgot-password', forgotPasswordController.requestPasswordReset);

// Route để thực hiện đặt lại mật khẩu
router.post('/reset-password', forgotPasswordController.resetPassword);

//qltaikhoankh
router.get('/getallcustomers', midddlewareController.verifyTokenAndIsEmployee, customersAccController.getAllCustomers);
router.get('/getcartbyiduser/:idUser',midddlewareController.verifyTokenAndIsEmployee, customersAccController.getOrdersByCustomerId);
router.post("/customer/add", midddlewareController.verifyTokenAndIsEmployee,customersAccController.addCustomer);
router.put('/customer/put/:idUser', midddlewareController.verifyTokenAndIsEmployee, customersAccController.updateCustomer);
router.delete('/customer/del/:idUser', middlewareController.verifyTokenAndIsAdmin,customersAccController.deleteCustomer);
router.put('/customer/changepassword', midddlewareController.verifyTokenAndIsEmployee,customersAccController.changePassword);

//taikhoannv
router.post("/register", usersController.register);
router.post("/login", usersController.login);
router.post("/logout", midddlewareController.verifyTokenAndIsEmployee,usersController.logout);
router.post("/refreshtoken", usersController.requestRefreshToken);
router.delete("/deletecustomer", usersController.deleteUser);
router.delete("/deleteuser", midddlewareController.verifyTokenAndIsAdmin,usersController.deleteUser);
router.get("/getuserbyid", midddlewareController.verifyTokenAndIsEmployee,usersController.getUserById);
router.get("/confirmorderbyuser", midddlewareController.verifyTokenAndIsEmployee,usersController.getConfirmedOrdersByEmployee)
router.put("/user/put",midddlewareController.verifyTokenAndIsEmployee,usersController.updateUser);
router.put("/user/changepassword",midddlewareController.verifyTokenAndIsEmployee,usersController.changePassword);

//qltk nhan vien
router.get("/getallusers", midddlewareController.verifyTokenAndIsAdmin,adminController.getAllUsers);
router.post("/user/add", midddlewareController.verifyTokenAndIsAdmin,adminController.addUser);
router.put("/users/:idNhanVien", midddlewareController.verifyTokenAndIsAdmin,adminController.updateUser);
router.delete("/users/:idNhanVien", midddlewareController.verifyTokenAndIsAdmin,adminController.deleteUser);
router.post("/users/changePassword/:idNhanVien", midddlewareController.verifyTokenAndIsAdmin,adminController.changePassword);
router.get("/confirmorderbyuser/admin/:idNhanVien", midddlewareController.verifyTokenAndIsAdmin,adminController.getConfirmedOrdersByEmployee)

//qldonhang
router.get("/detailcart/:idDonHang", midddlewareController.verifyTokenAndIsEmployee,orderController.getDetailCart);
router.get("/getallcart", midddlewareController.verifyTokenAndIsEmployee,orderController.getAllCart);
router.get("/getcusbyid/:idUser", midddlewareController.verifyTokenAndIsEmployee,orderController.getCusbyId);
router.get("/getallcartwaiting",midddlewareController.verifyTokenAndIsEmployee,orderController.getAllCartWaiting);
router.post("/confirmorder",midddlewareController.verifyTokenAndIsEmployee,orderController.confirmOrder);
router.get("/getallcartdelivery",midddlewareController.verifyTokenAndIsEmployee,orderController.getAllCartDelivery);
router.post("/confirmdone",midddlewareController.verifyTokenAndIsEmployee,orderController.confirmDelivery);
router.get("/getallcartdone", midddlewareController.verifyTokenAndIsEmployee,orderController.getAllCartDone);
router.post("/deliveryfailcod",midddlewareController.verifyTokenAndIsEmployee,orderController.deliveryfailCOD)



//thanh toán onl và xử lý hoàn tiền 
router.post('/createpayment', midddlewareController.verifyToken,zalopayController.createPayment);
router.post('/callback', zalopayController.callback);
router.post('/check-order-status/:app_trans_id',zalopayController.checkOrderStatus);
router.post('/refund',  midddlewareController.verifyToken,zalopayController.RefundOrder);
router.post('/cancelorderonl', midddlewareController.verifyToken,zalopayController.checkOrderStatusAndCancelOrder);
router.post("/processRefundAndCheckStatus", midddlewareController.verifyToken,zalopayController.processRefundAndCheckStatus);
router.post("/checko", midddlewareController.verifyToken,zalopayController.checkOrder);


module.exports = router;