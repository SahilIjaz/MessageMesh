jest.mock('../database/connection');

const { getConnection } = require('../database/connection');
const {
  sendMessage,
  getMessageHistory,
  updateMessageStatus,
  getUndeliveredMessages,
} = require('../models/message');

describe('Message Model', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      first: jest.fn(),
      update: jest.fn(),
    };
    getConnection.mockReturnValue(mockDb);
  });

  describe('sendMessage', () => {
    it('should insert and return message', async () => {
      const messageId = 'msg-uuid';
      mockDb.insert.mockResolvedValueOnce([messageId]);
      mockDb.first.mockResolvedValueOnce({
        id: messageId,
        conversation_id: 'conv-uuid',
        sender_id: 'user1',
        content: 'test',
      });

      const result = await sendMessage('conv-uuid', 'user1', 'test');

      expect(result.id).toBe(messageId);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getMessageHistory', () => {
    it('should return paginated messages', async () => {
      const messages = [{ id: 'msg1' }, { id: 'msg2' }];
      mockDb.first.mockResolvedValueOnce(undefined);
      mockDb.orderBy.mockReturnValue(mockDb);
      mockDb.limit.mockReturnValue(mockDb);
      mockDb.offset.mockResolvedValueOnce(messages);

      const result = await getMessageHistory('conv-uuid', 50, 0);

      expect(result).toEqual(messages);
      expect(mockDb.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    });
  });

  describe('updateMessageStatus', () => {
    it('should update delivered_at when status=delivered', async () => {
      mockDb.update.mockResolvedValueOnce(1);

      await updateMessageStatus('msg-uuid', 'delivered');

      expect(mockDb.update).toHaveBeenCalled();
      const call = mockDb.update.mock.calls[0][0];
      expect(call).toHaveProperty('delivered_at');
    });

    it('should update read_at when status=read', async () => {
      mockDb.update.mockResolvedValueOnce(1);

      await updateMessageStatus('msg-uuid', 'read');

      expect(mockDb.update).toHaveBeenCalled();
      const call = mockDb.update.mock.calls[0][0];
      expect(call).toHaveProperty('read_at');
    });
  });

  describe('getUndeliveredMessages', () => {
    it('should return only sent messages for recipient', async () => {
      const undelivered = [{ id: 'msg1', status: 'sent' }];
      mockDb.join.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.whereNot.mockReturnValue(mockDb);
      mockDb.orderBy.mockReturnValue(mockDb);
      mockDb.limit.mockReturnValue(mockDb);
      mockDb.select.mockResolvedValueOnce(undelivered);

      const result = await getUndeliveredMessages('recipient-uuid', 50);

      expect(result).toEqual(undelivered);
    });
  });
});
