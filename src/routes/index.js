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
} = require("../controllers/productController");
const { getAlldanhMucSP } = require("../controllers/danhMucSPController");
const { getAlldongDT } = require("../controllers/dongDTController");
const { getAllloaiDT } = require("../controllers/loaiDienThoaiController");

//sanpham
router.get("/sanpham", getAllProducts);
router.get("/sanpham/danhmuc/:idDanhMuc", getProductsByIDDanhMucSP);
router.get("/sanpham/detail/:idSanPham", getProductById);
router.get('/sanpham/search/:productName', searchProductByName);
router.get('/sanpham/getdongdtbyidsp/:idSanPham', getPhoneModelsByPhoneType);
router.post("/sanpham", addProduct);
router.put("/sanpham/:idSanPham", updateProduct);
router.delete("/sanpham/:idSanPham", deleteProduct);
//danhmucsp
router.get("/danhmucsp", getAlldanhMucSP);

//dongdt
router.get("/dongdt", getAlldongDT);

//
router.get("/loaiDT", getAllloaiDT);
module.exports = router;
