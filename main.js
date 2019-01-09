const highlight = require('cli-highlight').highlight;
const util = require('util');

// console.logj = (obj) => console.log(util.inspect(obj, {colors: true, depth: 4}));
console.logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));

const MongoClient = require('mongodb').MongoClient;
const deepEqual = require("deep-equal");


let url = "mongodb://localhost:9000";


console.time("query");

const toObject = (obj, item) => {
    obj[item.fieldName] = item.fieldValue;
    return obj
};

function getChanges(cur, prev) {
    let reference = Object.keys(cur).length >= Object.keys(prev) ? cur : prev;
    reference = filterFields(reference);

    return Object.keys(reference)
        .map(key => {
            // console.log("Comparing", key, cur[key], prev[key])
            if (!deepEqual(cur[key], prev[key])) {
                return {fieldName: key, fieldValue: cur[key]}
            }
            return null;
        })
        .filter(value => value !== null)
        .reduce(toObject, {});
}

MongoClient.connect(url, {useNewUrlParser: true}, function (err, connection) {
    if (err) throw err;


    const db = connection.db('test-website-versioning');
    let pageSnapshotByUri = db.collection("pageSnapshotByUri");


    pageSnapshotByUri.find({}).limit(15)
        .toArray((err, results) => {
            if (err) throw err;


            results.forEach(result => {

                console.log("Analyzing URI:", result._id);
                let snapshots = result.snapshots;


                for (let i = 1; i < snapshots.length; i++) {
                    let prev = snapshots[i - 1];
                    let cur = snapshots[i];

                    let pageCrawl = {
                        createDate: cur.createDate,
                        changes: getChanges(cur, prev)
                    };

                    if (Object.keys(pageCrawl.changes).length > 0) {
                        console.logj(pageCrawl)
                    }
                }

            });


            console.timeEnd("query");
            connection.close();
        })
});


function filterFields(currentValue) {

    const ignoredFields = ["createDate", "_id", "_links", "val", "selected", "_class", "crawlStatus"];
    let copy = Object.assign({}, currentValue);
    ignoredFields.forEach(filteredField => {
        delete copy[filteredField];
    });


    return copy;
}
