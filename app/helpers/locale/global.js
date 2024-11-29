var USER_LOCALE = null;

export function updateUserLocale(locale) {
	localStorage.setItem('locale', JSON.stringify(locale));
    USER_LOCALE = locale;
}

export function fetchUserLocale() {
	var storedLocale = localStorage.getItem('locale');

	if (!USER_LOCALE && storedLocale) {
		try {
			storedLocale = JSON.parse(storedLocale);
			return storedLocale;
		}
		catch(e) {
			return USER_LOCALE
		}
	}

	return USER_LOCALE;
}