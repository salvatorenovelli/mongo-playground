'use strict';
const highlight = require('cli-highlight').highlight;
const util = require('util');

console.logj = (obj) => console.log(util.inspect(obj, {colors: true, depth: 4}));
// console.logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));

const MongoClient = require('mongodb').MongoClient;


const url = "mongodb://localhost:9000";
const dbName = 'test-website-versioning';

module.exports = class MongoConsole {


    constructor(collectionName) {
        this.collectionName = collectionName;
    }

    async connect() {
        this.client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true});
        console.time("connect");
        await this.client.connect();
        console.log("Connected correctly to server");
        const db = this.client.db(dbName);
        this.collection = db.collection(this.collectionName);
        console.timeEnd("connect");
    }


    async bulkProcess(query, projection, forEachCallback, skip = 0, limit = 0) {
        try {
            console.time("init bulk");
            let bulk = this.collection.initializeUnorderedBulkOp();
            console.timeEnd("init bulk");

            console.time("query");
            const docs = await this.collection.find(query).project(projection).skip(skip).limit(limit).toArray();
            console.timeEnd("query");

            console.time("processing");
            docs.forEach(results => forEachCallback(results, this.collection, bulk));
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


