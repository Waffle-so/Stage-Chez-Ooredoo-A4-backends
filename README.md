1- Ajouter un Dossier 'Public' avec un autre dossier 'files'  <br/>
2- deuxiément ajouter un fichier .env avec les valeurs suivante : 

NODE_JS_API_URL=http://localhost:3000,http://192.168.100.41:3000
NODE_JS_APP_PORT=3001

DATABASE_USER=   
DATABASE_PASSWORD= 
DATABASE_HOST=
DATABASE_PORT=                      # Port par défaut de PostgreSQL


JWT_SECRET= 

REPERTOIRE_PHOTO_VIDEO = 'Public/files'  #le dépot ou on va stocker tout les fichier , video , photo
PHOTO_PROFIL_PAR_DEFAUT = 'image-1728837312287.png'   #image par défaut lors de l'authentification

TAILLE_MAX_FICHIER_OU_AUTRE = ' dans index.js 
Vérifier la ligne 544 pour les fichier (page: profile) /
Vérifier la ligne 554 pour les publications (page : formation) /
Vérifier la ligne 563 pour les images (page: profile, pour les photo de profils)/

Remarque : le fichier .env ne list pas les multiplications en raison de cela on déplace la taille des fichiers dans le fichier source
'


LIMITATION_TAILLE_FICH_LOG= '30m'  #limiter la taille des logs 
SUPPRIMER_OLD_LOG_AU_BOUT_DE='7d' #supprimer les logs au bout de combien de jours



EMAIL_ADDRESS=  #ici vous mettez l'adresse mail qui va envoyer les messages Gmail pour la récupération des mots de passe et la validation
EMAIL_PASSWORD=  #ici vous metter le mot de passe 



