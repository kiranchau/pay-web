import localizationDictionary from './localization_strings.json';
import { fetchUserLocale, updateUserLocale } from './global';

export default class Locale {

	constructor(props) {
		Object.assign(this, props)
	}

	static getString(key, fallback) {
		let userLocale = fetchUserLocale();
		let locale = 'en'
		
		if (userLocale == "null" || !userLocale) {
			locale = window.navigator.userLanguage || window.navigator.language || 'en';
		}
		else {
			locale = userLocale;
		}

		if (locale.indexOf('-') > -1) {
			const localeArray = locale.split('-');
			locale = localeArray[0];
		}

		let localizedString = localizationDictionary[`${key}`];
        
		if (localizedString && localizedString[locale]) {
			return localizedString[locale];
		}
		else {
			console.log('Localized String Not found: ', key);
        }

		return fallback;
	}

	static async setLocale(locale) {
		return updateUserLocale(locale);
    }

    static fetchLocale() {
        return fetchUserLocale();
    }
}