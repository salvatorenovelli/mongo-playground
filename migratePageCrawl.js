const pg = require("pg");
const MongoConsole = require("./MongoConsole.js");
const fetch = require("node-fetch");

let connectionString = "postgres://archive-backend:nBtmkpddgHCktpvh@localhost:5432/archive";


const client = new pg.Client(connectionString);

client.connect();


client.query('SELECT * FROM pageCrawl', [], function (err, result) {
    if (err) {
        console.log(err);
    }
    console.log(result.rows);

    client.end();
});

