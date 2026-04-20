exports.up = async (knex) => {
  await knex.schema.createTable('user_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().index();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').notNullable().unique().index();
    table.text('bio').nullable();
    table.string('avatar_url').nullable();
    table.string('phone').nullable();
    table.enum('status', ['active', 'inactive', 'blocked']).defaultTo('active');
    table.json('preferences').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });

  await knex.schema.createTable('user_connections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.uuid('connected_user_id').notNullable();
    table.enum('status', ['pending', 'accepted', 'blocked']).defaultTo('pending').index();
    table.timestamp('requested_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('accepted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.unique(['user_id', 'connected_user_id']);
    table.foreign('user_id').references('user_profiles.user_id');
    table.foreign('connected_user_id').references('user_profiles.user_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('user_connections');
  await knex.schema.dropTableIfExists('user_profiles');
};
