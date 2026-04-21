const knex = require('knex');
const knexConfig = require('../../knexfile');

let db = null;

const getConnection = () => {
  if (!db) {
    const env = process.env.NODE_ENV || 'development';
    db = knex(knexConfig[env]);
  }
  return db;
};

const closeConnection = async () => {
  if (db) {
    await db.destroy();
    db = null;
  }
};

module.exports = {
  getConnection,
  closeConnection,
};
