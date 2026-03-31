const productService = require('../services/productService');

/**
 * ProductController — chỉ nhận request, gọi service, trả response.
 * Không chứa business logic.
 */
const productController = {
  getAllProducts: async (req, res, next) => {
    try {
      const products = await productService.getAllProducts();
      res.json(products);
    } catch (err) { next(err); }
  },

  getProductById: async (req, res, next) => {
    try {
      const product = await productService.getProductById(req.params.idSanPham);
      res.json(product);
    } catch (err) { next(err); }
  },

  getProductsByIDDanhMucSP: async (req, res, next) => {
    try {
      const products = await productService.getProductsByDanhMuc(req.params.idDanhMuc);
      res.json(products);
    } catch (err) { next(err); }
  },

  getProductsByIDDongDT: async (req, res, next) => {
    try {
      const products = await productService.getProductsByDongDT(req.params.idDongDT);
      res.json(products);
    } catch (err) { next(err); }
  },

  getProductsByIDLoaiDT: async (req, res, next) => {
    try {
      const products = await productService.getProductsByLoaiDT(req.params.idLoaiDT);
      res.json(products);
    } catch (err) { next(err); }
  },

  searchProductByName: async (req, res, next) => {
    try {
      const products = await productService.searchProducts(req.params.productName);
      res.json(products);
    } catch (err) { next(err); }
  },

  getFilteredProducts: async (req, res, next) => {
    try {
      const filters = {
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        idDanhMuc: req.query.idDanhMuc ? Number(req.query.idDanhMuc) : undefined,
        idDongDT: req.query.idDongDT ? Number(req.query.idDongDT) : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };
      const products = await productService.getFilteredProducts(filters);
      res.json(products);
    } catch (err) { next(err); }
  },

  getPhoneModelsByPhoneType: async (req, res, next) => {
    try {
      const models = await productService.getPhoneModelsByPhoneType(req.params.idSanPham);
      res.json(models);
    } catch (err) { next(err); }
  },

  addProduct: async (req, res, next) => {
    try {
      const product = await productService.addProduct(req.body);
      res.status(201).json({ message: 'Thêm sản phẩm thành công', product });
    } catch (err) { next(err); }
  },

  updateProduct: async (req, res, next) => {
    try {
      const updated = await productService.updateProduct(req.params.idSanPham, req.body);
      res.json({ message: 'Cập nhật sản phẩm thành công', product: updated });
    } catch (err) { next(err); }
  },

  deleteProduct: async (req, res, next) => {
    try {
      const result = await productService.deleteProduct(req.params.idSanPham);
      res.json(result);
    } catch (err) { next(err); }
  },
};

module.exports = productController;
