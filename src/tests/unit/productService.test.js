// tests/unit/productService.test.js
jest.mock('../../src/repositories/productRepository');
jest.mock('../../src/services/cacheService');

const productService = require('../../src/services/productService');
const productRepository = require('../../src/repositories/productRepository');
const cacheService = require('../../src/services/cacheService');

describe('ProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.get = jest.fn().mockResolvedValue(null);
    cacheService.set = jest.fn().mockResolvedValue(undefined);
    cacheService.del = jest.fn().mockResolvedValue(undefined);
    cacheService.invalidatePattern = jest.fn().mockResolvedValue(undefined);
  });

  // ─── getAllProducts ──────────────────────────────────────────────────────────

  describe('getAllProducts', () => {
    it('should return products from DB and cache them', async () => {
      const mockProducts = [{ idSanPham: 1, tenSanPham: 'iPhone 15' }];
      productRepository.findAll = jest.fn().mockResolvedValue(mockProducts);

      const result = await productService.getAllProducts();

      expect(productRepository.findAll).toHaveBeenCalledTimes(1);
      expect(cacheService.set).toHaveBeenCalledWith('products:all', mockProducts, 300);
      expect(result).toEqual(mockProducts);
    });

    it('should return from cache when available', async () => {
      const cached = [{ idSanPham: 1, tenSanPham: 'iPhone 15 (cached)' }];
      cacheService.get = jest.fn().mockResolvedValue(cached);

      const result = await productService.getAllProducts();

      expect(productRepository.findAll).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });
  });

  // ─── getProductById ──────────────────────────────────────────────────────────

  describe('getProductById', () => {
    it('should return product by id', async () => {
      const mockProduct = { idSanPham: 1, tenSanPham: 'iPhone 15' };
      productRepository.findById = jest.fn().mockResolvedValue(mockProduct);

      const result = await productService.getProductById(1);

      expect(productRepository.findById).toHaveBeenCalledWith('idSanPham', 1);
      expect(result).toEqual(mockProduct);
    });

    it('should throw 404 when product not found', async () => {
      productRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(productService.getProductById(999)).rejects.toMatchObject({
        message: 'Sản phẩm không tồn tại',
        status: 404,
      });
    });
  });

  // ─── addProduct ──────────────────────────────────────────────────────────────

  describe('addProduct', () => {
    it('should insert product and invalidate cache', async () => {
      const data = { tenSanPham: 'Galaxy S24', donGia: 20000000 };
      const inserted = { idSanPham: 5, ...data };
      productRepository.insert = jest.fn().mockResolvedValue(inserted);

      const result = await productService.addProduct(data);

      expect(productRepository.insert).toHaveBeenCalledWith(data);
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('products:*');
      expect(result).toEqual(inserted);
    });
  });

  // ─── updateProduct ───────────────────────────────────────────────────────────

  describe('updateProduct', () => {
    it('should update product and clear cache', async () => {
      const existing = { idSanPham: 1, tenSanPham: 'Old Name' };
      const updated = { idSanPham: 1, tenSanPham: 'New Name' };
      productRepository.findById = jest.fn().mockResolvedValue(existing);
      productRepository.update = jest.fn().mockResolvedValue(updated);

      const result = await productService.updateProduct(1, { tenSanPham: 'New Name' });

      expect(cacheService.del).toHaveBeenCalledWith('products:1');
      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('products:all');
      expect(result).toEqual(updated);
    });

    it('should throw 404 when product not found', async () => {
      productRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(productService.updateProduct(999, {})).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ─── deleteProduct ───────────────────────────────────────────────────────────

  describe('deleteProduct', () => {
    it('should delete product and clear cache', async () => {
      productRepository.findById = jest.fn().mockResolvedValue({ idSanPham: 1 });
      productRepository.delete = jest.fn().mockResolvedValue({});

      const result = await productService.deleteProduct(1);

      expect(productRepository.delete).toHaveBeenCalledWith('idSanPham', 1);
      expect(cacheService.del).toHaveBeenCalledWith('products:1');
      expect(result).toHaveProperty('message');
    });
  });

  // ─── searchProducts ──────────────────────────────────────────────────────────

  describe('searchProducts', () => {
    it('should call repository searchByName', async () => {
      const mockResults = [{ idSanPham: 1, tenSanPham: 'iPhone 15 Pro' }];
      productRepository.searchByName = jest.fn().mockResolvedValue(mockResults);

      const result = await productService.searchProducts('iPhone');

      expect(productRepository.searchByName).toHaveBeenCalledWith('iPhone');
      expect(result).toEqual(mockResults);
    });
  });
});
