const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductsByIDDanhMucSP,
  getProductById,
  getPhoneModelsByPhoneType,
  searchProductByName,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductsByIDLoaiDT,
  getProductsByIDDongDT,
  getFilteredProducts,
} = require("../controllers/productController");
const { getAlldanhMucSP } = require("../controllers/danhMucSPController");
const { getAlldongDT } = require("../controllers/dongDTController");
const { getAllloaiDT } = require("../controllers/loaiDienThoaiController");
const {
  addToCart,
  getCart,
  createOrder,
  clearCart,
} = require("../controllers/cartController");

//sanpham
router.get("/sanpham", getAllProducts);
router.get("/sanpham/danhmuc/:idDanhMuc", getProductsByIDDanhMucSP);
router.get("/sanpham/detail/:idSanPham", getProductById);
router.get("/sanpham/search/:productName", searchProductByName);
router.get("/sanpham/getdongdtbyidsp/:idSanPham", getPhoneModelsByPhoneType);
router.get("/sanpham/dongdt/:idDongDT", getProductsByIDDongDT);
router.get("/sanpham/loaiDT/:idLoaiDT", getProductsByIDLoaiDT);
router.get("/sanpham/filter", getFilteredProducts);

router.post("/sanpham", addProduct);
router.put("/sanpham/:idSanPham", updateProduct);
router.delete("/sanpham/:idSanPham", deleteProduct);
//danhmucsp
router.get("/danhmucsp", getAlldanhMucSP);

//dongdt
router.get("/dongdt", getAlldongDT);

//loaidt
router.get("/loaiDT", getAllloaiDT);
module.exports = router;

//giohang
router.post("/cart/add", addToCart);
router.post("/cart/createorder", createOrder);
router.get("/cart", getCart);
router.get("/cart/clear", clearCart);
