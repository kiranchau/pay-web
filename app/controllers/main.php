<?php

$app->get('/', function($req, $res) {
	return $res->render('home');
});

$app->get('/qr', function($req, $res) {
	return $res->redirect('/');
});

$app->post('/ping', function($req, $res) {
	$ob = new StdClass;

	$timeout = 20 * 60;
	$warning = 2 * 60;
	$last = $_SESSION['last_interaction'] ?: 0;
	$diff = time() - $last;
	$ob->last_seen = $last;

	if ($diff > $timeout) {
		$ob->status = 3;
		unset($_SESSION['user_id']);
		unset($_SESSION['patient_id']);
		unset($_SESSION['account_id']);
	}
	else if ($diff >= $timeout - $warning) {
		$ob->status = 2;
		$ob->remaining = $timeout - $diff;
	}
	else {
		$ob->status = 0;
		$ob->remaining = $timeout - $diff;
	}

	return $res->json($ob);
});

$app->get('/currencies', function($req, $res) {
	$ob = new StdClass;
	if ($req->get['active'] && $req->get['active'] == 1) {
	$ob->currencies = Currency::factory()
		->where('active = ?', '1')
		->plain()
		->find();
	}
	else if ($req->get['active'] && $req->get['active'] == 0) {
		$ob->currencies = Currency::factory()
			->where('active = ?', '0')
			->plain()
			->find();
	}
	else {
		$ob->records = Currency::factory()
			->plain()
			->find();
	}
	return $res->json($ob);
});

$app->post('/currencies', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = Currency::factory()->load();
	$record->id = $req->post['id'];
	$errors = $record->validate();

	if($errors) {
		$ob->errors = $errors;
	}
	else {
	$record->save();
	$ob->record = Currency::factory()->plain()->first($record->id);
	$ob->status = 0;
	}
	return $res->json($ob);
});

$app->get('/countries', function($req, $res) {
	$ob = new StdClass;
	if($req->get['active'] && $req->get['active'] == 1) {
		$ob->countries = Country::factory()
				->where('active = ?', '1')
				->order('name')
				->plain()
				->find();	
	}
	else if ($req->get['active'] && $req->get['active'] == 0) {
		$ob->records = Country::factory()
			->select('country.*, currency.name as _currency_name')
			->table('country left join currency on country.default_currency = currency.code')
			->order('name')
			->plain()
			->find();
	}
	else {
		$ob->records = Country::factory()
			->select('country.*, currency.name as _currency_name')
			->table('country left join currency on country.default_currency = currency.code')
			->order('name')
			->plain()
			->find();
	}

	return $res->json($ob);
});

$app->get('/languages', $client_filter, function($req, $res) {
    $ob = new StdClass;
    $ob->records = Language::factory()->plain()->order('name')->find();
    return $res->json($ob);
});

$app->get('/pay-processor', $client_filter, function($req, $res) {
    $ob = new StdClass;
    $ob->records = PayProcessor::factory()->plain()->order('name')->find();
    $ob->feature_flag = Sys::getFeatureFlag();
    return $res->json($ob);
});

$app->get('/flight-time-pref', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 0;

	global $app;
	$globalUser = $app->response->user;
	$user = $res->user;
	$lang = $user ? $user->lang : $globalUser->lang;
	$ob->lang = $lang;

	if (!$lang) {
		$lang = 'en';
	}

	$ob->records = FlightTimePref::factory()
		->raw('select IF(ls.value is null, ftp.name, ls.value) as name, ftp.id
				from flight_time_pref ftp
				left join localized_string ls on ls.name = (CONCAT("option.", REPLACE(SUBSTR(ftp.name, 1, (LOCATE(" (", ftp.name) - 1)), " ", "-")))
				where (ls.lang = ? or ls.lang is null)', $lang)
		->plain()
		->find();

	foreach ($ob->records as $record) {
		$record->name = ucwords($record->name);
		$record->id = $record->id;
	}
	
	return $res->json($ob);
});

$app->get('/flight-seat-pref', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 0;

	global $app;
	$globalUser = $app->response->user;
	$user = $res->user;
	$lang = $user ? $user->lang : $globalUser->lang;
	$ob->lang = $lang;

	if (!$lang) {
		$lang = 'en';
	}

	$ob->records = FlightSeatPref::factory()
		->raw('select IF(ls.value is null, fsp.name, ls.value) as name, fsp.id
				from flight_seat_pref fsp
				left join localized_string ls on ls.name = CONCAT("option." , REPLACE(fsp.name, "-", " "))
				where (ls.lang = ? or ls.lang is null) group by fsp.id', $lang)
		->plain()
		->find();

	foreach ($ob->records as $record) {
		$record->name = ucwords($record->name);
		$record->id = $record->id;
	}

	return $res->json($ob);
});

$app->post('/countries', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = Country::factory()->load();
	$record->code = $req->post['code'];
	$errors = $record->validate();

	if($errors) {
		$ob->errors = $errors;
	}
	else {
		$record->save();
		$ob->record = Country::factory()->plain()->first($record->code);
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->get('/settings', function($req, $res) {
	$ob = new StdClass;
	if ($req->get['ver'] && $req->get['ver'] == 2) {

		$ob->countries = Country::factory()
		->select('country.*, currency.symbol as _symbol')
		->table('country left join currency on country.default_currency = currency.code')
		->where('country.code = ?', $account->country)
		->where('country.active = ?', '1')
		->order('name')
		->plain()
		->find();


		// $ob->countries = Country::factory()->where('active = ?', '1')->plain()->find();
	}
	else {
			$ob->countries = Country::fetchAll();
	}
	$ob->states = [
		'US' => State::fetchAll('US'),
		'CA' => State::fetchAll('CA'),
	];
	$ob->timezones = DateTimeZone::listIdentifiers();
	$sysData = Sys::factory()
		->plain()
		->select('enable_ous,feature_flag')
		->where('id = ?', 5)
		->first();
	$ob->enable_ous = $sysData->enable_ous;
    $ob->feature_flag = $sysData->feature_flag;

	return $res->json($ob);
});

$app->get('/settings/geocode', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	if ($req->get['lat'] && $req->get['lng']) {
		$components = GeoHelper::reverseGeocode([
			'lat' => $req->get['lat'],
			'lng' => $req->get['lng'],
		]);

		if ($components === false) {
			$ob->error = LocalizedString::getString('error.determine-location', 'We were unable to determine your location for the provided coordinates.');
			return $res->json($ob);
		}

		$addr = new StdClass;

		$street = [];
		foreach ($components->address_components as $comp) {
			if (in_array('street_number', $comp->types))
				$street[] = $comp->short_name;
			if (in_array('route', $comp->types))
				$street[] = $comp->short_name;
			if (in_array('locality', $comp->types))
				$addr->city = $comp->short_name;
			if (in_array('administrative_area_level_1', $comp->types))
				$addr->state = $comp->short_name;
			if (in_array('country', $comp->types))
				$addr->country = $comp->short_name;
			if (in_array('postal_code', $comp->types))
				$addr->zipcode = $comp->short_name;
		}

		$addr->address = implode(' ', $street);

		$ob->address = $addr;
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->any('/hook/sms', function($req, $res) {
  $ob = new StdClass;
  $ob->status = 2;

	mail('test@redaxle.com', 'SMS Incoming', print_r($req->post, true));
  $msg = trim($req->post['Body']);
  $from = preg_replace('#^\+1#', '', $req->post['From']);

  $user = Account::factory()
		->where('phone_mobile = ?', $from)
		->first();

  if ($user && preg_match('#^confirm#i', $msg)) {
		$user->date_mobile_verified = new DateTime;
		$user->mobile_verified = 1;
		$user->only('date_mobile_verified', 'mobile_verified')->save();
  }

  return '';
});

$app->any('/hook/voice', function($req, $res) {
	$xml = '<Response>
			<Say voice="woman">You have reached Real Time Pay. For further assistance please email support at real time dash ctms dot com.</Say>
			<Pause />
			<Say voice="woman">Goodbye.</Say>
		</Response>';
	return $res->xml($xml);
});

