'use strict';

const cluster = require('cluster');

if (cluster.isMaster) {
  const os = require('os');

  for (let i = 0; i < os.cpus().length; ++i) {
    cluster.fork();
  }
} else {
  const fs = require('fs');
  const http = require('http');
  const morgan = require('morgan');
  const path = require('path');
  const winston = require('winston');

  const createApp = require('./app.js');
  const authenticate = require('./middleware/authentication.js');

  function fileExists (file) {
    try {
      fs.accessSync(file);
    } catch (e) {
      return false;
    }
    return true;
  }

  let logDir = process.env.LOG_DIR;
  if (logDir === undefined) {
    logDir = path.join(__dirname, 'logs');
  }
  if (!fileExists(logDir)) {
    fs.mkdirSync(logDir);
  }

  const logger = new winston.Logger({
    transports: [
      new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
    ]
  });

  logger.info('Bootstrapping application.');

  const configFileName = path.join(__dirname, 'server-config.json');
  if (!fileExists(configFileName)) {
    logger.error('Could not find "server-config.json". A "server-config.json" file must be created before using this application.');
    return;
  }
  let config = fs.readFileSync(path.join(__dirname, 'server-config.json'));
  config = (function () {
    let val = null;
    try {
      val = JSON.parse(config);
    } catch (e) {
      val = null;
    }
    return val;
  }());
  if (config === null) {
    logger.error('Error while parsing "server-config.json".');
    process.exit(1);
  }
  logger.info('Loaded "server-config.json".');

  const accessLogStream = fs.createWriteStream(
    path.join(logDir, 'access.log'),
    { flags: 'a' }
  );
  const accessLogger = morgan('combined', { stream: accessLogStream });

  const authenticator = authenticate({
    logger,
    token: config.apptoken
  });

  const middleWare = [
    accessLogger,
    authenticator
  ];
  const app = createApp(logger, middleWare);

  const server = http.createServer(app)
    .listen(8480, '127.0.0.1');
  server.on('listening', () => logger.info('Server listening on port 8480'));

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
}

