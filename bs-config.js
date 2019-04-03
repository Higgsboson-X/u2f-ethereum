var express = require('express');
var app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {

	res.sendFile(__dirname + '/src/' + 'index.html');

});

app.get('/myBank', (req, res) => {

	res.sendFile(__dirname + '/src/' + 'bank.html');

});


module.exports = {

    'server': {
        'baseDir': ['./src'],
        'middleware': {
            1 : app,
        }
    },
    'https': true
    
}