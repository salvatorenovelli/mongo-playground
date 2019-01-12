'use strict';
const highlight = require('cli-highlight').highlight;
const util = require('util');

console.logj = (obj) => console.log(util.inspect(obj, {colors: true, depth: 4}));
// console.logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));

const MongoClient = require('mongodb').MongoClient;


const url = "mongodb://localhost:9000";
const dbName = 'test-website-versioning';

module.exports = class MongoConsole {


    async find(query, forEachCallback, skip = 0, limit = 0) {

        console.time("query");

        const client = new MongoClient(url, {useNewUrlParser: true});

        try {
            await client.connect();
            console.log("Connected correctly to server");
            const db = client.db(dbName);
            const collection = db.collection('pageSnapshot');
            let bulk = collection.initializeUnorderedBulkOp();

            const docs = await collection.find(query).skip(skip).limit(limit).toArray();

            docs.forEach(results => forEachCallback(results, collection, bulk));

            await bulk.execute();

            console.log("");
            console.timeEnd("query");

        } catch (err) {
            console.error(err.stack);
        }

        return client.close(false);


    }
};


