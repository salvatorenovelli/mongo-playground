'use strict';
const highlight = require('cli-highlight').highlight;
const util = require('util');

// console.logj = (obj) => console.log(util.inspect(obj, {colors: true, depth: 4}));
console.logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));

const MongoClient = require('mongodb').MongoClient;


let url = "mongodb://localhost:9000";


module.exports = class MongoConsole {


    async find(query, forEachCallback, limit = 0) {
        console.time("query");
        MongoClient.connect(url, {useNewUrlParser: true}, function (err, connection) {
            if (err) throw err;

            const db = connection.db('test-website-versioning');
            let collection = db.collection("pageSnapshot");
            let bulk = collection.initializeUnorderedBulkOp();

            collection
                .find(query).limit(limit)
                .toArray(async (err, results) => {
                    if (err) throw err;
                    results.forEach(results => forEachCallback(results, collection, bulk));
                    console.timeEnd("query");
                    await bulk.execute();
                    await connection.close(false);
                })
        });
    }
};


