const knex = require('knex');
const knexConfig = require('../../knexfile');

let connection = null;

const getConnection = () => {
  if (!connection) {
    const env = process.env.NODE_ENV || 'development';
    connection = knex(knexConfig[env]);
  }
  return connection;
};

const closeConnection = async () => {
  if (connection) {
    await connection.destroy();
    connection = null;
  }
};

module.exports = {
  getConnection,
  closeConnection,
};
