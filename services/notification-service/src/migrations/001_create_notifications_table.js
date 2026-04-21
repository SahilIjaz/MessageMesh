exports.up = async (knex) => {
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.string('type', 50).notNullable();
    table.string('title').notNullable();
    table.text('body').notNullable();
    table.jsonb('payload').nullable();
    table.boolean('read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now()).index();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('notifications');
};
