<?php

$app->delete('/travelrequests/(?<id>\d+)', $client_filter, function($req, $res) {

	$ob = new StdClass;
	$ob->status = 2;

	$record = PatientTravelRequest::factory()->first($req->id);

	if ($record) {
		$record->deleted = 1;
		$record->save();
	}

	$ob->status = 0;
	$ob->record = PatientStudy::factory()
		->select("
			patient_travel_request.*,
			patient_study.patient_id,
			patient_study.study_id,
			study_visit.id as visit_id,
			GROUP_CONCAT(
				distinct travel_request_type.label ORDER BY travel_request_type.label SEPARATOR ', ') as _request_types,
			study_visit.name as _visit_name,
			study_visit.baseline as _visit_baseline,
			study_visit.sort_order as _visit_sort_order")
		->table('
			patient_study 
			join study_visit on patient_study.study_id = study_visit.study_id
			left join patient_travel_request on patient_study.study_id = patient_travel_request.study_id 
				and patient_study.patient_id = patient_travel_request.patient_id
				and study_visit.id = patient_travel_request.visit_id
				and patient_travel_request.deleted = 0
			left join travel_request_type on patient_travel_request.id = travel_request_type.travel_request_id and travel_request_type.selected = 1
		')
		->where('patient_study.deleted = 0 and patient_study.patient_id = ? and patient_study.study_id = ? and study_visit.id = ?', $record->patient_id, $record->study_id, $record->visit_id)
		->group('study_visit.id')
		->plain()
		->first();

		$record->_travel_types = TravelRequestType::factory()->plain()->where('travel_request_id = ?', $record->id)->find();

	return $res->json($ob);

});

/**
* Get Patients Travelrequests
*
* @param route  number  $patient_id
*
*/

$app->get('/patients/(?<patient_id>\d+)/travelrequests', $client_filter, function($req, $res) {
	$niftyEngineModel = new NiftyEngine\Model;
	$ob = new StdClass;

	$patientTravelRequest = PatientTravelRequest::factory()
		->select("
			patient_travel_request.*,
			travel_status.status as travel_status,
			concat(account.firstname, ' ', account.lastname) as submitted_by,
			GROUP_CONCAT( distinct travel_request_type.label ORDER BY travel_request_type.label SEPARATOR ', ') as _request_types")
		->table('
			patient_travel_request
			left join travel_request_type on patient_travel_request.id = travel_request_type.travel_request_id and travel_request_type.selected = 1
			left join travel_status on travel_status.id = patient_travel_request.status
			join account on account.id = patient_travel_request.submitted_by
			')
			->where('patient_travel_request.id', $niftyEngineModel->escape($req->get['id']))
		->where('patient_travel_request.deleted = 0 and patient_travel_request.patient_id = ?', $req->patient_id)
		->group('patient_travel_request.id')
		->plain()
		->find();

	foreach($patientTravelRequest as $record) {
		if ($record->id) {
			$record->_travel_types = TravelRequestType::factory()->plain()->where('travel_request_id = ?', $record->id)->find();
		}
	}

	$visits = [];

	$patientStudies = PatientStudy::factory()->where('patient_study.patient_id = ? and patient_study.deleted = 0', $req->patient_id)->plain()->find();
	foreach($patientStudies as $patientStudy) {

		$_visits = StudyVisit::getStudySiteTemplates($patientStudy->study_id, $patientStudy->site_id);		
		$_visits = StudyVisit::sortNatural($_visits);

		foreach($_visits as $visit) {
			$visit->_patient_study['study_id'] = $patientStudy->study_id;
			$visit->_patient_study['site_id'] = $patientStudy->site_id;
			array_push($visits, $visit);
		}
	}

	foreach ($visits as $visit) {

		$visit->_visit_name       = $visit->name;
		$visit->_original_visit   = $visit->original_visit;
		$visit->_visit_baseline   = $visit->visit_baseline;
		$visit->_visit_sort_order = $visit->visit_sort_order;
		$visit->visit_id          = $visit->id;


		$visit->id                = null;
		$visit->visit_start_date  = null;
		$visit->travel_start_date = null;
		$visit->travel_end_date   = null;
		$visit->comment           = null;
		$visit->date_added        = null;
		$visit->date_updated      = null;
		$visit->deleted           = null;
		$visit->visit_end_date    = null;
		$visit->patient_save      = null;
		$visit->site_id           = $visit->_patient_study['site_id'];
		$visit->study_id          = $visit->_patient_study['study_id'];

		$visit->patient_id = $req->patient_id;


		foreach($patientTravelRequest as $request) {
			
			if ($request->study_id == $visit->study_id && ($request->visit_id == $visit->visit_id || $request->visit_id == $visit->original_visit)) {
				
				$visit->request = $request;

				foreach($request as $key => $value) {
					$visit->{$key} = $value;

					$visit->site_id = $visit->_patient_study['site_id'];
					$visit->study_id = $visit->_patient_study['study_id'];
				}
			}
		}
	}

	$ob->records = $visits;

	return $res->json($ob);
});

$app->get('/patients/(?<patient_id>\d+)/(?<id>\d+)/travelrequests_', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$patientTravelRequest = PatientTravelRequest::factory()
		->select("
			patient_travel_request.*,
			travel_status.status as travel_status,
			concat(account.firstname, ' ', account.lastname) as submitted_by,
			GROUP_CONCAT( distinct travel_request_type.label ORDER BY travel_request_type.label SEPARATOR ', ') as _request_types")
		->table('
			patient_travel_request
			left join travel_request_type on patient_travel_request.id = travel_request_type.travel_request_id and travel_request_type.selected = 1
			left join travel_status on travel_status.id = patient_travel_request.status
			join account on account.id = patient_travel_request.submitted_by')
		->where('patient_travel_request.id = ?', $req->id)
		->group('patient_travel_request.id')
		->plain()
		->find();

	foreach($patientTravelRequest as $record) {
		if ($record->id) {
			$record->_travel_types = TravelRequestType::factory()->plain()->where('travel_request_id = ?', $record->id)->find();
		}
	}
	$ob->records = $patientTravelRequest;
	return $res->json($ob);
});

function get_travel_status()
{
	$ob = new StdClass;
	$TravelStatus = TravelStatus::factory()
			->plain()
			->select('travel_status.*')
			->where('yes_no', 1)
			->limit('1');
	$ob = $TravelStatus->find();
	$status = $ob[0]->id;
	return $status;
}

$app->post('/patients/(?<patient_id>\d+)/travelrequests', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$niftyEngineModel = new NiftyEngine\Model;
	$ob->status = 2;
	if (!empty($req->post['status']))
	{
		$status = $niftyEngineModel->escape($req->post['status']);
	}
	else
	{
		$status = 1;
	}
	$account = Account::factory()->first($_SESSION['user_id']);
	$post_id = $niftyEngineModel->escape($req->post['id']);
	$user 					   = $res->user;
	$record 				   = PatientTravelRequest::factory();
	$record->patient_id        = $niftyEngineModel->escape($req->post['patient_id']);
	$record->study_id          = $niftyEngineModel->escape($req->post['study_id']);
	$record->site_id           = $niftyEngineModel->escape($req->post['site_id']);
	$record->visit_id          = $niftyEngineModel->escape($req->post['visit_id']);
	$record->visit_start_date  = $niftyEngineModel->escape($req->post['visit_start_date']);
	$record->travel_start_date = $niftyEngineModel->escape($req->post['travel_start_date']);
	$record->travel_end_date   = $niftyEngineModel->escape($req->post['travel_end_date']);
	$record->comment           = $req->post['comment'];
	$record->deleted           = $niftyEngineModel->escape($req->post['deleted']);
	$record->visit_end_date    = $niftyEngineModel->escape($req->post['visit_end_date']);
	$record->patient_save      = $niftyEngineModel->escape($req->post['patient_save']);
	$record->submitted_by      = $_SESSION['user_id'];
	$record->site_user_save    = $account->type == "siteuser" ? 1 : 0;
	$record->id 			   = $post_id;
	$record->status            = $status;
	$errors 				   = $record->validate();
	if (($req->post['visit_start_date'] == '' || $req->post['visit_start_date'] == '0000-00-00 00:00:00') && 
	($req->post['visit_end_date'] == '' || $req->post['visit_end_date'] == '0000-00-00 00:00:00')) {
		$errors['visit_date'] = LocalizedString::getString('error.select-visit-date', 'Please select a visit date.');
	}

	if ($user->id == $req->post['patient_id'] && 
	($req->post['travel_start_date'] == '' || $req->post['travel_start_date'] == '0000-00-00 00:00:00') ||
	($req->post['travel_end_date'] == '' || $req->post['travel_end_date'] == '0000-00-00 00:00:00')) {
		$errors['travel_date'] = LocalizedString::getString('error.select-travel-date', 'Please select a travel start and end date.');
	}

	$hasPostSelected = false;
	foreach ($req->post['_travel_types'] as $item) {
		if ($item['selected'] == 1) {
			$hasPostSelected = true;
		}
	}

	if ($user->id == $req->post['patient_id'] && !$hasPostSelected){;
		$errors['travel_types_selection'] = LocalizedString::getString('error.select-travel-type', 'Please select at least one travel type.');
	}
	
	$firstSave = false;
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime;
			$firstSave = true;
		} else {
			$savedTravelRequest = PatientTravelRequest::factory()->plain()->first($post_id);
			$savedSelectedCount = TravelRequestType::factory()->plain()->where('travel_request_id = ? and selected = 1', $post_id)->count();
		}

		if ($user->id == $record->patient_id && $record->patient_save == 0) {
			$record->patient_save = 1;
		}

		$record->date_updated = new DateTime;
		$record->save();

		$hasSelected = false;
		$types = [];
		if($req->post['_travel_types']) {
			foreach ($req->post['_travel_types'] as $item) {
				if ($item['selected'] == 1) {
					$hasSelected = true;
				}
				$type = TravelRequestType::factory()->loadFrom($item);
				if (!$item['id']) {
					$type->date_added = new DateTime;
				}
				$type->travel_request_id = $record->id;

				$type->date_updated = new DateTime;
				$type->save();

				$types[] = TravelRequestType::factory()->plain()->first($type->id);
			}
		}

		$_record = PatientTravelRequest::factory()->plain()->first($record->id);
		$_record->_visit_name = StudyVisit::factory()->select('name as _visit_name')->where('id = ?', $record->visit_id)->scalar();
		$_record->_travel_types = $types;

		$sendAdminEmail = false;
		if ($_record->travel_start_date != '0000-00-00 00:00:00' && $_record->travel_start_date != '0000-00-00 00:00:00') {
			if ($firstSave ||
			($user->id == $_record->patient_id && $record->patient_save = 1) ||
			($savedTravelRequest->travel_start_date == '0000-00-00 00:00:00' || $savedTravelRequest->travel_start_date == '0000-00-00 00:00:00') ||
			($hasSelected && $savedSelectedCount == 0)){
				$sendAdminEmail = true;
			}
		}

		$sendPatientEmail = false;
		if ($_record->visit_start_date != '0000-00-00 00:00:00' && $_record->visit_end_date != '0000-00-00 00:00:00') {
			if ($firstSave ||
			($savedTravelRequest->visit_start_date == '0000-00-00 00:00:00' || $savedTravelRequest->visit_end_date == '0000-00-00 00:00:00')) {
				$sendPatientEmail = true;
			}
		}
		
		if ($sendAdminEmail || $sendPatientEmail) {
			$patient = Patient::factory()
			->select("
			patient.id, 
			CONCAT(LEFT(account.firstname, 1), IF(patient.middle is null or patient.middle = '', '-', LEFT(patient.middle, 1)), LEFT(account.lastname, 1)) as _initials")
			->table('patient
				join account on patient.id = account.id')
			->plain()
			->where('patient.id = ?', $_record->patient_id)
			->first();
			$study = Study::factory()->select('protocol, title')->plain()->first($_record->study_id);
			$studyName = $req->post['_study_name'];
			$siteName = $req->post['_site_name'];
			$studyNameShort = $req->post['_study_name_short'];

			$types = TravelRequestType::factory()->plain()->where('travel_request_id = ? and selected = 1', $_record->id)->order('label')->find();
			$types_labels = $types;
			$types_labels = array_map(function($t){return ucfirst($t->label);}, $types_labels);
			$types_labels = implode(', ', $types_labels);

			$types_dates = array_filter($types, function($t){
				if ($t->departure_date != '0000-00-00 00:00:00' || $t->return_date != '0000-00-00 00:00:00') {
					return true;
				};

				return false;
			});

			$formatDateTime = function($date, $hasTime = true) {
				if ($date == '0000-00-00 00:00:00') {return '';};
				$dateTimeFormat = $hasTime ? 'j-M-Y H:i' : 'j-M-Y';
				$d = new DateTime($date);
				return strtoupper($d->format($dateTimeFormat));
			};

			$formatTime = function($date) {
				if ($date == '0000-00-00 00:00:00') {return '';};
				$d = new DateTime($date);
				return strtoupper($d->format('H:i'));
			};

			$visit_start_date = $formatDateTime($_record->visit_start_date);
			$visit_end_date = $formatTime($_record->visit_end_date);
			if ($visit_start_date && !$visit_end_date) {$visit_end_date = '00:00';};
			$travel_start_date = $formatDateTime($_record->travel_start_date, false);
			$travel_end_date = $formatDateTime($_record->travel_end_date, false);

			$renderTravelTypeValue = '';
			if ($types_labels) {
				$renderTravelTypeLabel = "<div style='font-weight: bold;'>Type of Travel:</div>";
				$renderTravelTypeValue = "<div>{$types_labels}</div>";
			}

			$renderTravelLabel = '';
			$renderTravelValue = '';
			if ($types_dates) {
				$renderTravelLabel = "<div style='font-weight: bold;'>Travel Date/Time:</div>";
				$renderTravelValue = "<div>";
				foreach($types_dates as $t) {
					$departure = $formatDateTime($t->departure_date);
					$return = $formatDateTime($t->return_date);
					
					$label = ucfirst($t->label);
					$renderTravelValue .= "<div><span style='width: 45px; display: inline-block'>{$label}</span>: {$departure} -- {$return}</div>";
				}
				$renderTravelValue .= '</div>';
			}

			$style__header = "
				style='
				background: lightgrey;
				height: 60px;
				padding: 10px 0in 10px 0in;
				'";

			$style__header_img = "
				style='
				padding-left: 10px;
				'";


			$style__header_title = "
				style='
				font-size: 1.5em;
				'";

			$style__email_body = "
				style='
				padding: 20px 50px 20px 50px;
				'";

			$style__col_1 = "
				style='
				width: 40%;
				padding: 0in 0in 0in 0in;
				'";

			$style__col_2 = "
				style='
				width: 60%;
				padding: 0in 0in 0in 0in;
				'";

				$col_2 = "
				width: 60%
				";

			$style__label = "
				font-weight: bold
			";
				
			$style__clearfix = "
				style='
				clear: both;
				display: table;" . 'content: "";'.
				"'";

			$style__request_button = "
				style='
				cursor: pointer;
				color: #fff;
				background-color: #2292a4;
				padding: 6px 10px 6px 10px;
				min-width: 180px;
				text-align: center;
				border-radius: 3px;
				font-weight: bold;
				width: 10%
				'";

			$style__request_button_container = "
				style='
				margin: 0 auto;
				width: 100%;
				max-width: 180px;
				padding-bottom: 30px;
				'";

			$style__footer = "
				style='
				background: #9fc03c;
				height: 10px
				'";

			$renderTravelTypeRow = '';
			if ($renderTravelTypeLabel) {
				$renderTravelTypeRow = "
				<tr>
				  <td {$style__col_1} valign='top'>
					<div style='{$style__label}'>{$renderTravelTypeLabel}</div>
				  </td>
				  <td {$style__col_2}>
					<div>{$renderTravelTypeValue}</div>
				  </td>
				</tr>";
			}

			$renderTravelRow = '';
			if ($renderTravelLabel) {
				$renderTravelRow = "
				<tr>
				  <td {$style__col_1} valign='top'>
					<div style='{$style__label}'>{$renderTravelLabel}</div>
				  </td>
				  <td style='{$col_2}; padding: 0in 0in 10px 0in;'>
					<div>{$renderTravelValue}</div>
				  </td>
				</tr>
				";
			}

			if ($sendPatientEmail) {
				$account = Account::factory()->first($patient->id);

				$account->sendEmail([
					'subject' => LocalizedString::getString('label.travel-request', 'Travel Request', $account->lang) . " - {$_record->_visit_name}",
					'footer' => '<p style="font-size: 11px; color: #444">' . LocalizedString::getString('email.footer-automated-notification', 'This is an automated notification alert from RealTime-Pay. Do NOT reply to this email.', $account->lang),
					'html' => "
						<div align='center' width='560px;'>
						<table >
						<tr>
						<td colspan='1' align='center' width='560px;' style='border: 1px solid #dedede' cellpadding='0'>
						<div >
							<table width='100%' style='background: lightgrey; height: 10px;'>
							</table>

							<table style='width: 86%; margin: 0 auto; padding: 15px 0 25px 0;'>

								<tr>
									<td {$style__col_1}>
										<div style='{$style__label}'>{{title.site}}:</div>
									</td>
									<td {$style__col_2}>
										<div>{$siteName}</div>
									</td>
								</tr>
								<tr>
									<td valign='top' {$style__col_1}>
										<div style='{$style__label}'>{{title.study}}:</div>
									</td>
									<td style='{$col_2}; padding: 0in 0in 10px 0in;'>
										<div>{$studyNameShort}</div>
									</td>
								</tr>
								<tr>
									<td {$style__col_1} valign='top' >
										<div style='{$style__label}'>{{title.visit}}:</div>
									</td>
									<td {$style__col_2}>
										<div>{$_record->_visit_name}</div>
									</td>
								</tr>

								<tr>
									<td {$style__col_1} valign='top'>
										<div style='{$style__label}'>{{title.visit-date-time}}:</div>
									</td>
									<td style='{$col_2}; padding: 0in 0in 10px 0in;'>
										<div>{$visit_start_date} - {$visit_end_date}</div>
									</td>
								</tr>

								<tr>
									<td colspan='2'>
										<div {$style__request_button_container} align='center'>  
											<a style='text-decoration: none;' href='{{app_url}}/?cmd=view-patient-travel-request&patient_id={$_record->patient_id}&study_id={$_record->study_id}&visit_id={$_record->visit_id}&id={$_record->id}'><span {$style__request_button}>{{button.view-request}}</span></a>
										</div>
									</td>
								</tr>
							
							</table>

							<div {$style__footer}></div>
						</div>
						</td>
						</tr>
						</table>											
					",
				]);
			}

			$system = $req->config->system;

			if ($sendAdminEmail) {
				Account::factory()->sendEmailNotificationFor('patient_travel_request_alert', [
					'subject' => "{{email.travel-request-subject}}" . ": {$patient->id} | {$_record->_visit_name}",
					'footer' => '<p style="font-size: 11px; color: #444">' . "{{email.footer-automated-notification}}",
					'html' => "
						<div align='center' width='560px;'>
						<table >
						<tr>
						<td colspan='1' align='center' width='560px;' style='border: 1px solid #dedede' cellpadding='0'>
						<div >
							<table width='100%' height='60px' {$style__header}>
								<tr>
									<td style='width: 18%; padding: 0in 0in 0in 10px;'>
										<img {$style__header_img} src=\"$system->url/logo-pay-mini.png\" alt='RealTime-Pay' />
									</td>
									
									<td>
										<span {$style__header_title}>{{email.travel-request-title}}.</span>
									</td>
								</tr>
							</table>

							<table style='width: 86%; margin: 0 auto; padding: 15px 0 25px 0;'>
								<tr>
									<td style='width: 40%; padding: 0in 0in 0in 0in;'>
										<div style='{$style__label}'>{{email.travel-request-patient-initials}}</div>
									</td>
									<td {$style__col_2}>
										<div></div>
									</td>
								</tr>
								<tr>
									<td {$style__col_1}>
										<div style='{$style__label}'>MRN:</div>
									</td>
									<td {$style__col_2}>
										<div>{$patient->id}</div>
									</td>
								</tr>
								<tr>
									<td valign='top' {$style__col_1}>
										<div style='{$style__label}'>{{title.study}}:</div>
									</td>
									<td style='{$col_2}; padding: 0in 0in 10px 0in;'>
										<div>{$studyName}</div>
									</td>
								</tr>
								<tr>
									<td {$style__col_1} valign='top' >
										<div style='{$style__label}'>{{title.visit}}:</div>
									</td>
									<td {$style__col_2}>
										<div>{$_record->_visit_name}</div>
									</td>
								</tr>

								<tr>
									<td {$style__col_1}>
										<div style='{$style__label}'>{{title.visit-date-time}}</div>
									</td>
									<td {$style__col_2}>
										<div>{$visit_start_date} - {$visit_end_date}</div>
									</td>
								</tr>
								
								<tr>
									<td {$style__col_1}>
										<div style='{$style__label}'>{{email.travel-request-patient-travel-date-range}}</div>
									</td>
									<td {$style__col_2}>
										<div>{$travel_start_date} -- {$travel_end_date}</div>
									</td>
								</tr>
								
								{$renderTravelTypeRow}

								{$renderTravelRow}

								<tr>
									<td {$style__col_1} valign='top'>
										<div style='{$style__label}'>{{label.comment}}:</div>
									</td>
									<td style='{$col_2}; padding: 0in 0in 10px 0in;'>
										<div>{$_record->comment}</div>
									</td>
								</tr>

								<tr>
									<td colspan='2'>
										<div {$style__request_button_container} align='center'>  
											<a style='text-decoration: none;' href='{{app_url}}/?cmd=view-patient&patient_id={$_record->patient_id}&study_id={$_record->study_id}&visit_id={$_record->visit_id}&id={$_record->id}'><span {$style__request_button}>{{button.view-request}}</span></a>
										</div>
									</td>
								</tr>
							
							</table>

							<div {$style__footer}></div>
						</div>
						</td>
						</tr>
						</table>
						</div>
					",
				]);
			}
		}

		$ob->status = 0;
		$ob->record = $_record;
	}

	return $res->json($ob);

});