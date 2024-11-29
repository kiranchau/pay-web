<?php

$app->get('/sites', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$user = $res->user;
	if ($user->type == 'siteuser') {
		$studySite = StudySite::factory()
			->select('study_site.*, country.name as _country_name')
			->table("study_site
				join study_site_user on study_site_user.site_id = study_site.id
				left join country on study_site.country = country.code
			")
			->where("study_site_user.user_id = '$user->id'")
			->order('study_site.name')
			->plain()
			->group('study_site.id');
		

		if (isset($req->get['status'])) {
			$studySite->where("study_site_user.user_id = '$user->id' AND study_site.status = ?", $req->get['status']);
		}

		$ob->records = $studySite->find();
	}
	else {
		$studySite = StudySite::factory()
			->plain()
			->select('study_site.*, country.name as _country_name')
			->table('study_site left join country on study_site.country = country.code')
			->order('study_site.name');

		if (isset($req->get['status'])) {
			$studySite->where("study_site.status = ?", $req->get['status']);
		}

		$ob->records = $studySite->find();
	}

	return $res->json($ob);
});

$app->post('/sites', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$record = StudySite::factory()->load();
	$record->id = $req->post['id'];

	$savedStudy = StudySite::factory()
		->first($record->id);

	$errors = $record->validate();
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime;
			if (!isset($req->post['status'])) {
				$record->status = StudySite::STATUS_ACTIVE; //default
			}
		}

		$record->date_updated = new DateTime;
		$record->save();
		$ob->status = 0;

		$record->updatePatientStudies();

		if ($record->country !== $savedStudy->country) {
			$record->updateAccountCountries();
			$ob->status = 1;
		}

		$ob->record = StudySite::factory()->plain()->first($record->id);
	}

	return $res->json($ob);
});

$app->get('/sites/locations/:id', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->records = SiteLocation::factory()
		->where('site_id = ?', $req->id)
		->order('name')
		->plain()
		->find();

	$ob->patient_locations = [];
	if ($res->user->type == 'patient') {
		$ob->patient_locations = PatientRequestAddress::factory()
			->where('patient_id = ?', $res->user->id)
			->order('name, address')
			->plain()
			->find();
	}
	else if ($res->user->type != 'patient' && $req->get['patient_id']) {
		$ob->patient_locations = PatientRequestAddress::factory()
			->where('patient_id = ?', $req->get['patient_id'])
			->order('name, address')
			->plain()
			->find();
	}

	return $res->json($ob);
});

$app->post('/sites/locations/:id', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = SiteLocation::factory()->load();
	$record->site_id = $req->id;
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
	}

	return $res->json($ob);
});

$app->get('/sites/users/:id', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$records = Account::factory()
		->select('a.*, b.role as _role')
		->table('account a join study_site_user b on a.id = b.user_id')
		->where('a.type = ? and b.site_id = ?', 'siteuser', $req->id)
		->plain()
		->find();

	foreach ($records as $user) {
		$user->_studies = new StdClass;
		$list = StudySiteUserAccess::factory()
			->select('study.id')
			->table('
				study_site_user_access
				join study on study.id = study_site_user_access.study_id
				join study_site_map on study_site_map.study_id = study.id
			')
			->where('study_site_user_access.user_id = ? and study_site_map.site_id = ?', $user->id, $req->id)
			->group('study.id')
			->plain()
			->find();

		foreach ($list as $study) {
			$user->_studies->{$study->id} = 1;
		}
		$options = AccountMeta::factory()
			->select('name, value')
			->where('account_id = ? and privilege = 1 and deleted = 0', $user->id)
			->find();

		$user->options = new StdClass;

		foreach ($options as $option) {
			$user->options->{$option->name} = $option->value;
		}
	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->post('/sites/users/:id', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$record = Account::factory()->load();
	$record->id = $req->post['id'];
	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
		$ob->status = 2;
	}
	else {
		$record->type = 'siteuser';
		$record->system_id = $req->config->system->id;
		$record->date_updated = new DateTime;

		if (!$record->id) {
			$record->date_added = new DateTime;
		}
		
		if ($record->password) {
			$record->password = password_hash($record->password, PASSWORD_DEFAULT);
		}

		if ($record->password && $record->active == 1) {
			$record->date_provisioned = new DateTime;
			$record->date_password = new DateTime;
			$record->status = '';
		}

		$record->save();

		$meta = new AccountMeta;
		$meta->account_id = $record->id;
		$meta->privilege = 1;
		$meta->name = 'subject_management';
		$meta->value = 1;
		$meta->date_added = new DateTime;
		$meta->date_updated = new DateTime;
		$meta->updateOnDuplicate(true);
		$meta->save();

		$siteUser = StudySiteUser::factory();
		$siteUser->site_id = $req->id;
		$siteUser->user_id = $record->id;
		$siteUser->date_added = new DateTime;
		$siteUser->role = $record->_role ?: 0;
		$siteUser->date_updated = new DateTime;
		$siteUser->updateOnDuplicate(['role', 'date_updated']);
		$siteUser->save();

		StudySiteUserAccess::factory()->raw('delete from [table] where user_id = ?', $siteUser->user_id)->query();
		if ($record->_studies) {
			foreach ($record->_studies as $study_id => $_) {
				$access = new StudySiteUserAccess;
				$access->user_id = $siteUser->user_id;
				$access->study_id = $study_id;
				$access->updateOnDuplicate(['date_updated']);
				$access->date_added = new DateTime;
				$access->date_updated = new DateTime;
				$access->save();
			}
		}
		$record->saveOptions($record->options);
		$ob->status = 0;
	}

	return $res->json($ob);
});