const express = require("express");
const { sequelize } = require('../DB/Db');
var bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { utilisateur,Files,Publications,Commentaires ,Playlist,PlaylistVideos,Projets,Projets_membres,ProjetVideos, Objectifs} = require('../Model/Model');
require('dotenv').config(); 
const crypto = require('crypto'); // Pour générer un code aléatoire
const nodemailer = require('nodemailer');
const validator = require('validator');
const cron = require('node-cron');


// controllers/userController.js
/**
 * Récupérer un utilisateur par son ID
 * @param {number} userId - L'ID de l'utilisateur
 * @returns {Object} - Informations de l'utilisateur ou une erreur si l'utilisateur n'existe pas
 */
async function getUserById(userId) {
  if (!userId) {
    throw new Error('ID utilisateur invalide');
  }

  
  try {
    const user = await utilisateur.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      secteur: user.secteur,
      status:user.status,
      photoprofil:user.photoprofil,
      role:user.role,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    throw new Error('Erreur serveur');
  }
}







async function getAllUsers_socket(userSector) {
  try {
    // Rechercher les utilisateurs appartenant au même secteur
    const users = await utilisateur.findAll({
      attributes: ['id', 'nom', 'prenom', 'secteur', 'status', 'photoprofil', 'role'],
      where: {
        secteur: userSector, // Filtrer par secteur
      },
    });

    // Mapper les utilisateurs pour formater les résultats
    return users.map(user => ({
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      secteur: user.secteur,
      status: user.status,
      photoprofil: user.photoprofil,
      role: user.role,
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs par secteur:', error);
    throw new Error('Erreur serveur');
  }
}





// Tâche planifiée pour s'exécuter tous les jours à minuit
cron.schedule('0 0 * * *', async () => {
  console.log('Tâche Cron : Vérification hebdomadaire et gestion des utilisateurs inactifs.');

  try {
    // 1. Réinitialiser `Nbr_add_file` tous les dimanches
    const today = new Date();
    const isSunday = today.getDay() === 0; // Dimanche = 0

    if (isSunday) {
      await utilisateur.update({ Nbr_add_file: 0, Nbr_Connexion:0 }, { where: {} });
      console.log('Réinitialisation hebdomadaire : Nbr_add_file a été réinitialisé à 0.');
    }

    // 2. Réinitialiser le `status` des utilisateurs inactifs depuis plus de 5 jours
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5); // Date d'il y a 5 jours

    const inactiveUsers = await utilisateur.findAll({
      where: {
        status: 1, // Utilisateurs actuellement connectés
        lastLogin: {
          [Op.lt]: fiveDaysAgo, // Pas d'activité depuis plus de 5 jours
        },
      },
    });

    if (inactiveUsers.length > 0) {
      const userIds = inactiveUsers.map(user => user.id);
      await utilisateur.update(
        { status: 0 }, // Déconnexion forcée
        { where: { id: userIds } }
      );

      console.log(`Statut réinitialisé pour ${inactiveUsers.length} utilisateur(s) inactif(s).`);
    }
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la tâche Cron :', error.message);
  }
});



/* -------------------------------- LOGIN SING UP PARTIE --------------------------------  */
const saltRounds = process.env.SALT_ROUNDS || 10; 

async function register(nom, prenom, date_de_naissance, email, password, secteur,status,telephone,photoprofil,role) {
  try {
  
      if (!nom || !prenom || !date_de_naissance || !email || !password || !role) {
        throw new Error("Tous les champs sont obligatoires.");
      }
  
   if (password.length < 10) {
    throw new Error("Le mot de passe doit avoir au moins 10 caractères.");
  }

    const newUser = await sequelize.transaction(async (t) => {
      
      const userWithEmail = await utilisateur.findOne({ where: { email: email } }, { transaction: t });
      if (userWithEmail) {
        console.log('Cet email existe déjà !')
        throw new Error("L'email existe déjà.");
      }

   
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Création de l'utilisateur dans la transaction
      return await utilisateur.create({
        nom: nom, prenom: prenom, date_de_naissance: date_de_naissance, password: hashedPassword, email: email, secteur: secteur,status:status,telephone:telephone,photoprofil:photoprofil,role:role
      }, { transaction: t });
    });

   
    return { success: true, message: newUser };
  } catch (error) {
    console.error("Erreur lors de l'enregistrement :", error);
    return { success: false, message: "Une erreur s'est produite lors de l'enregistrement." };
  }
}



async function login(email, password) {
  const Users = await utilisateur.findOne({ where: { email: email } });
 // console.log("cc ", Users);
  try {
      if (Users) {

          const hashedPassword = Users.password;     
          const passwordMatch = await bcrypt.compare(password, hashedPassword);

        //  console.log('Password match:', passwordMatch);

          if (passwordMatch) {

                 // Récupérer la valeur actuelle de Nbr_Connexion
                 const currentNbrConnexion = Users.Nbr_Connexion || 0; // Utiliser 0 si null

            await utilisateur.update({ 
              status:1, 
              Nbr_Connexion: currentNbrConnexion + 1 ,
              lastLogin : new Date(),
             },
             {where:{id : Users.id}})
              const token = jwt.sign({ userid: Users.id }, process.env.JWT_SECRET, {
                  expiresIn: '3h',
              });

           //  console.log('voici ton token bg :', token);

              return {
                  success: true,
                  message: Users,
                  token: token
              };
          } else {
              return {
                  success: false,
                  message: "Login failed: Incorrect password",
              };
          }
      } else {
          return {
              success: false,
              message: "Login failed: User not found",
          };
      }
  } catch (error) {
      return {
          success: false,
          message: "Error occurred",
      };
  }
}


async function change_mdp(userid, newpass) {
  try {
    // Rechercher l'utilisateur par son username
    const user = await utilisateur.findOne({ where: { id: userid } });

    if (!user) {
      return {
        success: false,
        message: "Utilisateur introuvable.",
      };
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newpass, saltRounds);

    // Mettre à jour le mot de passe de l'utilisateur
    user.password = hashedPassword;
    user.set('Mdp_change', false);

    await user.save();

    return {
      success: true,
      message: "Mot de passe mis à jour avec succès.",
    };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mot de passe :", error);
    return {
      success: false,
      message: "Une erreur est survenue lors de la mise à jour du mot de passe.",
    };
  }
}

async function logout(userId) {
  try {
    const user = await utilisateur.findOne({ where: { id: userId } });

    if (user) {
      // Mettre à jour le statut à 0 pour signifier la déconnexion
      await utilisateur.update({ status: 0 }, { where: { id: userId } });

      return {
        success: true,
        message: "Déconnexion réussie",
      };
    } else {
      return {
        success: false,
        message: "Utilisateur introuvable",
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Erreur lors de la déconnexion",
    };
  }
}


async function connected_users(userId) {
  try {
    const user = await utilisateur.findOne({ where: { id: userId } }); // Ajout d'await ici
   // console.log('le user : ', user);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const user_secteur = user.secteur;
    //console.log('utilisateur secteur : ', user_secteur);
    
    const connectedUsers = await utilisateur.findAll({ where: { status: 1, secteur: user_secteur } });
    
    if (connectedUsers && connectedUsers.length > 0) { // Vérifiez si des utilisateurs sont connectés
     // console.log(`Tous les utilisateurs du secteur ${user_secteur} connectés sont :`, connectedUsers);
      return { success: true, users: connectedUsers }; // Retourner les utilisateurs connectés
    } else {
      console.log('Aucun utilisateur connecté !');
      return { success: false, message: 'Aucun utilisateur connecté' }; // Retourner un message approprié
    }
    
  } catch (err) {
    console.error('Erreur lors de la récupération des utilisateurs connectés :', err); // Journaliser l'erreur
    return {
      success: false,
      message: "Erreur lors de la récupération des utilisateurs connectés !",
    };
  }
}


async function forgotPassword(email) {
  try {
      // Vérification de la validité de l'email
      if (!validator.isEmail(email)) {
          return {
              success: false,
              message: 'Adresse e-mail invalide',
          };
      }

      // Rechercher l'utilisateur par email
      const user = await utilisateur.findOne({ where: { email } });

      if (!user) {
          return {
              success: false,
              message: "Aucun utilisateur trouvé avec cette adresse e-mail.",
          };
      }

      // Vérifier que l'utilisateur a un Gmail enregistré
      if (!user.Gmail) {
          return {
              success: false,
              message: "L'utilisateur n'a pas de Gmail enregistré.",
          };
      }

      // Générer un code de réinitialisation et une date d'expiration
      const resetCode = crypto.randomInt(100000, 999999).toString();
      const expirationTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Mettre à jour la base de données avec le code et son expiration
      await utilisateur.update(
          { resetCode, resetCodeExpires: expirationTime },
          { where: { id: user.id } }
      );

      // Configurer le transporteur Nodemailer
      const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
              user: process.env.EMAIL_ADDRESS, 
              pass: process.env.EMAIL_PASSWORD, 
          },
      });

      // Contenu de l'email
      const mailOptions = {
          from: process.env.EMAIL_ADDRESS,
          to: user.Gmail, // Envoyer au Gmail de l'utilisateur
          subject: 'Réinitialisation de votre mot de passe',
          text: `Bonjour ${user.prenom || 'utilisateur'},\n\nVoici votre code de réinitialisation : ${resetCode}\n\nCe code est valable pendant 15 minutes.\n\nSi vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.\n\nCordialement,\nL'équipe.`,
      };

      // Envoyer l'email
      await transporter.sendMail(mailOptions);

      return {
          success: true,
          message: 'Code de réinitialisation envoyé avec succès à votre Gmail.',
      };
  } catch (error) {
      console.error('Erreur dans forgotPassword:', error);
      return {
          success: false,
          message: 'Une erreur est survenue lors de la réinitialisation du mot de passe.',
      };
  }
}




async function verifyResetCode(email, resetCode) {
  try {
      // Rechercher l'utilisateur par email
      const user = await utilisateur.findOne({ where: { email } });

      if (!user) {
          return {
              success: false,
              message: "Aucun utilisateur trouvé avec cette adresse e-mail.",
          };
      }

      // Vérification de l'existence du code et de sa validité
      if (
          !user.resetCode ||
          user.resetCode !== resetCode ||
          new Date() > new Date(user.resetCodeExpires)
      ) {
          return {
              success: false,
              message: 'Code de réinitialisation invalide ou expiré.',
          };
      }

      // Code valide, supprimer le code de réinitialisation pour éviter une réutilisation
      await utilisateur.update(
          { resetCode: null, resetCodeExpires: null , Mdp_change :1},
          { where: { id: user.id } }
      );

       // Génération du token JWT
       const token = jwt.sign({ userid: user.id }, process.env.JWT_SECRET, {
        expiresIn: '2h',
    });

      // Mise à jour du statut utilisateur (facultatif, comme dans `login`)
      await utilisateur.update({ status: 1 }, { where: { id: user.id } });


      return {
          success: true,
          message: `Code de réinitialisation vérifié avec succès pour ${user.prenom || 'utilisateur'}.`,
          token: token,
      };
  } catch (error) {
      console.error('Erreur dans verifyResetCode:', error);
      return {
          success: false,
          message: 'Une erreur est survenue lors de la vérification du code.',
      };
  }
}





















const JWT_SECRET = process.env.JWT_SECRET; 


const authenticate = (token) => {
  if (!token) {
      return "Token is missing";
  }
  try {
      const decoded = jwt.verify(token,JWT_SECRET);
     // console.log("decoded la : ",decoded);
      return decoded.userid; // Assurez-vous que la propriété est correcte
  } catch (err) {
      console.error("Invalid token:", err.message);
      return "Invalid Token";
  }
};

  

  async function profile (id) {
 
    try {
      const user = await utilisateur.findByPk(id);
      //console.log("le fameux id trouvé :", id); // Ajoute ceci pour le débogage

      if (!user) {
          return { status :false,
            message: "User not found" };
      }
      return{success : true, user};
  
    } catch (error) {
        console.error("Error fetching user details:", error);
        return  { success: false, message: "Internal Server Error" };
    }
  };

  
  
  /* -------------------------------- fin --------------------------------  */

















  /* -------------------------------- FICHIERS (profile page) PARTIE --------------------------------  */



  const mv  = require('mv');
  const path = require('path');
/*const { stat } = require("fs");
const { error } = require("console");*/
  const uploadDirectory = process.env.REPERTOIRE_PHOTO_VIDEO;
  
  
  async function add_files(userId, file_path, file_size, file_type, file_name) {
    let transaction;
    try {
        // Démarrer une transaction
        transaction = await sequelize.transaction();

        const destPath = path.join(uploadDirectory, file_name);

        // Déplacer le fichier de manière asynchrone dans le cadre de la transaction
        await new Promise((resolve, reject) => {
            mv(file_path, destPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Créer un nouvel enregistrement dans la table Files
        const newFile = await Files.create(
            {
                id_user: userId,
                file_path: file_name,
                file_size: file_size,
                file_type: file_type,
                file_name: file_name,
            },
            { transaction }
        );

        // Récupérer la valeur actuelle de Nbr_add_file
        const user = await utilisateur.findOne({ where: { id: userId }, transaction });
        const currentNbrAddFile = user.Nbr_add_file || 0; // Utiliser 0 si null

        // Mettre à jour l'attribut Nbr_add_file dans la table utilisateur
        await utilisateur.update(
            { Nbr_add_file: currentNbrAddFile + 1 ,add_file_on: 1},
            { where: { id: userId }, transaction }
        );

        // Valider la transaction
        await transaction.commit();

        return {
            success: true,
            message: 'Files uploaded successfully',
            data: newFile,
        };
    } catch (err) {
        console.error('Error uploading files:', err);

        // Annuler la transaction en cas d'erreur
        if (transaction) await transaction.rollback();
        return {
            success: false,
            message: 'Error occurred while uploading files',
        };
    }
}


async function get_file(id_user){ 
  try{

    const File = await Files.findAll({ where: { id_user: id_user } });

    if(File.length === 0){
      return{
          success: false,
        message: "No files found for this user."
      }
    };

      return {success : true, File };

    
    

  }catch(err){
  console.Error('cant find your files', err);
  }
}


async function get_file_per_id(id_user) {
  try {
    // Chercher les fichiers associés à l'ID utilisateur
    const files = await Files.findAll({ where: { id_user: id_user } });

    if (files.length === 0) {
      return {
        success: false,
        message: "Aucun fichier trouvé pour cet utilisateur."
      };
    }

    return { success: true, files: files };

  } catch (err) {
    console.error('Impossible de récupérer les fichiers:', err);
    return { success: false, message: 'Erreur lors de la récupération des fichiers.' };
  }
}


async function delete_file(userfile_id) {
  let transaction;
  try {
    // Démarrer une transaction
    transaction = await sequelize.transaction();

    // Trouver le fichier à supprimer
    const file = await Files.findOne({ where: { id: userfile_id }, transaction });

    if (file) {
      const userId = file.id_user;

      // Supprimer le fichier
      await Files.destroy({ where: { id: userfile_id }, transaction });

      // Récupérer l'utilisateur et sa valeur actuelle de Nbr_add_file
      const user = await utilisateur.findOne({ where: { id: userId }, transaction });

      if (user) {
        const updatedNbrAddFile = Math.max(0, user.Nbr_add_file - 1); // S'assurer que la valeur ne descend pas en dessous de 0

        // Mettre à jour add_file_on et Nbr_add_file
        await utilisateur.update(
          { add_file_on: 0, Nbr_add_file: updatedNbrAddFile },
          { where: { id: userId }, transaction }
        );
      }

      // Valider la transaction
      await transaction.commit();

      console.log(`Le fichier avec l'ID ${userfile_id} a été supprimé avec succès.`);
      return { success: true, message: 'Fichier supprimé avec succès.' };
    } else {
      // Annuler la transaction
      await transaction.rollback();
      console.log(`Aucun fichier trouvé avec l'ID ${userfile_id}.`);
      return { success: false, message: `Aucun fichier trouvé avec l'ID ${userfile_id}.` };
    }
  } catch (err) {
    console.error('Erreur lors de la suppression du fichier:', err);
    if (transaction) await transaction.rollback();
    return { success: false, message: 'Une erreur est survenue lors de la suppression du fichier.' };
  }
}







async function sendConfirmationEmail(Gmail, username,email) {
  try {
    // Générer un token de confirmation unique
    const confirmationToken = crypto.randomBytes(20).toString('hex');
    
    console.log('le gmail est arrivéer : ',Gmail);
    // Créer une date d'expiration pour le lien de confirmation (par exemple, 24 heures)
    const confirmationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    // Mettre à jour l'utilisateur avec le token et son expiration
    await utilisateur.update(
      { confirmationToken : confirmationToken, 
        confirmationTokenExpires: confirmationExpiry.toISOString() },
      { where: { email } }
    );

    console.log('update du confirmationTokenExpires...');
    // Configurer le transporteur Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_ADDRESS,  // Remplacez par votre email
        pass: process.env.EMAIL_PASSWORD,  // Remplacez par votre mot de passe d'application
      },
    });
    console.log(' nodemailer a été envoyer...');

    // L'URL de confirmation (vous devrez ajuster le chemin selon votre frontend)
   // const confirmationUrl = `http://localhost:3000/Page_One_For_All?page=confirm-email/${confirmationToken}`;
    // const confirmationUrl = `http://localhost:3000/confirm-email/${confirmationToken}`;
   const confirmationUrl = `http://localhost:3000/confirm-email/${encodeURIComponent(confirmationToken)},${encodeURIComponent(Gmail)}`;

    // Contenu de l'email
    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: Gmail,
      subject: 'Confirmez votre adresse e-mail',
      html: `
        <p>Bonjour ${username},</p>
        <p>Nous avons reçu une demande pour modifier votre Gmail. Pour confirmer que vous êtes bien à l'origine de cette demande, veuillez cliquer sur le lien ci-dessous :</p>
        <p><a href="${confirmationUrl}">Confirmer mon adresse e-mail</a></p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>
      `,
    };

    // Envoyer l'email
    await transporter.sendMail(mailOptions);

    console.log(' nodemailer sendMail confirmed...');

    return { success: true, message: 'Email de confirmation envoyé.' };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de confirmation:', error);
    return { success: false, message: 'Une erreur est survenue lors de l\'envoi de l\'email.' };
  }
}




async function change_params(userId, filePath, telephone, Gmail) {
  try {
    const user = await utilisateur.findOne({ where: { id: userId } });

    if (!user) {
      return {
        success: false,
        message: 'Utilisateur non trouvé !',
      };
    }

    // Mise à jour des paramètres uniquement si une valeur est fournie
    if (Gmail) {
      // Vérification si le Gmail est unique
      const existingUser = await utilisateur.findOne({ where: { Gmail } });
      if (existingUser) {
        return {
          success: false,
          message: 'Ce Gmail est déjà utilisé par un autre utilisateur.',
        };
      }

      // Mise à jour du Gmail et envoi d'un email de confirmation
      user.Gmail = Gmail;
      const confirmationResponse = await sendConfirmationEmail(Gmail, user.username, user.email);
      if (!confirmationResponse.success) {
        return {
          success: false,
          message: confirmationResponse.message,
        };
      }
    }

    if (filePath) {
      user.photoprofil = filePath;
    }

    if (telephone) {
      user.telephone = telephone;
    }

    await user.save();

    return {
      success: true,
      message: 'Paramètres mis à jour avec succès.',
      user: {
        id: user.id,
        Gmail: user.Gmail,
        telephone: user.telephone,
        photoprofil: user.photoprofil,
      },
    };
  } catch (err) {
    console.error('Erreur dans la modification des paramètres utilisateur !', err);
    return {
      success: false,
      message: 'Une erreur est survenue lors de la mise à jour des paramètres.',
    };
  }
}



async function Confirm_email(token,email) {

  try{
     const user = await utilisateur.findOne({
    where: { confirmationToken: token, confirmationTokenExpires: { [Op.gt]: new Date() } },
  });

  console.log('je suis arriver a confirmer_email ')
  if (!user) {
    return {
      success: false,
      message: 'Token invalide ou expiré.'
    };
  }


  // Mettre à jour le Gmail de l'utilisateur
  user.Gmail = email; // Assurez-vous que le nouveau Gmail est enregistré dans l'utilisateur.
  user.confirmationToken = null; // Réinitialiser le token de confirmation
  user.confirmationTokenExpires = null; // Réinitialiser l'expiration du token

  await user.save();
  console.log('confirm_email a fonctionné, Gmail changé');

  return {
    success: true,
    message: 'Email confirmé et mis à jour avec succès !'
  };
  }
 catch{
  console.error('Erreur dans la modification des informations du GMAIL !', err);
  return {
    status: false,
    message: 'Une erreur est survenue lors de la modification.',
  };
 }
 
}




  /* -------------------------------- fin --------------------------------  */





















    /* -------------------------------- VIDEOS PLAYLIST (formation page) PARTIE --------------------------------  */


    const { Op, where } = require('sequelize');

    const uploadDirectory2 = path.join(__dirname, 'Public', 'files');
    const fsPromises = require('fs').promises;
    
    async function add_video_or_playlist(
      userId,
      Nom_publication,
      Date_poste,
      Contenu_URL,
      Catégorie,
      secteur,
      miniature_URL,
      Description,
      selectedOption,
      selectedProjectId
    ) {
      let transaction;
      try {
        transaction = await sequelize.transaction();
    
        // Déplacer la vidéo et la miniature
        const destPathVideo = path.join(uploadDirectory, Contenu_URL);
        await fsPromises.rename(path.join(uploadDirectory, Contenu_URL), destPathVideo);
    
        if (miniature_URL) {
          const destPathMiniature = path.join(uploadDirectory, miniature_URL);
          await fsPromises.rename(path.join(uploadDirectory, miniature_URL), destPathMiniature);
        }
    
        // Récupérer l'utilisateur
        const user = await utilisateur.findByPk(userId, { transaction });
        if (!user) {
          return { success: false, message: 'Utilisateur non trouvé.' };
        }
    
        // Créer l'enregistrement dans la table Publications
        const newFile = await Publications.create(
          {
            id_User: userId,
            Nom_publication: Nom_publication,
            Date_poste: Date_poste,
            Contenu_URL: Contenu_URL,
            Catégorie: Catégorie,
            Secteur: user.secteur,
            miniature: miniature_URL,
            Description: Description,
            Types: selectedOption,
          },
          { transaction }
        );
    
        // Si la vidéo est privée, l'ajouter à la table ProjetVideos
        if (selectedOption === 'Privée') {
          if (selectedProjectId) {
            const isUserInProject = await Projets_membres.findOne({
              where: { id_user: userId, id_projet: selectedProjectId },
            });
    
            if (isUserInProject) {
              await ProjetVideos.create(
                {
                  id_projet: selectedProjectId,
                  id_video: newFile.id,
                },
                { transaction }
              );
            } else {
              return { success: false, message: "L'utilisateur n'appartient pas au projet sélectionné." };
            }
          } else {
            return { success: false, message: 'Aucun projet sélectionné.' };
          }
        }
    
        // Incrémenter Nbr_add_video de l'utilisateur
        await utilisateur.update(
          { Nbr_add_video: user.Nbr_add_video + 1 },
          { where: { id: userId }, transaction }
        );
    
        // Valider la transaction
        await transaction.commit();
        return {
          success: true,
          message: 'Vidéo ou playlist téléchargée avec succès',
          data: newFile,
        };
      } catch (err) {
        console.error('Erreur lors du téléchargement de la vidéo :', err);
        if (transaction) await transaction.rollback();
        return { success: false, message: 'Une erreur est survenue lors du téléchargement de la vidéo.' };
      }
    }
    

    async function get_all_vid(id_user) {
      try {
        // Vérifier si l'utilisateur existe et récupérer directement son secteur et son type
        const user = await utilisateur.findByPk(id_user);
    
        if (!user) {
          return { success: false, message: 'Utilisateur non trouvé.' };
        }
    
        // Vérifier que le type de l'utilisateur est "administrateur"
        if (user.role !== 'Administrateur') {
          return { success: false, message: 'Accès refusé : L\'utilisateur n\'est pas un administrateur.' };
        }
    
        // Ajouter ici la logique pour récupérer toutes les vidéos
        const videos = await Publications.findAll();
        if (videos.length === 0) {
          return { success: true, message: 'Aucune vidéo trouvée.' };
        }
        return {
          success: true,
          message: 'Vidéos récupérées avec succès.',
          Video: videos,
        };
      } catch (err) {
        console.error('Erreur lors de la récupération des vidéos :', err);
        return {
          success: false,
          message: 'Une erreur est survenue lors de la récupération de toutes les vidéos.',
          error: err.message,
        };
      }
    }
    



async function get_vid(id_user) {
  try {
      // Vérifier si l'utilisateur existe (et récupérer directement son secteur)
      const user = await utilisateur.findByPk(id_user, {
        attributes: ['id', 'secteur'], // Ne récupérer que ce qui est nécessaire
      });
  
      if (!user) {
        return { success: false, message: 'Utilisateur non trouvé.' };
      }

    // Obtenir les projets auxquels appartient l'utilisateur
    const projetsUtilisateur = await Projets_membres.findAll({
      where: { id_user: id_user },
      attributes: ['id_projet']
    });

    // Extraire les IDs des projets
    const projetsIds = projetsUtilisateur.map(projet => projet.id_projet);

    // Récupérer toutes les vidéos publiques dans le même secteur que l'utilisateur
    const videosPubliques = await Publications.findAll({
      where: {
        Types: 'Public', // Type public
        Secteur: user.secteur // Secteur de l'utilisateur
      }
    });

    // Récupérer les vidéos privées associées aux projets de l'utilisateur
    const videosPriveesAssociees = await ProjetVideos.findAll({
      where: { id_projet: projetsIds },
      include: [
        {
          model: Publications,
          as: 'Video',
          where: { Secteur: user.secteur }, // Filtrer par secteur
          required: true
        },
        {
          model: Projets,
          as: 'Projet',
          attributes: ['id_projet','Nom_projet','image'] // Inclure uniquement le nom du projet
        }
      ]
    });

      // Ajouter `Nom_projet` comme un attribut dans chaque vidéo
      const videosPrivees = videosPriveesAssociees.map(v => {
        const videoData = v.Video.toJSON(); // Convertir en objet manipulable
        videoData.Nom_projet = v.Projet?.Nom_projet || 'Nom inconnu'; // Ajouter `Nom_projet`
        videoData.id_projet = v.Projet?.id_projet || null;
        videoData.image = v.Projet?.image || null;
        return videoData;
      });

    // Combiner les vidéos publiques et privées
    const toutesLesVideos = [...videosPubliques, ...videosPrivees];

    return { success: true, Video: toutesLesVideos };
  } catch (err) {
    console.error('Erreur lors de la récupération des vidéos :', err);
    return {
      success: false,
      message: 'Une erreur est survenue lors de la récupération des vidéos.',
      error: err,
    };
  }
}




// ... existing code ...
const updateVideo = async (id,userId, nomVideo, description, fileName) => {
  try {

    // Exemple de mise à jour avec un ORM fictif
    const video = await Publications.findOne({ where: { id } });
    if (!video) {
      return { success: false, message: 'Vidéo non trouvée.' };
    }

    video.Nom_publication = nomVideo;
    video.Description = description;
    video.miniature = fileName;
    // Assurez-vous que le chemin du fichier est correct

    await video.save();

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la vidéo :', error);
    return { success: false, message: 'Erreur lors de la mise à jour de la vidéo.' };
  }
};




async function get_playlist(userid){ 
  try{

  
     const user = await utilisateur.findByPk(userid);
     if (!user) {
      return {success:false, message:'Utilisateur non trouvé. '};
     }
     

     const playlist = await Playlist.findAll({ where: { 
      Secteur :user.secteur,
     } });
     

    if(playlist.length === 0){
      return{
          success: false,
          message: "No playlist found for this user."
      }
    };
    
   
      return {success : true, playlist };

  }catch(err){
  console.Error('cant find your playlist', err);
  }
}


async function get_video_by_id(videoId) { 
  try {
      const video = await Publications.findOne({ 
          where: { 
              id: videoId,
              Catégorie: 'Video' 
          } 
      });

      if (!video) {
          return {
              success: false,
              message: "Aucune vidéo trouvée pour cet ID."
          };
      }

      return { success: true, video };
  } catch (err) {
      console.error('Erreur lors de la récupération de la vidéo:', err);
      return {
          success: false,
          message: 'Une erreur est survenue lors de la récupération de la vidéo',
          error: err,
      };
  }
}


async function get_playlist_by_id(pl_id) { 
  try {
 
      const playlist = await Playlist.findOne({ 
          where: { 
              id: pl_id, 
          } 
      });
   
      if (!playlist) {
          return {
              success: false,
              message: "Aucune playlist trouvée pour cet ID."
          };
      }


      return { success: true, playlist };
  } catch (err) {
      console.error('Erreur lors de la récupération de la playlist:', err);
      return {
          success: false,
          message: 'Une erreur est survenue lors de la récupération de la playlist',
          error: err,
      };
  }
}



async function delete_vid(id_vid) {
  try{

    const Video = await Publications.findOne({ where: { id: id_vid } });

    if (Video) {
      // Supprimer l'offre si elle existe
      await Publications.destroy({where:{id:id_vid}});
      console.log(`La video avec l'ID ${id_vid} a été supprimée avec succès.`);
      return { success: true, Video };
      
    } else {
      
      console.log(`Aucune video trouvée avec l'ID ${id_vid}.`);
      return { success: false, message: `Aucune video trouvé avec l'ID ${id_vid}.` };
    }

    
  }catch(err){
    console.error('Erreur lors de la suppression de la video:', err);
  }

}



async function find_all_user() {
  try {
    const Users = await utilisateur.findAll();
    if (Users.length > 0) {
     
      const usersDetails = Users.map(user => ({
        id : user.id,
        nom: user.nom,  
        prenom: user.prenom, 
        photoprofil:user.photoprofil,
        date_de_naissance : user.date_de_naissance,
        Gmail: user.Gmail,
      }));

      //console.log(`Utilisateurs retrouvés !`);
      return { success: true, Users: usersDetails };
    } else {
      console.log(`Aucun utilisateur n'a été trouvé.`);
      return { success: false, message: `Aucun utilisateur n'a été retrouvé` };
    }
  } catch (err) {
    console.error('Erreur lors du fetch des utilisateurs : ', err);
    return { success: false, message: 'Erreur lors de la récupération des utilisateurs' };
  }
}


async function add_comment(id_User,id_Video,Commentaire,Date_poste,Type_com,ParentId) {
  let transaction;
  try{

  
     transaction = await sequelize.transaction();


    const Comment = await Commentaires.create({
      id_User:id_User,
      id_Video:id_Video,
      Commentaire: Commentaire,
      Date_poste : Date_poste,
      Type_com:Type_com,
      ParentId:ParentId,
    },{transaction})

    
     await transaction.commit();

     return {
         success: true,
         message: 'Files uploaded successfully',
         data: Comment
     };



  }catch(err){
    console.error('Erreur lors de l ajout du commentaire : ', err);
    return { success: false, message: 'Erreur lors de la requete add_comment ! ' };
  }
  
}


async function get_comments(id_video){ 
  try{

     // Récupérer l'utilisateur de la base de données pour obtenir le secteur
     const video = await Publications.findByPk(id_video);
     if (!video) {
       return res.status(404).json({ success: false, message: 'video non trouvé.' });
     }
     
     
     const Comments = await Commentaires.findAll({where:{id_Video : id_video}});

    if(Comments.length === 0){
      return{
          success: false,
          message: "No files found for this user."
      }
    };

      return {success : true, Comments };

  }catch(err){
  console.Error('cant find your files', err);
  return{
    success : false,
    message : 'An error occured while retreving videos',
    error : err,
  }
  }
}

async function delete_comment(id_com) {
  try{

    const Com = await Commentaires.findOne({ where: { id: id_com } });

    if (Com) {
     
      await Commentaires.destroy({where:{id:id_com}});
      console.log(`Le commentaire avec l'ID ${id_com} a été supprimée avec succès.`);
      return { success: true, Com };
      
    } else {
      
      console.log(`Aucun commentaire trouvée avec l'ID ${id_com}.`);
      return { success: false, message: `Aucune commentaire trouvé avec l'ID ${id_com}.` };
    }

    
  }catch(err){
    console.error('Erreur lors de la suppression du commentaire :', err);
  }

}




async function add_playlist(userId,Nom_playlist) {
  try{

      
       const user = await utilisateur.findByPk(userId);
       if (!user) {
         return {success:false, message:'Utilisateur non trouvé. '};
       }
       

       
    const newplaylist =await Playlist.create({
      id_User:userId,
      Nom_playlist : Nom_playlist,
      id_Playlist : Playlist.id ,
      Secteur : user.secteur
    });

    if(newplaylist){
      return {success: true, message:'Video ajoutée avec succés à la playlist. '};
    }
   

  }catch(err){
    console.error('Erreur lors de l ajout de la playlist:', err);
    return { success: false, message: "Erreur lors de l'ajout de la playlist." };
  }
}


async function addVideoToPlaylist(id_Playlist, id_Video) {
  try {
    const playlist = await Playlist.findByPk(id_Playlist, {
      include: [{ model: Publications, as: 'Publications' }]
    });

    if (!playlist) {
      console.log('Playlist not found.');
      return { success: false, message: 'Playlist not found.' };
    }

    const video = await Publications.findByPk(id_Video);
    if (!video) {
      console.log('Vidéo non trouvée.');
      return { success: false, message: 'Vidéo non trouvée.' };
    }

    const existingEntry = await PlaylistVideos.findOne({
      where: {
        id_Playlist: id_Playlist,
        id_Video: id_Video
      }
    });

    if (existingEntry) {
      console.log('La vidéo est déjà dans la playlist.');
      return { success: false, message: 'La vidéo est déjà dans la playlist.' };
    }

    console.log('Ajout de la vidéo à la playlist...');
    await playlist.addPublication(video);

    console.log('Création de l\'enregistrement dans PlaylistVideos...');
    await PlaylistVideos.create({
      id_Video: video.id,
      id_Playlist: playlist.id,
    });

    return { success: true, message: 'Vidéo ajoutée à la playlist.' };
  } catch (err) {
    console.error('Erreur lors de l\'ajout de la vidéo à la playlist', err);
    return { success: false, message: 'Erreur serveur.' };
  }
}



async function getPlaylistWithVideos(id_Playlist) {
  try {
    // Récupérer la playlist et ses publications
    const playlist = await Playlist.findByPk(id_Playlist, {
      include: [
        {
          model: Publications,
          as: 'Publications',
         
        },
      ],
    });

    if (!playlist) {
      console.log('Playlist non trouvée.');
      return { success: false, message: 'Playlist non trouvée.' };
    }

    // Enrichir chaque vidéo avec son image associée
    const videosAvecImages = await Promise.all(
      playlist.Publications.map(async (video) => {
        // Trouver l'image associée si elle existe
        const projetVideo = await ProjetVideos.findOne({
          where: { id_video: video.id },
          include: [
            {
              model: Projets,
              as: 'Projet',
              attributes: ['image'], // Inclure uniquement l'image
            },
          ],
        });

        // Ajouter l'image au résultat de la vidéo
        const enrichedVideo = video.toJSON(); // Convertir en objet manipulable
        enrichedVideo.image = projetVideo?.Projet?.image || null; // Ajout de l'image si elle existe

        return enrichedVideo;
      })
    );

    return { success: true, playlist: { ...playlist.toJSON(), Publications: videosAvecImages } };
  } catch (err) {
    console.error('Erreur lors de la récupération de la playlist', err);
    return { success: false, message: 'Erreur serveur.' };
  }
}


async function delete_playlist(id_Playlist) {
  try{
    const playlist = await Playlist.findOne({ where: { id: id_Playlist } });

    if (playlist) {
      // Supprimer l'offre si elle existe
      await Playlist.destroy({where:{id:id_Playlist}});
      await PlaylistVideos.destroy({where:{id_Playlist}});
      console.log(`La playlist avec l'ID ${id_Playlist} a été supprimée avec succès.`);
      return { success: true, playlist };
      
    } else {
      
      console.log(`Aucune playlist trouvée avec l'ID ${id_Playlist}.`);
      return { success: false, message: `Aucune playlist trouvé avec l'ID ${id_Playlist}.` };
    }
    
  }catch(err){
    console.error('Erreur lors de la suppression de la playlist', err);
    return { success: false, message: 'Erreur serveur.' };
  }
  
}



async function delete_vid_in_playlist(id_vid, id_playlist) {
  try {
    // Trouver la vidéo dans la playlist spécifique
    const supp = await PlaylistVideos.findOne({
      where: {
        id_Video: id_vid,
        id_Playlist: id_playlist, // Jointure avec l'ID de la playlist
      }
    });

    if (supp) {
      // Supprimer la vidéo de la playlist
      await PlaylistVideos.destroy({
        where: {
          id_Video: id_vid,
          id_Playlist: id_playlist, // On s'assure de supprimer uniquement dans cette playlist
        }
      });
      console.log(`La vidéo avec l'ID ${id_vid} dans la playlist ${id_playlist} a été supprimée avec succès.`);
      return { success: true, supp };
    } else {
      console.log('Vidéo ou playlist introuvable');
      return { success: false, message: 'Vidéo ou playlist introuvable.' };
    }
  } catch (err) {
    console.error('Erreur lors de la suppression de la vidéo dans la playlist', err);
    return { success: false, message: 'Erreur serveur.' };
  }
}


/* -------------------------------- Fin PARTIE VIDEO PLAYLIST (FORMATION PAGE) --------------------------------  */














/* ------------------------------------------ PARTIE REPORT ----------------------------------------------------- */

async function find_all_employee(Secteur) {
  try {

    const Users = await utilisateur.findAll({where:{secteur:Secteur}});
    if (Users.length > 0) {
     
      const usersDetails = Users.map(user => ({
        id : user.id,
        nom: user.nom,  
        prenom: user.prenom, 
        photoprofil:user.photoprofil,
        role:user.role,
        telephone:user.telephone,
        date:user.date_de_naissance,
        Gmail : user.Gmail,
        Nbr_Connexion: user.Nbr_Connexion,
        Nbr_add_file: user.Nbr_add_file,
        Nbr_add_video: user.Nbr_add_video,
        add_file_on: user.add_file_on,
        lastLogin: user.lastLogin,

      }));


      //console.log(`Utilisateurs retrouvés !`);
      return { success: true, Users: usersDetails };
    } else {
      console.log(`Aucun utilisateur n'a été trouvé.`);
      return { success: false, message: `Aucun utilisateur n'a été retrouvé` };
    }
  } catch (err) {
    console.error('Erreur lors du fetch des utilisateurs : ', err);
    return { success: false, message: 'Erreur lors de la récupération des utilisateurs' };
  }
}

async function change_role(userId,rolename) {
  try {
    const user = await utilisateur.findOne({ where: { id: userId } });
  
    if(!user){
      return{
        status: false,
        message: 'utilisateur non trouvé !',
      }
    }
  
      
       if (rolename) user.role = rolename;
    
    await user.save();
  
    return{
      success: true,
      user: user,
      messsage:'Succées lors de la modification du role !'
    }
  
  }catch(err){
    console.error('Erreur dans la modification des informations role du profil !',err);
  }
  
  }
  

  async function addProject (Nom_projet,Description_projet,date_fin_projet,fileName,secteur) {
    try {
      const nouveauProjet = await Projets.create({Nom_projet: Nom_projet, Description:Description_projet,date_fin_projet:date_fin_projet,image:fileName,secteur:secteur });
      console.log('Projet ajouté avec succès :', nouveauProjet);
      return nouveauProjet;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du projet :', error);
      throw error;
    }
  };

  async function deleteProject(id_projet) {
    try {
      const projetSupprime = await Projets.destroy({
        where: { id_projet: id_projet }
      });
      if (projetSupprime === 0) {
        console.log('Aucun projet trouvé à supprimer.');
      } else {
        console.log(`Le projet ${id_projet} a été supprimé avec succès.`);
      }
      return projetSupprime;
    } catch (error) {
      console.error('Erreur lors de la suppression du projet :', error);
      throw error;
    }
  }
  
  
  async function find_all_projects(usersecteur) {
    try {
      const Projet = await Projets.findAll({where: {secteur:usersecteur}});
      if (Projet.length > 0) {
        return { success: true, Projet: Projet };
      } else {
        console.log(`Aucun Projet n'a été trouvé.`);
        return { success: false, message: `Aucun Projet n'a été retrouvé` };
      }
    } catch (err) {
      console.error('Erreur lors du fetch des Projets : ', err);
      return { success: false, message: 'Erreur lors de la récupération des Projet' };
    }
  }

  async function findMembersByProjectId(projectId) {
    try {
        const members = await Projets_membres.findAll({
            where: {
                id_projet: projectId,
            },
            include: [
                {
                    model: utilisateur,
                    as: 'Utilisateur', // Alias correct pour l'association avec 'utilisateur'
                    attributes: ['id', 'nom', 'prenom', 'role', 'date_de_naissance', 'photoprofil', 'telephone','Nbr_Connexion','Nbr_add_file','Nbr_add_video','add_file_on'], // Attributs utilisateur
                },
                {
                    model: Projets,
                    as: 'Projet', // Alias pour l'association avec 'Projets'
                    attributes: [] // Ne pas inclure d'attributs du projet
                }
            ]
        });

        if (members.length > 0) {
            // Mapper les utilisateurs pour structurer les données
            const usersDetails = members.map(member => {
                const user = member.Utilisateur; // Récupérer les informations utilisateur associées
                return user
                    ? {
                          id: user.id,
                          nom: user.nom,
                          prenom: user.prenom,
                          photoprofil: user.photoprofil,
                          role: user.role,
                          telephone: user.telephone,
                          date: user.date_de_naissance,
                          Nbr_Connexion:user.Nbr_Connexion,
                          Nbr_add_file:user.Nbr_add_file,
                          Nbr_add_video:user.Nbr_add_video,
                          add_file_on:user.add_file_on,
                      }
                    : null; // Si pas d'utilisateur, retourner null (ou gérer autrement)
            }).filter(user => user !== null); // Filtrer les entrées nulles

            return { success: true, Users: usersDetails }; // Retourner les données structurées
        } else {
            return { success: false, message: 'Aucun membre trouvé pour ce projet.' };
        }
    } catch (err) {
        console.error('Erreur lors de la récupération des membres du projet :', err);
        return { success: false, message: 'Erreur lors de la récupération des membres' };
    }
}


async function addmembersinprojet(userid,projetId) {
    try {
        
        // Vérifiez que l'utilisateur et le projet sont fournis
        if (!userid || !projetId) {
            return res.status(400).json({ message: "Veuillez fournir un utilisateur et un projet valide." });
        }

        // Vérifiez si l'utilisateur existe
        const user = await utilisateur.findByPk(userid);
        if (!user) {
          throw new Error("Utilisateur introuvable.");;
        }

        // Vérifiez si le projet existe
        const projet = await Projets.findByPk(projetId);
        if (!projet) {
          throw new Error("Projet introuvable.");
        }

        // Ajoutez l'utilisateur au projet, s'il n'est pas déjà membre
        const [member, created] = await Projets_membres.findOrCreate({
            where: { id_user: userid, id_projet: projetId },
            defaults: { id_user: userid, id_projet: projetId },
        });

        if (!created) {
          return { success: false, message: "L'utilisateur est déjà membre du projet." };
        }

        return { success: true, message: `Utilisateur ajouté au projet avec succès.`, projectId: projetId };
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'utilisateur au projet :", error.message);
      return { success: false, message: error.message };
    }
};

async function removeMemberFromProject(userId, projectId) {
  try {
    // Vérifiez que l'utilisateur et le projet sont fournis
    if (!userId || !projectId) {
      return { success: false, message: "Veuillez fournir un utilisateur et un projet valide." };
    }

    // Vérifiez si l'utilisateur existe
    const user = await utilisateur.findByPk(userId);
    if (!user) {
      return { success: false, message: "Utilisateur introuvable." };
    }

    // Vérifiez si le projet existe
    const project = await Projets.findByPk(projectId);
    if (!project) {
      return { success: false, message: "Projet introuvable." };
    }

    // Supprimer l'utilisateur du projet (en fonction de l'association dans Projets_membres)
    const memberToDelete = await Projets_membres.findOne({
      where: { id_user: userId, id_projet: projectId },
    });

    if (!memberToDelete) {
      return { success: false, message: "L'utilisateur n'est pas membre de ce projet." };
    }

    // Supprimer l'association
    await memberToDelete.destroy();

    return { success: true, message: "Utilisateur supprimé du projet avec succès." };
  } catch (err) {
    console.error("Erreur lors de la suppression de l'utilisateur du projet :", err);
    return { success: false, message: "Erreur lors de la suppression de l'utilisateur du projet." };
  }
}


async function find_all_projects_associed(userId) {
  try {
    const projets = await Projets.findAll({
      include: {
        model: Projets_membres,
        as: 'Membres', // Alias défini dans la relation
        where: { id_user: userId }, // Filtrer par l'utilisateur spécifique
        attributes: [], // On n'a pas besoin des colonnes de Projets_membres
      },
      attributes: ['id_projet', 'Nom_projet', 'Description','date_fin_projet', 'createdAt', 'updatedAt','image'], // Colonnes nécessaires de Projets
    });

    if (projets.length > 0) {
      return { success: true, projets };
    } else {
      console.log(`Aucun projet trouvé pour l'utilisateur avec l'ID ${userId}.`);
      return { success: false, message: `Aucun projet associé à l'utilisateur n'a été retrouvé.` };
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des projets : ', err);
    return { success: false, message: 'Erreur lors de la récupération des projets.' };
  }
}



/* -------------------------------- Fin PARTIE REPORT (report PAGE) --------------------------------  */












/* ------------------------------------------ PARTIE Dashbord ----------------------------------------------------- */


async function find_all_users() {
  try {

    const Users = await utilisateur.findAll();
    if (Users.length > 0) {
     
      const usersDetails = Users.map(user => ({
        id : user.id,
        nom: user.nom,  
        prenom: user.prenom, 
        photoprofil:user.photoprofil,
        role:user.role,
        secteur:user.secteur,
        telephone:user.telephone,
        date:user.date_de_naissance,
        Gmail:user.Gmail,
        Nbr_Connexion: user.Nbr_Connexion,
        Nbr_add_file: user.Nbr_add_file,
        add_file_on:user.add_file_on,
        Nbr_add_video:user.Nbr_add_video,
        lastLogin: user.lastLogin,
      }));


      //console.log(`Utilisateurs retrouvés !`);
      return { success: true, Users: usersDetails };
    } else {
      console.log(`Aucun utilisateur n'a été trouvé.`);
      return { success: false, message: `Aucun utilisateur n'a été retrouvé` };
    }
  } catch (err) {
    console.error('Erreur lors du fetch des utilisateurs : ', err);
    return { success: false, message: 'Erreur lors de la récupération des utilisateurs' };
  }
}



/* -------------------------------- Fin PARTIE Dashbord (Dashbord PAGE) --------------------------------  */




/*---------------------------PARTIE OBJECTIF----------------------------- */

async function add_objectif (Titre_objectif,nom_objectif,Description_objectif,fileName,id_projet,userid) {
  try {
    const nouveauObjectif = await Objectifs.create({
      Titre: Titre_objectif,
      Nom_objectif:nom_objectif,
      Description:Description_objectif,
      Fichier:fileName || null,
      id_Projet:id_projet,
      id_User:userid,
      Terminer:0,
     });
    console.log('Objectif ajouté avec succès :', nouveauObjectif);
    return nouveauObjectif;
  } catch (error) {
    console.error('Erreur lors de l\'ajout de lobjectif :', error);
    throw error;
  }
};


async function find_all_Objectifs(id_projet) {
  try {
    const objectifs = await Objectifs.findAll({
      where: {
        id_Projet: id_projet,  // Assurez-vous que la colonne est bien `id_projet`
      },
    });

    if (objectifs.length > 0) {
      return { success: true, objectifs: objectifs };
    } else {
      console.log(`Aucun Objectif n'a été trouvé pour ce projet.`);
      return { success: false, message: `Aucun Objectif trouvé pour ce projet` };
    }
  } catch (err) {
    console.error('Erreur lors du fetch des Objectifs : ', err);
    return { success: false, message: 'Erreur lors de la récupération des Objectifs' };
  }
}

async function delete_objectif(id_objectif) { 
  try {
    // Vérification si l'objectif existe
    const objectif = await Objectifs.findByPk(id_objectif);
    if (!objectif) {
      console.log(`Objectif avec l'id ${id_objectif} non trouvé.`);
      return { success: false, message: 'Objectif non trouvé.' };
    }

    // Suppression de l'objectif
    await objectif.destroy();
    console.log(`Objectif avec l'id ${id_objectif} supprimé avec succès.`);
    return { success: true, message: 'Objectif supprimé avec succès.' };
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'objectif :', error);
    throw error;
  }
};

async function all_obj() {
  try {

    const objectifs = await Objectifs.findAll();
    if (objectifs.length > 0) {

      //console.log(`Utilisateurs retrouvés !`);
      return { success: true, objectifs: objectifs };
    } else {
      console.log(`Aucun Objectifs n'a été trouvé.`);
      return { success: false, message: `Aucun Objectifs n'a été retrouvé` };
    }
  } catch (err) {
    console.error('Erreur lors du fetch des Objectifs : ', err);
    return { success: false, message: 'Erreur lors de la récupération des Objectifs' };
  }
}


async function change_finalisation_obj(userId,id_objectif,etat) {
  try {
    const objectif = await Objectifs.findOne({ where: { id: id_objectif } });
  
    if(!objectif){
      return{
        status: false,
        message: 'objectif non trouvé !',
      }
    }
  
      if(userId){
            objectif.Terminer = etat;
      }
     
    
    await objectif.save();
  
    return{
      success: true,
      objectif: objectif,
      messsage:'Succées lors de la modification de l objectif !'
    }
  
  }catch(err){
    console.error('Erreur dans la modification des informations de l objectif !',err);
  }
  
  }
  

  /* --------------------------------------------------------*/



  module.exports = { getUserById,getAllUsers_socket,
    register,login,change_mdp ,logout,authenticate,profile,connected_users,forgotPassword,verifyResetCode,
    add_files,get_file,get_file_per_id,delete_file,change_params,Confirm_email,
    add_video_or_playlist,get_vid,updateVideo,get_all_vid,get_video_by_id,delete_vid,find_all_user,add_comment,get_comments,delete_comment,
    add_playlist,get_playlist,get_playlist_by_id,addVideoToPlaylist,getPlaylistWithVideos,delete_playlist,delete_vid_in_playlist,
    find_all_employee,change_role,addProject,deleteProject,find_all_projects,findMembersByProjectId,addmembersinprojet,removeMemberFromProject,find_all_projects_associed,
    find_all_users,add_objectif,find_all_Objectifs,change_finalisation_obj,all_obj,delete_objectif}