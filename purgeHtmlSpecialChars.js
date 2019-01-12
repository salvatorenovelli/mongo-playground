const util = require('util');
const MongoConsole = require("./MongoConsole.js");
const Entities = require('html-entities').AllHtmlEntities;
const c = require('ansi-colors');
const entities = new Entities();

let mongoConsole = new MongoConsole();

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

// var pattern = /&#?[\w\d]+;/g;
var pattern = /[\n\r]/g;

var query = {
    $or: [
        {"title": pattern},
        {"metaDescriptions": pattern},
        {"h1s": pattern},
        {"h2s": pattern}
    ]
};


(async function () {

    const pageSize = 5000.0;

    for (let i = 0; i < 100; i++) {
        console.log("Processing page: " + i);
        let recordUpdated = await processNextPage(0, pageSize);
        console.log("Updated ", recordUpdated, " records")
    }

})();


async function processNextPage(skip = 0, limit = 0) {

    let totalUpdates = 0;
    let skipNotified = false;

    await mongoConsole.find(query, (result, collection, bulk) => {

        //console.logj(bulk);
        if (bulk.s.currentBatch == null) {
            bulk.s.currentBatch = {
                sizeBytes: 0
            }
        }

        if (bulk.s.maxBatchSizeBytes - bulk.s.currentBatch.sizeBytes > 100000) {


            process.stdout.write("\rBulk Size " + getBulkSizeDescription(bulk) + " -- URL: " + result.uri + " " + result._id);
            // console.log(
            // console.log(highlight(util.inspect(result, {colors: true, depth: 4})));

            result.title = sanitizeField("Title", result.title);
            result.metaDescriptions = sanitizeField("Meta Description", result.metaDescriptions);
            result.h1s = sanitizeField("H1", result.h1s);
            result.h2s = sanitizeField("H2", result.h2s);

            // console.log("New value is:")
            // console.logj(result);

            bulk.find({"_id": result._id}).updateOne(result);
            totalUpdates++;
        } else {
            if (!skipNotified) {
                console.log("\nMax bulk size exceeded skipping this...");
                skipNotified = true;
            }
        }

    }, skip, limit);

    console.log("");
    return totalUpdates;
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
    //     console.log("Changing " + fieldName + ":\n\t", "'" + highlight(item) + "'", "\n\t " + "'" + sanitize(item) + "'");
    // }
    return sanitized;
}

function highlight(str) {
    return str.replace(/(&#?[\w\d]+;?)/g, function (s, entity) {
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
    return removeDoubleSpaces(removeLineBreaks(entities.decode(string))).trim();
}





