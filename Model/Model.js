const { sequelize, DataTypes } = require('../DB/Db');


const utilisateur = sequelize.define('utilisateurs', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date_de_naissance: {
      type: DataTypes.DATE,
      allowNull: false,
    },
     secteur:{
        type:DataTypes.STRING,
        allowNull:false,
     },
     status:{
      type:DataTypes.INTEGER,
      allowNull:false,
      defaultValue: 0, // Par défaut, l'utilisateur est déconnecté
   },
   telephone:{
    type:DataTypes.INTEGER,
    allowNull:false,
 },
 photoprofil: {
  type: DataTypes.STRING,
allowNull: false,
},
     createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      role:{
        type: DataTypes.STRING,
        allowNull: false,
      },
      Gmail:{
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetCode: {
        type: DataTypes.STRING, // Stocke le code de réinitialisation
        allowNull: true,       // Peut être null si aucun code n'a été généré
    },
    resetCodeExpires: {
        type: DataTypes.DATE, // Stocke la date d'expiration du code
        allowNull: true,      // Peut être null si aucun code n'a été généré
    },
    Nbr_Connexion:{
      type:DataTypes.INTEGER,
      allowNull:true,
   },
   Nbr_add_file:{
    type:DataTypes.INTEGER,
    allowNull:true,
 },
 Nbr_add_video:{
  type:DataTypes.INTEGER,
  allowNull:true,
},
add_file_on:{
  type:DataTypes.INTEGER,
  allowNull:true,
},
lastLogin: {
  type: DataTypes.DATE,
  allowNull: true, // Peut être null si l'utilisateur ne s'est jamais connecté
},
confirmationTokenExpires:{
  type: DataTypes.STRING,
  allowNull: true, // Peut être null si l'utilisateur ne s'est jamais connecté
},
confirmationToken:{
  type: DataTypes.STRING,
  allowNull: true, // Peut être null si l'utilisateur ne s'est jamais connecté
},
Mdp_change:{
  type: DataTypes.BOOLEAN,
  allowNull: true, // Peut être null si l'utilisateur ne s'est jamais connecté
}
   
  },{
    tableName:'utilisateurs',
    schema:'public',
  });



  const Files = sequelize.define('Files', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    id_user:{
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    file_path:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_size:{
      type: DataTypes.STRING,
      allowNull: false,
    },

    file_type:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    file_name:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    
  },{
    tableName:'Files',
    schema:'public',
  });


  
  const Publications = sequelize.define('Videos', {
    id: {
      type: DataTypes.UUID,
      defaultValue:DataTypes.UUIDV4,
     // autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    id_User:{
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Nom_publication:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    Date_poste:{
      type: DataTypes.DATE,
      allowNull: false,
    },

    Contenu_URL:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    Catégorie:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    Secteur:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt:{
      type: DataTypes.DATE,
      allowNull: false,
    },
    miniature:{
      type: DataTypes.STRING,
      allowNull: true,
    },
    Description:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    Types:{
      type: DataTypes.STRING,
      allowNull: true,
    },
    
  },{
    tableName:'Videos',
    schema:'public',
  });



  const Commentaires = sequelize.define('Commentaires', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    id_User:{
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_Video:{
      type: DataTypes.UUID,
      allowNull: false,
    },
    Commentaire:{
      type: DataTypes.TEXT,
      allowNull: false,
    },
    Date_poste:{
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt:{
      type: DataTypes.DATE,
      allowNull: false,
    },  
    Type_com:{
      type: DataTypes.STRING,
      allowNull: false,
    },     
    ParentId:{
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },{
    tableName:'Commentaires',
    schema:'public',
  });

  const Playlist = sequelize.define('Playlists', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    id_Playlist:{
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_User:{
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_Video:{
      type: DataTypes.UUID,
      allowNull: true,
    },
    Nom_playlist:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    Secteur:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt:{
      type: DataTypes.DATE,
      allowNull: false,
    },    

  },{
    tableName:'Playlists',
    schema:'public',
  })





  const PlaylistVideos = sequelize.define('PlaylistVideos', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    id_Playlist:{
      type: DataTypes.INTEGER,
      references:{
        model:'Playlists',
        key:'id',
      },
      allowNull: true,
    },
    id_Video:{
      type: DataTypes.UUID,
      references:{
        model:'Videos',
        key:'id',
      },
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt:{
      type: DataTypes.DATE,
      allowNull: true,
    },    

  },{
    tableName:'PlaylistVideos',
    schema:'public',
    timestamps: true,
  })


  // Playlist Model
  Playlist.belongsToMany(Publications, {
    through: PlaylistVideos,
    foreignKey: 'id_Playlist',
    otherKey: 'id_Video',
    as:'Publications'
  });
  
  // Video Model
  Publications.belongsToMany(Playlist, {
    through: PlaylistVideos,
    foreignKey: 'id_Video',
    otherKey: 'id_Playlist',
    as:'Playlists'
  });
  

  
  const Projets = sequelize.define('Projets', {
    id_projet: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    Nom_projet:{
      type: DataTypes.STRING,
      allowNull: true,
    },
    Description:{
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt:{
      type: DataTypes.DATE,
      allowNull: true,
    },    
    date_fin_projet:{
      type: DataTypes.DATE,
      allowNull: false,
    },
    image:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    secteur:{
      type:DataTypes.STRING,
      allowNull:false,
    }

  },{
    tableName:'Projets',
    schema:'public',
    timestamps: true,
  })

  const Projets_membres = sequelize.define('Projet_membres', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    id_projet:{
      type: DataTypes.INTEGER,
      allowNull: false,
      references:{
        model:'Projets',
        key:'id_projet',
      }
    },
    id_user:{
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt:{
      type: DataTypes.DATE,
      allowNull: true,
    },    

  },{
    tableName:'Projet_membres',
    schema:'public',
    timestamps: true,
  })

utilisateur.hasMany(Projets_membres, {
    foreignKey: 'id_user',  // Correspond à la clé étrangère dans 'Projets_membres'
    as: 'Projets_membres'  // Nom de l'alias
  });
  
 // Un projet peut avoir plusieurs membres
Projets.hasMany(Projets_membres, {
  foreignKey: 'id_projet',
  as: 'Membres',
});

// Chaque membre est associé à un projet
Projets_membres.belongsTo(utilisateur, {
  foreignKey: 'id_user',
  as: 'Utilisateur',
});

Projets_membres.belongsTo(Projets, {
  foreignKey: 'id_projet', // Clé étrangère dans Projets_membres
  as: 'Projet',  // Alias pour la relation
});




const ProjetVideos = sequelize.define('ProjetVideos', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  id_projet: {
      type: DataTypes.INTEGER,
      references: {
          model: Projets,
          key: 'id_projet',
      },
  },
  id_video: {
      type: DataTypes.UUID,
      references: {
          model: Publications,
          key: 'id',
      },
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt:{
    type: DataTypes.DATE,
    allowNull: false,
  },  

});




Projets.belongsToMany(Publications, {
  through: 'ProjetVideos',
  foreignKey: 'id_projet',
  otherKey: 'id_video',
  as: 'VideosAssociees' // Alias pour les vidéos du projet
});

Publications.belongsToMany(Projets, {
  through: 'ProjetVideos',
  foreignKey: 'id_video',
  otherKey: 'id_projet',
  as: 'ProjetsAssocies' // Alias pour les projets liés à une vidéo
});


ProjetVideos.belongsTo(Projets, { foreignKey: 'id_projet', as: 'Projet' });
ProjetVideos.belongsTo(Publications, { foreignKey: 'id_video', as: 'Video' });



const Objectifs = sequelize.define('Objectifs', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  id_User:{
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_Projet:{
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  Titre:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  Nom_objectif:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  Description:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  Fichier:{
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  Terminer: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  
},{
  tableName:'Objectifs',
  schema:'public',
});






  const syncModel = async () => {
    try {
      await sequelize.sync(); // Synchronisation des modèles avec la base de données
      console.log('Les modèles ont été synchronisés avec succès.');
    } catch (error) {
      console.error('Erreur lors de la synchronisation des modèles:', error);
    }
  };

  
  syncModel();

  module.exports = { utilisateur,Files,Publications,Commentaires,Playlist,PlaylistVideos,Projets,Projets_membres,ProjetVideos,Objectifs};


