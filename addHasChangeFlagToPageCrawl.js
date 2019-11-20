const MongoConsole = require("./MongoConsole.js");
const fetch = require("node-fetch");

const highlight = require('cli-highlight').highlight;
const logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));


function ObjectId(s) {
    return s;
}

function ISODate(s) {
    return s;
}

(async function () {

    let mongoConsole = new MongoConsole();
    await mongoConsole.connect();
    let monitoredUriRepo = await mongoConsole.getCollection("monitoredUri");
    let pageCrawlRepo = await mongoConsole.getCollection("pageCrawl");


    try {

        let totalMonitoredUri = await monitoredUriRepo.countDocuments({workspaceNumber: 63});
        let updatedMonitoredUri = 0;
        let updatedPageCrawl = 0;
        let data = await monitoredUriRepo.find({workspaceNumber: 63}).project({uri: 1}).toArray();
        let start = new Date().getTime();

        for (const monitoredUri of data) {
            let pageCrawls = await pageCrawlRepo.find({uri: monitoredUri.uri}).toArray();
            for (const entity of pageCrawls) {
                let updateOne = await pageCrawlRepo.updateOne({_id: entity._id}, {$set: {hasChanges: hasChanges(entity)}});

                if (updateOne.result.nModified !== 1) {
                    console.error("Did not update:", entity._id)
                }
                updatedPageCrawl++;
                if (updatedPageCrawl % 100 === 0) {
                    let end = new Date().getTime();
                    console.log(updatedMonitoredUri + "/" + totalMonitoredUri, "Total updated: " + updatedPageCrawl, "Time: " + (end - start));
                    start = end;
                }
            }
            updatedMonitoredUri++;
        }


    } finally {
        await mongoConsole.close();
    }


})();


function hasChanges(pageCrawl) {
    let fieldNames = ["redirectChainElements", "title", "metaDescriptions", "h1s", "h2s", "canonicals"];
    for (const fieldName of fieldNames) {
        if (valueExist(pageCrawl, fieldName)) return true;
    }
    return false;
}

function valueExist(pageCrawl, fieldName) {
    return pageCrawl[fieldName].value;
}
