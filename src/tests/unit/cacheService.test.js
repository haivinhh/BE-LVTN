// tests/unit/cacheService.test.js
jest.mock('ioredis');

const Redis = require('ioredis');

describe('CacheService', () => {
  let mockRedisInstance;

  beforeEach(() => {
    jest.resetModules();
    mockRedisInstance = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      flushdb: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn((event, cb) => {
        if (event === 'connect') cb(); // simulate connect
      }),
    };
    Redis.mockImplementation(() => mockRedisInstance);
  });

  it('should return null on cache miss', async () => {
    mockRedisInstance.get.mockResolvedValue(null);
    const cacheService = require('../../src/services/cacheService');
    const result = await cacheService.get('missing_key');
    expect(result).toBeNull();
  });

  it('should parse JSON on cache hit', async () => {
    const data = { id: 1, name: 'test' };
    mockRedisInstance.get.mockResolvedValue(JSON.stringify(data));
    const cacheService = require('../../src/services/cacheService');
    const result = await cacheService.get('some_key');
    expect(result).toEqual(data);
  });

  it('should call setex with correct params on set', async () => {
    mockRedisInstance.setex.mockResolvedValue('OK');
    const cacheService = require('../../src/services/cacheService');
    await cacheService.set('key1', { foo: 'bar' }, 60);
    expect(mockRedisInstance.setex).toHaveBeenCalledWith('key1', 60, JSON.stringify({ foo: 'bar' }));
  });

  it('should call del on cache delete', async () => {
    mockRedisInstance.del.mockResolvedValue(1);
    const cacheService = require('../../src/services/cacheService');
    await cacheService.del('key1');
    expect(mockRedisInstance.del).toHaveBeenCalledWith('key1');
  });

  it('should invalidate multiple keys by pattern', async () => {
    mockRedisInstance.keys.mockResolvedValue(['products:1', 'products:2', 'products:all']);
    mockRedisInstance.del.mockResolvedValue(3);
    const cacheService = require('../../src/services/cacheService');
    await cacheService.invalidatePattern('products:*');
    expect(mockRedisInstance.keys).toHaveBeenCalledWith('products:*');
    expect(mockRedisInstance.del).toHaveBeenCalledWith('products:1', 'products:2', 'products:all');
  });

  it('should not throw if redis is down', async () => {
    mockRedisInstance.get.mockRejectedValue(new Error('Connection refused'));
    const cacheService = require('../../src/services/cacheService');
    const result = await cacheService.get('key');
    expect(result).toBeNull(); // graceful degrade
  });
});
