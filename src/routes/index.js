const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductsByIDDanhMucSP,
  getProductById,
  searchProductByName,
  addProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { getAlldanhMucSP } = require("../controllers/danhMucSPController");
const { getAlldongDT } = require("../controllers/dongDTController");

//sanpham
router.get("/sanpham", getAllProducts);
router.get("/sanpham/danhmuc/:idDanhMuc", getProductsByIDDanhMucSP);
router.get("/sanpham/detail/:idSanPham", getProductById);

router.get('/sanpham/search/:productName', searchProductByName);
router.post("/sanpham", addProduct);
router.put("/sanpham/:idSanPham", updateProduct);
router.delete("/sanpham/:idSanPham", deleteProduct);
//danhmucsp
router.get("/danhmucsp", getAlldanhMucSP);

//dongdt
router.get("/dongdt", getAlldongDT);

module.exports = router;
