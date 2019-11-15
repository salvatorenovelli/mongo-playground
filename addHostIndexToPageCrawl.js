const util = require('util');
const MongoConsole = require("./MongoConsole.js");
const Entities = require('html-entities').AllHtmlEntities;
const c = require('ansi-colors');
const entities = new Entities();
const htmlToText = require('html-to-text');


String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};


let query = {host: {$exists: false}};


(async function () {

    const pageSize = 5000.0;
    let mongoConsole = new MongoConsole("pageCrawl");
    await mongoConsole.connect();

    for (let i = 0; i < 1000; i++) {
        console.log("\n\nProcessing page: " + i);
        console.time("page");
        let recordUpdated = await processNextPage(mongoConsole, 0, pageSize);
        console.log("Updated ", recordUpdated, " records");
        console.timeEnd("page");
    }

    await mongoConsole.close();

})();


async function processNextPage(mongoConsole, skip = 0, limit = 0) {

    let totalUpdates = 0;
    let skipNotified = false;

    await mongoConsole.find(query, {_id: true, "uri": true}, (entity, collection, bulk) => {

        //console.logj(bulk);
        if (bulk.s.currentBatch == null) {
            bulk.s.currentBatch = {
                sizeBytes: 0
            }
        }

        if (bulk.s.maxBatchSizeBytes - bulk.s.currentBatch.sizeBytes > 100000) {
            // process.stdout.write("\nBulk Size " + getBulkSizeDescription(bulk) + " -- URL: " + entity.uri + " " + entity._id);
            // console.log(
            // console.log(highlight(util.inspect(entity, {colors: true, depth: 4})));

            if (entity.uri && entity.uri !== "") {
                // console.log("Processing:", entity);
                try {
                    bulk.find({"_id": entity._id}).updateOne({$set: {"host": new URL(entity.uri).host}});
                    totalUpdates++;
                } catch (e) {
                    console.log("URI: '" + entity.uri + "'", entity);
                    console.log("Exception: ", e);
                }
            }


        } else {
            if (!skipNotified) {
                console.log("Max bulk size exceeded skipping this...");
                skipNotified = true;
            }
        }

    }, skip, limit);


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





