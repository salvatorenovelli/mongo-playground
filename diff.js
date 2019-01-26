'use strict';
const highlight = require('cli-highlight').highlight;
const util = require('util');

console.logj = (obj) => console.log(util.inspect(obj, {colors: true, depth: 4}));
// console.logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));

Date.prototype.addDays = function (days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}


const MongoClient = require('mongodb').MongoClient;


const url = "mongodb://localhost:9000";
const dbName = 'test-website-versioning';


const tags = ["title", "h1", "metaDescription"];


(async function () {

    const client = new MongoClient(url, {useNewUrlParser: true});


    await client.connect();
    console.log("Connected correctly to server");


    const db = client.db(dbName);
    const collection = db.collection('pageCrawls');

    await collection.deleteMany({});


    const startDate = new Date(2015, 0, 1);

    let state = {
        title: {value: "title"},
        metaDescription: {value: "metaDescription"},
        h1: {value: "h1"}
    };

    let lastId = (await collection.insertOne({createDate: startDate.addDays(0), snapshot: state})).insertedId;


    for (let i = 1; i < 7000; i++) {

        let unchanged = [];

        tags.forEach(tag => {
            if (Math.random() > 0.99) {
                delete state[tag].reference;
                state[tag].value = tag + "-" + i;
            } else {
                unchanged.push(tag);
            }

        });

        unchanged.forEach(tag => {
            if (state[tag].value) {
                delete state[tag].value;
                state[tag].reference = lastId;
            }
        });

        let inserted = await collection.insertOne({createDate: startDate.addDays(i), snapshot: state});

        lastId = inserted.insertedId;

        console.log(lastId);
        console.log("")

    }


    await client.close(false);


})();




