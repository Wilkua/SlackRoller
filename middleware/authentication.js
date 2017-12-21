'use strict';

const authentication = (options) => (req, res, next) => {
  if (options.token !== undefined) {
    if (
      req.body !== undefined
      && req.body.token !== undefined
    ) {
      if (options.token === req.body.token) {
        return next();
      }
    }
    if (options.logger !== undefined) {
      options.logger.warn('Request received with invalid authentication token. Possible sign of token rotation.');
    }
    res.status(401);
    res.send('Invalid authentication token');
    res.end();
    return;
  } else {
    if (options.logger) {
      options.logger.info('Skipping authentication. No token specified.');
    }
    return next();
  }
};
module.exports = authentication;

