const { Sequelize, DataTypes } = require('sequelize');
//require('dotenv').config(); // Charger les variables d'environnement en premier
// Remplace ces variables par tes variables d'environnement ou des valeurs réelles
const DATABASE_NAME = 'Employee_Ooredoo'; // nom de la base de données
const DATABASE_USER = process.env.DATABASE_USER; // utilisateur
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD; // mot de passe
const DATABASE_HOST = process.env.DATABASE_HOST; // hôte (par exemple, 'localhost')

// Création d'une instance Sequelize pour PostgreSQL
const sequelize = new Sequelize(DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD, {
  host: DATABASE_HOST,
  port: 5432, // Ajoutez le port ici
  dialect: 'postgres', // Spécifie le dialecte pour PostgreSQL
 // logging:console.log,
 logging:false,
});

// Vérification de la connexion
sequelize.authenticate()
  .then(() => {
    console.log('Connexion à la base de données réussie.');
  })
  .catch(err => {
    console.error('Impossible de se connecter à la base de données:', err);
  });

module.exports = { sequelize, DataTypes };

