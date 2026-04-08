const knex = require('knex')({
    client:'sqlite3',
    connection: {
      filename: "./db.sqlite3"
    },
    useNullAsDefault: true,
})
async function initDB(){
    try{
        const exists = await knex.schema.hasTable('users');
        if(!exists){
            await knex.schema.createTable('users', table =>{
                table.string('email').primary();
                table.string('nom').notNullable();
                table.string('prenom').notNullable();
                table.string('password').notNullable();
                table.string('liste_post_it').notNullable();
                console.log("Table users créée");
            });}
        else {
            console.log("Table users existe déjà");
        }; }
    catch (err) {
        console.error(" Erreur : ",err);
        
    }finally{
        await knex.destroy();
    }
}
initDB();