const fs = require('fs');
let localizationDictionary = require('./localization_strings.json');
const countryCode = process.argv.slice(2)[0].split('=')[1];

(async function run() {
    if (!countryCode) {
        return;
    }

    for (let key of Object.keys(localizationDictionary)) {
        let object = localizationDictionary[key];
        object[`${countryCode}`] = '';
        localizationDictionary[key] = object;
    }

    fs.writeFile('./app/helpers/localization_strings.json', JSON.stringify(localizationDictionary), res => {
        process.exit();
    });
})();