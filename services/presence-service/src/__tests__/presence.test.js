jest.mock('../redis/connection');

const request = require('supertest');
const app = require('../index');
const { getRedis } = require('../redis/connection');

describe('Presence Service', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = {
      get: jest.fn(),
      multi: jest.fn(),
      exec: jest.fn(),
    };
    getRedis.mockReturnValue(mockRedis);
  });

  describe('GET /status/:userId', () => {
    it('should return online status for connected user', async () => {
      mockRedis.get.mockResolvedValueOnce('1');
      mockRedis.get.mockResolvedValueOnce('2024-04-21T00:00:00Z');

      const res = await request(app)
        .get('/status/user-123')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(res.body.online).toBe(true);
    });

    it('should return offline status for disconnected user', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.get.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/status/user-123')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(res.body.online).toBe(false);
    });
  });

  describe('GET /status (batch query)', () => {
    it('should return array of statuses', async () => {
      mockRedis.multi.mockReturnValue(mockRedis);
      mockRedis.exec.mockResolvedValueOnce(['1', 'ts1', null, 'ts2']);

      const res = await request(app)
        .get('/status?userIds=user-1,user-2')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(res.body.statuses).toBeInstanceOf(Array);
      expect(res.body.statuses.length).toBe(2);
    });
  });

  describe('GET /status/online', () => {
    it('should return list of online user IDs', async () => {
      const res = await request(app)
        .get('/status/online')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('online');
      expect(res.body).toHaveProperty('count');
    });
  });
});
