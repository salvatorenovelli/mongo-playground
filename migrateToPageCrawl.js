'use strict';
const highlight = require('cli-highlight').highlight;
const util = require('util');
const deepEqual = require("deep-equal");

console.logj = (obj) => console.log(util.inspect(obj, {colors: true, depth: 4}));
// console.logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));

Date.prototype.addDays = function (days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

Array.prototype.contains = function (element) {
    return this.indexOf(element) > -1;
};


const MongoClient = require('mongodb').MongoClient;


const url = "mongodb://localhost:9000";
const dbName = 'test-website-versioning';


const tags = ["title", "h1", "metaDescription"];
const printError = mongoError => {
    if (mongoError)
        console.error(mongoError);
};

const ignoredFields = ["_class"];
const mappedFields = ["redirectChainElements", "title", "h1s", "h2s", "metaDescriptions", "canonicals"];

function mapSnapshotToCrawl(snapshot) {

    return Object.keys(snapshot)
        .filter(key => !ignoredFields.contains(key))
        .map(key => {
            if (mappedFields.contains(key)) {
                return {key: key, value: {value: snapshot[key]}};
            } else {
                return {key: key, value: snapshot[key]};
            }
        })
        .reduce((previousValue, currentValue) => {
            previousValue[currentValue.key] = currentValue.value;
            return previousValue;
        }, {});
}

function createIncrementalSnapshot(prev, cur, index, lastCrawl) {

    let mapped = Object.keys(cur)
        .filter(key => !ignoredFields.contains(key))
        .map(key => {
            if (mappedFields.contains(key)) {


                if (deepEqual(cur[key], prev[key])) {

                    if (lastCrawl[key].value) {
                        return {
                            key: key,
                            value: {reference: prev._id}
                        };
                    }

                    return {
                        key: key,
                        value: {reference: lastCrawl[key].reference}
                    };
                } else {
                    // console.log("Diff in key " + key + " index " + index + " date: " + cur.createDate.toISOString().split('T')[0]);
                    return {key: key, value: {value: cur[key]}};
                }


            } else {
                return {key: key, value: cur[key]};
            }
        })
        .reduce((previousValue, currentValue) => {
            previousValue[currentValue.key] = currentValue.value;
            return previousValue;
        }, {});


    return mapped;
}

(async function () {
    try {

        const client = new MongoClient(url, {useNewUrlParser: true});

        await client.connect();
        console.log("Connected correctly to server");


        const db = client.db(dbName);
        const monitoredUriColl = db.collection("monitoredUri");
        const pageSnapshotColl = db.collection("pageSnapshot");
        const pageCrawlCollection = db.collection("pageCrawl");

        await pageCrawlCollection.deleteMany({});


        let done = 0;


        // noinspection JSIgnoredPromiseFromCall
        monitoredUriColl.find({})
            .limit(1000)
            .project({uri: 1})
            .forEach(async function (monitoredUri) {





                let snapshots = await pageSnapshotColl.find({uri: monitoredUri.uri}).sort({createDate: 1}).toArray();
                // let snapshotCount = await pageSnapshotColl.find({uri: monitoredUri.uri}).sort({createDate: 1}).count();
                console.log("URL: " + monitoredUri.uri + "\n")

                let lastCrawl;

                let map = snapshots.map((item, index) => {

                    if (index === 0) {
                        lastCrawl = mapSnapshotToCrawl(item);
                    } else {
                        lastCrawl = createIncrementalSnapshot(snapshots[index - 1], item, index, lastCrawl);
                    }

                    return lastCrawl;

                });

                await pageCrawlCollection.insertMany(map);

                console.log("completed: ", ++done, "/10000")


            }, printError);


        //await client.close(false);
    } catch (err) {
        console.error(err.stack);
    }

})();




