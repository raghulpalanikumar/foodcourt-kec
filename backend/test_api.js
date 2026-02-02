const axios = require('axios');

async function testApi() {
    try {
        const res = await axios.get('http://localhost:5000/api/reservations/availability');
        console.log('SUCCESS:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('ERROR:', err.message);
        if (err.response) {
            console.error('RESPONSE DATA:', err.response.data);
        }
    }
}

testApi();
