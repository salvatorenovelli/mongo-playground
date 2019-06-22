const util = require('util');
const MongoConsole = require("./MongoConsole.js");
const Entities = require('html-entities').AllHtmlEntities;
const c = require('ansi-colors');
const entities = new Entities();
const htmlToText = require('html-to-text');

let mongoConsole = new MongoConsole();

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

// var pattern = /&#?[\w\d]+;/g;
// var pattern = /[\n\r]/g;
// var pattern = /[ ]{2,}/g;
var pattern = /</g;

var queryPageCrawl = {
    $or: [
        {"title.value": pattern},
        {"metaDescriptions.value": pattern},
        {"h1s.value": pattern},
        {"h2s.value": pattern}
    ]
};

var queryMonitoredUri = {
    $or: [
        {"currentValue.title": pattern},
        {"currentValue.metaDescriptions": pattern},
        {"currentValue.h1s": pattern},
        {"currentValue.h2s": pattern},
        {"recommendation.title": pattern},
        {"recommendation.metaDescriptions": pattern},
        {"recommendation.h1s": pattern},
        {"recommendation.h2s": pattern},
    ]
};


(async function () {

    const pageSize = 5000.0;

    for (let i = 0; i < 100; i++) {
        console.log("\n\nProcessing page: " + i);
        console.time("page");
        let recordUpdated = await processNextPage(0, pageSize);
        console.log("Updated ", recordUpdated, " records");
        console.timeEnd("page");
    }

})();


async function processNextPage(skip = 0, limit = 0) {

    let totalUpdates = 0;
    let skipNotified = false;

    await mongoConsole.find(queryMonitoredUri, (result, collection, bulk) => {

        //console.logj(bulk);
        if (bulk.s.currentBatch == null) {
            bulk.s.currentBatch = {
                sizeBytes: 0
            }
        }

        if (bulk.s.maxBatchSizeBytes - bulk.s.currentBatch.sizeBytes > 100000) {


            // process.stdout.write("\nBulk Size " + getBulkSizeDescription(bulk) + " -- URL: " + result.uri + " " + result._id);
            // console.log(
            // console.log(highlight(util.inspect(result, {colors: true, depth: 4})));

            sanitizeMonitoredUri(result);

            // console.log("New value is:")
            // console.logj(result);

            bulk.find({"_id": result._id}).updateOne(result);
            totalUpdates++;
        } else {
            if (!skipNotified) {
                console.log("Max bulk size exceeded skipping this...");
                skipNotified = true;
            }
        }

    }, skip, limit);


    return totalUpdates;
}

function sanitizeMonitoredUri(muri) {


    if (muri.currentValue) update(muri.currentValue);
    if (muri.recommendation) update(muri.recommendation);

}

function update(currentValue) {
    if (currentValue.title) currentValue.title = sanitizeField("Title", currentValue.title);
    if (currentValue.metaDescriptions) currentValue.metaDescriptions = sanitizeField("Meta Description", currentValue.metaDescriptions);
    if (currentValue.h1s) currentValue.h1s = sanitizeField("H1", currentValue.h1s);
    if (currentValue.h2s) currentValue.h2s = sanitizeField("H2", currentValue.h2s);
}

function sanitizePageCrawl(result) {
    if (result.title.value) result.title.value = sanitizeField("Title", result.title.value);
    if (result.metaDescriptions.value) result.metaDescriptions.value = sanitizeField("Meta Description", result.metaDescriptions.value);
    if (result.h1s.value) result.h1s.value = sanitizeField("H1", result.h1s.value);
    if (result.h2s.value) result.h2s.value = sanitizeField("H2", result.h2s.value);
}

function getBulkSizeDescription(bulk) {
    return bytesToSize(bulk.s.currentBatch.sizeBytes) + " / " + bytesToSize(bulk.s.maxBatchSizeBytes);
}

function bytesToSize(bytes) {
    let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function sanitizeField(fieldName, field) {
    if (Array.isArray(field)) {
        return field.map((item, index) => {
            return sanitizeItem(fieldName + "-" + index, item);
        });
    } else {
        return sanitizeItem(fieldName, field);
    }
}

function sanitizeItem(fieldName, item) {
    let sanitized = sanitize(item);
    // if (item !== sanitized) {
    //     console.log("Changing " + fieldName + ":", "'" + highlight(item) + "'", c.bold(c.blueBright("=> ")) + "'" + sanitized + "'");
    // }
    return sanitized;
}

function highlight(str) {
    ///old: (&#?[\w\d]+;?)/g
    return str.replace(/(<[^>]*>?)/g, function (s, entity) {
        return c.red(entity);
    });
}

function removeDoubleSpaces(str) {
    return str.replaceAll("[ ]{2,}", " ");
}

function removeLineBreaks(str) {
    return str.replaceAll("[\\n\\r]", " ");
}

function sanitize(string) {
    string = htmlToText.fromString(string);
    return removeDoubleSpaces(removeLineBreaks(entities.decode(string))).trim();
}





