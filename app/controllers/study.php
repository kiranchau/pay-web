<?php

$app->get('/studies', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$user = $res->user;

	$siteID = intval($req->get['site_id']);
	$studyID = intval($req->get['study_id']);

	if ($req->get['limit']) {
		$userID = $res->user->id;
		$page = $req->get['page'] ?: 1;
		$limit = $req->get['limit'];
		$niftyEngineModel = new NiftyEngine\Model;

		$numRecords = Study::factory()
			->select('count(distinct study.id) as _numRecords')
			->table('study
				left join study_site_map on study_site_map.study_id = study.id and study_site_map.deleted = 0
				left join patient_study on study_site_map.site_id = patient_study.site_id and study.id = patient_study.study_id and patient_study.deleted = 0
				left join sponsor on sponsor.id = study.sponsor_id
				left join study_site on study_site_map.site_id = patient_study.site_id'
			)
			->where('1');

		$records = Study::factory()
			->select('study.*,
				sponsor.name as _sponsor_name')
			->table('study
				left join sponsor on sponsor.id = study.sponsor_id
				left join study_site_map on study_site_map.study_id = study.id and study_site_map.deleted = 0
			')
			->order('sponsor.name, study.protocol, study.title')
			->where('1')
			->limit(($page - 1) * $limit, $limit)
			->group('study.id')
			->plain();

		if ($req->get['search']) {
			$se = "'%" . $niftyEngineModel->escape($req->get['search']) . "%'";
			$w = " and (sponsor.name LIKE $se
			or study.protocol LIKE $se
			or study.description LIKE $se
			or study.title LIKE $se
			or study.cro_id LIKE $se)";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}
	}
	else if ($user->type == 'siteuser') {	
		$records = Study::factory()
			->select('study.*,
				sponsor.name as _sponsor_name')
			->table('
				study
				left join sponsor on sponsor.id = study.sponsor_id
				left join study_site_user_access on study_site_user_access.study_id = study.id
				left join study_site_map on study_site_map.study_id = study.id and study_site_map.deleted = 0')
			->where("study_site_user_access.user_id = '$user->id'")
			->group('study.id')
			->order('sponsor.name, study.protocol, study.title')
			->plain();
	}
	else {
		$records = Study::factory()
			->select('study.*,
				sponsor.name as _sponsor_name')
			->table('study
				left join sponsor on sponsor.id = study.sponsor_id
				left join study_site_map on study_site_map.study_id = study.id and study_site_map.deleted = 0')
			->order('sponsor.name, study.protocol, study.title')
			->where('1')
			->group('study.id')
			->plain();
	}

	if ($siteID > 0) {
		$records->appendToWhere(' and study_site_map.site_id = ?', $siteID);

		if ($req->get['limit'] && $numRecords) {
			$numRecords->appendToWhere(' and study_site_map.site_id = ?', $siteID);
		}
	}

	if ($req->get['status'] >= 0) {
		$status = intval($req->get['status']);
		$records->appendToWhere( " and study.status = $status");

		if ($req->get['limit'] && $numRecords) {
			$numRecords->appendToWhere( " and study.status = $status");
		}
	}

	if ($studyID > 0) {
		$records->appendToWhere(' and study.id = ?', $studyID);
		$ob->record = $records->first();
	} else {
		$ob->records = $records->find();

		if ($numRecords) {
			$numRecords = $numRecords->scalar();

			$numPages = ceil($numRecords / $limit);
	
			if ($numPages < $page) {
				$page = 1;
			}
			$ob->numPages = $numPages;
		}
	}

	$ob->domainName = $req->config->system->dynamic_domain_name; 
	return $res->json($ob);
});

$app->post('/studies', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$record = Study::factory()->load();
	$record->id = $req->post['id'];
	$errors = $record->validate();
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime;
		}

		if (intval($record->_stipends_and_reimbursements) === 1) {
			$record->visit_stipends = 1;
			$record->manage_reimbursements = 1;
		}

		$record->date_updated = new DateTime;
		$record->save();

		$record->updatePatientStudies();

		if ($record->_costs) {
			$record->savePerMileCosts();
		}
		if ($record->_sites) {
			$record->saveSiteLocations();
		}
		$ob->status = 0;
		$ob->record = Study::factory()
			->plain()
			->first($record->id);
	}

	return $res->json($ob);
});

$app->get('/studies/reimbursement-costs', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$study_id = intval($req->get['id']);
	$sql = "
		select a.id, a.name, IFNULL(b.cost_per_mile, 0.00) cost_per_mile
		from reimbursement_item_type a
		left join reimbursement_item_cost b on a.id = b.type_id and b.study_id = '$study_id'
		where 
			a.address_based = 1
		order by a.sortorder, a.name
	";

	$ob->records = ReimbursementItemCost::factory()
		->raw($sql)
		->plain()
		->find();

	return $res->json($ob);
});

$app->get('/studies/(?<id>\d+)/payments/approved/count', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$approved = PatientRequest::STATUS_APPROVED;
	$record = PatientRequest::factory()->where('patient_request.status = ? and study_id = ? and date_approved is not null', $approved, $req->id);

	if (isset($req->get['site_id'])) {
		$niftyEngineModel = new NiftyEngine\Model;
		$site_id = $niftyEngineModel->escape($req->get['site_id']);
		$w = " and patient_request.site_id = {$site_id}";
		$record->appendToWhere($w);
	}

	$ob->record = $record->count();

	return $res->json($ob);
});


$app->get('/travel-status', $client_filter, function($req, $res)
{
	$ob = new StdClass;
	$TravelStatus = TravelStatus::factory()
			->plain()
			->select('travel_status.*')
			->order('travel_status.sort_order');
		if (isset($req->get['status'])) {
			$TravelStatus->where("travel_status.status = ?", $req->get['status']);
		}
		$ob->records = $TravelStatus->find();
		return $res->json($ob);
});

$app->get('/travel-status-site', $client_filter, function($req, $res)
{
	$ob = new StdClass;
	$TravelStatus = TravelStatus::factory()
			->plain()
			->select('travel_status.*')
			->where('site_user = ?', 1)
			->order('travel_status.sort_order');
		if (isset($req->get['status'])) {
			$TravelStatus->where("travel_status.status = ?", $req->get['status']);
		}
		$ob->records = $TravelStatus->find();
		return $res->json($ob);
});

$app->get('/studies/visit-stipends', $client_filter, function($req, $res) {//update stipend - visit stipend on patient form
	$ob = new StdClass;

	if ($req->get['studyID']) {
		$visitStipend = Study::factory()
			->plain()
			->select('visit_stipends')
			->where('id = ?', $req->get['studyID'])
			->scalar();
		$ob->visit_stipends = $visitStipend;
	}

	return $res->json($ob);
});

$app->get('/studies/(?<id>\d+)/sites-summary', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$sites = StudySiteMap::factory()
	->select('
		study_site.*,
		study_site.status as _site_status,
		SUM(IF(patient_study.status = 0 AND account.id IS NOT NULL, 1, 0)) AS _active_count,
		SUM(IF(patient_study.status = 2 AND account.id IS NOT NULL, 1, 0)) AS _complete_count')
	->table('
		study_site_map
		JOIN study_site ON study_site_map.site_id = study_site.id
		LEFT JOIN patient_study on 
			study_site_map.site_id = patient_study.site_id 
			and study_site_map.study_id = patient_study.study_id 
			and patient_study.deleted = 0
			and (patient_study.patient_id != 0 or patient_study.id is null)
		LEFT JOIN account on patient_study.patient_id = account.id and account.deleted = 0 ')
	->where('
		study_site_map.study_id = ? 
		and study_site_map.deleted = 0 
		', $req->id)
	->group('study_site.id')
	->order('study_site.name')
	->plain()
	->find();
	$ob->records = $sites;

	return $res->json($ob);
});

$app->get('/studies/(?<id>\d+)/pending-payments', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$STATUS_REVIEW = PatientRequest::STATUS_REVIEW;
	$STATUS_PENDING = PatientRequest::STATUS_PENDING;
	$STATUS_APPROVED = PatientRequest::STATUS_APPROVED;

	$records = PatientRequest::factory()
		->raw("select 
				patient.id as patient_id,
				patient_study.study_number,
				concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0, substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1, 1)) as initials,
				sub_payment_total.payment_total as payment_total,
				patient_request.amount as pending_payment_total,
				study_site.name as study_site_name,
				patient_request.site_id,
				patient_request.id,
				patient_study.study_id
			from patient_request
			left join patient_card on patient_request.card_id = patient_card.id
			join patient on patient_request.patient_id = patient.id
			join patient_study on patient.id = patient_study.patient_id
				and patient_study.study_id = patient_request.study_id
			join account on account.id = patient_request.patient_id
			join study_site on patient_request.site_id = study_site.id
			left join account user on user.id = patient_request.user_approved
			left join study on study.id = patient_study.study_id
			left join sponsor on sponsor.id = study.sponsor_id
			left join (
					select patient_request.patient_id, patient_request.site_id, patient_request.study_id, sum(patient_request.amount) as payment_total
					from patient_request
					where 
						patient_request.study_id = ?
						and patient_request.status = {$STATUS_APPROVED}
					group by patient_request.patient_id, patient_request.site_id
				) as sub_payment_total on patient_request.patient_id = sub_payment_total.patient_id
				&& patient_request.site_id = sub_payment_total.site_id
				&& patient_request.study_id = sub_payment_total.study_id
			where 
				patient_request.study_id = ?
				and patient_request.status in ({$STATUS_REVIEW}, {$STATUS_PENDING})
				and account.deleted = 0
			order by study_site.name, patient.id, patient_request.id
		", $req->id, $req->id)
		->plain()
		->find();

	$ob->records = $records;

	return $res->json($ob);
});

$app->get('/studies/pending-payments/summary', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$STATUS_REVIEW = PatientRequest::STATUS_REVIEW;
	$STATUS_PENDING = PatientRequest::STATUS_PENDING;
	$STATUS_APPROVED = PatientRequest::STATUS_APPROVED;

	$whereAppend = '';
	if (isset($req->get['site_id'])) {
		$niftyEngineModel = new NiftyEngine\Model;
		$site_id = $niftyEngineModel->escape($req->get['site_id']);
		$whereAppend = " and patient_request.site_id = {$site_id} ";
	}
	
	$records = PatientRequest::factory()
		->select("
			patient_request.site_id,
			patient_request.study_id,
			study.protocol,
			study_researcher.name as cro_name,
			study.status as study_status,
			sponsor.name as _sponsor_name,
			sum(patient_request.amount) as total_payment_total,
			sum(IF(patient_request.date_approved is not null, patient_request.amount, 0)) as paid_payment_total,
			sum(IF(patient_request.date_approved is null, patient_request.amount, 0)) as pending_payment_total")
		->table("
			patient_request
			left join study on study.id = patient_request.study_id
			left join sponsor on sponsor.id = study.sponsor_id
			left join study_researcher on study.cro_id = study_researcher.id")
		->where("patient_request.status in ({$STATUS_REVIEW}, {$STATUS_PENDING}, {$STATUS_APPROVED})
				$whereAppend")
		->group('patient_request.study_id')
		->having('pending_payment_total > 0')
		->order('sponsor.name, study.protocol')
		->plain();

	$sql = $records->buildQuery('SELECT');
	$records = $records->fetchRecords($sql);

	

	// $list = array_filter($list, function($r) {
	// 	return $r['pending_payment_total'] > 0;
	// });

	$list = [];
	foreach ($records as $record) {
		$list[] = $record->toPlain();
	}

	$ob->records = $list;

	return $res->json($ob);
});

$app->get('/studies/(?<id>\d+)/pending-payments/summary', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$STATUS_REVIEW = PatientRequest::STATUS_REVIEW;
	$STATUS_PENDING = PatientRequest::STATUS_PENDING;
	$STATUS_APPROVED = PatientRequest::STATUS_APPROVED;

	$whereAppend = '';
	if (isset($req->get['site_id'])) {
		$niftyEngineModel = new NiftyEngine\Model;
		$site_id = $niftyEngineModel->escape($req->get['site_id']);
		$whereAppend = " and patient_request.site_id = {$site_id} ";
	}
	$records = PatientRequest::factory()
		->raw("select
				sum(patient_request.amount) as total_payment_total,
				sum(IF(patient_request.date_approved is not null, patient_request.amount, 0)) as paid_payment_total,
				sum(IF(patient_request.date_approved is null, patient_request.amount, 0)) as pending_payment_total
			from patient_request
			where 
				patient_request.study_id = ?
				and patient_request.status in ({$STATUS_REVIEW}, {$STATUS_PENDING}, {$STATUS_APPROVED})
				{$whereAppend}
		", $req->id)
		->plain()
		->find();

	foreach($records as $r) {
		foreach($r as $k => $v) {
			$ob->$k = $v;
		}
	}
	

	return $res->json($ob);
});

$app->get('/studies/(?<id>\d+)/subjects', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$records = PatientRequest::factory()
		->raw("select 
				patient.id as patient_id,
				patient_study.study_number,
				concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0, substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1, 1)) as initials,
				study_site.status as study_site_status,
				study_site.name as study_site_name,
				patient_study.site_id,
				patient_study.status as patient_study_status,
				CONCAT(patient_study.patient_id, patient_study.site_id) as id
			FROM 
				patient
				JOIN patient_study on patient.id = patient_study.patient_id
				JOIN account on account.id = patient_study.patient_id
				JOIN study_site on patient_study.site_id = study_site.id
				LEFT JOIN study on study.id = patient_study.study_id
				LEFT JOIN sponsor on sponsor.id = study.sponsor_id
			where 
				patient_study.study_id = ?
				and patient_study.deleted = 0
				and account.deleted = 0
			group by patient_study.patient_id, patient_study.site_id
		", $req->id)
		->plain()
		->find();

	$ob->records = $records;

	return $res->json($ob);
});

$app->get('/studies/(?<id>\d+)/active-subjects/count', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->count = Patient::factory()
		->table(" 
			patient
			JOIN patient_study on patient.id = patient_study.patient_id
			JOIN account on account.id = patient_study.patient_id")
		->where(" 
			patient_study.study_id = ?
			and patient_study.status = 0
			and patient_study.deleted = 0
			and account.deleted = 0
		", $req->id)
		->count();
		
	return $res->json($ob);
});

/**
* Get Study Site visits assignment
*
* @param route  number  $id Study Id
* @param query  string  $site_id optional
*/

$app->get('/studies/(?<id>\d+)/sites/visits/assignments', $client_filter, function($req, $res) {

	$ob = new StdClass;

	$visits = StudySite::factory()
	->select('
		study_site_visit_assignment.id,
		study_site_visit_assignment.assigned,
		study_site_map.study_id,
		study_site_map.site_id,
		study_site.name as _study_site__name,
		study_site.status as _study_site__status
		')
	->table('
		study_site_map
		JOIN study_site ON study_site_map.site_id = study_site.id
		JOIN study ON study_site_map.study_id = study.id
		LEFT JOIN study_site_visit_assignment ON study_site_visit_assignment.site_id = study_site_map.site_id and study_site_visit_assignment.study_id = study_site_map.study_id')
	->where('
		(study_site_visit_assignment.deleted = 0 or study_site_visit_assignment.deleted is null)
		and study_site_map.deleted = 0 
		and study_site_map.study_id = ?', $req->id)
	->order('study_site.name')
	->plain();

	if ($req->get['site_id']) {
		$visits->appendToWhere('and study_site_map.site_id = ?', $req->get['site_id']);
	}

	$ob->records = $visits->find();
	
	return $res->json($ob);
});

/**
* Create new Study Site visits assignment
*
* @param route  number  $id Study Id
* @param query  array  $assignments
*/

$app->post('/studies/(?<id>\d+)/sites/visits/assignments', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$records = [];

	$currentDate = new DateTime;

	foreach ($req->post['assignments'] as $item) {
		$assignment = StudySiteVisitAssignment::factory()->loadFrom($item);

		$isNew = $assignment->id ? false : true;
		$isSavedAssigned = true;
		if (!$isNew) {
			$isSavedAssigned = StudySiteVisitAssignment::factory()->select('assigned')->where("id = ?", $assignment->id)->scalar() == 0 ? false : true;
		}

		$assignment->save();

		if (!$isSavedAssigned && $assignment->assigned == '1') {
			$visits = StudyVisit::factory()->where('study_id = ? and site_id = ?', $assignment->study_id, $assignment->site_id)->find();

			foreach($visits as $visit) {
				$visit->unDelete();
				$visit->save();
			}
		}

		if ($isNew) {
			$study_visits = StudyVisit::factory()->where('study_id = ? and original_visit = 0 and deleted = 0', $assignment->study_id)->find();
			foreach ($study_visits as $visit) {
				$studySiteVisit = StudyVisit::factory();
				$studySiteVisit->original_visit = $visit->id;
				$studySiteVisit->name = $visit->name;
				$studySiteVisit->baseline = $visit->baseline;
				$studySiteVisit->stipend = $visit->stipend;
				$studySiteVisit->sort_order = $visit->sort_order;
				$studySiteVisit->site_id = $assignment->site_id;
				$studySiteVisit->study_id = $assignment->study_id;
				$studySiteVisit->date_added = $currentDate;
				$studySiteVisit->date_updated = $currentDate;
				$studySiteVisit->deleted = 0;
				$studySiteVisit->date_deleted = '0000-00-00 00:00:00';
				$studySiteVisit->deleted_by = 0;
				$studySiteVisit->save();

				$patientRequests = PatientRequest::factory()
                    ->select("
                        patient_request.*, 
                        patient_visit.id as patient_visit_id,
                        patient_visit.visit_id as patient_visit_visit_id")
                    ->table("
                        patient_request
							join patient_visit on patient_request.patient_visit_id = patient_visit.id")
					->where('patient_request.study_id = ? and patient_request.site_id = ? and patient_visit.visit_id = ?', $assignment->study_id, $assignment->site_id, $visit->id)
                    ->find();
				foreach($patientRequests as $patientRequest) {
					
					$patient_visit = PatientVisit::factory()->first($patientRequest->patient_visit_id);
					if ($patient_visit && $studySiteVisit->id != $patient_visit->visit_id) {
						$patient_visit->visit_id = $studySiteVisit->id;
						$patient_visit->date_updated = $currentDate;
						$patient_visit->only('visit_id', 'date_updated')->save();
					}
				}
			}
		}
		
		$records[] = $assignment->toPlain();
	}

	$ob->records = $records;
	return $res->json($ob);
});
