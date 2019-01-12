const MongoConsole = require("./MongoConsole.js");
const Entities = require('html-entities').AllHtmlEntities;
const c = require('ansi-colors');
const entities = new Entities();

let mongoConsole = new MongoConsole();

var pattern = /&#?[\w\d]+;/g;

var query = {
    $or: [
        {"title": pattern},
        {"metaDescriptions": pattern},
        {"h1s": pattern},
        {"h2s": pattern}
    ]
};


// var bulk = db.monitoredUri.initializeUnorderedBulkOp();


(async function () {
    for (let i = 0; i < 1; i++) {
        console.log("Processing block: " + i)
        await nextBlock();
    }
})();


async function nextBlock() {
    return mongoConsole.find(query, (result, collection, bulk) => {

        console.log("Analyzing URL:", result.uri, result._id);
        result.title = sanitizeField("Title", result.title);
        result.metaDescriptions = sanitizeField("Meta Description", result.metaDescriptions);
        result.h1s = sanitizeField("H1", result.h1s);
        result.h2s = sanitizeField("H2", result.h2s);

        // console.log("New value is:")
        // console.logj(result);

        bulk.find({"_id": result._id}).updateOne(result);

    }, 5000);
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

function sanitize(string) {
    return entities.decode(string).trim();
}





