const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors,json } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const express = require('express');
const fs = require('fs');
require('dotenv').config(); 


const app = express();

// Format des logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const ignoreCorsRequests = format((info) => {
    // Ignorer les logs pour les OPTIONS et les routes spécifiques
    if (info.message.includes('OPTIONS') || 
        info.message.includes('/user_info') ||
        info.message.includes('/user_videos') ||
        info.message.includes('/files/') ||
        info.message.includes('/profile') ||
        info.message.includes('/user_files')) {
      return false; // Ignore ces logs
    }
    return info; // Conserve les autres logs
  });
  
  
const logger = createLogger({
  level: 'info',
  format: combine(
    ignoreCorsRequests(),
    timestamp(),
    json(),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, // Compresser les anciens logs
      maxSize: process.env.LIMITATION_TAILLE_FICH_LOG, // Taille maximale du fichier
      maxFiles: process.env.SUPPRIMER_OLD_LOG_AU_BOUT_DE, // Supprime les logs plus anciens que 7 jours
    }),
    new transports.File({ filename: 'logs/errors.log', level: 'error' })
  ]
});
module.exports = logger;

