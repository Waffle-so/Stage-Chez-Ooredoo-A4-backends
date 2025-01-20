/*Import des bibliothéques et autre  */
const express = require("express");
const app = express();
require('dotenv').config();
const bodyParser =require('body-parser');
const {getUserById,getAllUsers_socket,
  register,login,change_mdp,logout ,authenticate,profile,connected_users,forgotPassword,verifyResetCode,
  add_files,get_file,get_file_per_id,delete_file,change_params,Confirm_email,
  add_video_or_playlist,get_vid,get_all_vid,get_video_by_id,delete_vid,find_all_user,add_comment,get_comments,delete_comment,
  add_playlist,get_playlist,get_playlist_by_id,addVideoToPlaylist,getPlaylistWithVideos,delete_playlist,delete_vid_in_playlist,
  find_all_employee,change_role,addProject,deleteProject,find_all_projects,findMembersByProjectId,addmembersinprojet,removeMemberFromProject,find_all_projects_associed,
  find_all_users,add_objectif,find_all_Objectifs,change_finalisation_obj,all_obj,delete_objectif} = require('./Controller/Controller')
const cors = require('cors');
const cookie = require("cookie-parser");
const helmet = require('helmet'); // Importer helmet
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const limiter = require("./limiter"); // Importe le limiter
const { body, validationResult } = require('express-validator');
const http = require('http');
const socketIo = require('socket.io');
const {Server} = require('socket.io');
const logger = require('./Logger');
const cron = require('node-cron');
/* FIN */



app.use((req, res, next) => {
  if(req.method === 'OPTIONS' || req.url==='/api/user_info' || req.url==='/api/user_videos' || req.url.startsWith('/files/') 
    || req.url==='/api/profile' || req.url==='/api/user_files' || req.url==='/api/user_playlist'|| req.url==='/api/get_video_by_id' 
  || req.url==='/api/get_all_user' || req.url==='/api/get_comment_by_video_id' || req.url==='/api/get_playlist_videos' || req.url==='/api/get_all_users'|| req.url==='/api/profile'
  || req.url==='/api/get_all_employee' || req.url==='/api/get_all_projet_associer' || req.url==='/api/get_all_members' || req.url==='/api/get_all_projet' || req.url==='/api/logs'
  || req.url==='/api/get_all_objectifs' || req.url==='/api/get_all_employee' || req.url==='/api/logs'){
    return next();
  }
  logger.info(`HTTP ${req.method} ${req.url}`);
  next();
});

app.use((err, req, res, next) => {
  logger.error(`Erreur: ${err.message}`, { stack: err.stack });
  res.status(500).send('Erreur interne du serveur');
});





// Parse NODE_JS_API_URL into an array
const allowedOrigins = process.env.NODE_JS_API_URL
  ? process.env.NODE_JS_API_URL.split(',')
  : [];

/*Réglages */
require("./DB/Db");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(cookie());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Autoriser le chargement des ressources de différents domaines
  })
);


const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    //origin: process.env.NODE_JS_API_URL, // Make sure this matches your frontend's URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
    credentials: true,
  },
});

//limiter les api suivant
app.use('/api/submit', limiter);
app.use('/api/login', limiter);
app.use('/api/upload_file',limiter);
app.use('/api/delete_file',limiter);
app.use('/api/change_params',limiter);

app.use('/api/forgot_password',limiter);
app.use('/api/verifyResetCode',limiter);
app.use('/api/files',limiter);
app.use('/api/user_files',limiter);
app.use('/api/upload_vid_play',limiter);
app.use('/api/user_videos',limiter);
app.use('/api/user_playlist',limiter);
app.use('/api/get_video_by_id',limiter);
app.use('/api/delete_vid',limiter);
app.use('/api/get_all_user',limiter);
app.use('/api/add_comment',limiter);
app.use('/api/delete_comment',limiter);
app.use('/api/add_playlist',limiter);
app.use('/api/add_vid_in_play',limiter);
app.use('/api/delete_playlist',limiter);
app.use('/api/delete_vid_in_playlist',limiter);
app.use('/api/change_role',limiter);
app.use('/api/add_projet',limiter);
app.use('/api/add_member_inprojet',limiter);
app.use('/api/delete_projet',limiter);
app.use('/api/remove_member',limiter);





app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
  });


/*Fin */








  //-----------------------------------------------------------------------------------------

  const authenticateToken = (req, res, next) => {
    
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Authorization token is missing' });
    }
  
    const token = authHeader.split(' ')[1]; // "Bearer <token>"
    const userId = authenticate(token);
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  
    req.userId = userId;
    next();
  };
  

  
   //-----------------------------------------------------------------------------------------


app.post('/api/logs', authenticateToken, async (req, res) => {
  try {
    const logDir = path.join(__dirname, 'logs');
    const logFiles = fs.readdirSync(logDir);

    // Filtrer les fichiers qui commencent par 'app-' et se terminent par '.log'
    const latestLogFile = logFiles
      .filter(file => file.startsWith('app-') && file.endsWith('.log'))
      .sort((a, b) => fs.statSync(path.join(logDir, b)).mtime - fs.statSync(path.join(logDir, a)).mtime)[0]; // Trier par date de modification

    if (latestLogFile) {
      // Lire le fichier le plus récent
      const logData = fs.readFileSync(path.join(logDir, latestLogFile), 'utf8');
      res.status(200).json({ success: true, logs: logData });
    } else {
      res.status(404).json({ success: false, message: 'Log file not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reading log file', error: error.message });
  }
});


   /* __________________________________PARTIE LOGIN/SINGIN*__________________________________ */

//INSERT CRUD
app.post('/api/submit',authenticateToken,async (req, res) => {
    const nom = req.body.nom;
    const prenom = req.body.prenom;
    const date_de_naissance = req.body.date_de_naissance;
    const email = req.body.email;
    const pass = req.body.password;
    const secteur = req.body.secteur;
    const status = 0;
    const telephone =213;
    const role= req.body.role;
    const photoprofil = `${process.env.REPERTOIRE_PHOTO_VIDEO}/${process.env.PHOTO_PROFIL_PAR_DEFAUT}`;

    const username = req.body.username;
    const userprenom = req.body.userprenom;

   register(nom,prenom,date_de_naissance,email,pass,secteur,status,telephone,photoprofil,role)
   .then(result => {

    if (result) {
       // Log de l'enregistrement réussi
       logger.info(`Requête reçue pour /api/submit: l'utilisateur {${username} ${userprenom}} a ajouter un nouveau user : nom=${nom}, prenom=${prenom}, email=${email}, secteur=${secteur}, role=${role}`);

      res.status(200).send(result);
    } else {
        // Log de l'échec de l'enregistrement
        logger.warn(`Enregistrement échoué pour la requete /api/submit pour l'utilisateur l'utilisateur {${username} ${userprenom}} `);
      res.status(400).send(result);
    }
  })
  .catch(error => {
     // Log de l'erreur rencontrée
     logger.error('Erreur lors de l’enregistrement', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).send(error);
  });   
});

app.post('/api/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // Validation de l'email sans utiliser 'validator'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('Tentative de connexion avec un email invalide :', email);
    return res.status(400).send({ message: 'Email invalide' });
  }

  try {
    const result = await login(email, password);
    if (result.success) {
      logger.info(`Requête reçue pour /api/login', email=${email}`);
      res.cookie('token', result.token, {
        httpOnly: true,
      });
      res.status(200).send(result);
    } else {
      logger.warn(`Login échoué pour : email : ${email}`);
      console.log('Échec de la connexion pour l\'Email :', email);
      res.status(401).send(result);
    }
  } catch (err) {
    // Log de l'erreur rencontrée
    logger.error('Erreur lors du Login ', {
      error: err.message,
      stack: err.stack,
    });
    console.log("Erreur lors du login :", err);
    res.status(500).json({ success: false, message: "Erreur du serveur" });
  }
});



app.post('/api/logout',authenticateToken, (req, res) => {
  try{
    const nom =req.body.username;
    const prenom =req.body.userprenom;
    logout(req.userId)
    res.clearCookie('token'); // Supprime le cookie contenant le token JWT
    logger.info(`Déconnexion reçue pour /logout', {${nom} ${prenom}} `);
    res.status(200).json({ success: true, message: 'Déconnexion réussie' });
  }catch(err){
    logger.error(`Erreur lors de la déconnexion /logout pour {${nom} ${prenom}} `, {
      error: err.message,
      stack: err.stack,
    });
    console.log('erreur lors de la déconnexion')
  }

});


app.post('/api/change_mdp',authenticateToken, async (req, res) => {
  try {
    const { newpass, confirmnewpass, username, userprenom } = req.body;

    // Vérifier si les mots de passe correspondent
    if (newpass !== confirmnewpass) {
      res.status(400).json({ success: false, message: 'Les mots de passe ne correspondent pas.' });
      return;
    }
// Vérifier la longueur minimale et maximale du mot de passe
if (newpass.length < 10 || newpass.length > 30) {
  return res.status(400).json({ 
    success: false, 
    message: 'Le mot de passe doit contenir entre 10 et 30 caractères.' 
  });
}
    // Traitement du changement de mot de passe
    logger.info(`Requête reçue pour /api/change_mdp pour l'utilisateur {${username} ${userprenom}}`);
    
    // Simuler la fonction de changement de mot de passe
    const success = await change_mdp(req.userId, newpass); // À implémenter selon ta logique
    if (success) {
      res.status(200).json({ success: true, message: 'Mot de passe changé avec succès.' });
    } else {
      logger.warn(`Échec du changement de mot de passe pour {${username} ${userprenom}}`);
      res.status(400).json({ success: false, message: 'Problème lors du changement du mot de passe.' });
    }
  } catch (error) {
    logger.error('Erreur lors de la Requête /api/change_mdp', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});





app.post('/api/forgot_password', async (req, res) => {
  try {
    const { email } = req.body;
   const forget_pass_func = forgotPassword(email);

   if(forget_pass_func){
    logger.info(`Requête reçue pour /forget_pass_func pour le mail {${email}} `);
    res.status(200);
    res.json({ success: true, pass: forget_pass_func });
   }else{
    logger.warn(`Requête /forget_pass_func  échoué pour `);
    res.status(400).send('probléme lors de lenvoie du code pour avoir oublier le mot de passe ')
   }
    
  } catch (error) {
    logger.error('Erreur lors de la Requête /forget_pass_func ', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/verifyResetCode', async (req, res) => {
  try {
    const { email, resetCode } = req.body;

    // Validation des champs requis
    if (!email || !resetCode) {
      logger.warn(`Requête /verifyResetCode échouée : champs manquants`);
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir une adresse e-mail et un code de réinitialisation.',
      });
    }

    // Validation de l'email sans utiliser 'validator'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`Requête /verifyResetCode échouée : email invalide ${email}`);
      return res.status(400).json({ success: false, message: 'Email invalide' });
    }

    // Appel à la fonction verifyResetCode
    const result = await verifyResetCode(email, resetCode);

    if (result.success) {
      logger.info(`Code vérifié avec succès pour l'email : ${email}`);

      // Retourne le token via un cookie et dans le body
      res.cookie('token', result.token, { httpOnly: true });
      return res.status(200).json({
        success: true,
        message: result.message,
        token: result.token,
      });
    } else {
      logger.warn(`Code de réinitialisation invalide ou expiré pour : ${email}`);
      return res.status(401).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    // Log de l'erreur
    logger.error('Erreur lors de la requête /verifyResetCode', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
});








/* _____________________ PARTIE SOCKET _________________________________________________________ */

const connectedUsers = {};
const messageStore = {}; // Remplacement de Redis par un stockage en mémoire

// Chemin vers le fichier JSON contenant les messages
const pathh = path.join(__dirname, 'messages.json');

// Middleware d'authentification pour Socket.io
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authorization token is missing'));
  }

  const userId = authenticate(token); // Fonction d'authentification pour extraire l'ID utilisateur
  if (!userId) {
    return next(new Error('Invalid token'));
  }

  try {
    // Utilisation de la fonction du contrôleur pour obtenir les informations de l'utilisateur
    const user = await getUserById(userId);
    if (!user) {
      return next(new Error('User not found'));
    }

    // Stocker l'ID et le nom de l'utilisateur dans le socket
    socket.userId = user.id;
    socket.userName = `${user.prenom} ${user.nom}`; // Concatenation du prénom et nom
    socket.status = user.status;
    socket.photoprofil = user.photoprofil;
    socket.secteur = user.secteur;
    socket.role = user.role;

    next();
  } catch (error) {
    console.error(error.message);
    return next(new Error('Erreur serveur'));
  }
});


// Écouter les connexions des utilisateurs
io.on('connection', (socket) => {
  console.log('New client connected:', socket.userId);

  // Ajouter l'utilisateur connecté à la liste des utilisateurs connectés
  connectedUsers[socket.userId] = {
    socketId: socket.id,
    userId: socket.userId,
    userName: socket.userName,
    status: socket.status,
    photoprofil: socket.photoprofil,
    secteur: socket.secteur,
    role: socket.role,
  };

  socket.join(socket.userId);

  // Envoyer la liste des utilisateurs connectés à tous les clients
  io.emit('/api/connected_users', Object.values(connectedUsers).map(user => ({
    userId: user.userId, // Correction : envoyer l'userId, pas le socketId
    userName: user.userName,
    status: user.status,
    photoprofil: user.photoprofil,
    socketId: socket.id,
    secteur: user.secteur,
    role: user.role,
  })));



  socket.on('/api/get_all_users', async (callback) => {
    try {
        // Récupérer tous les utilisateurs en fonction du secteur
        const allUsers = await getAllUsers_socket(socket.secteur);

        if (!Array.isArray(allUsers)) {
            throw new Error("Données inattendues de la base de données");
        }

        // Traiter les utilisateurs en mappant les informations
        const usersWithConnectionStatus = allUsers.map(user => {
            const isConnected = connectedUsers[user.id];
            return {
                userId: user.id,
                userName: `${user.prenom} ${user.nom}`, // Nom complet
                status: isConnected ? connectedUsers[user.id].status : user.status,
                photoprofil: isConnected ? connectedUsers[user.id].photoprofil : user.photoprofil,
                secteur: isConnected ? connectedUsers[user.id].secteur : user.secteur,
                role: isConnected ? connectedUsers[user.id].role : user.role,
                isConnected: !!isConnected,
                socketId: isConnected ? connectedUsers[user.id].socketId : null,
            };
        });

        // Répondre avec les données
        callback({ success: true, users: usersWithConnectionStatus });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);

        // Empêcher la propagation de l'erreur et informer le client
        callback({ success: false, error: 'Une erreur est survenue lors de la récupération des utilisateurs. Veuillez réessayer plus tard.' });
    }
});



 // Lorsqu'un utilisateur se déconnecte
 socket.on('/api/disconnect', () => {
  console.log('Client disconnected:', socket.userId);

  const disconnectedUser = connectedUsers[socket.userId];
  if (disconnectedUser) {
    delete connectedUsers[socket.userId];

    // Envoyer la liste mise à jour des utilisateurs connectés
    io.emit('/api/connected_users', Object.values(connectedUsers).map(user => ({
      userId: user.userId,
      userName: user.userName,
      status: user.status,
      photoprofil: user.photoprofil,
      socketId: user.socketId,
      secteur: user.secteur,
      role: user.role,
    })));


    io.emit('/api/update_connected_users',Object.values(connectedUsers));
  }
});




// Gérer l'envoi de messages
socket.on('/api/send_message', async (data) => {
  const { senderId, recipientId, content,timestamp } = data;
  console.log(`Message de ${senderId} à ${recipientId}: ${content} à ${timestamp}`);

  // Récupérer l'utilisateur qui envoie le message et celui qui doit le recevoir
  const sender = connectedUsers[senderId];
  const recipient = connectedUsers[recipientId];

  // Vérifier si les deux utilisateurs appartiennent au même secteur
  if (sender && recipient && sender.secteur === recipient.secteur) {
    console.log(`Message de ${senderId} à ${recipientId} dans le secteur ${sender.secteur}: ${content}  à ${timestamp}`);

    // Envoyer le message au destinataire seulement s'ils sont dans le même secteur
    io.to(recipientId).emit('/api/receive_message', {
      senderId: senderId,
      recipientId: recipientId,
      content: content,
      timestamp: timestamp,
    });

    // Sauvegarder le message dans le fichier JSON
    const message = {
      senderId,
      recipientId,
      content,
      timestamp: timestamp,
    };

    // Vérifier si le fichier existe avant de lire
    fs.readFile(pathh, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // Si le fichier n'existe pas, créer un nouveau fichier avec un tableau de messages vide
          const initialData = { messages: [message] };
          fs.writeFile(pathh, JSON.stringify(initialData, null, 2), 'utf8', (err) => {
            if (err) {
              console.error('Erreur d\'écriture dans le fichier:', err);
            } else {
              console.log('Nouveau fichier créé avec le message');
            }
          });
        } else {
          console.error('Erreur de lecture du fichier:', err);
        }
      } else {
        try {
          // Si le fichier existe, tenter de lire et analyser les données
          const messagesData = JSON.parse(data);
          if (!messagesData.messages) {
            // Si la structure n'est pas correcte, initialiser le tableau messages
            messagesData.messages = [];
          }

          // Ajouter le message au tableau de messages
          messagesData.messages.push(message);

          // Réécrire le fichier avec le message ajouté
          fs.writeFile(pathh, JSON.stringify(messagesData, null, 2), 'utf8', (err) => {
            if (err) {
              console.error('Erreur d\'écriture dans le fichier:', err);
            }
          });
        } catch (parseError) {
          // Si la lecture échoue, log l'erreur
          console.error('Erreur de parsing du fichier JSON:', parseError);
        }
      }
    });
  } else {
    console.log(`Message bloqué : les utilisateurs ne sont pas dans le même secteur.`);
  }
});


 
  // Lors de la connexion d'un utilisateur
  socket.on('/api/connect', async () => {
    // Récupérer les messages en mémoire (remplaçant Redis)
    const messages = messageStore[socket.userId] || [];
    messages.forEach((message) => {
      socket.emit('api/receive_message', message);
    });
    
    delete messageStore[socket.userId];
  });


  // Nouvelle requête : send_notif
  socket.on('/api/send_notif', (data) => {
    const { message,timestamp } = data;
    console.log(`Notification envoyée à tous les utilisateurs: - ${message}`);

    // Diffuser la notification à tous les utilisateurs connectés
    io.emit('/api/receive_notif', {
      message: message,
      timestamp: timestamp,
    });
  });

});





// Endpoint HTTP pour récupérer les messages entre deux utilisateurs
app.post('/api/messages', (req, res) => {
  const { userId, chatUserId } = req.query;

  // Vérifier si les paramètres requis sont présents
  if (!userId || !chatUserId) {
    return res.status(400).json({ error: 'Les paramètres userId et chatUserId sont requis.' });
  }

  // Lire le fichier JSON contenant les messages
  fs.readFile(pathh, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Si le fichier n'existe pas, retourner un tableau vide
        return res.json({ messages: [] });
      } else {
        console.error('Erreur de lecture du fichier:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur.' });
      }
    }

    try {
      const messagesData = JSON.parse(data);
      const filteredMessages = messagesData.messages.filter(
        (msg) =>
          (msg.senderId === Number(userId) && msg.recipientId === Number(chatUserId)) ||
          (msg.senderId === Number(chatUserId) && msg.recipientId === Number(userId)) 
      );

      // S'assurer que chaque message contient le timestamp
      const messagesWithTimestamp = filteredMessages.map((msg) => ({
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        content: msg.content,
        timestamp: msg.timestamp,  // Assurer que timestamp est inclus
      }));

      res.json({ messages: messagesWithTimestamp });
    } catch (parseError) {
      console.error('Erreur de parsing du fichier JSON:', parseError);
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  });
});

// Tâche planifiée pour vider messages.json chaque jour à minuit
cron.schedule('0 0 * * *', () => {
  console.log('Tâche Cron : Réinitialisation de messages.json à minuit.');

  // Vider le fichier messages.json
  const emptyMessages = { messages: [] };

  fs.writeFile(pathh, JSON.stringify(emptyMessages, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de la réinitialisation de messages.json :', err.message);
    } else {
      console.log('messages.json a été réinitialisé avec succès.');
    }
  });
});


/* _____________________  FIN _________________________________________________________ */













/* _______________________________PARTIE RECUPERATION UTILISATEUR*_______________________________ */

app.post('/api/profile',authenticateToken, async (req, res) => {
  try {

  const userprofile = await profile(req.userId);

  if (userprofile.success) {
    res.status(200).send(userprofile);
  } else {
    logger.warn(`Requête /profile échoué pour : id : ${req.userId}`);
    res.status(401).send(userprofile);
  }}catch(error) {
    logger.error('Erreur lors de la Requête /profile', {
      error: error.message,
      stack: error.stack,
    });
      console.error("Erreur lors du login :", error);
      res.status(500).json({ success: false, message: "Erreur du serveur" });
    };
});









/* ______________________________________PARTIE GERER LES FICHIERS*______________________________________ */

app.use('/files',express.static(path.join(__dirname,process.env.REPERTOIRE_PHOTO_VIDEO)));
const uploadDirectory = process.env.REPERTOIRE_PHOTO_VIDEO;


if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    // Stocker le nom du fichier et son type
    const ext = path.extname(file.originalname); // Obtenir l'extension
    cb(null, `${file.fieldname}-${Date.now()}${ext}`); // Renommer le fichier
  },
});



const storagee = multer.memoryStorage();


const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/pdf',            // PDF files
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word (.docx) files
    'application/msword',         // Older Word (.doc) files
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel (.xlsx) files
    'application/vnd.ms-excel',   // Older Excel (.xls) files
  ];

  if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File size should not exceed 10 MB'), false);
    }
};


const fileFilter_img = (req, file, cb) => {
  const allowedTypes_img = ['image/png', 'image/jpeg', 'image/jpg', 'image/jfif'];
  if (allowedTypes_img.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé pour l\'image.'), false);
  }
};

const fileFilter_vid = (req, file, cb) => {
  const allowedTypes_vid = ['video/mp4', 'video/webm', 'video/ogg'];
  if (allowedTypes_vid.includes(file.mimetype)) {
    if (file.size > 2 * 1024 * 1024 * 1024) { // Vérifie si la vidéo dépasse 2 Go
      return cb(new Error('La taille de la vidéo ne doit pas dépasser 2 Go.'), false);
    }
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Seuls MP4, WebM, et Ogg sont acceptés.'), false);
  }
};


const fileFilter_formatin = (req,file ,cb)=>{
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/pdf',            // PDF files
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word (.docx) files
    'application/msword',         // Older Word (.doc) files
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel (.xlsx) files
    'application/vnd.ms-excel',   // Older Excel (.xls) files
    'video/mp4', 'video/webm',
    'text/csv',  // Fichiers CSV autorisés
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé pour l\'image.'), false);
  }
}


const TAILLE_fichier_MAX = 1 * 1024 * 1024 * 1024; //1 Gigabit max

const upload= multer({
  storage: storage,
  storagee:storage,
  fileFilter:fileFilter,
  limits:{fileSize: TAILLE_fichier_MAX}
})


const TAILLE_Publication_MAX = 5 * 1024 * 1024 * 1024; //5 Gigabit max

const upload2= multer({
  storage: storage,
  fileFilter_formatin:fileFilter_formatin,
  limits:{fileSize: TAILLE_Publication_MAX}
})


const TAILLE_IMAGE_MAX = 10 * 1024 * 1024; //10 Megabit max

const upload_img= multer({
  storage,
  fileFilter:fileFilter_img,
  limits:{fileSize: TAILLE_IMAGE_MAX}
})

const upload_minia_projet= multer({
  storage,
  fileFilter:fileFilter_img,
  limits:{fileSize: TAILLE_IMAGE_MAX}
})








/* ______________________________________PARTIE PROFILE*______________________________________ */


app.post('/api/upload_file',authenticateToken,upload.single('file'), async (req, res) => {
  try {
   
    // Récupère le fichier envoyé depuis le frontend
    const file = req.file;
    const { username, userprenom } = req.body;

    if(!file){
      return res.status(400).json({success :false, message : 'no file uploaded '});
    }

     // Informations sur le fichier
     const file_path = file.path;
     const file_size = file.size; // Taille du fichier en octets
     const file_type = file.mimetype;
     const file_name = file.originalname;
  
    const fiile = await add_files(req.userId,file_path,file_size,file_type,file_name);
    
    if (fiile.success) {
      logger.info(`Requête reçue pour /upload_file', l'utilisateur {${username} ${userprenom}} a ajouter le fichier file=${file_path} de taille=${file_size}`);

       res.status(200).send(fiile);
     } else {
      logger.warn(`Requête  /upload_file échoué pour l'utilisateur {${username} ${userprenom}} `);
       res.status(401).send(fiile);
     }

  
  } catch (error) {
    logger.error('Erreur lors de la requete /upload_file', {
      error: error.message,
      stack: error.stack,
    });
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




app.post('/api/user_files', authenticateToken, async (req, res) => {
  try {
    const File = await get_file(req.userId);

    if (File.success) {
      res.status(200).send(File);
    } else {
      logger.warn(`Requête /user_files échoué pour : id : ${req.userId}`);
      // If the user has no files, return an empty array with a success status
      res.status(200).json({ success: true, files: [], message: 'No files available' });
    }

  } catch (error) {
     // Log de l'erreur rencontrée
 logger.error('Erreur lors de la Requête /user_files', {
  error: error.message,
  stack: error.stack,
});
    console.error('Error fetching user files:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



app.post('/api/user_files_per_id', authenticateToken, async (req, res) => {
  try {
    // Récupérer les fichiers de l'utilisateur en fonction de son userId
    const userId = req.body.userId;
    const files = await get_file_per_id(userId);

    if (files.success) {
      res.status(200).send(files);
    } else {
      logger.warn(`Requête /user_files échouée pour l'ID : ${userId}`);
      // Si aucun fichier n'est trouvé, renvoyer une réponse avec succès mais tableau vide
      res.status(200).json({ success: true, files: [], message: 'Aucun fichier disponible' });
    }

  } catch (error) {
    // Log de l'erreur rencontrée
    logger.error('Erreur lors de la Requête /user_files', {
      error: error.message,
      stack: error.stack,
    });
    console.error('Erreur lors de la récupération des fichiers de l\'utilisateur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur interne' });
  }
});




app.post('/api/delete_file',authenticateToken,async(req,res)=>{
  try{
   
  const userfile_id = req.body.userfile_id;
  const nom = req.body.username;
  const prenom = req.body.userprenom;
  const fileName = req.body.fileName;
  const fich = await delete_file(userfile_id);
  logger.info(`Requête reçue pour /delete_file',l'utilisateur {${nom} ${prenom}} a supprimer le fichier ${fileName} `);
  res.status(200).json(fich);

  }catch(err){
    logger.error('Erreur lors de la Requête /delete_file', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Error deleting file:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




// Route change_params
app.post('/api/change_params', authenticateToken,upload_img.single('image'), 

  async (req, res) => {
    try {
      // Vérifiez les erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }


      // Récupère le fichier envoyé depuis le frontend
      const file = req.file;
      const telephone = req.body.newtelephone;
      const Gmail = req.body.newGmail;
      const filePath = file ? file.path : null;

        // Vérification de la taille du téléphone (max 15 caractères)
    if (telephone && telephone.length > 15) {
      return res.status(400).json({ success: false, message: 'Le numéro de téléphone ne doit pas dépasser 15 caractères.' });
    }


     // Vérification de la taille du Gmail (max 60 caractères)
     if (Gmail && Gmail.length > 60) {
      return res.status(400).json({ success: false, message: 'Le Gmail ne doit pas dépasser 80 caractères.' });
    }
    
     

      if (!filePath && !telephone && !Gmail) {
        return res.status(400).json({ success: false, message: 'Aucun paramètre à modifier.' });
      }
  
 
      // Utilisez le chemin du fichier au lieu de l'objet entier
        const { username, userprenom } = req.body;
        const submit = await change_params(req.userId, filePath, telephone,Gmail);

      if (submit.success) {
        logger.info(`Requête reçue pour /change_params' par l'utilisateur {${username} ${userprenom}}. voici ce qui a été modifié la photo de profil :${filePath} && le numéro de telephone ${telephone} && son Gmail : ${Gmail} `);
        let message = 'Paramètres mis à jour avec succès.';
      if (Gmail) {
        message += ' Un email de confirmation a été envoyé.';
      }
        res.status(200).json({success:true,message});
      } else {
        logger.warn(`Requête /change_params échoué pour l'utilisateur {${username} ${userprenom}}`);
        res.status(401).json(submit);
      }

    } catch (err) {
      logger.error('Erreur lors de la Requête /change_params', {
        error: err.message,
        stack: err.stack,
      });
      console.error('Error uploading file:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});



app.post('/api/confirm-email/:token', async (req, res) => {
  const { token } = req.params;
  const { email } = req.body;  // Récupère l'email du corps de la requête
  console.log('Le email a été récupéré: ', email);

  try {
    // Appelle la fonction Confirm_email avec le token et l'email
    const result = await Confirm_email(token, email);  // Assurez-vous que Confirm_email retourne une promesse avec un message
    
    if (result.success) {
      // Si la confirmation réussie
      res.json({
        success: true,
        message: 'Email confirmé avec succès !'
      });
    } else {
      // Si la confirmation échoue
      res.json({
        success: false,
        message: result.message || 'Erreur lors de la confirmation de l\'email.'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la confirmation de Confirm_email:', error);
    res.status(500).json({ success: false, message: 'Une erreur est survenue.' });
  }
});








/* ______________________________________PARTIE FORMATION*______________________________________ */


// Utilisation de upload.fields() pour spécifier les filtres sur les champs de fichier
const uploadFields = upload2.fields([
  { name: 'miniature', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

app.post('/api/upload_vid_play', authenticateToken, uploadFields, (req, res) => {
  try {
    if (!req.files['file']) {
      return res.status(400).json({ success: false, message: 'Vidéo ou document manquant.' });
    }

    const videoFile = req.files['file'][0]; // Le fichier (vidéo ou document)
    let imageFile = null;

    if (req.files['miniature']) {
      imageFile = req.files['miniature'][0];
    }

    console.log("Received files:", { imageFile, videoFile });

    // Filtre pour l'image, uniquement si une miniature a été fournie
    if (imageFile) {
      fileFilter_img(req, imageFile, (err) => {
        if (err)
           {
            return res.status(400).json({ success: false, message: err.message });
          }
      });
    }

    // Filtre pour le fichier principal
    fileFilter_formatin(req, videoFile, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
    });

    // Détermination de la catégorie (Video ou Document) selon le mimetype
    let Catégorie;
    switch (videoFile.mimetype) {
      case 'video/mp4':
      case 'video/avi':
      case 'video/mkv':
        Catégorie = 'Video';
        break;
      default:
        Catégorie = 'Document';
    }

    // Récupérer des informations supplémentaires depuis le corps de la requête
    const { Nom_publication, Description, selectedOption, selectedProjectId,username,userprenom } = req.body;
    const secteur = ''; // Secteur à ajuster selon ton application
    const Date_poste = Date.now();
    const Contenu_URL = videoFile.filename; // Nom du fichier vidéo ou document
    const miniature_URL = imageFile ? imageFile.filename : null; // Miniature si elle existe

    // Vérification de la longueur du nom de publication
    if (Nom_publication.length <= 65) {
      console.log("Le nom de la vidéo ou du document est valide.");
    } else {
      console.log("Le nom de la vidéo ou du document doit contenir moins de 65 caractères.");
      return res.status(400).json({ success: false, message: 'Le nom de la publication est trop long.' });
    }


     // Vérification de la longueur du nom de publication
     if (Description.length <= 700) {
      console.log("La Description de la vidéo est valide.");
    } else {
      console.log("La Description de la vidéo doit contenir moins de 700 caractères.");
      return res.status(400).json({ success: false, message: 'La Description de la publication est trop long.' });
    }


    // Ajout de logs pour vérifier les valeurs
    console.log("Contenu_URL:", Contenu_URL);
    console.log("miniature_URL:", miniature_URL);
    console.log("Catégorie:", Catégorie);
    console.log("selectedOption:", selectedOption);



    // Appel de la fonction pour ajouter la vidéo ou le document
    add_video_or_playlist(req.userId, Nom_publication, Date_poste, Contenu_URL, Catégorie, secteur, miniature_URL, Description,selectedOption,selectedProjectId)
    .then(file => {
      // Log de succès après l'ajout réussi
      logger.info(`Vidéo ou document: {${Contenu_URL}} ajouté avec succès par l'utilisateur  {${username} ${userprenom}.} `),
      res.status(200).send(file);
    })
    .catch(err => {
      // Log d'erreur en cas d'échec
      logger.error('Échec de l’ajout de la vidéo ou du document', {
        userId: req.userId,
        error: err.message,
        stack: err.stack
      });
      res.status(401).send(err);
    });

  } catch (error) {
    console.error('Error uploading video or document:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




app.post('/api/user_videos', authenticateToken, async (req, res) => {
  try {
    const video = await get_vid(req.userId);

 
    if (video.success) {
      res.status(200).send(video);
    } else {
      // If the user has no files, return an empty array with a success status
      res.status(200).json({ success: true, video: [], message: 'No files available' });
    }

  } catch (error) {
    console.error('Error fetching user files:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


app.post('/api/get_all_vid', authenticateToken, async (req, res) => {
  try {
    const video = await get_all_vid(req.userId);

    if (video.success) {
      res.status(200).send(video);
    } else {
      // If the user has no files, return an empty array with a success status
      res.status(200).json({ success: true, video: [], message: 'No files available' });
    }

  } catch (error) {
    console.error('Error fetching user files:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



app.post('/api/user_playlist', authenticateToken, async (req, res) => {
  try {
    const playlist = await get_playlist(req.userId);

 
    if (playlist.success) {
      console.log(playlist);
      res.status(200).send(playlist);
    } else {
      // If the user has no files, return an empty array with a success status
      res.status(200).json({ success: true, playlist: [], message: 'No files available' });
    }

  } catch (error) {
    console.error('Error fetching user files:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




app.post('/api/get_video_by_id', authenticateToken, async (req, res) => {
  try {
      const videoId = req.body.id; // Récupérer l'ID de la vidéo à partir du corps de la requête
      const video = await get_video_by_id(videoId); // Passer l'ID de la vidéo à la fonction

      if (video.success) {
          res.status(200).send(video); // Retourner les détails de la vidéo
      } else {
          res.status(200).json({ success: false, message: 'Aucune vidéo trouvée' });
      }
  } catch (error) {
      console.error('Error fetching video:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


app.post('/api/user_info', authenticateToken, async (req, res) => {
  try {
 
    const user_id = req.body.userId;
    const userInfo = await profile(user_id);

    if (userInfo.success) {
      res.status(200).send(userInfo);
    } else {
      res.status(200).json({ success: true, userInfo: [], message: 'No files available' });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});





app.post('/api/delete_vid',authenticateToken,async(req,res)=>{
  try{
   
  const id_vid = req.body.id_vid;
  const Name_video = req.body.videoname;
  const { username, userprenom } = req.body;
  if (!id_vid) {
    console.error("ID de la vidéo non fourni");
    return res.status(400).json({ success: false, message: 'ID de la vidéo manquant' });
  }
  console.log(`ID de la vidéo à supprimer: ${id_vid} son nom : ${Name_video}`);

  const fich = await delete_vid(id_vid);
  console.log('fichier supprimer');
  logger.info(`Requête reçue pour /delete_vid', la video ${Name_video} supprimer par l'utilisateur {${username} ${userprenom}.}`);
  res.status(200).json(fich);

  }catch(err){
    logger.error('Erreur lors de la Requête /delete_vid ', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Error deleting video:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post('/api/get_all_user',authenticateToken,async(req,res)=>{
  try{

    const all_users = await find_all_user();
    console.log('tout les users ont été retrouvé');
    res.status(200).json(all_users);
  

  }catch(err){
    console.error('Error deleting video:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
})


app.post('/api/add_comment',authenticateToken,async(req,res)=>{
  try{

    const id_User = req.body.id_User;
    const id_Video = req.body.id_Video;
    const Commentaire = req.body.Commentaire;
    const Date_poste = Date.now();
    const nom = req.body.username;
    const prenom = req.body.userprenom;
    const Type_com = req.body.Type_com;
    const ParentId = req.body.ParentId;
    
    if (Commentaire.length > 400) {
      alert('Commentaire beaucoup trop long !')
      return;
  }

   add_comment(id_User,id_Video,Commentaire,Date_poste,Type_com,ParentId)
   .then(result => {
    //console.log("nta howa result", result)
    if (result) {
      logger.info(`Requête reçue pour /add_comment' un commentaire a été ajouter par l'utilisateur {${nom} ${prenom}} sous la video ${id_Video}`);
      res.status(200).send(result);
    } else {
      logger.warn(`Requête /add_comment échoué pour l'utilisateur {${nom} ${prenom}}`);
      res.status(400).send(result);
    }
  })

  }catch(err){
    logger.error('Erreur lors de la Requête /add_comment ', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Error when add comment :', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
})




app.post('/api/get_comment_by_video_id', authenticateToken, async (req, res) => {
  try {
      const videoId = req.body.id; // Récupérer l'ID de la vidéo à partir du corps de la requête
      const comments = await get_comments(videoId); // Passer l'ID de la vidéo à la fonction

      if (comments.success) {
          res.status(200).send(comments); // Retourner les détails de la vidéo
      } else {
          res.status(200).json({ success: false, message: 'Aucun commentaure trouvée' });
      }
  } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post('/api/delete_comment',authenticateToken,async(req,res)=>{
  try{
   
  const id_com = req.body.id_comment;
  const nom = req.body.username;
  const prenom = req.body.userprenom;
  if (!id_com) {
    console.error("ID du commentaire non fourni");
    return res.status(400).json({ success: false, message: 'ID du commentaire manquant' });
  }
  console.log(`ID du commentaire à supprimer: ${id_com}`);

  const fich = await delete_comment(id_com);
  console.log('commentaire supprimer');
  logger.info(`Requête reçue pour /delete_comment' un commentaire id=${id_com} a été supprimer par l'utilisateur {${nom} ${prenom}} `);
  res.status(200).json(fich);

  }catch(err){
    logger.error('Erreur lors de la Requête /delete_comment ', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Error deleting comment:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



app.post('/api/add_playlist',authenticateToken,async(req,res)=>{
  try{

   
    const Nom_playlist = req.body.newplaylist;
    const nom = req.body.username;
    const prenom = req.body.userprenom;

    if ( !Nom_playlist || Nom_playlist.length <= 50) {
      console.log("Le nom de la playlist est valide.");
  } else {
      console.log("Le nom de la playlist doit contenir moins de 50 caractères.");
  }

   add_playlist(req.userId,Nom_playlist)
   .then(result => {
   console.log("nta howa result", result)
    if (result) {
      logger.info(`Requête reçue pour /add_playlist' une playlist nom {${Nom_playlist}} a été ajouté par l'utilisateur  {${nom} ${prenom}}`);
      res.status(200).send(result);
    } else {
      logger.warn(`Requête /add_playlist échoué par l'utilisateur  {${nom} ${prenom}}`);
      res.status(400).send(result);
    }
  })

  }catch(err){
    logger.error('Erreur lors de la Requête /add_playlist ', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Error when add comment :', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
})

app.post('/api/get_playlist_videos', authenticateToken, async (req, res) => {
  try {
      const pl_id = req.body.id; // Récupérer l'ID de la vidéo à partir du corps de la requête
      console.log(pl_id);
      const playlist = await getPlaylistWithVideos(pl_id); // Passer l'ID de la vidéo à la fonction

      if (playlist.success) {
          res.status(200).send(playlist); // Retourner les détails de la vidéo
      } else {
          res.status(200).json({ success: false, message: 'Aucune playlist trouvée' });
      }
  } catch (error) {
      console.error('Error fetching playlists:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


app.post('/api/add_vid_in_play', authenticateToken, async (req, res) => {
  try {
    
    const pl_id = parseInt(req.body.id_Playlist, 10);
      const id_video = req.body.videoId;
      const nom = req.body.username;
      const prenom = req.body.userprenom;
     
      console.log(pl_id, 'et' , id_video);
      const playlist = await addVideoToPlaylist(pl_id,id_video); // Passer l'ID de la vidéo à la fonction

      if (playlist.success) {
        logger.info(`Requête reçue pour /add_vid_in_play' la video {${id_video}} a la playlist {${pl_id}},par l'utilisateur {${nom} ${prenom}}`);
          res.status(200).send(playlist); // Retourner les détails de la vidéo
      } else {
        logger.warn(`Requête /add_vid_in_play  échoué pour l'utilisateur {${nom} ${prenom}}`);
          res.status(200).json({ success: false, message: 'Aucune playlist trouvée' });
      }
  } catch (error) {
    logger.error('Erreur lors de la Requête /add_vid_in_play ', {
      error: error.message,
      stack: error.stack,
    });
      console.error('Error fetching playlists:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



app.post('/api/delete_playlist',authenticateToken,async(req,res)=>{
  try{
   
  const id_play = req.body.id_play;
  const nom = req.body.username;
  const prenom = req.body.userprenom;
  const Nom_playlist = req.body.Nom_playlist;
     
  if (!id_play) {
    console.error("ID de la playlist non fourni");
    return res.status(400).json({ success: false, message: 'ID de la playlist manquant' });
  }
  console.log(`ID de la playlist à supprimer: ${id_play}`);

  const fich = await delete_playlist(id_play);
  console.log('playlist supprimer');
  logger.info(`Requête reçue pour /delete_playlist' la playlist {${Nom_playlist}} a été supprimer par l'utilisateur {${nom} ${prenom}}`);
  res.status(200).json(fich);

  }catch(err){
    logger.error('Erreur lors de la Requête /connected_users ', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Error deleting playlist:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});





app.post('/api/delete_vid_in_playlist',authenticateToken,async(req,res)=>{
  try{
   
  const id_play = req.body.id_play;
  const id_vid = req.body.id_vid;
  const nom = req.body.username;
  const prenom = req.body.userprenom;

  console.log('id de la playlist est la mon gros :' ,id_play);
  console.log('id de la video est la mon gros :' ,id_vid);

  if (!id_play) {
    console.error("ID de la playlist non fourni");
    return res.status(400).json({ success: false, message: 'ID de la playlist manquant' });
  }

  if (!id_vid) {
    console.error("ID de la video non fourni");
    return res.status(400).json({ success: false, message: 'ID de la video manquant' });
  }


  const fich = await delete_vid_in_playlist(id_vid,id_play);
  console.log('video dans la playlist supprimer avec succes ');
  logger.info(`Requête reçue pour /delete_vid_in_playlist' la video {${id_vid}} a été supprimer dans la playlist {${id_play}} par l'utilisateur {${nom} ${prenom}}`);
  res.status(200).json(fich);

  }catch(err){
    logger.error(`Erreur lors de la Requête /delete_vid_in_playlist pour l'utilisateur {${nom} ${prenom}} `, {
      error: err.message,
      stack: err.stack,
    });
    console.error('Error deleting video in playlist :', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});










   /* __________________________________PARTIE Report *__________________________________ */

   app.post('/api/get_all_employee',authenticateToken,async(req,res)=>{
    try{
     
      const Secteur = req.body.usersecteur;
      console.log(Secteur);
      const all_users = await find_all_employee(Secteur);
      console.log('tout les users ont été retrouvé');
      res.status(200).json(all_users);
    
  
    }catch(err){
      console.error('Error fidning users:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  })




app.post('/api/change_role',authenticateToken, async (req, res) => {
    try {

      // Récupère le fichier envoyé depuis le frontend
      const role = req.body.role;
      const user_id = req.body.userid;
      const nom = req.body.username;
      const prenom = req.body.userprenom;

      const nom_user = req.body.nom;
      const prenom_user = req.body.prenom;
      if (!role ) {
        return res.status(400).json({ success: false, message: 'No role uploaded' });
      }

      const submit = await change_role(user_id, role);

      if (submit.success) {
        logger.info(`Requête reçue pour /change_role', l'utilisateur {${nom} ${prenom}} a changer le role de l'utlisateur {${nom_user} ${prenom_user}} par le role {${role}}`);
        res.status(200).send(submit);
      } else {
        logger.warn(`Requête /change_role échoué pour l'utilisateur {${nom} ${prenom}}`);
        res.status(401).send(submit);
      }

    } catch (err) {
      logger.error(`Erreur lors de la Requête /change_role pour l'utilisateur {${nom} ${prenom}} `, {
        error: err.message,
        stack: err.stack,
      });
      console.error('Error uploading role:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});


app.post('/api/add_projet',authenticateToken,upload_img.single('file'),async(req,res)=>{
  try{
    const nom_projet = req.body.nom_projet;
    const Description_projet = req.body.Description_projet;
    const date_fin_projet = req.body.date_fin_projet;
    const nom = req.body.username;
    const prenom = req.body.userprenom;
    const secteur = req.body.usersecteur;
    
   // Vérification de la longueur du nom du projet
   if (!nom_projet || nom_projet.length > 60) {
    return res.status(400).json({
      success: false,
      message: "Le nom du projet doit contenir 60 caractères ou moins.",
    });
  }

   // Vérification de la longueur du nom du projet
   if (!Description_projet || Description_projet.length > 400) {
    return res.status(400).json({
      success: false,
      message: "Le Description du projet doit contenir 400 caractères ou moins.",
    });
  }

   // Vérification de la longueur du nom du projet
   if (!date_fin_projet ) {
    return res.status(400).json({
      success: false,
      message: "Le date_fin_projet du projet doit être remplie.",
    });
  }
  
  console.log('ici arriver')
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Le fichier du projet est requis.',
    });
  }

  // Informations du fichier téléchargé
  const fileName = req.file.filename;
  const filePath = req.file.path;

  console.log('Fichier reçu:', { fileName, filePath });


   addProject(nom_projet,Description_projet,date_fin_projet,fileName,secteur)
   .then(result => {
    if (result) {
      logger.info(`Requête reçue pour /add_projet', l'utilisateur {${nom} ${prenom}} a ajouter le projet {${nom_projet}}`);
      res.status(200).send(result);
    } else {
      logger.warn(`Requête /add_projet  échoué pour l'utilisateur {${nom} ${prenom}}`);
      res.status(400).send(result);
    }
  })

  }catch(err){
    logger.error('Erreur lors de la Requête /add_projet ', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Error when add new projct :', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
})


app.post('/api/get_all_projet',authenticateToken,async(req,res)=>{
  try{
   
    const usersecteur = req.body.usersecteur;
    if(req.userId){
      const all_users = await find_all_projects(usersecteur);
      console.log('tout les users ont été retrouvé');
      res.status(200).json(all_users);
    }else{
      console.log('aucun projet na etait trouver !');
    }
  

  }catch(err){
    console.error('Error fidning users:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
})


app.post('/api/get_all_members',authenticateToken,async(req,res)=>{
  try{
   
    const id_projet=req.body.id_projet;
    if(req.userId){
      const members = await findMembersByProjectId(id_projet);
      console.log('tout les users ont été retrouvé');
      res.status(200).json(members);
    }else{
      console.log('aucun projet na etait trouver !');
    }
  

  }catch(err){
    console.error('Error fidning users:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
})




app.post('/api/add_member_inprojet',authenticateToken,async(req,res)=>{
  try{
    const userId = req.body.userid;
    const ProjetId = req.body.projetId;
    const nom = req.body.username;
    const prenom = req.body.userprenom;
    const Projetname = req.body.projet_name;
    const nom_user = req.body.nom;
    const prenom_user = req.body.prenom;


    addmembersinprojet(userId,ProjetId)
   .then(result => {
    if (result) {
      logger.info(`Requête reçue pour /add_member_inprojet',  l'utilisateur {${nom} ${prenom}}  à ajouter l'utilisateur {${nom_user} ${prenom_user}} dans le projet {${Projetname}}`);
      res.status(200).send(result);
    } else {
      logger.warn(`Requête /add_member_inprojet  échoué pour l'utilisateur {${nom} ${prenom}}`);
      res.status(400).send(result);
    }
  })

  }catch(err){
    logger.error('Erreur lors de la Requête /add_member_inprojet ', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Error when add new memeber in projet :', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.post('/api/delete_projet', authenticateToken, async (req, res) => {
  try {
    const ProjetId = req.body.id_projet;
    const nom = req.body.username;
    const prenom = req.body.userprenom;
    // Suppression du projet
    const result = await deleteProject(ProjetId);

    // Vérifier si le projet a été supprimé avec succès
    if (result) {
      logger.info(`Requête reçue pour /delete_projet' l'utilisateur {${nom} ${prenom}} a supprimer le projet {${ProjetId}}`);
      res.status(200).json({ success: true, message: `Le projet avec ID ${ProjetId} a été supprimé avec succès.` });
    } else {
      logger.warn(`Requête /delete_projet  échoué pour l'utilisateur {${nom} ${prenom}}`);
      res.status(404).json({ success: false, message: `Le projet avec ID ${ProjetId} n'a pas été trouvé.` });
    }
  } catch (err) {
    logger.error('Erreur lors de la Requête /delete_projet ', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Erreur lors de la suppression du projet :', err);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});


app.post('/api/remove_member', authenticateToken, async (req, res) => {
  try {
    const { userid, projetId } = req.body;
    const nom = req.body.username;
    const prenom = req.body.userprenom;

    const { nom_user,prenom_user,projetname} = req.body;
    const result = await removeMemberFromProject(userid, projetId);

    if (result.success) {
      logger.info(`Requête reçue pour /remove_member' l'utilisateur {${nom} ${prenom}} a retirer l'utilisateur {${nom_user} ${prenom_user} dans le projet{${projetname}}`);
      res.status(200).json(result);
    } else {
      logger.warn(`Requête /remove_member  échoué pour l'utilisateur {${nom} ${prenom}}`);
      res.status(400).json(result);
    }
  } catch (err) {
    logger.error('Erreur lors de la Requête /remove_member ', {
      error: err.message,
      stack: err.stack,
    });
    console.error('Erreur lors de la suppression de l\'utilisateur :', err);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});



app.post('/api/get_all_projet_associer', authenticateToken, async (req, res) => {
  try {
    // Vérifie si l'ID de l'utilisateur est présent
    if (!req.userId) {
      console.log('ID utilisateur non trouvé dans la requête.');
      return res.status(400).json({ success: false, message: 'ID utilisateur manquant.' });
    }

    // Appel de la fonction pour récupérer les projets associés
    const all_projects = await find_all_projects_associed(req.userId);

    // Vérifie si des projets sont trouvés
    if (all_projects.success) {
      console.log('Tous les projets associés ont été retrouvés.');
      return res.status(200).json(all_projects);
    } else {
      console.log('Aucun projet associé n\'a été trouvé.');
      return res.status(404).json({ success: false, message: 'Aucun projet associé trouvé.' });
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des projets associés :', err);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
});



      /* __________________________________PARTIE FIN Report*__________________________________ */














           /* __________________________________PARTIE Dashbord*__________________________________ */

      app.post('/api/get_all_users',authenticateToken,async(req,res)=>{
        try{
         
          const all_users = await find_all_users();
          console.log('tout les utillisateurs ont été retrouvé');
          res.status(200).json(all_users);
        
      
        }catch(err){
          console.error('Error fidning users:', err);
          res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
      })
    

     /* __________________________________ FIN PARTIE Dashbord*__________________________________ */












      /* __________________________________PARTIE OBJECTIF dans report*__________________________________ */


      app.post('/api/add_objectif',authenticateToken,upload_img.single('file'),async(req,res)=>{
        try{
          const id_projet = req.body.id;
          const Titre_objectif = req.body.add_Titre_objectif;
          const nom_objectif = req.body.add_nom_objectif;
          const Description_objectif = req.body.add_Description_objectif;
          const nom = req.body.username;
          const prenom = req.body.userprenom;
      
          console.log('nom_projet:', nom_objectif);
         // Vérification de la longueur du nom du projet
         if (!nom_objectif || nom_objectif.length > 35) {
          return res.status(400).json({
            success: false,
            message: "Le nom de lobjectif doit contenir 35 caractères ou moins.",
          });
        }

         // Vérification de la longueur du nom du projet
         if (!Titre_objectif || Titre_objectif.length > 20) {
          return res.status(400).json({
            success: false,
            message: "Le titre de lobjectif doit contenir 20 caractères ou moins.",
          });
        }
      
         // Vérification de la longueur du nom du projet
         if (!Description_objectif || Description_objectif.length > 250) {
          return res.status(400).json({
            success: false,
            message: "Le Description de l objectif doit contenir 250 caractères ou moins.",
          });
        }
      
      // Vérification si un fichier a été téléchargé
      const fileName = req.file ? req.file.filename : null;
      const filePath = req.file ? req.file.path : null;
        console.log('Fichier reçu:', { fileName, filePath });
      
      
        add_objectif(Titre_objectif,nom_objectif,Description_objectif,fileName,id_projet,req.userId)
         .then(result => {
          if (result) {
            logger.info(`Requête reçue pour /add_objectif', l'utilisateur {${nom} ${prenom}} a ajouter l objectif {${nom_objectif}}`);
            res.status(200).send(result);
          } else {
            logger.warn(`Requête /add_objectif  échoué pour l'utilisateur {${nom} ${prenom}}`);
            res.status(400).send(result);
          }
        })
      
        }catch(err){
          logger.error('Erreur lors de la Requête /add_projet ', {
            error: err.message,
            stack: err.stack,
          });
          console.error('Error when add new projct :', err);
          res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
      })


      app.post('/api/get_all_objectifs',authenticateToken,async(req,res)=>{
        try{
          const id_projet= req.body.id;
         
          if(req.userId){
            const all_obj = await find_all_Objectifs(id_projet);
            console.log('tout les objectifs ont été retrouvé');
            res.status(200).json(all_obj);
          }else{
            console.log('aucun objectifs na etait trouver !');
          }
        
      
        }catch(err){
          console.error('Error fidning objectifs:', err);
          res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
      })


      app.post('/api/get_all_obj_all', authenticateToken, async (req, res) => {
        try {
          if (req.userId) {
            // Appel correct de la fonction importée all_obj()
            const objectifs = await all_obj();
            console.log('Tous les objectifs ont été retrouvés');
            res.status(200).json(objectifs);
          } else {
            console.log('Aucun objectif n\'a été trouvé !');
            res.status(404).json({ success: false, message: 'Aucun objectif trouvé' });
          }
        } catch (err) {
          console.error('Erreur lors de la récupération des objectifs :', err);
          res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
        }
      });
      



      app.post('/api/change_etat',authenticateToken, async (req, res) => {
        try {
    
          // Récupère le fichier envoyé depuis le frontend
          const id_objectif = req.body.id;
          const etat = req.body.etat;
          const nom = req.body.username;
          const prenom = req.body.userprenom;

          const submit = await change_finalisation_obj(req.userId, id_objectif,etat);
    
          if (submit.success) {
            logger.info(`Requête reçue pour /change_etat', l'utilisateur {${nom} ${prenom}} a changer l'état de l'objectif `);
            res.status(200).send(submit);
          } else {
            logger.warn(`Requête /change_etat échoué pour l'utilisateur {${nom} ${prenom}}`);
            res.status(401).send(submit);
          }
    
        } catch (err) {
          logger.error(`Erreur lors de la Requête /change_etat `, {
            error: err.message,
            stack: err.stack,
          });
          console.error('Error uploading etat:', err);
          res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    });
    

    app.post('/api/delete_objectif', authenticateToken, async (req, res) => {
      try {
        const id_objectif = req.body.id_objectif; // ID de l'objectif à supprimer
        const nom = req.body.username; // Nom de l'utilisateur
        const prenom = req.body.userprenom; // Prénom de l'utilisateur
    
        if (!id_objectif) {
          return res.status(400).json({
            success: false,
            message: 'ID de l\'objectif requis pour la suppression.',
          });
        }
    
        const result = await delete_objectif(id_objectif);
    
        if (result.success) {
          logger.info(`Requête reçue pour /delete_objectif, l'utilisateur {${nom} ${prenom}} a supprimé l'objectif {${id_objectif}}`);
          return res.status(200).json(result);
        } else {
          logger.warn(`Requête échouée pour /delete_objectif, l'utilisateur {${nom} ${prenom}} a tenté de supprimer un objectif inexistant.`);
          return res.status(404).json(result);
        }
      } catch (err) {
        logger.error('Erreur lors de la Requête /delete_objectif', {
          error: err.message,
          stack: err.stack,
        });
        console.error('Erreur lors de la suppression de l\'objectif :', err);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
      }
    });
    
       /* __________________________________FIN PARTIE OBJECTIF dans report*__________________________________ */



/*app.listen(3001, () => {
    console.log("running on port 3001");
});
*/
server.listen(process.env.NODE_JS_APP_PORT, () => {
  console.log('Server listening on port 3001');
});




