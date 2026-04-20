const { getConnection } = require('../database/connection');
const { generateUUID } = require('@messagemesh/utils').uuid;

const tableName = 'users_auth';

const create = async (userData) => {
  const db = getConnection();
  const [user] = await db(tableName)
    .insert({
      id: generateUUID(),
      email: userData.email.toLowerCase(),
      password_hash: userData.passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning(['id', 'email', 'is_verified', 'created_at']);

  return user;
};

const findByEmail = async (email) => {
  const db = getConnection();
  return db(tableName).where('email', email.toLowerCase()).first();
};

const findById = async (id) => {
  const db = getConnection();
  return db(tableName).where('id', id).first();
};

const updateRefreshToken = async (userId, refreshToken) => {
  const db = getConnection();
  return db(tableName)
    .where('id', userId)
    .update({
      refresh_token: refreshToken,
      updated_at: new Date(),
    });
};

const updatePassword = async (userId, passwordHash) => {
  const db = getConnection();
  return db(tableName)
    .where('id', userId)
    .update({
      password_hash: passwordHash,
      refresh_token: null,
      updated_at: new Date(),
    });
};

const invalidateRefreshToken = async (userId) => {
  const db = getConnection();
  return db(tableName)
    .where('id', userId)
    .update({
      refresh_token: null,
      updated_at: new Date(),
    });
};

const verifyUser = async (userId) => {
  const db = getConnection();
  return db(tableName)
    .where('id', userId)
    .update({
      is_verified: true,
      updated_at: new Date(),
    });
};

module.exports = {
  create,
  findByEmail,
  findById,
  updateRefreshToken,
  updatePassword,
  invalidateRefreshToken,
  verifyUser,
};
