const { v4: uuidv4 } = require('uuid');
const { getConnection } = require('../database/connection');

const create = async (userData) => {
  const db = getConnection();
  const id = uuidv4();

  const [user] = await db('user_profiles')
    .insert({
      id,
      user_id: userData.userId,
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      bio: userData.bio || null,
      avatar_url: userData.avatarUrl || null,
      phone: userData.phone || null,
      preferences: userData.preferences || {},
    })
    .returning('*');

  return user;
};

const findByUserId = async (userId) => {
  const db = getConnection();
  return db('user_profiles')
    .where('user_id', userId)
    .first();
};

const findById = async (id) => {
  const db = getConnection();
  return db('user_profiles')
    .where('id', id)
    .first();
};

const findByEmail = async (email) => {
  const db = getConnection();
  return db('user_profiles')
    .where('email', email)
    .first();
};

const update = async (userId, updateData) => {
  const db = getConnection();

  const [user] = await db('user_profiles')
    .where('user_id', userId)
    .update({
      first_name: updateData.firstName || undefined,
      last_name: updateData.lastName || undefined,
      bio: updateData.bio !== undefined ? updateData.bio : undefined,
      avatar_url: updateData.avatarUrl !== undefined ? updateData.avatarUrl : undefined,
      phone: updateData.phone !== undefined ? updateData.phone : undefined,
      preferences: updateData.preferences || undefined,
      updated_at: db.fn.now(),
    })
    .returning('*');

  return user;
};

const updateStatus = async (userId, status) => {
  const db = getConnection();

  const [user] = await db('user_profiles')
    .where('user_id', userId)
    .update({
      status,
      updated_at: db.fn.now(),
    })
    .returning('*');

  return user;
};

const search = async (query, limit = 20, offset = 0) => {
  const db = getConnection();

  return db('user_profiles')
    .where((builder) => {
      builder
        .where(db.raw('first_name ILIKE ?', [`%${query}%`]))
        .orWhere(db.raw('last_name ILIKE ?', [`%${query}%`]))
        .orWhere(db.raw('email ILIKE ?', [`%${query}%`]));
    })
    .where('status', 'active')
    .orderBy('first_name')
    .limit(limit)
    .offset(offset);
};

module.exports = {
  create,
  findByUserId,
  findById,
  findByEmail,
  update,
  updateStatus,
  search,
};
