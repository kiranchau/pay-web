<?php

/**
* Get Study visits
*
* @param route  number  $study_id
* @param query  string  $site_id optional
*/
$app->get('/studies/visits/(?<study_id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$records = StudyVisit::factory()
        ->select('study_visit.*, count(patient_visit.id) as _patient_count')
        ->table('study_visit left join patient_visit on study_visit.id = patient_visit.visit_id')
		->order('LPAD(sort_order, 3, 0), name')
		->where('study_visit.study_id = ? and study_visit.deleted = 0', $req->study_id)
        ->group('study_visit.id')
		->plain();

	if ($req->get['site_id']) {
		$records->appendToWhere('and study_visit.site_id = ?', $req->get['site_id']);
	} else {
		$records->appendToWhere('and study_visit.site_id = 0');
	}

	$ob->records = $records->find();
	return $res->json($ob);
});

/**
* Get Study visits for a site
*
* @param route  number  $study_id
* @param route  number  $site_id
*/
$app->get('/studies/visits/(?<study_id>\d+)/sites/(?<site_id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$statuses = implode(', ', [PatientRequest::STATUS_CANCELLED, PatientRequest::STATUS_RECALLED, PatientRequest::STATUS_VOIDED]);
	$isStudySiteVisit = StudySiteVisitAssignment::factory()->where("study_id = ? and site_id = ?", $req->study_id, $req->site_id)->find();

	if ($isStudySiteVisit) {
		$records = StudyVisit::factory()
			->select("
				study_visit.*, 
				sum(IF(patient_request.id IS NOT NULL, 
					IF(patient_request.status IN ({$statuses}), 0, 1) 
					, 0)) as _patient_count
			")
			->table('
				study_visit 
				left join patient_visit on study_visit.id = patient_visit.visit_id
				left join patient_request on patient_request.patient_visit_id = patient_visit.id
				')
			->order('LPAD(sort_order, 3, 0), name')
			->where('study_visit.study_id = ? and study_visit.site_id = ? and study_visit.deleted = 0', $req->study_id, $req->site_id)
			->group('study_visit.id')
			->plain()
			->find();
	}
	else {
		$records = StudyVisit::factory()
			->select("
				study_visit.*, 
				sum(IF(patient_request.id IS NOT NULL, 
					IF(patient_request.status IN ({$statuses}), 0, 1) 
					, 0)) as _patient_count
			")
			->table('
				study_visit 
				left join patient_visit on study_visit.id = patient_visit.visit_id
				left join patient_request on patient_request.patient_visit_id = patient_visit.id
				')
			->order('LPAD(sort_order, 3, 0), name')
			->where('study_visit.study_id = ? and study_visit.site_id = 0 and study_visit.deleted = 0', $req->study_id)
			->group('study_visit.id')
			->plain()
			->find();
	}


	$ob->records = array_values($records);
	return $res->json($ob);
});

$app->post('/studies/visits/(?<study_id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = StudyVisit::factory()->load();
	$record->id = $req->post['id'];
	$record->study_id = $req->study_id;
	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
		return $res->json($ob);
	}

	if ($record->baseline == 1) {
		StudyVisit::factory()
			->raw('update study_visit set baseline = 0 where study_id = ?', $record->study_id)
			->query();
	}

	$isNew = false;
	if (!$record->id) {
		$record->date_added = new DateTime;
		$isNew = true;
	}

	$record->date_updated = new DateTime;
	$record->save();

	if ($isNew) { //add new visit to add study site visit lists
		$currentDate = new DateTime;

		$study_visits = StudySiteVisitAssignment::factory()->select('site_id')->where('study_id = ?', $record->study_id)->find();
		$site_ids = array_map(function($visit) {return $visit->site_id;}, $study_visits);
		foreach($site_ids as $site_id) {
			$_record = StudyVisit::factory()->load();
			$_record->study_id = $req->study_id;
			$_record->site_id = $site_id;
			$_record->original_visit = $record->id;
			$_record->date_added = $currentDate;
			$_record->date_updated = $currentDate;
			$_record->save();
		}
	}

	$ob->record = StudyVisit::factory()->plain()->first($record->id);
	$ob->status = 0;
	
	return $res->json($ob);
});

$app->post('/studies/visits/(?<study_id>\d+)/sites/(?<site_id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = StudyVisit::factory()->load();
	$record->id = $req->post['id'];
	$record->study_id = $req->study_id;
	$record->site_id = $req->site_id;
	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
		return $res->json($ob);
	}

	if ($record->baseline == 1) {
		StudyVisit::factory()
			->raw('update study_visit set baseline = 0 where study_id = ? and site_id = ?', $record->study_id, $req->site_id)
			->query();
	}
	
	$currentDate = new DateTime;

	if (!$record->id) {
		$record->date_added = $currentDate;
		$record->stipend =  $req->post['stipend'] ?: 0;
		$record->deleted = 0;
		$record->date_deleted = '0000-00-00 00:00:00';
		$record->deleted_by = 0;
		$record->original_visit = 0;
	}

	$record->date_updated = $currentDate;
	$record->save();

	$ob->record = StudyVisit::factory()->plain()->first($record->id);
	$ob->status = 0;

	return $res->json($ob);
});

$app->delete('/studies/visits/(?<study_id>\d+)/:id', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = $res->user;

	$record = StudyVisit::factory()->first($req->id);
    $patientVisits = PatientVisit::factory()
        ->where('visit_id = ?', $req->id)
        ->find();

	if ($record && !$patientVisits) {
		$record->shouldDeleteWithUserID($user->id);
		$record->save();
	}

	return $res->json($ob);
});

$app->delete('/studies/visits/(?<study_id>\d+)/sites/(?<site_id>\d+)/:id', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = $res->user;

	$statuses = implode(', ', [PatientRequest::STATUS_CANCELLED, PatientRequest::STATUS_RECALLED, PatientRequest::STATUS_VOIDED]);

	$record = StudyVisit::factory()->first($req->id);
	$patientVisits = PatientVisit::factory()
		->table("
			patient_visit
			join patient_request on patient_request.patient_visit_id = patient_visit.id and patient_request.status NOT IN ({$statuses}) 
		")
        ->where('patient_visit.visit_id = ?', $req->id)
        ->find();

	if ($record && !$patientVisits) {
		$record->shouldDeleteWithUserID($user->id);
		$record->save();
	}

	return $res->json($ob);
});