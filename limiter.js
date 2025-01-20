const rateLimit = require('express-rate-limit');
let logCount = 0;
const logLimit = 3; // Nombre maximum de logs autorisés dans une période donnée

// Limitation du débit pour les routes 
const limiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 1000, // Limite chaque IP à 100 requêtes par fenêtre de 2 minutes
    handler: (req, res) => {
         // Limiter les logs
         if (logCount < logLimit) {
            console.log('Trop de tentatives, veuillez réessayer plus tard.');
            logCount++;
        } else if (logCount === logLimit) {
            console.log('Limite de log atteinte pour les tentatives excessives.');
            logCount++;
        }

        res.status(429).send({ 
            success: false, 
            message: 'Trop de tentatives, veuillez réessayer plus tard.',
            redirect : '/Login/Login'
                             });
    }
});

setInterval(()=>{
    logCount = 0;
}, 2*60*1000);

module.exports = limiter;
