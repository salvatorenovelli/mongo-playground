'use strict';
const highlight = require('cli-highlight').highlight;
const util = require('util');

console.logj = (obj) => console.log(util.inspect(obj, {colors: true, depth: 4}));
// console.logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));

const MongoClient = require('mongodb').MongoClient;


const url = "mongodb://localhost:9000";
const dbName = 'website-versioning';

module.exports = class MongoConsole {


    async connect() {
        this.client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true});
        console.time("connect");
        await this.client.connect();
        console.log("Connected correctly to server");
        this.db = this.client.db(dbName);
        console.timeEnd("connect");
    }

    async getCollection(collectionName) {
        return this.db.collection(collectionName);
    }


    async bulkProcess(collectionName, query, projection, forEachCallback, skip = 0, limit = 0) {
        const collection = this.getCollection(collectionName);
        try {
            console.time("init bulk");
            let bulk = collection.initializeUnorderedBulkOp();
            console.timeEnd("init bulk");

            console.time("query");
            const docs = await collection.find(query).project(projection).skip(skip).limit(limit).toArray();
            console.timeEnd("query");

            console.time("processing");
            docs.forEach(results => forEachCallback(results, collection, bulk));
            console.timeEnd("processing");

            console.time("execute bulk");
            await bulk.execute();
            console.timeEnd("execute bulk");

        } catch (err) {
            console.error(err.stack);
        }
    }

    async close() {
        return this.client.close(false);
    }
};


