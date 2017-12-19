'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
const path = require('path');
const winston = require('winston');

function logDirExists (dir) {
  try {
    fs.accessSync(dir);
  } catch (e) {
    return false;
  }
  return true;
}

let logDir = process.env.LOG_DIR;
if (logDir === undefined) {
  logDir = path.join(__dirname, 'logs');
}
if (!logDirExists(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = new winston.Logger({
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
  ]
});

logger.info('Bootstrapping application...');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'),
  { flags: 'a' }
);
accessLogStream.on('close', () => logger.info('Access log stream closed.'));
logger.info(`Opened access log stream "${path.join(logDir, 'access.log')}".`);
app.use(morgan('combined', { stream: accessLogStream }));

app.post('/', (req, res) => {
  if (req.body.text === undefined) {
    res.json({
      text: 'You gave me some invalid parameters. Please try again.'
    });
    return;
  }

  let [ numDie, sides ] = req.body.text.split('d');
  numDie = parseInt(numDie, 10);
  sides = parseInt(sides, 10);
  if (
    !Number.isInteger(numDie)
    || !Number.isInteger(sides)
  ) {
    res.json({
      text: 'You gave me some invalid parameters. Please try again.'
    });
    return;
  }

  let roll = 0;
  for (let i = 0; i < numDie; ++i) {
    roll = roll + Math.floor(Math.random() * sides + 1);
  }
  res.json({
    text: `@user rolled ${numDie}d${sides} and got ${roll}`
  });
});
logger.info('Registered routes.');

const server = app.listen(8480, () => logger.info('Server listening on port 8480'));

function gracefulShutdown () {
  logger.info('Received shutdown signal.');
  server.close(() => {
    logger.info('Server closed.');
    accessLogStream.end();
    process.exit();
  });
  setTimeout(() => {
    logger.error('Failed to close server in a timely manner. Force quit.');
    accessLogStream.end();
    process.exit();
  }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

