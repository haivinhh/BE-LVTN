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

//sanpham
router.get("/sanpham", productController.getAllProducts);
router.get("/sanpham/danhmuc/:idDanhMuc", productController.getProductsByIDDanhMucSP);
router.get("/sanpham/detail/:idSanPham", productController.getProductById);
router.get("/sanpham/search/:productName", productController.searchProductByName);
router.get("/sanpham/getdongdtbyidsp/:idSanPham", productController.getPhoneModelsByPhoneType);
router.get("/sanpham/dongdt/:idDongDT", productController.getProductsByIDDongDT);
router.get("/sanpham/loaiDT/:idLoaiDT", productController.getProductsByIDLoaiDT);
router.get("/sanpham/filter", productController.getFilteredProducts);

router.post("/sanpham", productController.addProduct);
router.put("/sanpham/:idSanPham", productController.updateProduct);
router.delete("/sanpham/:idSanPham", productController.deleteProduct);
//danhmucsp
router.get("/danhmucsp", danhMucSPController.getAlldanhMucSP);

//dongdt
router.get("/dongdt", dongDTController.getAlldongDT);

//loaidt
router.get("/loaiDT", loaiDienThoaiController.getAllloaiDT);


//giohang
router.post("/cart/add", midddlewareController.verifyToken,cartController.addToCart);
router.post("/cart/createorder", midddlewareController.verifyToken,cartController.createOrder);
router.get("/cart", midddlewareController.verifyToken,cartController.getCart);
router.delete("/cart/clear", cartController.clearCart);
router.put("/cart/updatecartitem", midddlewareController.verifyToken,cartController.updateCartItem);
router.delete("/cart/deletecartitem", midddlewareController.verifyToken,cartController.deleteCartItem);


//taikhoankh
router.post("/cusregister", customersController.cusregister);
router.post("/cuslogin", customersController.cuslogin);
router.post("/cuslogout", midddlewareController.verifyToken,customersController.cuslogout);
router.post("/refreshtokencus", customersController.requestRefreshToken);


//taikhoannv
router.post("/register", usersController.register);
router.post("/login", usersController.login);
router.post("/logout", midddlewareController.verifyToken,usersController.logout);
router.post("/refreshtoken", usersController.requestRefreshToken);
router.get("/getallcustomers", midddlewareController.verifyToken,usersController.getAllCustomers);
router.get("/getallusers", midddlewareController.verifyToken,usersController.getAllUsers);
router.delete("/deletecustomer", usersController.deleteUser);
router.delete("/deleteuser", midddlewareController.verifyTokenAndIsAdmin,usersController.deleteUser);



module.exports = router;