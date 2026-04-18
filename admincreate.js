const bcrypt = require('bcrypt');
const knex = require('knex')({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
});

async function createAdmin() {
    try {
        const password = "u7Kz9@vP2!rQ5&m888"; 
        const hash = await bcrypt.hash(password, 10);

        await knex('users').insert({
            pseudo: "Admin",
            email: "efvzejvnzec@mail.com",
            nom: "Admin1",
            prenom: "a",
            password: hash,
            admin: true,
            creer: true,
            modifier: true,
            supprimer: true
        });

        process.exit();
    } catch (err) {
        console.error("Erreur création admin :", err);
        process.exit(1);
    }
}

createAdmin();