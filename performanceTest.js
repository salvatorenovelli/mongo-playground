const MongoConsole = require("./MongoConsole.js");
const request = require('request');
const util = require('util');
const fetch = require("node-fetch");

const highlight = require('cli-highlight').highlight;
const logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));


function getTimeMillis() {
    return new Date().getTime();
}

(async function () {

    let mongoConsole = new MongoConsole("monitoredUri");
    await mongoConsole.connect();
    let monitoredUris = mongoConsole.collection;


    try {

        let uriCount = await monitoredUris.countDocuments();
        let totalTime = 0;


        let numTests = 100;

        for (let i = 0; i < numTests; i++) {
            let randomUri = await getRandomUri(uriCount);
            let start = getTimeMillis();
            await getData('http://localhost:8081/archive-api/page-changes?uri=' + encodeURIComponent(randomUri));
            let elapsedTime = getTimeMillis() - start;
            console.log(randomUri + ", " + elapsedTime);
            totalTime += elapsedTime;
        }
        console.log("Total time", totalTime, "AVG: " + totalTime / numTests);


    } finally {
        await mongoConsole.close();
    }

    async function getRandomUri(nUris) {
        let randomUriIndex = Math.round(nUris * Math.random());
        return await monitoredUris.find().project({uri: 1}).skip(randomUriIndex).limit(1).toArray().then(value => {
            return value[0].uri;
        });
    }


})();


const getData = async url => {
    const response = await fetch(url);
    try {
        return await response.json();
    } catch (e) {
        console.log("Exception with:", url, e);
    }
};
