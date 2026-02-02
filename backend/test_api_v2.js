const axios = require('axios');
const fs = require('fs');

async function test() {
    const logFile = 'api_result.txt';
    try {
        const res = await axios.get('http://localhost:5000/api/reservations/availability');
        fs.writeFileSync(logFile, JSON.stringify(res.data, null, 2));
        console.log('Logged success to', logFile);
    } catch (err) {
        fs.writeFileSync(logFile, 'ERROR: ' + err.message + '\n' + (err.response ? JSON.stringify(err.response.data, null, 2) : ''));
        console.log('Logged error to', logFile);
    }
}

test();
