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

Array.prototype.in = function (other) {
    if (this === other) return true;
    if (other == null) return false;


    for (let i = 0; i < this.length; ++i) {
        if (!other.contains(this[i])) return false;
    }
    return true;
};


const MongoClient = require('mongodb').MongoClient;


const url = "mongodb://localhost:9000";
const dbName = 'test-website-versioning';


const tags = ["title", "h1", "metaDescription"];
const printError = mongoError => {
    if (mongoError)
        console.error(mongoError);
};

const allFields = ["_id", "createDate", "uri", "redirectChainElements", "title", "h1s", "h2s", "metaDescriptions", "canonicals", "_class", "crawlStatus"];


const ignoredFields = ["_class"];
const optionalFields = ["crawlStatus"];

const mappedFields = ["redirectChainElements", "title", "h1s", "h2s", "metaDescriptions", "canonicals"];

function mapSnapshotToCrawl(snapshot) {

    if (!Object.keys(snapshot).in(allFields)) {
        throw Error("There are more fields than predicted!" + Object.keys(snapshot));
    }

    return allFields
        .filter(key => !ignoredFields.contains(key))
        .map(key => {
            if (mappedFields.contains(key)) {
                return {key: key, value: {value: snapshot[key]}};
            } else {
                if (typeof snapshot[key] === "undefined" && optionalFields.contains(key)) {
                    return {key: null};
                }
                return {key: key, value: snapshot[key]};
            }
        })
        .filter(v => v.key != null)
        .reduce((previousValue, currentValue) => {
            previousValue[currentValue.key] = currentValue.value;
            return previousValue;
        }, {});
}

function createIncrementalSnapshot(prev, cur, index, lastCrawl) {

    let mapped = allFields
        .filter(key => !ignoredFields.contains(key))
        .map(key => {
            if (mappedFields.contains(key)) {


                if (deepEqual(cur[key], prev[key])) {


                    if (typeof lastCrawl[key] === "undefined") {
                        console.log("")
                    }

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
                if (typeof cur[key] === "undefined" && optionalFields.contains(key)) {
                    return {key: null};
                }
                return {key: key, value: cur[key]};
            }
        })

        .filter(v => v.key != null)
        .reduce((previousValue, currentValue) => {
            previousValue[currentValue.key] = currentValue.value;
            return previousValue;
        }, {});


    return mapped;
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

(async function () {
    try {


        const filter = {uri: "https://uk.braun.com/en-gb/female-hair-removal/all-about-beautiful-skin/how-to-remove-facial-hair"};

        const client = new MongoClient(url, {useNewUrlParser: true});

        await client.connect();
        console.log("Connected correctly to server");


        const db = client.db(dbName);
        const monitoredUriColl = db.collection("monitoredUri");
        const pageSnapshotColl = db.collection("pageSnapshot");
        const pageCrawlCollection = db.collection("pageCrawl");

        await pageCrawlCollection.deleteMany(filter);


        let done = 0;

        let monitoredUris = await monitoredUriColl.find(filter).project({uri: 1}).toArray();

        let tot = monitoredUris.length;


        await asyncForEach(monitoredUris, async (monitoredUri) => {

            // let snapshotCount = await pageSnapshotColl.find({uri: monitoredUri.uri}).sort({createDate: 1}).count();
            console.log("Fetching snapshots: " + monitoredUri.uri + "\n");
            let snapshots = await pageSnapshotColl.find({uri: monitoredUri.uri}).sort({createDate: 1}).toArray();

            let lastCrawl;

            let map = snapshots.map((item, index) => {

                if (index === 0) {
                    lastCrawl = mapSnapshotToCrawl(item);
                } else {
                    lastCrawl = createIncrementalSnapshot(snapshots[index - 1], item, index, lastCrawl);
                }

                return lastCrawl;

            });

            if (map.length > 0) {
                await pageCrawlCollection.insertMany(map);
            } else {
                console.error("Nothing to do with:", monitoredUri.uri)
            }

            console.log("completed: ", ++done, "/" + tot)
        });


        console.log("Done")


        // return client.close(false);
    } catch (err) {
        console.error(err.stack);
    }

})();




