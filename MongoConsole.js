'use strict';
const highlight = require('cli-highlight').highlight;
const util = require('util');

console.logj = (obj) => console.log(util.inspect(obj, {colors: true, depth: 4}));
// console.logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));

const MongoClient = require('mongodb').MongoClient;


const url = "mongodb://localhost:9000";
const dbName = 'test-website-versioning';

module.exports = class MongoConsole {


    async find(collectionName, query, projection, forEachCallback, batchSize = 1) {


        const client = new MongoClient(url, {useNewUrlParser: true});

        try {
            console.time("connect");
            await client.connect();
            console.log("Connected correctly to server");
            console.timeEnd("connect");

            console.time("initbulk");
            const db = client.db(dbName);
            const collection = db.collection(collectionName);
            let bulk = collection.initializeUnorderedBulkOp();
            console.timeEnd("initbulk");

            let cursor = collection.find(query).project(projection).limit(batchSize);

            // const docs = await collection.find(query).project(projection).skip(0).limit(limit).toArray();

            while (await cursor.hasNext()) {

                console.time("page");
                console.time("query");
                const docs = await cursor.toArray();
                console.timeEnd("query");

                console.time("processing");
                docs.forEach(entity => forEachCallback(entity, collection, bulk));
                console.timeEnd("processing");

                console.time("executebulk");
                await bulk.execute();
                console.timeEnd("executebulk");
                console.timeEnd("page");
                console.log("\n")

            }


        } catch (err) {
            console.error(err.stack);
        }

        return client.close(false);


    }
};


