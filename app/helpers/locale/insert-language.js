const fs = require('fs');

let localizationDictionary = require('./localization_strings.json');
const excelToJson = require('convert-excel-to-json');

(async function run() {
	const jsonData = excelToJson({
		sourceFile: './app/helpers/locale/japan.xlsx',
	});
	
	const sheetKeys = Object.keys(jsonData);

	console.log(sheetKeys)

	for (let i = 0; i < sheetKeys.length; i++) {
		const sheetKey = sheetKeys[i];
		const language = 'jp';
		const sheet = jsonData[sheetKey];

		for (let i = 1; i < sheet.length; i++) {
			const localeString = sheet[i];
			// console.log(localeString)
			try {
				const stringName = localeString.A;

				if (!localizationDictionary[stringName]) {
					localizationDictionary[stringName] =  {
						"en": "",
						"en_US": "",
						"fr": "",
						"de": "",
						"es": "",
						"ru": "",
						"pl": "",
						"nl": "",
						"it": "",
						"zh": "",
						"ja": "",
						"sv": "",
						"sl": "",
						"cs": "",
						"sk": "",
						"ro": "",
						"pt": "",
						"et": "",
						"el": "",
						"da": "",
						"ar": "",
						"bg": "",
						"fi": "",
						"hr": "",
						"hu": "",
						"lt": "",
						"mt": "",
						"lv": "",
						"jp": "",
					}
				}
				
				localizationDictionary[stringName][language] = localeString.B;
				console.log(localizationDictionary[stringName][language])
			}
			catch(e) {
				console.log(localeString);
				console.log(e);
			}
		}

		fs.writeFile('./app/helpers/locale/localization_strings_new.json', JSON.stringify(localizationDictionary), res => {
			console.log({res});
			process.exit();
		});
	}
})();