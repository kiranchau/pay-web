<?php

$app->get('/patients', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$user = $res->user;

	if ($req->get['limit']) {
		$userID = $res->user->id;
		$page = $req->get['page'] ?: 1;
		$limit = $req->get['limit'];
		$niftyEngineModel = new NiftyEngine\Model;

		$records = Patient::factory()
			->select("account.*,
				patient.*,
				account.id as id,
				allSites.name as _site,
				CONCAT(LEFT(account.firstname, 1), IF(patient.middle is null or patient.middle = '', '-', LEFT(patient.middle, 1)), LEFT(account.lastname, 1)) as _initials,
				GROUP_CONCAT(distinct CONCAT(allSites.name, ' - ', allStudies.title, ' - ', sponsor.name, ' - ', allStudies.protocol) separator '<><>') as _studies,
				count(distinct patient_request.id) as _pending_requests,
				GROUP_CONCAT(distinct IF(patient_study.study_number is null or patient_study.study_number = '', null, CONCAT(patient_study.study_number, '|', allSites.name, '.', allStudies.title, '.', sponsor.name)) separator '<><>') as _patient_study_study_number,
				patient_study.site_id as _patient_study_site_id");

		if ($res->user->type == 'siteuser') {
			$records->table("study_site_user_access
				left join study_site_user on study_site_user_access.user_id = study_site_user.user_id
				left join patient_study on study_site_user_access.study_id = patient_study.study_id
					and patient_study.site_id = study_site_user.site_id
					and patient_study.deleted = 0
				left join patient on patient_study.patient_id = patient.id
				join account on patient.id = account.id
				left join study as allStudies on patient_study.study_id = allStudies.id
					and patient_study.deleted = 0
				left join sponsor on allStudies.sponsor_id = sponsor.id
				left join study_site as allSites on patient_study.site_id = allSites.id
				left join patient_request on patient.id = patient_request.patient_id
					and patient_request.status = 1
					and patient_request.study_id = patient_study.study_id
					and patient_request.site_id = patient_study.site_id
				left join study_site_map on patient_study.study_id = study_site_map.study_id
					and patient_study.site_id = study_site_map.site_id");
		}
		else {
			$records->table('account
				join patient on patient.id = account.id
				left join patient_study on patient.id = patient_study.patient_id
					and patient_study.deleted = 0
				left join study as allStudies on patient_study.study_id = allStudies.id
				left join sponsor on allStudies.sponsor_id = sponsor.id
				left join study_site as allSites on patient_study.site_id = allSites.id
				left join patient_request on patient.id = patient_request.patient_id
					and patient_request.status = 1
					and patient_request.study_id = patient_study.study_id
					and patient_request.site_id = patient_study.site_id');
		}

		$order = 'account.id';

		if ($req->get['sortField'] && $req->get['sortDir']) {
			if ($req->get['sortField'] === 'id') {
				$order = "account." . $niftyEngineModel->escape($req->get['sortField']) . " " . $niftyEngineModel->escape($req->get['sortDir']);
			}
			else {
				$order = $niftyEngineModel->escape($req->get['sortField']) . " " . $niftyEngineModel->escape($req->get['sortDir']);
			}
		}

		$queryStart = $res->user->type == 'siteuser' ? "account.deleted = 0 and study_site_user_access.user_id = $userID and account.type = 'patient'" : "account.deleted = 0 and account.type = 'patient'";
		$records->where($queryStart);

		if ($req->get['search']) {
			$se = "'%" . $niftyEngineModel->escape($req->get['search']) . "%'";
			$records->appendToWhere("and (account.phonenumber LIKE $se
				or account.phone_mobile LIKE $se
				or account.emailaddress LIKE $se
				or account.firstname LIKE $se
				or account.lastname LIKE $se
				or account.country LIKE $se
				or account.street LIKE $se
				or account.city LIKE $se
				or account.state LIKE $se
				or account.zipcode LIKE $se
				or account.company LIKE $se
				or patient.ssn LIKE $se
				or patient.address LIKE $se
				or patient.address2 LIKE $se
				or patient.middle LIKE $se
				or CONCAT(LEFT(account.firstname, 1), IF(patient.middle is null or patient.middle = '', '-', LEFT(patient.middle, 1)), LEFT(account.lastname, 1)) LIKE $se
				or CONCAT(LEFT(account.firstname, 1), LEFT(account.lastname, 1)) LIKE $se
				or patient.dob LIKE $se
				or patient.phone_home LIKE $se
				or patient.language LIKE $se
				or account.id LIKE $se
				or patient_study.study_number LIKE $se)");
		}

		if ($req->get['siteID']) {
			$siteID = intval($req->get['siteID']);
			$records->appendToWhere( " and patient_study.site_id = $siteID");
		}
		if ($req->get['studyID']) {
			$studyID = intval($req->get['studyID']);
			$records->appendToWhere(" and patient_study.study_id = $studyID");
		}

		if ($res->user->type == 'siteuser') {
			$numRecords = Patient::factory()
				->select('count(distinct account.id) as _numRecords')
				->table("study_site_user_access
					left join study_site_user on study_site_user_access.user_id = study_site_user.user_id
					left join patient_study on study_site_user_access.study_id = patient_study.study_id
						and patient_study.site_id = study_site_user.site_id
						and patient_study.deleted = 0
					left join patient on patient_study.patient_id = patient.id
					join account on patient.id = account.id
					left join patient_study as pStudy on pStudy.patient_id = patient.id
						and pStudy.deleted = 0
						and pStudy.study_id = patient.selected_study_id")
				->where($records->getQuery()->where)
				->scalar();

			$ob->records = $records->where($records->getQuery()->where)
				->group('account.id')
				->order($order)
				->limit(($page - 1) * $limit, $limit)
				->plain()
				->find();
		}
		else {
			$numRecords = Patient::factory()
				->select('count(distinct account.id) as _numRecords')
				->table('account
					join patient on patient.id = account.id
						and account.deleted = 0
					left join patient_study on patient.id = patient_study.patient_id
						and patient_study.deleted = 0
					left join patient_study as pStudy on patient.selected_study_id = pStudy.study_id
						and pStudy.patient_id = patient.id
						and pStudy.deleted = 0')
				->where($records->getQuery()->where)
				->scalar();

			$ob->records =	$records->where($records->getQuery()->where)
				->group('account.id')
				->order($order)
				->limit(($page - 1) * $limit, $limit)
				->plain()
				->find();
		}

		$numPages = ceil($numRecords / $limit);

		if ($numPages < $page) {
			$page = 1;
		}
		$ob->numPages = $numPages;
	}
	else if ($req->get['id']) {
		$record = Patient::factory()
			->plain()
			->select('account.*,
				patient.*,
				account.id as id,
				CONCAT(LEFT(account.firstname, 1), IF(patient.middle is null or patient.middle = "", "-", LEFT(patient.middle, 1)), LEFT(account.lastname, 1)) as _initials,
				patient_study.study_number as _selected_patient_study_study_number,
				study.visit_stipends as _study_visit_stipends,
				study.manage_visits as _study_manage_visits,
				patient_study.status as _patient_study_status,
				patient_study.id as _patient_study_id,
				patient_study.site_id as _patient_study_site_id')
			->table('account
				join patient on account.id = patient.id
				left join patient_study on patient.selected_study_id = patient_study.study_id
					and patient_study.patient_id = patient.id
					and patient_study.deleted = 0
				left join study on patient.selected_study_id = study.id')
			->where('account.id = ?', $req->get['id'])
			->first(); //RecordViewer specific
		$ob->records = $record;
	}

	foreach($ob->records as $record) {
		$record->study = Study::factory()
			->plain()
			->where('id = ?', $record->selected_study_id)
			->first();

		if ($user->type !== 'siteuser') {
			$record->site = StudySite::factory()
				->plain()
				->table('study_site
					left join patient_study on study_site.id = patient_study.site_id')
				->where('patient_study.patient_id = ? and patient_study.deleted = 0 and patient_study.study_id = ?', $record->id, $record->selected_study_id)
				->first();
		}
		else {
			$record->site = StudySite::factory()
				->plain()
				->select('study_site.*')
				->table('study_site_user_access
					left join study_site_user on study_site_user_access.user_id = study_site_user.user_id
					join patient_study on study_site_user_access.study_id = patient_study.study_id
						and patient_study.deleted = 0
						and patient_study.site_id = study_site_user.site_id
					join patient on patient_study.patient_id = patient.id
						and patient_study.study_id = patient.selected_study_id
					join study_site on patient_study.site_id = study_site.id')
				->where('patient.id = ? and study_site_user_access.user_id = ?', $record->id, $user->id)
				->first();
		}

		$ous = $record->country && $record->country != 'US' ? true : false;
		$paymentMethod = $record->site->payment_method;
		if ($ous) {//bank
			$bank = PatientBankAccount::factory()
				->plain()
				->select('patient_bank_account.account_num')
				->where('patient_id = ?', $record->id)
				->order('id desc')
				->scalar();
			if ($bank) {
				$record->_card = $bank;
			}
			else {
				$record->_card = 'Not Assigned';
			}
		}
		else {//card
			$card = PatientCard::factory()
				->plain()
				->select('patient_card.name')
				->where('patient_id = ? and date_voided is null', $record->id)
				->order('id desc')
				->scalar();
			if ($card) {
				$record->_card = $card;
			}
			else {
				$record->_card = $card;
			}
		}

		if ($user->type !== 'siteuser') {
			$currentPatientStudy = PatientStudy::factory()
				->select('patient_study.study_number,
					patient_study.status')
				->where('patient_study.deleted = 0 and patient_study.study_id = ? and patient_study.patient_id = ?', $record->selected_study_id, $record->id)
				->first();
		}
		else {
			$currentPatientStudy = PatientStudy::factory()
				->select('patient_study.study_number,
					patient_study.status')
				->table('patient_study
					join study_site_user_access on patient_study.study_id = study_site_user_access.study_id
						and patient_study.study_id = study_site_user_access.study_id
					join study_site_user on study_site_user_access.user_id = study_site_user.user_id
						and patient_study.site_id = study_site_user.site_id')
				->where('patient_study.deleted = 0 and patient_study.study_id = ? and patient_study.patient_id = ? and study_site_user_access.user_id = ?', $record->selected_study_id, $record->id, $user->id)
				->first();

		}
		$record->_selected_patient_study_study_number = $currentPatientStudy->study_number;
		$record->_patient_study_status = $currentPatientStudy->status;
	}

	return $res->json($ob);
});

$app->post('/patients', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$niftyEngine = new NiftyEngine\Model;
	$ob->status = 2;

	$record = Patient::factory()->load();
	$record->id = $req->post['id'];
	if ($req->post['_studyAssociations']) {
		$studyArr = $req->post['_studyAssociations'];
		$record->study_id = $req->post['study_id'];
	}

	$record->_admin = true;
	$savedPatient = Patient::factory()->first($record->id);
	$savedAccount = Account::factory()->first($record->id);

	if ($savedPatient) {
		$record->user_token = $savedPatient->user_token;
		$record->user_token_card = $savedPatient->user_token_card;
	}
	$errors = $record->validate();

	$possibleDuplicates = $record->findDuplicates($req, $res);
	if (!$req->post['_duplicate_ack'] && $possibleDuplicates) {
		$errors['duplicatePatients'] = $possibleDuplicates;
		$errors['_duplicate_detection'] = LocalizedString::getString('error.duplicate-patient', 'Our records detect that this patient might be a duplicate of');
	}

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$record->encryptSSN();
		$record->saveCombined();
		$record->assignStudyAssociations();

		$currentStudy = PatientStudy::factory()
			->where('deleted = 0 and study_id = ? and site_id = ? and patient_id = ?', $req->post['selected_study_id'], $req->post['selected_site_id'], $record->id)
			->first();

		if ($currentStudy) {
			$currentStudy->study_number = $req->post['_selected_patient_study_study_number'];
			$currentStudy->status = intval($req->post['_patient_study_status']);
			$currentStudy->date_updated = new DateTime;
			$currentStudy->only('date_updated', 'study_number', 'status')->save();
		}

		$user = Account::factory()->first($record->id);

		$isInternational = $record->country != 'US';
		if ($account->type == 'patient') {
			$isInternational = $account->country != 'US' ? true : false;
		}

		if ($record->_attempt_email_verification) {
			$user->attemptEmailVerification();
		}

		if (!$isInternational) {
			if ($record->_attempt_mobile_verification) {
				$user->attemptMobileVerification();
			}
		}

		$_record = Patient::factory()
			->plain()
			->select("account.*,
				patient.*,
				account.id as id,
				patient_study.study_number as _selected_patient_study_study_number,
				GROUP_CONCAT(IF(patient_study.study_number is null or patient_study.study_number = '', null, patient_study.study_number) separator ', ') as _patient_study_study_number,
				study.visit_stipends as _study_visit_stipends,
				GROUP_CONCAT(patient_study.study_id) as _assignedStudies,
				patient_study.status as _patient_study_status,
				patient_study.id as _patient_study_id
				")
			->table('account join patient on account.id = patient.id
				left join patient_study on patient.id = patient_study.patient_id 
					and patient_study.deleted = 0
				left join study on patient_study.study_id = study.id')
			->where('account.id = ? and patient_study.study_id = ?', $record->id, $req->post['selected_study_id'])
			->group('patient_study.patient_id')
			->first();

		$_record->study = Study::factory()
			->plain()
			->where('id = ?', $_record->selected_study_id)
			->first();

		if ($user->type !== 'siteuser') {
			$_record->site = StudySite::factory()
				->plain()
				->table('study_site
					left join patient_study on study_site.id = patient_study.site_id')
				->where('patient_study.patient_id = ? and patient_study.deleted = 0 and patient_study.study_id = ?', $record->id, $record->selected_study_id)
				->first();
		}
		else {
			$_record->site = StudySite::factory()
				->plain()
				->select('study_site.*')
				->table('study_site_user_access
					left join study_site_user on study_site_user_access.user_id = study_site_user.user_id
					join patient_study on study_site_user_access.study_id = patient_study.study_id
						and patient_study.deleted = 0
						and patient_study.site_id = study_site_user.site_id
					join patient on patient_study.patient_id = patient.id
						and patient_study.study_id = patient.selected_study_id
					join study_site on patient_study.site_id = study_site.id')
				->where('patient.id = ? and study_site_user_access.user_id = ?', $record->id, $user->id)
				->first();
		}

		$ous = $record->country && $record->country != 'US' ? true : false;
		$paymentMethod = $_record->site->payment_method;
		if ($ous) {//bank
			$bank = PatientBankAccount::factory()
				->plain()
				->select('patient_bank_account.account_num')
				->where('patient_id = ?', $record->id)
				->order('id desc')
				->scalar();
			if ($bank) {
				$_record->_card = $bank;
			}
			else {
				$_record->_card = 'Not Assigned';
			}
		}
		else {//card
			$card = PatientCard::factory()
				->plain()
				->select('patient_card.name')
				->where('patient_id = ? and date_voided is null', $record->id)
				->order('id desc')
				->scalar();
			if ($card) {
				$_record->_card = $card;
			}
			else {
				$_record->_card = $card;
			}
		}

		if ($user->type !== 'siteuser') {
			$currentPatientStudy = PatientStudy::factory()
				->select('patient_study.study_number,
					patient_study.status')
				->where('patient_study.deleted = 0 and patient_study.study_id = ? and patient_study.patient_id = ?', $record->selected_study_id, $record->id)
				->first();
		}
		else {
			$currentPatientStudy = PatientStudy::factory()
				->select('patient_study.study_number,
					patient_study.status')
				->table('patient_study
					join study_site_user_access on patient_study.study_id = study_site_user_access.study_id
						and patient_study.study_id = study_site_user_access.study_id
					join study_site_user on study_site_user_access.user_id = study_site_user.user_id
						and patient_study.site_id = study_site_user.site_id')
				->where('patient_study.deleted = 0 and patient_study.study_id = ? and patient_study.patient_id = ? and study_site_user_access.user_id = ?', $record->selected_study_id, $record->id, $user->id)
				->first();

		}
		$_record->_selected_patient_study_study_number = $currentPatientStudy->study_number;
		$_record->_patient_study_status = $currentPatientStudy->status;

		$ob->record = $_record;
		$ob->status = 0;
	}

	return $res->json($ob);
});

/**
* Get Patient Condensed Statuses
* - does patient have any studies that have SUBJECT TRAVEL PREFERENCES enabled?
* - does patient have any studies that have PAYMENT PROGRAM TYPE Reimbursements enabled?
*
* @param route  number  $id patient id
*/

$app->get('/patients/(?<id>\d+)/statuses/summary', $patient_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$ob->record = Patient::factory()
	->select(
		'IF(MIN(study.subject_travel_preferences) = 1, 0, 1) as _extra__has_studies_subject_travel_preferences',
		'IF(MIN(study.subject_travel_request) = 1, 0, 1) as _extra__has_studies_subject_travel_request',
		'MAX(study.manage_reimbursements) as _extra__has_studies_manage_reimbursements'
	)
	->table(
		'patient
		left join patient_study on patient.id = patient_study.patient_id
		left join study on patient_study.study_id = study.id'
	)
	->where('patient_study.deleted = 0 and patient.id = ?', $req->id)
	->plain()
	->first();

	$ob->status = 0;
	return $res->json($ob);
});

$app->get('/patients/dashboard', $patient_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->amountPending = PatientRequest::factory()
		->select('sum(amount)')
		->where('patient_id = ? and status = ?', $res->user->id, PatientRequest::STATUS_PENDING)
		->scalar();
	$ob->numPending = PatientRequest::factory()
		->select('count(*)')
		->where('patient_id = ? and status = ?', $res->user->id, PatientRequest::STATUS_PENDING)
		->scalar();

	$patient = Patient::factory()->first($res->user->id);
	$account = Account::factory()->first($res->user->id);

	if ($patient->card_id) {
		$card = PatientCard::factory()
			->where('id = ?', $patient->card_id)
			->first();
		$ob->symbol = "$";
	}
	else {
		$ob->symbol = PatientBankAccount::factory()
			->select('symbol')
			->table('patient_bank_account left join currency on patient_bank_account.currency = currency.code')
			->where('patient_id = ?', $patient->id)
			->scalar();
	}

	$international = false;
	if ($account->country) {
		$international = $account->country != 'US' ? true : false;
	}
	else {
		$patientStudy = PatientStudy::factory()
			->select('patient_study.site_id, patient_study.study_id')
			->where('deleted = 0 and patient_id = ? and study_id = ?', $patient->id, $patient->selected_study_id)
			->scalar();
		$site = StudySite::factory()->first($patientStudy->site_id);
		if ($site->country) {
			$international = $site->country != 'US' ? true : false;
		}
	}

	$ob->patient_id = $patient->id;
	$ob->site_id = $patientStudy->site_id;
	$ob->study_id = $patientStudy->study_id;
	$ob->international = $international;
	$ob->cardBalance = $card ? $card->balance : 0;

	return $res->json($ob);
});

$app->post('/patients/studies', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = PatientStudy::factory()->load();
	$record->id = $req->post['_patient_study_id'];
	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime();
		}

		if ($record->_icf_verified) {
			$record->icf_user_id = $res->user->id;
			$record->icf_date_added = new DateTime();
		}

		$record->date_updated = new DateTime();
		$record->save();

		//all assigned
		$ob->record = PatientStudy::factory()
			->plain()
			->select('study.protocol as _study_protocol,
				study.id as study_id,
				study.title as _study_title,
				study.subject_study_id_toggle as _study_subject_study_id_toggle,
				patient_study.id as id,
				patient_study.deleted,
				study.status,
				patient_study.id as _patient_study_id,
				patient_study.patient_id as _patient_study_patient_id,
				patient_study.site_id as site_id,
				sponsor.name as _sponsor_name,
				study_site.name as _study_site_name,
				GROUP_CONCAT(patient_study.study_id) as _assignedStudies,
				patient_study.status as _patient_study_status')
			->table('patient_study
					join study on patient_study.study_id = study.id
				left join sponsor on study.sponsor_id = sponsor.id
				left join study_site on patient_study.site_id = study_site.id')
			->where('patient_study.id = ? and patient_study.deleted = 0', $record->id)
			->first();

		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->get('/patients/info', $patient_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$pat = Patient::factory()
		->table('account a join patient b on b.id = a.id')
		->where('a.id = ?', $res->user->id)
		->plain()
		->first();

	$pat->studies = PatientStudy::factory()
		->select('patient_study.id as id,
			study.id as _study_id,
			study.title,
			sponsor.name as _sponsor_name,
			study.protocol as _study_protocol,
			study.manage_visits as _study_manage_visits,
			study.visit_stipends as _study_visit_stipends,
			patient_study.status,
			study_site.name as _study_site_name
			')
		->table('patient_study
			join study on patient_study.study_id = study.id
			join sponsor on study.sponsor_id = sponsor.id
			join study_site on patient_study.site_id = study_site.id')
		->where('patient_study.patient_id = ? and patient_study.deleted = 0', $pat->id)
		->events(false)
		->plain()
		->find();

	$site_id = PatientStudy::factory()
		->select('patient_study.site_id')
		->where('deleted = 0 and patient_id = ? and study_id = ?', $res->user->id, $pat->selected_study_id)
		->scalar();
	$pat->study->site_id = $site_id;

	unset($pat->password);

	$ob->record = $pat;
	$ob->status = 0;

	return $res->json($ob);
});

$app->post('/patients/info', $patient_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$errors = [];

	$user = Account::factory()->load();
	$savedUser = Account::factory()->first($res->user->id);
	$match = Account::factory()
		->where('phone_mobile = ? and id != ? and phone_mobile != ""', $user->phone_mobile, $res->user->id)
		->first();
	if ($match) {
		$errors['phone_mobile'] = LocalizedString::getString('error.duplicate-number', 'Please pick a number not already in use.');
	}

	if (!$match && $savedUser->phone_mobile != $user->phone_mobile && $user->phone_mobile) {
		$user->mobile_verified = 0;
		$user->date_mobile_verified = null;
		$user->attemptMobileVerification();
	}

	$user->id = $res->user->id;
	$user->_selfUpdate = true;
	$user->only('firstname', 'lastname', 'phone_mobile', 'emailaddress', 'city', 'mobile_verified', 'date_mobile_verified', 'state', 'zipcode', 'country', 'timezone');

	$patient = Patient::factory()->load();
	$patient->id = $res->user->id;
	$patient->_selfUpdate = true;
	$patient->_api_call = $res->api_call;
	$patient->only('address', 'address2', 'initial', 'phone_home', 'dob', 'middle');

	$mergeErrors = $patient->validate();
	$errors = array_merge($mergeErrors, $errors);
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$user->save();
		$patient->save();
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/patients/provision', function($req, $res) {
	$ob = new StdClass;

	$patient = Patient::factory()->where('reset_code = ?', $req->post['code'])->first();
	if ($patient) {
		$ob->message = '';
		$ob->status = 0;
	}
	else {
		$ob->message = LocalizedString::getString('message.sorry-url-expired', 'Sorry, the URL you used is either invalid or has expired.');
		$ob->status = 2;
	}
	$ob->errors = new StdClass;

	return $res->json($ob);
});

$app->get('/patients/addresses', $patient_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->records = PatientRequestAddress::factory()
		->where('patient_id = ?', $res->user->id)
		->plain()
		->find();

	return $res->json($ob);
});

$app->post('/patients/addresses', $patient_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = $res->user;

	$record = PatientRequestAddress::factory()->load();

	if (is_numeric($req->post['id'])) {
		$record->id = intval($req->post['id']);
		$stored = PatientRequestAddress::factory()->where('id = ? and patient_id = ?', $record->id, $user->id)->first();
	}

	if ($record->id && !$stored) {
		$errors['generic'] = LocalizedString::getString('error.no-saved-address', 'Could not find a saved address for updating.');
		$ob->errors = $errors;
		return $res->json($ob);
	}

	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime;
			$record->patient_id = $user->id;
		}

		$record->date_updated = new DateTime;
		$record->save();

		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->delete('/patients/addresses/(?<id>\d+)', $patient_filter, function($req, $res) {
	$ob = new StdClass;

	$record = PatientRequestAddress::factory()->first($req->id);
	if ($record && $record->patient_id == $res->user->id) {
		$record->delete();
		$ob->deleted = true;
	}

	return $res->json($ob);
});

$app->get('/patients/sites/id', $client_filter, function($req, $res) {
	$ob = new StdClass;

	if ($req->get['patient_id'] && $req->get['study_id']) {
		$site_id = PatientStudy::factory()
			->select('patient_study.site_id')
			->where('deleted = 0 and patient_study.patient_id = ? and patient_study.study_id = ?', intval($req->get['patient_id']), intval($req->get['study_id']))
			->scalar();
		$ob->site_id = $site_id;
	}
	else {
		$ob->site_id = -1;
	}
	return $res->json($ob);
});

/**
* Get Patients studies
*
* @param query  array   $study_associations optional An array of patient study ids
* @param query  string  $patient_id optional
*/
$app->get('/patients/studies', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$user = $res->user;
	$niftyEngine = new NiftyEngine\Model;
	if ($req->get['study_associations']) {//unsaved case
		$patientStudyIDs = explode(',', $req->get['study_associations']);
			$ob->records = Study::factory()
				->plain()
				->select('distinct study.id as study_id,
					sponsor.name as _sponsor_name,
					study_site.name as _study_site_name,
					patient_study.id as id,
					study.title as _study_title,
					study.subject_travel_preferences as _study_subject_travel_preferences,
					study.subject_study_id_toggle as _study_subject_study_id_toggle,
					study.description as _study_description,
					study.protocol as _study_protocol,
					study.status as _study_status,
					patient_study.status as _patient_study_status,
					patient_study.icf_date_added,
					CONCAT(account.firstname, " ", account.lastname) as _icf_username,
					study.manage_visits as _study_manage_visits,
					study.manage_none as _study_manage_none,
					study.visit_stipends as _study_visit_stipends,
					study_site.id as _study_site_id,
					study_site.country as _study_site_country,
					0 as _num_reimbursements')
				->table('patient_study
					left join study on patient_study.study_id = study.id
					left join patient on study.id = patient.selected_study_id
						and patient_study.patient_id = patient.id
						and patient_study.deleted = 0
					left join sponsor on study.sponsor_id = sponsor.id
					left join study_site_map on study.id = study_site_map.study_id
					left join study_site on patient_study.site_id = study_site.id
					left join account on account.id = patient_study.icf_user_id')
				->where('patient_study.id IN (' . implode(',', array_map('intval', $patientStudyIDs)) . ')')
				->find();
	}
	else if ($req->get['patient_id']) {
		$ob->records = PatientStudy::factory()
			->plain()
			->select('distinct patient_study.study_number,
				patient_study.status,
				patient_study.site_id as site_id,
				patient_study.study_id,
				patient_study.id,
				study.protocol as _study_protocol,
				study.title as _study_title,
				study.subject_travel_preferences as _study_subject_travel_preferences,
				study.subject_study_id_toggle as _study_subject_study_id_toggle,
				study.description as _study_description,
				study.status as _study_status,
				study.manage_reimbursements as _study_manage_reimbursements,
				study.manage_visits as _study_manage_visits,
				study.manage_none as _study_manage_none,
				study.visit_stipends as _study_visit_stipends,
				sponsor.name as _sponsor_name,
				study_site.name as _study_site_name,
				study_site.country as _study_site_country,
				COUNT(distinct patient_request.id) as _num_reimbursements,
				COUNT(distinct case when patient_request.status = 6 then patient_request.id end) as _num_void_reimbursements,
				study_site_visit_assignment.assigned as _study_site_schedule_assigned,
				patient_study.icf_date_added,
				CONCAT(account.firstname, " ", account.lastname) as _icf_username')
			->table('patient_study
				join study on patient_study.study_id = study.id
					and patient_study.deleted = 0
				left join sponsor on study.sponsor_id = sponsor.id
				left join study_site_map on patient_study.study_id = study_site_map.study_id 
					and patient_study.site_id = study_site_map.site_id 
					and study_site_map.deleted = 0
				left join study_site on patient_study.site_id = study_site.id
				left join patient_request on patient_study.patient_id = patient_request.patient_id
					and patient_request.site_id = patient_study.site_id
					and patient_request.study_id = patient_study.study_id
				left join study_site_visit_assignment on study_site_map.study_id = study_site_visit_assignment.study_id
					and study_site_map.site_id = study_site_visit_assignment.site_id
				left join account on account.id = patient_study.icf_user_id and patient_study.icf_user_id is not null')
			->where('patient_study.deleted = 0 and patient_study.patient_id = ?', $req->get['patient_id'])
			->group('study_site_map.site_id, study_site_map.study_id')
			->find();
	} else {
		$ob->records = [];
	}

	return $res->json($ob);
});

$app->delete('/patients/studies/:patient_study_id', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$study = PatientStudy::factory()->first($req->patient_study_id);
	if ($study) {
		if ($study->deleted == 0) {
			$study->date_updated = new DateTime;
			$study->deleted = 1;
			$study->deleted_by = $res->user->id;
			$study->date_deleted = new DateTime;

			$args = ['date_updated', 'deleted', 'deleted_by', 'date_deleted'];

			if ($study->status == PatientStudy::STATUS_ACTIVE) {
				$study->status = PatientStudy::STATUS_COMPLETED;
				$args[] = 'status';
			}

			call_user_func_array(array($study, 'only'), $args);
			$study->save();
			$ob->status = 1;
		}
	}
	return $res->json($ob);
});

$app->delete('/patients/:id', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = Account::factory()->first($req->id);

	if ($record) {
		$record->deleted = 1;
		$record->save();

		$record->updatePatientStudiesToCOMPLETED();

		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->get('/patients/(?<id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$record = Patient::factory()
		->select('account.*, patient.*, account.id as id')
		->table('account join patient on patient.id = account.id')
		->where('patient.id = ?', $req->id)
		->plain()
		->first();

	$ob->record = $record;
	return $res->json($ob);
});
