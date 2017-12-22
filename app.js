'use strict';

const bodyParser = require('body-parser');
const express = require('express');

const createApp = (winston, middleWare) => {
  const app = express();

  app.locals.logger = winston;

  app.use(bodyParser.json());
  winston.info('Registered JSON body parser');
  app.use(bodyParser.urlencoded({ extended: false }));
  winston.info('Registered URL encoded body parser');

  middleWare.forEach(fn => {
    app.use(fn);
    winston.info(`Registered middleware: ${fn.name}`);
  });

  app.post('/', (req, res) => {
    if (req.body.ssl_check !== undefined) {
      res.status(200);
      res.end();
      return;
    }

    const badParamResponse = {
      text: 'Oops! Seems like you gave me some incorrect parameters.',
      attachments: [{ text: 'Try /roll 3d6' }]
    };

    if (req.body.text === undefined) {
      res.json(badParamResponse);
      return;
    }

    let [ numDie, sides ] = req.body.text.split('d');
    numDie = parseInt(numDie, 10);
    sides = parseInt(sides, 10);
    if (
      !Number.isInteger(numDie)
      || !Number.isInteger(sides)
    ) {
      res.json(badParamResponse);
      return;
    }

    let roll = 0;
    for (let i = 0; i < numDie; ++i) {
      roll = roll + Math.floor(Math.random() * sides + 1);
    }

    res.json({
      response_type: 'in_channel',
      text: `<@${req.body.user_id}> rolled ${numDie}d${sides} and got ${roll}`
    });
  });
  winston.info('Registered routes.');

  return app;
}
module.exports = createApp;

