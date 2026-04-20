const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

const getConnection = () => db;

const closeConnection = async () => {
  await db.destroy();
};

module.exports = {
  getConnection,
  closeConnection,
  db,
};
