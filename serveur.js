const express = require('express');
const bodyP = require('body-parser');
const cookieParser = require("cookie-parser");
const nunjucks = require('nunjucks');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const knex = require('knex')({
    client:'sqlite3',
    connection: {
      filename: "./db.sqlite3"
    },
    useNullAsDefault: true,
})

const app = express();


app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyP.urlencoded({ extended: false }));
app.use(cookieParser());

nunjucks.configure(path.join(__dirname, 'views'), {
    autoescape: true,
    express: app
});

app.use(session({
    secret: 'mon_secret',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next)=>{
    res.locals.user= req.session.user || null;
    next();});


function connecte(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        return res.redirect('/connexion');
    }
}


app.set('view engine', 'html');

app.get('/', (req, res) => {
    return res.render('index.html');
});

app.get('/inscription', (req, res) => {
    return res.render('inscription.html');

});

app.post('/verif_inscription', (req, res) => {
    const { email, nom, prenom, mot_de_passe } = req.body;
    if (!email || !nom || !prenom || !mot_de_passe) { // Verification coté serveur que tout les champs on bien été rempli
    return res.redirect('/inscription');
}
    const mail = req.body.email;

    knex('users').where({ email: mail }).first()
        .then(user => {
            if (user) {
                console.log("Email déjà présent");
                return res.redirect('/inscription');
            } else {
                return bcrypt.hash(req.body.mot_de_passe, 10)
                    .then(hashedPassword => {
                        return knex('users').insert({
                            email: mail,
                            nom: req.body.nom,
                            prenom: req.body.prenom,
                            password: hashedPassword,
                            liste_post_it: JSON.stringify([]) 
                        });
                    })
                    .then(() => {
                    req.session.user = {
                        email: req.body.email,
                        nom: req.body.nom
                    };

                        return res.redirect('/');
                    });
            }
        })
        
        .catch(err => console.error(err));
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
                        email: user.email,
                        nom: user.nom
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
        else{
        res.clearCookie('connect.sid'); 
        return res.redirect('/');}
    });
});
app.get('/ajouter_post-it', connecte, (req, res) => {

});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
}); 