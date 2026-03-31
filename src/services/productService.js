const productRepository = require('../repositories/productRepository');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

const CACHE_TTL = 300; // 5 minutes

class ProductService {
  async getAllProducts() {
    const cacheKey = 'products:all';
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.info('[Cache] HIT: products:all');
      return cached;
    }

    const products = await productRepository.findAll();
    await cacheService.set(cacheKey, products, CACHE_TTL);
    return products;
  }

  async getProductById(idSanPham) {
    const cacheKey = `products:${idSanPham}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const product = await productRepository.findById('idSanPham', idSanPham);
    if (!product) {
      const err = new Error('Sản phẩm không tồn tại');
      err.status = 404;
      throw err;
    }
    await cacheService.set(cacheKey, product, CACHE_TTL);
    return product;
  }

  async getProductsByDanhMuc(idDanhMuc) {
    return productRepository.findByDanhMuc(idDanhMuc);
  }

  async getProductsByDongDT(idDongDT) {
    return productRepository.findByDongDT(idDongDT);
  }

  async getProductsByLoaiDT(idLoaiDT) {
    return productRepository.findByLoaiDT(idLoaiDT);
  }

  async searchProducts(name) {
    return productRepository.searchByName(name);
  }

  async getFilteredProducts(filters) {
    return productRepository.findAllWithFilter(filters);
  }

  async getPhoneModelsByPhoneType(idSanPham) {
    return productRepository.getPhoneModelsByPhoneType(idSanPham);
  }

  async addProduct(data) {
    const product = await productRepository.insert(data);
    await cacheService.invalidatePattern('products:*');
    return product;
  }

  async updateProduct(idSanPham, data) {
    const existing = await productRepository.findById('idSanPham', idSanPham);
    if (!existing) {
      const err = new Error('Sản phẩm không tồn tại');
      err.status = 404;
      throw err;
    }
    const updated = await productRepository.update('idSanPham', idSanPham, data);
    await cacheService.del(`products:${idSanPham}`);
    await cacheService.invalidatePattern('products:all');
    return updated;
  }

  async deleteProduct(idSanPham) {
    const existing = await productRepository.findById('idSanPham', idSanPham);
    if (!existing) {
      const err = new Error('Sản phẩm không tồn tại');
      err.status = 404;
      throw err;
    }
    await productRepository.delete('idSanPham', idSanPham);
    await cacheService.del(`products:${idSanPham}`);
    await cacheService.invalidatePattern('products:all');
    return { message: 'Xóa sản phẩm thành công' };
  }
}

module.exports = new ProductService();
