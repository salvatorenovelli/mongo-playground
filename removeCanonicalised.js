'use strict';
const highlight = require('cli-highlight').highlight;
const util = require('util');
const deepEqual = require("deep-equal");


console.logj = (obj) => console.log(util.inspect(obj, {colors: true, depth: 4}));
console.logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));

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
const dbName = 'website-versioning';

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}


(async function () {
    try {


        const filter = {workspaceNumber: 63, "currentValue.canonicals.0": {$exists: true}};

        const client = new MongoClient(url, {useNewUrlParser: true});

        await client.connect();
        console.log("Connected correctly to server");


        const db = client.db(dbName);
        const monitoredUriColl = db.collection("monitoredUri");
        const pageCrawlCollection = db.collection("pageCrawl");


        let monitoredUris = await monitoredUriColl.find(filter).project({
            id: 1,
            uri: 1,
            "currentValue.canonicals": 1
        }).toArray();

        let done = 0;
        let deletedMonitoredUri = 0;
        let deletedPageCrawls = 0;
        let tot = monitoredUris.length;


        await asyncForEach(monitoredUris, async (monitoredUri) => {

            // console.logj(monitoredUri)

            if (monitoredUri.uri !== monitoredUri.currentValue.canonicals[0]) {
                console.log("Different:", monitoredUri.uri, monitoredUri.currentValue.canonicals[0]);

                console.log("Deleting monitored URI ID: ", monitoredUri._id);

                let monitoredUriResult = await monitoredUriColl.deleteOne({"_id": monitoredUri._id});

                console.log("Deleting PageCrawls");
                let pageCrawlResult = await pageCrawlCollection.deleteMany({"uri": monitoredUri.uri});


                // console.log(result)

                deletedMonitoredUri += monitoredUriResult.deletedCount;
                deletedPageCrawls += pageCrawlResult.deletedCount;
            }


            console.log("completed: ", ++done, "/" + tot + " deleted: " + deletedMonitoredUri + ", " + deletedPageCrawls)
        });


        console.log("Done!");
        console.log("Deleted MonitoredUri: ", deletedMonitoredUri);
        console.log("Deleted PageCrawl: ", deletedPageCrawls);


        // return client.close(false);
    } catch (err) {
        console.error(err.stack);
    }

})();




