const { v4: uuidv4 } = require('uuid');
const { getConnection } = require('../database/connection');

const sendRequest = async (userId, connectedUserId) => {
  const db = getConnection();
  const id = uuidv4();

  const [connection] = await db('user_connections')
    .insert({
      id,
      user_id: userId,
      connected_user_id: connectedUserId,
      status: 'pending',
    })
    .returning('*');

  return connection;
};

const acceptRequest = async (userId, connectedUserId) => {
  const db = getConnection();

  const [connection] = await db('user_connections')
    .where('user_id', connectedUserId)
    .where('connected_user_id', userId)
    .update({
      status: 'accepted',
      accepted_at: db.fn.now(),
    })
    .returning('*');

  return connection;
};

const rejectRequest = async (userId, connectedUserId) => {
  const db = getConnection();

  await db('user_connections')
    .where('user_id', connectedUserId)
    .where('connected_user_id', userId)
    .del();
};

const blockUser = async (userId, blockedUserId) => {
  const db = getConnection();

  const [connection] = await db('user_connections')
    .where('user_id', userId)
    .where('connected_user_id', blockedUserId)
    .update({
      status: 'blocked',
    })
    .returning('*');

  return connection;
};

const unblockUser = async (userId, blockedUserId) => {
  const db = getConnection();

  await db('user_connections')
    .where('user_id', userId)
    .where('connected_user_id', blockedUserId)
    .del();
};

const getConnections = async (userId, status = 'accepted', limit = 50, offset = 0) => {
  const db = getConnection();

  return db('user_connections as uc')
    .join('user_profiles as up', 'uc.connected_user_id', 'up.user_id')
    .where('uc.user_id', userId)
    .where('uc.status', status)
    .select('up.*', 'uc.accepted_at', 'uc.requested_at')
    .orderBy('uc.accepted_at', 'desc')
    .limit(limit)
    .offset(offset);
};

const getPendingRequests = async (userId, limit = 50, offset = 0) => {
  const db = getConnection();

  return db('user_connections as uc')
    .join('user_profiles as up', 'uc.user_id', 'up.user_id')
    .where('uc.connected_user_id', userId)
    .where('uc.status', 'pending')
    .select('up.*', 'uc.id as request_id', 'uc.requested_at')
    .orderBy('uc.requested_at', 'desc')
    .limit(limit)
    .offset(offset);
};

const isBlocked = async (userId, otherUserId) => {
  const db = getConnection();

  const blocked = await db('user_connections')
    .where('user_id', userId)
    .where('connected_user_id', otherUserId)
    .where('status', 'blocked')
    .first();

  return !!blocked;
};

const isConnected = async (userId, otherUserId) => {
  const db = getConnection();

  const connected = await db('user_connections')
    .where((builder) => {
      builder
        .where({ user_id: userId, connected_user_id: otherUserId })
        .orWhere({ user_id: otherUserId, connected_user_id: userId });
    })
    .where('status', 'accepted')
    .first();

  return !!connected;
};

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  blockUser,
  unblockUser,
  getConnections,
  getPendingRequests,
  isBlocked,
  isConnected,
};
