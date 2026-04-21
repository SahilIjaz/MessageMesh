jest.mock('@messagemesh/events');
jest.mock('../database/connection');

const request = require('supertest');
const app = require('../index');
const { publishEvent } = require('@messagemesh/events').eventBus;
const { getConnection } = require('../database/connection');

describe('Auth Service', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn().mockReturnThis(),
    };
    getConnection.mockReturnValue(mockDb);
  });

  describe('POST /register', () => {
    it('should register new user with valid input', async () => {
      mockDb.first.mockResolvedValueOnce(null);
      mockDb.insert.mockResolvedValueOnce([{ id: 'user-uuid' }]);

      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(publishEvent).toHaveBeenCalled();
    });

    it('should return 409 for duplicate email', async () => {
      mockDb.first.mockResolvedValueOnce({ id: 'existing-uuid' });

      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'existing@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_EXISTS');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /login', () => {
    it('should login with valid credentials', async () => {
      const hashedPassword = '$2b$12$mockhashedpassword';
      mockDb.first.mockResolvedValueOnce({ id: 'user-uuid', password_hash: hashedPassword });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should return 401 for wrong password', async () => {
      mockDb.first.mockResolvedValueOnce({ id: 'user-uuid', password_hash: 'wronghash' });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should return 404 for unknown email', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'unknown@example.com', password: 'password123' });

      expect(res.status).toBe(404);
    });
  });
});
