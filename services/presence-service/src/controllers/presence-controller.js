const { getRedis } = require('../redis/connection');
const { AppError } = require('@messagemesh/middleware').errorHandler;
const logger = require('@messagemesh/middleware').logger;
const { getOnlineUserIds } = require('../websocket/ws-server');

const getStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw new AppError('User ID is required', 400, 'MISSING_USER_ID');
    }

    const redis = getRedis();
    const isOnline = await redis.get(`presence:${userId}`);
    const lastSeen = await redis.get(`presence:lastseen:${userId}`);

    res.status(200).json({
      userId,
      online: isOnline ? true : false,
      lastSeen: lastSeen || null,
    });
  } catch (error) {
    next(error);
  }
};

const getBatchStatus = async (req, res, next) => {
  try {
    const { userIds } = req.query;

    if (!userIds) {
      throw new AppError('userIds query parameter is required', 400, 'MISSING_USER_IDS');
    }

    const userIdArray = typeof userIds === 'string' ? userIds.split(',') : userIds;

    const redis = getRedis();
    const statusMap = {};

    const pipeline = redis.multi();
    for (const userId of userIdArray) {
      pipeline.get(`presence:${userId}`);
      pipeline.get(`presence:lastseen:${userId}`);
    }
    const results = await pipeline.exec();

    for (let i = 0; i < userIdArray.length; i++) {
      const userId = userIdArray[i];
      statusMap[userId] = {
        userId,
        online: results[i * 2] ? true : false,
        lastSeen: results[i * 2 + 1] || null,
      };
    }

    res.status(200).json({
      statuses: Object.values(statusMap),
    });
  } catch (error) {
    next(error);
  }
};

const getOnlineList = (req, res, next) => {
  try {
    const onlineUserIds = getOnlineUserIds();
    res.status(200).json({
      online: onlineUserIds,
      count: onlineUserIds.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStatus,
  getBatchStatus,
  getOnlineList,
};
