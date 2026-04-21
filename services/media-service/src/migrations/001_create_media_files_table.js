exports.up = async (knex) => {
  await knex.schema.createTable('media_files', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('uploaded_by').notNullable().index();
    table.string('original_name').notNullable();
    table.string('stored_name').notNullable();
    table.integer('file_size').notNullable();
    table.string('mime_type', 100).notNullable();
    table.string('url').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).index();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('media_files');
};
