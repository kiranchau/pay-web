<?php

$app->get('/manage/reimbursement-item-types', $filter_client, function($req, $res) {
	$ob = new StdClass;

	$ob->records = ReimbursementItemType::factory()
		->order('sortorder')
		->plain()
		->find();

	return $res->json($ob);
});

$app->post('/manage/reimbursement-item-types', $filter_client, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = ReimbursementItemType::factory()->load();
	$record->id = $req->post['id'];
	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime;
		}
		$record->date_updated = new DateTime;
		$record->save();
		$ob->status = 0;
		$ob->record = ReimbursementItemType::factory()->plain()->first($record->id);
	}

	return $res->json($ob);
});

$app->get('/list/reimbursement-item-types', $client_filter, function($req, $res) {
	$ob = new StdClass;

	global $app;
	$globalUser = $app->response->user;
	$user = $res->user;
	$lang = $user ? $user->lang : $globalUser->lang;
	$ob->lang = $lang;

	if (!$lang) {
		$lang = 'en';
	}

	if ($req->get['study_id']) {
		$ob->records = ReimbursementItemType::factory()
			->raw('select rit.id, IF(ls.value is null, rit.name, ls.value) as name, rit.sortorder, rit.address_based, rit.intl, ifnull(ric.cost_per_mile, 0) cost_per_mile, rit.direct_mileage_entry, rit.uploads_required
				from reimbursement_item_type rit
				left join reimbursement_item_cost ric on ric.type_id = rit.id and ric.study_id = ?
				left join localized_string ls on ls.name = CONCAT("option." , REPLACE(rit.name, " ", "-"))
				where (ls.lang = ? or ls.lang is null)
				group by rit.id
				order by rit.sortorder ', $req->get['study_id'], $lang)
			->events(false)
			->plain()
			->find();
	}
	else {
		$ob->records = ReimbursementItemType::factory()
			->raw('select rit.id, rit.sortorder, rit.cost_per_mile, rit.address_based, rit.intl, rit.direct_mileage_entry, rit.uploads_required, IF(ls.value is null, rit.name, ls.value) as name
				from reimbursement_item_type rit
				left join localized_string ls on ls.name = CONCAT("option." , REPLACE(rit.name, " ", "-"))
				where (ls.lang = ? or ls.lang is null)
				group by rit.id
			', $lang)
			->order('sortorder')
			->plain()
			->events(false)
			->find();
	}
	$ob->status = 0;

	foreach ($ob->records as $record) {
		$record->name = ucwords($record->name);
	}

	return $res->json($ob);
});

$app->get('/system-config', $filter_client, function($req, $res) {
	$ob = new StdClass;

	$ob->config['travel_preferences_requests_enabled'] = $req->config->travel_preferences_requests_enabled;

	return $res->json($ob);
});

$app->get('/system-settings', $filter_client, function($req, $res) {
	$ob = new StdClass;

	$records = SystemOption::factory()
		->where("system_id = ? and name not in ('user_management')", 5)
		->find();

	$settings = new StdClass;
	foreach ($records as $record) {
		$settings->{$record->name} = $record->value;
	}
	$settings->feature_flag = Sys::getFeatureFlag();
	$ob->settings = $settings;

	return $res->json($ob);
});

$app->post('/system-settings', $filter_client, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$settingArray = $req->post['settings'];
	unset($settingArray['feature_flag']);
	foreach ($settingArray as $key => $val) {
		$opt = SystemOption::factory()
			->where('system_id = 5 and name = ?', $key)
			->first();
		if (!$opt) {
			$opt = SystemOption::factory();
			$opt->system_id = 5;
			$opt->name = $key;
		}
		$opt->value = $val;
		$errors =	$opt->validate();
		if($errors) {
			$ob->errors = $errors;
			return $res->json($ob);
		}
	$opt->save();
	}
	$ob->status = 0;
	return $res->json($ob);
});

$app->get('/studies-sites', $client_filter, function($req, $res) {

	$ob = new StdClass;

	$user = $res->user;
	function fetchStudies($user) {
		$tableAppend = '';
		$where = '1';
		if ($user->type == 'siteuser') {
			$tableAppend = '
				left join study_site_user_access on study_site_user_access.study_id = study.id
				left join study_site_user on study_site_user.user_id = study_site_user_access.user_id';
			$where = "study_site_user_access.user_id = '$user->id'";
		}

		$records = Study::factory()
		->select('
			study.id,
			study.protocol,
			sponsor.name as _sponsor_name')
		->table("
			study
			{$tableAppend}
			left join study_site_map on study_site_map.study_id = study.id
				and study_site_map.deleted = 0
			left join sponsor on sponsor.id = study.sponsor_id
			left join study_site on study_site_map.site_id = study_site.id")
		->order('sponsor.name, study.protocol, study.title')
		->where($where)
		->group('study.id');

		$sql = $records->buildQuery('SELECT');
		$records = $records->fetchRecords($sql);

		$list = [];
		foreach ($records as $record) {
			$list[] = $record->toPlain();
		}
		return $list;
	}

	function fetchSites($user) {
		$tableAppend = '';
		$where = '1';
		if ($user->type == 'siteuser') {
			$tableAppend = 'join study_site_user on study_site_user.site_id = study_site.id';
			$wehre = "study_site_user.user_id = '$user->id'";
		}

		return StudySite::factory()
		->select('study_site.id, study_site.name')
		->table("study_site
			{$tableAppend}
			left join country on study_site.country = country.code
		")
		->where($where)
		->order('study_site.name')
		->group('study_site.id')
		->plain()
		->find();
	}

	$ob->studies = fetchStudies($user);
	$ob->sites   = fetchSites($user);

	return $res->json($ob);
});
