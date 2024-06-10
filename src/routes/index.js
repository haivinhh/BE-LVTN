const express = require('express');
const router = express.Router();
const { getAllProducts,getAlldanhMucSP,getAlldongDT, addProduct, updateProduct, deleteProduct } = require('../controllers/productController');

router.get('/sanpham', getAllProducts);
router.get('/danhmucsp', getAlldanhMucSP);
router.get('/dongdt', getAlldongDT);
router.post('/sanpham', addProduct);
router.put('/sanpham/:idSanPham', updateProduct);
router.delete('/sanpham/:idSanPham', deleteProduct);

module.exports = router;
