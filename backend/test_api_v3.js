const axios = require('axios');
const fs = require('fs');

async function test() {
    const logFile = 'D:\\UID lab\\Foodcourt\\backend\\api_debug_log.txt';
    try {
        const res = await axios.get('http://localhost:5000/api/reservations/availability');
        fs.writeFileSync(logFile, 'DATE: ' + new Date().toISOString() + '\n' + JSON.stringify(res.data, null, 2));
        console.log('Logged success to', logFile);
    } catch (err) {
        fs.writeFileSync(logFile, 'DATE: ' + new Date().toISOString() + '\nERROR: ' + err.message + '\n' + (err.response ? JSON.stringify(err.response.data, null, 2) : ''));
        console.log('Logged error to', logFile);
    }
}

test();
