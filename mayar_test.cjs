const https = require('https');
const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiYWVhZDk0Mi02Nzc0LTRiZGUtOTQ4ZS05NzBlMzY3MTA3MWEiLCJhY2NvdW50SWQiOiI4NTU5ZTUyZC1iOTQ1LTQwOTUtOTJhYS1iY2U2YjkzZTIwMzEiLCJjcmVhdGVkQXQiOiIxNzgyMDM0NDQzMDI4Iiwicm9sZSI6ImRldmVsb3BlciIsInNjb3BlIjp7InJlYWQiOnRydWUsIndyaXRlIjp0cnVlfSwic3ViIjoiYWJpZXRlY2huby5pZEBnbWFpbC5jb20iLCJuYW1lIjoiQUJJRSBURUNITk9MT0dZIFNPTFVUSU9OUyIsImxpbmsiOiJhYmlldGVjaG5vIiwiaXNTZWxmRG9tYWluIjpudWxsLCJpYXQiOjE3ODIwMzQ0NDN9.gBYi42BpryH447SipToF7M0nd_0p44_ZGk7VPuQ18HVup68sphYxaEZR-MCEC8kEltA_d7lGQiKycksVEZwi3NpbczYM6Jfa6dYTBBY4EWcQGQlFw9Nf2_n09-eFbQRXC-3klj0tt393TDlYI1xFYdWPITHw7ysSs6ORIDsc65KhiCLpGOCRBPp_OHnIEnCPCycPQl7sLajG0yA9a7cz2kw__LFKipSo2bPaL0bBWhSc4kev-RVghDbatB4GfnkNOQf-K1idcpZBfSaioj_Hqg-xYo15TVXvpZIz_FQQugxeCuRgIjVhJeEhtw2pmAEn6i91c2hHjmKF8gysh4S8wQ";

const body = JSON.stringify({
  name: "Sewa Loker Bintang Lima",
  amount: 5000,
  description: "test description"
});

const req = https.request({
  method: 'POST',
  hostname: 'api.mayar.id',
  path: '/hl/v1/payment/create',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': body.length
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(res.statusCode, data));
});
req.write(body);
req.end();
