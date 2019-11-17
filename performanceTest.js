const MongoConsole = require("./MongoConsole.js");
const fetch = require("node-fetch");

const highlight = require('cli-highlight').highlight;
const logj = (obj) => console.log(highlight(JSON.stringify(obj, null, 4), {language: 'json', ignoreIllegals: true}));


function getTimeMillis() {
    return new Date().getTime();
}

(async function () {

    let mongoConsole = new MongoConsole();
    await mongoConsole.connect();
    let monitoredUris = await mongoConsole.getCollection("monitoredUri");
    let pageCrawl = await mongoConsole.getCollection("pageCrawl");


    try {

        let uriCount = await monitoredUris.countDocuments();
        let totalTime = 0;
        let totalTimePerCrawl = 0;

        let numTests = 100;

        console.log("\n\n\n#, uri, change count, crawl count, time, time per crawl");

        for (let i = 0; i < numTests; i++) {
            let randomUri = await getRandomUri(uriCount);
            let crawlCount = await pageCrawl.countDocuments({uri: randomUri});

            let start = getTimeMillis();
            let newVar = await getData('http://localhost:8081/archive-api/page-changes?uri=' + encodeURIComponent(randomUri));
            let elapsedTime = getTimeMillis() - start;
            let timePerCrawl = (elapsedTime / crawlCount);
            console.log(i + ", " + randomUri + ", " + newVar.length + ", " + crawlCount + ", " + elapsedTime + ", " + timePerCrawl.toFixed(2));
            totalTime += elapsedTime;
            totalTimePerCrawl += timePerCrawl;
        }
        console.log("Total time", totalTime, "AVG: " + (totalTime / numTests), "AVG Time per crawl: " + (totalTimePerCrawl / numTests).toFixed(3));


    } finally {
        await mongoConsole.close();
    }

    async function getRandomUri(nUris) {
        let randomUriIndex = Math.round(nUris * Math.random());
        return await monitoredUris.find({}).project({uri: 1}).skip(randomUriIndex).limit(1).toArray().then(value => {
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
