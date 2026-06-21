const https = require('https');
const req = https.request({
  method: 'OPTIONS',
  hostname: 'api.mayar.id',
  path: '/hl/v1/payment/create',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST'
  }
}, (res) => {
  console.log(res.statusCode, res.headers);
});
req.end();
