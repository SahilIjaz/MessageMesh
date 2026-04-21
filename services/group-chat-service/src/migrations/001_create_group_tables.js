exports.up = async (knex) => {
  await knex.schema.createTable('groups', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.uuid('created_by').notNullable().index();
    table.string('avatar_url').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('group_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('group_id').notNullable().index().references('id').inTable('groups').onDelete('CASCADE');
    table.uuid('user_id').notNullable().index();
    table.enum('role', ['admin', 'member']).defaultTo('member');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.unique(['group_id', 'user_id']);
  });

  await knex.schema.createTable('group_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('group_id').notNullable().index().references('id').inTable('groups').onDelete('CASCADE');
    table.uuid('sender_id').notNullable().index();
    table.text('content').notNullable();
    table.enum('message_type', ['text', 'media']).defaultTo('text');
    table.string('media_url').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).index();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('group_messages');
  await knex.schema.dropTableIfExists('group_members');
  await knex.schema.dropTableIfExists('groups');
};
