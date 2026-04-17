const knex = require('knex')({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, 
  },
  pool: { min: 2, max: 10 }
});

async function initDB() {
    try {

        // USERS

        const usersExists = await knex.schema.hasTable('users');
        if (!usersExists) {
            await knex.schema.createTable('users', table => {
                table.increments('id').primary();
                table.string('pseudo').unique().notNullable();
                table.string('email').unique().notNullable();
                table.string('nom').notNullable();
                table.string('prenom').notNullable();
                table.string('password').notNullable();
                table.boolean('creer').defaultTo(true);
                table.boolean('supprimer').defaultTo(true);
                table.boolean('modifier').defaultTo(true);
                table.boolean('admin').defaultTo(false);
            });
            console.log("Table users créée");
        } else {
            console.log("Table users existe déjà");
        }

        // POSTITS

        const postitsExists = await knex.schema.hasTable('postits');
        if (!postitsExists) {
            await knex.schema.createTable('postits', table => {
                table.increments('id').primary();
                table.text('contenu').notNullable();
                table.datetime('date').notNullable();
                table.string('auteur').notNullable();
                table.integer('position_x').notNullable();
                table.integer('position_y').notNullable();
            });
            console.log("Table postits créée");
        } else {
            console.log("Table postits existe déjà");
        }

    } catch (err) {
        console.error("Erreur :", err);
    } 
}

initDB();