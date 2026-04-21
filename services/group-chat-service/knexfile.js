module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DATABASE_HOST || 'postgres',
      port: process.env.DATABASE_PORT || 5432,
      user: process.env.DATABASE_USER || 'messagemesh',
      password: process.env.DATABASE_PASSWORD || 'messagemesh',
      database: process.env.DATABASE_NAME || 'messagemesh',
    },
    migrations: {
      directory: './src/migrations',
    },
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/migrations',
    },
  },
};
