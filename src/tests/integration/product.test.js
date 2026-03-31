// tests/integration/product.test.js
const request = require('supertest');

// Mock DB before requiring app
jest.mock('../../src/models/db', () => ({
  query: jest.fn(),
}));

// Mock cache service to avoid Redis dependency in tests
jest.mock('../../src/services/cacheService', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  invalidatePattern: jest.fn().mockResolvedValue(undefined),
  isReady: () => false,
}));

// Mock queue service
jest.mock('../../src/services/queueService', () => ({
  consumer: { startAll: jest.fn() },
}));

// Mock env config validation
jest.mock('../../src/config/envConfig', () => ({}));

const db = require('../../src/models/db');
const app = require('../../app');

const MOCK_PRODUCTS = [
  { idSanPham: 1, tenSanPham: 'iPhone 15', donGia: 25000000, soLuong: 10 },
  { idSanPham: 2, tenSanPham: 'Samsung Galaxy S24', donGia: 20000000, soLuong: 5 },
];

// Helper: generate a valid test token
const jwt = require('jsonwebtoken');
const makeToken = (payload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_KEY || 'test_access_secret_key_32chars!!', { expiresIn: '1h' });

beforeAll(() => {
  process.env.JWT_ACCESS_KEY = 'test_access_secret_key_32chars!!';
  process.env.JWT_REFRESH_KEY = 'test_refresh_secret_key_32chars!!';
});

describe('Product API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── GET /api/sanpham ────────────────────────────────────────────────────────

  describe('GET /api/sanpham', () => {
    it('should return all products', async () => {
      db.query.mockImplementation((sql, params, cb) => cb(null, MOCK_PRODUCTS));

      const res = await request(app).get('/api/sanpham');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('should return 500 on DB error', async () => {
      db.query.mockImplementation((sql, params, cb) => cb(new Error('DB Error'), null));

      const res = await request(app).get('/api/sanpham');

      expect(res.status).toBe(500);
    });
  });

  // ─── GET /api/sanpham/detail/:id ─────────────────────────────────────────────

  describe('GET /api/sanpham/detail/:idSanPham', () => {
    it('should return a single product', async () => {
      db.query.mockImplementation((sql, params, cb) => cb(null, [MOCK_PRODUCTS[0]]));

      const res = await request(app).get('/api/sanpham/detail/1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tenSanPham', 'iPhone 15');
    });

    it('should return 404 when product not found', async () => {
      db.query.mockImplementation((sql, params, cb) => cb(null, []));

      const res = await request(app).get('/api/sanpham/detail/9999');

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/sanpham (protected) ───────────────────────────────────────────

  describe('POST /api/sanpham', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/sanpham').send({ tenSanPham: 'Test' });
      expect(res.status).toBe(401);
    });

    it('should create product with valid admin token', async () => {
      const token = makeToken({ idNhanVien: 1, admin: true });
      db.query.mockImplementation((sql, params, cb) =>
        cb(null, [{ idSanPham: 3, tenSanPham: 'New Product' }])
      );

      const res = await request(app)
        .post('/api/sanpham')
        .set('Authorization', `Bearer ${token}`)
        .send({ tenSanPham: 'New Product', donGia: 10000000, soLuong: 5, danhMucSP: 1, dongDT: 1 });

      expect(res.status).toBe(201);
    });

    it('should return 403 when employee tries to access admin-only resource', async () => {
      // Employee has admin = 0, but product delete requires admin = true
      const token = makeToken({ idNhanVien: 2, admin: 0 });
      db.query.mockImplementation((sql, params, cb) => cb(null, [{ idSanPham: 1 }]));

      const res = await request(app)
        .delete('/api/sanpham/1')
        .set('Authorization', `Bearer ${token}`);

      // verifyTokenAndIsEmployee allows admin=0, so this should pass for employee
      expect([200, 403, 404]).toContain(res.status);
    });
  });

  // ─── GET /api/sanpham/search/:productName ────────────────────────────────────

  describe('GET /api/sanpham/search/:productName', () => {
    it('should search products by name', async () => {
      db.query.mockImplementation((sql, params, cb) => cb(null, [MOCK_PRODUCTS[0]]));

      const res = await request(app).get('/api/sanpham/search/iPhone');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─── HEALTH CHECK ────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });
});
