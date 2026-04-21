const { getConnection } = require('../database/connection');

const createGroup = async (createdBy, name, description, avatarUrl) => {
  const db = getConnection();
  const [groupId] = await db('groups').insert({
    created_by: createdBy,
    name,
    description,
    avatar_url: avatarUrl,
  });

  await db('group_members').insert({
    group_id: groupId,
    user_id: createdBy,
    role: 'admin',
  });

  return db('groups').where('id', groupId).first();
};

const getGroup = async (groupId) => {
  const db = getConnection();
  return db('groups').where('id', groupId).first();
};

const getGroupWithMembers = async (groupId) => {
  const db = getConnection();
  const group = await getGroup(groupId);
  if (!group) return null;
  group.members = await getGroupMembers(groupId);
  return group;
};

const getUserGroups = async (userId, limit = 50, offset = 0) => {
  const db = getConnection();
  return db('groups')
    .join('group_members', 'groups.id', 'group_members.group_id')
    .where('group_members.user_id', userId)
    .orderBy('groups.updated_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select('groups.*');
};

const getUserGroupCount = async (userId) => {
  const db = getConnection();
  const result = await db('groups')
    .join('group_members', 'groups.id', 'group_members.group_id')
    .where('group_members.user_id', userId)
    .count('groups.id as total')
    .first();
  return result.total;
};

const addMember = async (groupId, userId, role = 'member') => {
  const db = getConnection();
  const [memberId] = await db('group_members').insert({
    group_id: groupId,
    user_id: userId,
    role,
  });

  return db('group_members').where('id', memberId).first();
};

const removeMember = async (groupId, userId) => {
  const db = getConnection();
  return db('group_members').where({ group_id: groupId, user_id: userId }).delete();
};

const getGroupMembers = async (groupId) => {
  const db = getConnection();
  return db('group_members')
    .where('group_id', groupId)
    .select('user_id', 'role', 'joined_at');
};

const getMemberCount = async (groupId) => {
  const db = getConnection();
  const result = await db('group_members')
    .where('group_id', groupId)
    .count('id as total')
    .first();
  return result.total;
};

const isGroupMember = async (groupId, userId) => {
  const db = getConnection();
  const member = await db('group_members')
    .where({ group_id: groupId, user_id: userId })
    .first();
  return !!member;
};

const isGroupAdmin = async (groupId, userId) => {
  const db = getConnection();
  const member = await db('group_members')
    .where({ group_id: groupId, user_id: userId, role: 'admin' })
    .first();
  return !!member;
};

const sendGroupMessage = async (groupId, senderId, content, messageType = 'text', mediaUrl = null) => {
  const db = getConnection();
  const [messageId] = await db('group_messages').insert({
    group_id: groupId,
    sender_id: senderId,
    content,
    message_type: messageType,
    media_url: mediaUrl,
  });

  return db('group_messages').where('id', messageId).first();
};

const getGroupMessages = async (groupId, limit = 50, offset = 0) => {
  const db = getConnection();
  return db('group_messages')
    .where('group_id', groupId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
};

const getGroupMessageCount = async (groupId) => {
  const db = getConnection();
  const result = await db('group_messages')
    .where('group_id', groupId)
    .count('id as total')
    .first();
  return result.total;
};

module.exports = {
  createGroup,
  getGroup,
  getGroupWithMembers,
  getUserGroups,
  getUserGroupCount,
  addMember,
  removeMember,
  getGroupMembers,
  getMemberCount,
  isGroupMember,
  isGroupAdmin,
  sendGroupMessage,
  getGroupMessages,
  getGroupMessageCount,
};
