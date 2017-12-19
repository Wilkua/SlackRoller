'use strict';

const http = require('http');
const querystring = require('querystring');

function _safeJsonParse (str) {
  let res = null;
  try {
    res = JSON.parse(str);
  } catch (e) {
    res = null;
  }
  return res;
}

const rollInput = process.argv[2];
const requestCount = process.argv[3];

if (rollInput === undefined || requestCount === undefined) {
  console.error('Invalid parameters');
  console.error('distribution_test.js <die_note> <request_count>');
  process.exit();
}

const responses = new Map();

const requestData = querystring.stringify({
  text: rollInput
});
const requestOptions = {
  hostname: 'localhost',
  port: 8480,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(requestData)
  }
};
const promises = [];
for (let i = 0; i < requestCount; ++i) {
  promises.push(new Promise((resolve, reject) => {
    const req = http.request(requestOptions, (res) => {
      let resData = '';
      res.on('data', (chunk) => {
        resData = resData + chunk;
      });
      res.on('end', () => {
        const jsonData = _safeJsonParse(resData);
        if (jsonData === null) {
          return reject();
        }
        if (responses.has(jsonData.raw_value)) {
          responses.set(jsonData.raw_value,
            responses.get(jsonData.raw_value) + 1);
        } else {
          responses.set(jsonData.raw_value, 1);
        }
        return resolve();
      });
    });
    req.write(requestData);
    req.end();
  }));
}

Promise.all(promises)
.then(() => {
  let keys = [];
  for (let key of responses.keys()) {
    keys.push(key);
  }
  keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  keys.forEach(key => {
    const n = Math.floor(100 * (responses.get(key) / requestCount));
    console.info(`${key}: ${'+'.repeat(n)}`);
  });
});

