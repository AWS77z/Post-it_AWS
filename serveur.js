const express = require('express');
const bodyP = require('body-parser');
const cookieParser = require("cookie-parser");
const nunjucks = require('nunjucks');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const http = require("http");
const { Server } = require("socket.io");


let knexConfig;
if (process.env.DATABASE_URL) {
    knexConfig = {
        client: 'pg',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        }
    };
} else {
    knexConfig = {
        client: 'sqlite3',
        connection: { filename: "./db.sqlite3" },
        useNullAsDefault: true,
    };
}
const knex = require('knex')(knexConfig);

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyP.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'mon_secret_local',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: 'none'
    }
}));
nunjucks.configure(path.join(__dirname, 'views'), {
    autoescape: true,
    express: app
});

app.use(session({
    secret: 'mon_secret',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});


function connecte(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        return res.redirect('/connexion');
    }
}

function verif_permission(colonne) {
    return async (req, res, next) => {
        if (!req.session.user) return res.status(401).send("Non connecté");

        const user = await knex('users').where({ id: req.session.user.id }).first();

        if (user.admin || user[colonne]) {
            return next();
        } else {
            return res.status(403).send(`Droit insuffisant : ${colonne}`);
        }
    };
}


app.set('view engine', 'html');

app.get('/', (req, res) => {
    return res.render('index.html');
});

app.get('/inscription', (req, res) => {
    return res.render('inscription.html');

});

app.post('/verif_inscription', async (req, res) => {

    try {
        const { email, nom, prenom, pseudo, mot_de_passe } = req.body;

        if (!email || !nom || !prenom || !mot_de_passe || !pseudo) {
            return res.redirect('/inscription');
        }

        const mail = email;

        const userPseudo = await knex('users')
            .where({ pseudo: pseudo })
            .first();

        if (userPseudo) {
            console.log("Pseudo déjà pris");
            return res.redirect('/inscription');
        }

        const user = await knex('users')
            .where({ email: mail })
            .first();

        if (user) {
            console.log("Email déjà présent");
            return res.redirect('/inscription');
        }

        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

        const [id] = await knex('users').insert({
            email: mail,
            nom: req.body.nom,
            prenom: req.body.prenom,
            pseudo: req.body.pseudo,
            password: hashedPassword
        });

        req.session.user = {
            pseudo: req.body.pseudo,
            id: id
        };

        return res.redirect('/');

    } catch (err) {
        console.error(err);
        return res.status(500).send("Erreur serveur");
    }
});

app.get('/connexion', (req, res) => {
    res.render('connexion.html');
});

app.post('/verif_connexion', (req, res) => {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {// Verification coté serveur que tout les champs on bien été rempli
        return res.redirect('/connexion');
    }
    knex('users').where({ email: email }).first()
        .then(user => {
            if (!user) {
                return res.redirect('/connexion');
            }

            return bcrypt.compare(mot_de_passe, user.password)
                .then(isMatch => {
                    if (!isMatch) {
                        return res.redirect('/connexion');
                    }

                    req.session.user = {
                        pseudo: user.pseudo,
                        id: user.id
                    };

                    return res.redirect('/');
                });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Erreur serveur");
        });
});

app.get('/deconnexion', connecte, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.redirect('/blocknote');
        }
        else {
            res.clearCookie('connect.sid');
            return res.redirect('/');
        }
    });
});

app.get('/verif_connecte', (req, res) => {
    if (req.session.user) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(401);
    }
});


app.post('/sauvegarde_post-it', connecte, verif_permission('creer'), async (req, res) => {

    console.log(req.body);
    const { x, y, contenu } = req.body;
    if (!x || !y || !contenu) {
        return res.redirect('/?error=9')
    }
    try {
        const [id] = await knex('postits').insert({
            contenu: contenu,
            date: new Date(),
            auteur: req.session.user.id,
            position_x: x,
            position_y: y,
        });
        const postit = {
            id,
            contenu: contenu,
            date: new Date(),
            auteur: req.session.user.pseudo,
            position_x: x,
            position_y: y,
        };

        io.emit("new-postit", postit);
        return res.sendStatus(200);

    } catch (err) {
        console.error(err);
        return res.status(500).send("Erreur serveur");
    }
});

app.get('/afficher_postits_bd', async (req, res) => {
    try {
        const postits = await knex('postits').join('users', 'postits.auteur', 'users.id')
            .select(
                'postits.*',
                'users.pseudo as auteur'
            ).orderBy('postits.date', 'asc');
        res.json(postits);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur serveur");
    }
});

app.delete('/delete_postit/:id', connecte, verif_permission('supprimer'), async (req, res) => {
    try {
        const user_Id = req.session.user.id;
        const postit = await knex('postits')
            .where({ id: req.params.id })
            .first();

        if (!postit) {
            return res.status(404).send("Post-it introuvable");
        }
        const user_mtn = await knex('users').where({ id: user_Id }).first();
        if (!user_mtn.admin) {
            if (Number(postit.auteur) !== Number(user_Id)) {
                console.log(postit.auteur)
                console.log(req.session.user.id)

                return res.status(403).send("Non autorisé");
            }
        }

        await knex('postits')
            .where({ id: req.params.id })
            .del();
        console.log("DELETE ID:", req.params.id);
        io.emit("delete-postit", req.params.id);

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur serveur");
    }
});

app.put('/update_postit/:id', connecte, verif_permission('modifier'), async (req, res) => {
    try {
        const { contenu } = req.body;
        const postit_Id = req.params.id;
        const user_Id = req.session.user.id;

        const postit_existant = await knex('postits').where({ id: postit_Id }).first();

        if (!postit_existant) return res.status(404).send("Introuvable");
        const user_mtn = await knex('users').where({ id: user_Id }).first();
        if (!user_mtn.admin) {
            if (Number(postit_existant.auteur) !== Number(user_Id)) return res.status(403).send("Non autorisé");
        }



        const nouvelleDate = new Date();

        await knex('postits')
            .where({ id: postit_Id })
            .update({
                contenu: contenu,
                date: nouvelleDate
            });
        const nouvelle_postit = {
            id: postit_Id,
            contenu: contenu,
            date: nouvelleDate,
            auteur: req.session.user.pseudo,
            position_x: postit_existant.position_x,
            position_y: postit_existant.position_y,
        };
        io.emit("update-postit", nouvelle_postit);
        return res.sendStatus(200);

    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur serveur");
    }
});

app.get('/admin', connecte, verif_permission('admin'), async (req, res) => {
    try {

        const utilisateurs = await knex('users').select('*').orderBy('pseudo', 'asc');
        res.render('admin.html', { utilisateurs });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur lors de la récupération des utilisateurs");
    }
});

app.post('/admin/update_permission', connecte, verif_permission('admin'), async (req, res) => {
    const { userId, colonne, valeur } = req.body;


    const colonnesAutorisees = ['admin', 'creer', 'modifier', 'supprimer'];
    if (!colonnesAutorisees.includes(colonne)) {
        return res.status(400).send("Colonne non autorisée");
    }

    try {
        await knex('users')
            .where({ id: userId })
            .update({
                [colonne]: valeur ? 1 : 0
            });
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur de mise à jour");
    }
});

app.put('/update_position/:id', connecte, async (req, res) => {
    try {
        const { x, y } = req.body;
        const postit_Id = req.params.id;
        const user_Id = req.session.user.id;

        const postit = await knex('postits').where({ id: postit_Id }).first();

        if (!postit) return res.status(404).send("Introuvable");

        const user = await knex('users').where({ id: user_Id }).first();
        if (!user.admin && Number(postit.auteur) !== Number(user_Id)) {
            return res.status(403).send("Ce n'est pas ton post-it !");
        }

        const nouvelleDate = new Date();

        await knex('postits')
            .where({ id: postit_Id })
            .update({
                position_x: Math.round(x),
                position_y: Math.round(y),
                date: nouvelleDate
            });

        io.emit("postit_bouge", { id: postit_Id, x, y, date: nouvelleDate });

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur lors du déplacement");
    }
});
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
}); 