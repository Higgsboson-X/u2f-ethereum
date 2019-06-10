var express = require('express');
var app = express();
var dir = '/policy/';

app.use(express.static('public'));

app.get('/', (req, res) => {

	res.sendFile(__dirname + dir + 'index.html');

});

app.get('/myAccount', (req, res) => {

	res.sendFile(__dirname + dir + 'manager.html');

});

app.get('/myBank', (req, res) => {

	res.sendFile(__dirname + dir + 'bank.html');

});



module.exports = {

    'server': {
        'baseDir': [__dirname + dir],
        'middleware': {
            1 : app,
        }
    },
    'https': true
    
}