const MongoConsole = require("./MongoConsole.js");
const Entities = require('html-entities').AllHtmlEntities;
const c = require('ansi-colors');
const entities = new Entities();

let mongoConsole = new MongoConsole();

const pattern = /&#?[\w\d]+;/g;

let query = {
    $or: [
        {"title": pattern},
        {"metaDescriptions": pattern},
        {"h1s": pattern},
        {"h2s": pattern}
    ]
};


mongoConsole.find(query, (result, collection) => {

    // result.title = "&lt;&gt;&quot;&apos;&amp;&copy;&reg;&#8710;";
    console.log("\nAnalyzing URL:", result.uri);
    result.title = sanitizeField("Title", result.title);
    result.metaDescriptions = sanitizeField("Meta Description", result.metaDescriptions);
    result.h1s = sanitizeField("H1", result.h1s);
    result.h2s = sanitizeField("H2", result.h2s);

    // console.log("New value is:")
    // console.logj(result);

    collection.replaceOne(
        {"_id": result._id}, result
    );

}, 100);


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
    if (item !== sanitized) {
        console.log("Changing " + fieldName + ":\n\t", "'" + highlight(item) + "'", "\n\t " + "'" + sanitize(item) + "'");
    }
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





