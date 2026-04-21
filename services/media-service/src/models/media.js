const { getConnection } = require('../database/connection');

const createFile = async (uploadedBy, originalName, storedName, fileSize, mimeType, url) => {
  const db = getConnection();
  const [fileId] = await db('media_files').insert({
    uploaded_by: uploadedBy,
    original_name: originalName,
    stored_name: storedName,
    file_size: fileSize,
    mime_type: mimeType,
    url,
  });

  return db('media_files').where('id', fileId).first();
};

const getFile = async (fileId) => {
  const db = getConnection();
  return db('media_files').where('id', fileId).first();
};

const getUserFiles = async (userId, limit = 50, offset = 0) => {
  const db = getConnection();
  return db('media_files')
    .where('uploaded_by', userId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
};

const getUserFileCount = async (userId) => {
  const db = getConnection();
  const result = await db('media_files')
    .where('uploaded_by', userId)
    .count('id as total')
    .first();
  return result.total;
};

const deleteFile = async (fileId) => {
  const db = getConnection();
  return db('media_files').where('id', fileId).delete();
};

module.exports = {
  createFile,
  getFile,
  getUserFiles,
  getUserFileCount,
  deleteFile,
};
