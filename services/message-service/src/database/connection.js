const knex = require('knex');

let db = null;

const getConnection = () => {
  if (!db) {
    db = knex({
      client: 'pg',
      connection: process.env.DATABASE_URL || {
        host: process.env.DATABASE_HOST || 'postgres',
        port: process.env.DATABASE_PORT || 5432,
        user: process.env.DATABASE_USER || 'messagemesh',
        password: process.env.DATABASE_PASSWORD || 'messagemesh',
        database: process.env.DATABASE_NAME || 'messagemesh',
      },
      pool: { min: 2, max: 10 },
      migrations: {
        directory: './src/migrations',
      },
    });
  }
  return db;
};

const closeConnection = async () => {
  if (db) {
    await db.destroy();
    db = null;
  }
};

module.exports = { getConnection, closeConnection };
