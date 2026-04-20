exports.up = async (knex) => {
  return knex.schema.createTable('users_auth', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('refresh_token', 500).nullable();
    table.string('oauth_provider', 50).nullable();
    table.string('oauth_id', 255).nullable();
    table.boolean('is_verified').defaultTo(false);
    table.timestamps(true, true);

    // Indexes
    table.index('email');
    table.index('oauth_provider');
  });
};

exports.down = async (knex) => {
  return knex.schema.dropTableIfExists('users_auth');
};
