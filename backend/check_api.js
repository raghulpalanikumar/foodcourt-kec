const http = require('http');
const fs = require('fs');

http.get('http://localhost:5000/api/products?category=biryani', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        fs.writeFileSync('api_check.json', data);
        console.log('API check saved');
    });
}).on('error', (err) => {
    fs.writeFileSync('api_check.json', 'Error: ' + err.message);
    console.log('Error reaching API');
});
