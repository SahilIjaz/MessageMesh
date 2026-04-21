jest.mock('../database/connection');

const { getConnection } = require('../database/connection');
const {
  createNotification,
  getNotifications,
  markRead,
  getUnreadCount,
} = require('../models/notification');

describe('Notification Model', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      first: jest.fn(),
      update: jest.fn(),
    };
    getConnection.mockReturnValue(mockDb);
  });

  describe('createNotification', () => {
    it('should insert and return notification', async () => {
      const notifId = 'notif-uuid';
      mockDb.insert.mockResolvedValueOnce([notifId]);
      mockDb.first.mockResolvedValueOnce({
        id: notifId,
        user_id: 'user-uuid',
        type: 'new_message',
        title: 'New Message',
        body: 'Test message',
        read: false,
      });

      const result = await createNotification('user-uuid', 'new_message', 'New Message', 'Test message');

      expect(result.id).toBe(notifId);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications for user', async () => {
      const notifs = [{ id: 'notif1' }, { id: 'notif2' }];
      mockDb.orderBy.mockReturnValue(mockDb);
      mockDb.limit.mockReturnValue(mockDb);
      mockDb.offset.mockResolvedValueOnce(notifs);

      const result = await getNotifications('user-uuid', 50, 0);

      expect(result).toEqual(notifs);
      expect(mockDb.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });
  });

  describe('markRead', () => {
    it('should return 1 when notification belongs to user', async () => {
      mockDb.update.mockResolvedValueOnce(1);

      const result = await markRead('notif-uuid', 'user-uuid');

      expect(result).toBe(1);
      expect(mockDb.update).toHaveBeenCalledWith({ read: true });
    });

    it('should return 0 when notification does not belong to user', async () => {
      mockDb.update.mockResolvedValueOnce(0);

      const result = await markRead('notif-uuid', 'wrong-user');

      expect(result).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    it('should count unread notifications', async () => {
      mockDb.count.mockReturnValue(mockDb);
      mockDb.first.mockResolvedValueOnce({ total: 5 });

      const result = await getUnreadCount('user-uuid');

      expect(result).toBe(5);
    });
  });
});
