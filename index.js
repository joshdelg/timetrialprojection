const fs = require('fs');
const got = require('got');
const cheerio = require('cheerio');
const regression = require('regression');

console.log("Reading files...");
let jvath = JSON.parse(fs.readFileSync('./saved_data/two-mile-2020-jv-womens.json', 'utf-8')).results;
let varsityath = JSON.parse(fs.readFileSync('./saved_data/two-mile-2020-womens.json', 'utf-8')).results;

let athletes = varsityath.concat(jvath);

let newRaceResults = JSON.parse(fs.readFileSync('./saved_data/two-mile-2021-womens.json', 'utf-8')).results;

const timeToString = (sec) => {
    const mins = Math.floor(sec / 60);
    const seconds = (sec % 60).toFixed(1);

    const newSeconds = (seconds < 10) ? `0${seconds}` : seconds;

    return `${mins}:${newSeconds}`;
}

const toSeconds = (stringTime) => {
    const mins = parseFloat(stringTime.split(":")[0]);
    const secs = parseFloat(stringTime.split(":")[1]);

    return mins * 60 + secs;
}

const getAthletePR = async (athleteId, year) => {

    try {
        const response = await got(`https://www.athletic.net/CrossCountry/Athlete.aspx?AID=${athleteId}`);
        const $ = cheerio.load(response.body);


        let sr = null;

        const timeTables = $('table.histEvent');
        timeTables.each((i, el) => {
            if($(el).text().includes("5,000 Meters")) {
                $('tr.histSeason', el).each((index, el2) => {
                    if($(el2).text().includes(year)) {
                        const srr = $("[href*='/result/']", el2).text();
                        console.log("In llop", srr);
                        sr = srr;
                    }
                })
            }
        });

        return sr;
    } catch (err) {
        console.log("There was an error in avg time: ", err);
        return null;
    }
}

let regData = [];

const getData = async() => {
    for(const athlete of athletes) {
        const sr = await getAthletePR(athlete.AthleteID, 2020);
        if(athlete.Result !== "DNS" && athlete.Result !== "DNF") {
            if(sr) {
                console.log(sr, toSeconds(sr));
                regData.push([athlete.SortValue, toSeconds(sr)]);
            }
        }
    }
}

getData().then(() => {
    const model = regression.linear(regData.filter((val, index) => index < (regData.length - 5)));
    console.log(model);

    let output = "Athlete Name,Predicted 5K Time (Readable),Predicted 5K Time (Seconds)\n";

    newRaceResults.forEach((athlete) => {
        output += (athlete.FirstName + " " + athlete.LastName + "," + timeToString(model.predict(athlete.SortValue)[1]) + "," + model.predict(athlete.SortValue)[1].toFixed(1) + "\n");
        console.log((athlete.FirstName + " " + athlete.LastName), timeToString(model.predict(athlete.SortValue)[1]));
    });

    fs.writeFileSync('./output/2021-two-mile-womens-prediction.txt', output);
    console.log('Success!');
});




/*const createModel = async() => {

    try {
        const response = await got.post('https://www.athletic.net/api/v1/Meet/GetResultsData', {
            json: {
                divId: divId,
            },
            headers: {
                "Cookie": 'ANETSettings=Team=408&Sport=XC&guid=a5596ac4-d7ad-40e3-a9c5-6cbeb226eb9e&User=1012249',
                "Content-Type": 'application/json',
                "anettokens": 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZWV0SWQiOjE1NjcyOCwic3BvcnQiOjMsIm5iZiI6MTYyNzMyOTEzOSwiZXhwIjoxNjI3NTAxOTM5LCJpYXQiOjE2MjczMjkxMzksImlzcyI6ImF0aGxldGljLm5ldCIsImF1ZCI6Imp3dE1lZXQifQ.JY6RQbkK4wB5C6Y9IQRgi_DzShxcX1GTAdvQElK4uUw'
            }
        });

        console.log(JSON.parse(response.body).results);
    } catch (err) {
        console.log(err);
    }
};

createModel();*/