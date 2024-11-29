<?php

$app->get('/patients/reimbursements', $patient_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->records = PatientRequest::factory()
		->where('patient_id = ?', $res->user->id)
		->order('date_added desc')
		->plain()
		->findLoaded();

	return $res->json($ob);
});

/**
* Create Patient Request / Reimbursement
*
* @param body  string  $study_id
* @param body  string  $site_id
* @param body  string  $visit_id
* @param body  array[PatientRequestItem]  $items
* @param body  string  $status optional
* @param body  string  $id optional
*/

$app->post('/patients/reimbursements', $patient_filter, function($req, $res) {
	$ob = new StdClass;
	$errors = [];

	$user = $res->user;
	$patient = Patient::factory()->first($user->id);

	$ba = PatientBankAccount::factory()
		->select('currency.symbol, patient_bank_account.*')
		->table('patient_bank_account left join currency on patient_bank_account.currency = currency.code')
		->where('patient_id = ?', $patient->id)
		->plain()
		->find();
	if (!$patient) {
		return $res->json($ob);
	}

	if (intval($req->post['study_id']) == 0 && intval($req->post['site_id']) == 0) {
		$errors['_study_association'] = LocalizedString::getString('error.assign-study', 'Please assign a Study.');
	}

	if (!$res->api_call) { // current request is a web request
		if(!isset($req->post['visit_id']) || intval($req->post['visit_id']) == 0) {
			$errors['generic'] = LocalizedString::getString('error.select-visit', 'Please select a visit.');
			$ob->errors = $errors;
			return $res->json($ob);
		}
	}

	$patientRequest = new PatientRequest;
	$patientRequest->study_id = intval($req->post['study_id']);
	$patientRequest->site_id = intval($req->post['site_id']);
	if (isset($req->post['visit_id'])) {
		$patientRequest->visit_id = $req->post['visit_id'];
	}
	$patientRequest->status = PatientRequest::STATUS_DRAFT;
	if ($req->post['status'] <= PatientRequest::STATUS_PENDING) {
		$patientRequest->status = intval($req->post['status']);
	}

	$patientRequest->_symbol = $ba[0]->symbol;
	$patientRequest->currency = $ba[0]->currency;
	if (!$ba) {
		$patientRequest->_symbol = "$";
	}
	if ($req->post['id']) {
		$patientRequest->id = $req->post['id'];
		$savedRequest = PatientRequest::factory()->first($req->post['id']);
	}
	else {
		$patientRequest->patient_id = $patient->id;
		$patientRequest->date_added = new DateTime;
		$patientRequest->date_request = new DateTime;
	}
	$requestItems = [];
	$tmpAmount = 0;
	if (!$req->post['items'] && !$patientRequest->patient_visit_id) {
		$errors['generic'] = LocalizedString::getString('error.min-reimbursement-items', 'Please add at least one item to this reimbursement request.');
	}
	if ($req->post['items']) {
		foreach ($req->post['items'] as $item) {
			$patientRequestItem = PatientRequestItem::factory()->loadFrom($item);
			$itemType = ReimbursementItemType::factory()->first($patientRequestItem->type_id);
			$itemType->cost_per_mile = ReimbursementItemCost::factory()
				->select('cost_per_mile')
				->where('type_id = ? and study_id = ?', $itemType->id, $req->post['study_id'])
				->scalar();

			if ($itemType->address_based == 1 && $itemType->cost_per_mile > 0 && $item['distance'] == 0) {
				$start = PatientRequestAddress::factory()->loadFrom($item['address_start']);
				$end = PatientRequestAddress::factory()->loadFrom($item['address_end']);
				$patientRequestItem->distance = $patientRequestItem->computeDistance($start, $end);
				if ($patientRequestItem->roundtrip == 1) {
					$patientRequestItem->distance *= 2;
				}
				$tmpAmount += round($patientRequestItem->distance * $itemType->cost_per_mile, 2);

				if ($patientRequestItem->distance <= 0) {
					$errors['distance'] = LocalizedString::getString('error.distance-not-computed', 'The distance could not be computed for one or more address items.');
				}
			}
			else if ($itemType->address_based == 1 && $itemType->cost_per_mile > 0 && $item['distance'] > 0) {
				$tmpAmount += round($patientRequestItem->distance * $itemType->cost_per_mile, 2);
			}
			else {
				$patientRequestItem->distance = 0;
				$patientRequestItem->amount = $patientRequestItem->amount;
				$tmpAmount = $patientRequestItem->amount;
			}
			$requestItems[] = $patientRequestItem;
		}
	}
	else if ($patientRequest->patient_visit_id) {
		$tmpAmount = $patientRequest->amount;
	}
	if($tmpAmount <= $req->config->stipend_amount_minimum) {
		$errors['generic'] = LocalizedString::getString('error.amount-not-exceed', 'The entered amount must exceed') . $patientRequest->_symbol . '5.00';
	}
	if ($errors) {
		$ob->status = 2;
		$ob->errors = $errors;
		return $res->json($ob);
	}

	if ($savedRequest && $savedRequest->status >= PatientRequest::STATUS_APPROVED) {
		// prevent any changes to the request
		$ob->status = 0;
		return $res->json($ob);
	}

	if (!$res->api_call) {
		$studyVisit = StudyVisit::factory()->first($req->post['visit_id']);

		$studyVisitOriginal = StudyVisitOriginal::factory();
		$studyVisitOriginal->visit_id   = $studyVisit->id;
		$studyVisitOriginal->name       = $studyVisit->name;
		$studyVisitOriginal->baseline   = $studyVisit->baseline;
		$studyVisitOriginal->stipend    = $studyVisit->stipend;
		$studyVisitOriginal->sort_order = $studyVisit->sort_order;
		$studyVisitOriginal->date_added = new DateTime;
		$studyVisitOriginal->save();

		$patientRequest->original_visit = $studyVisitOriginal->id;
	}

	$patientRequest->date_updated = new DateTime;
	$patient->save();
	$patientRequest->save();

	$amount = 0;
	$savedItems = [];

	foreach ($requestItems as $patientRequestItem) {
		$itemType = ReimbursementItemType::factory()->first($patientRequestItem->type_id);
		$itemType->cost_per_mile = ReimbursementItemCost::factory()
			->select('cost_per_mile')
			->where('type_id = ? and study_id = ?', $itemType->id, $req->post['study_id'])
			->scalar();
		$patientRequestItem->request_id = $patientRequest->id;

		if (!is_numeric($patientRequestItem->id)) {
			// remove local only (temporary) ids
			unset($patientRequestItem->id);
		}

		// take care of any address-based items
		if ($itemType->address_based == 1) {
			if ($itemType->cost_per_mile > 0) {
				$patientRequestItem->amount = round($patientRequestItem->distance, 1) * $itemType->cost_per_mile;
			}
			$amount += round($patientRequestItem->amount, 2);
			foreach (['start', 'end'] as $point) {
				$tmp = PatientRequestAddress::factory()->loadFrom($patientRequestItem->{'address_' . $point});
				$addr = PatientRequestAddress::factory()
					->where('patient_id = ? and address = ? and city = ? and state = ? and zipcode = ?', $patient->id, $tmp->address, $tmp->city, $tmp->state, $tmp->zipcode)
					->first();
				$tmp->date_updated = new DateTime;
				if (!$addr) {
					$tmp->patient_id = $patient->id;
					$tmp->date_added = new DateTime;
					$tmp->save();
					$addr = $tmp;
				}
				$patientRequestItem->{'address_' . $point . '_id'} = $addr->id;
			}
		}
		else {
			$amount += round(floatval($patientRequestItem->amount), 2);
		}

		$patientRequestItem->save();
        $savedItems[] = $patientRequestItem->id;
	}

	if ($patientRequest->id > 0 && $requestItems && $savedItems) {
		$patientRequest->syncItems($savedItems);
	}

	$patientRequest->amount = $amount;
	$patientRequest->save();

	$system = $req->config->system;
	$_study = new StdClass;
	$_study->study_id = $patientRequest->study_id;
	$_study->site_id = $patientRequest->site_id;

	$_study = new StdClass;
	$_study->study_id = $patientRequest->study_id;
	$_study->site_id = $patientRequest->site_id;

	if ($patientRequest->status == PatientRequest::STATUS_PENDING) {
		Account::factory()->sendEmailNotificationFor('subject_request_approval', [
			'subject' => "{{reimbursement-request-subject}}" . ' ' . $patient->id,
			'html' => "
				<p>{{hi}} {{firstname}},</p>
				<p>MRN $patient->id {{email.reimbursement-request-body}} " . Helper::formatMoney($amount) . ". {{email.please-review}}.</p>
				<p><a href='{{app_url}}' style='{{user_button_style}}'>{{email.reimbursement-request-link}}</a></p>
				<p>&nbsp;</p>
				<p><img src=\"$system->url/logo-pay-mini.png\" alt='RealTime-Pay' style='max-height: 60px' /></p>
			",
			"study_association" => $_study,
			"exclude_accounts" => [$user->id]
		]);
	}

	$ob->status = 0;

	return $res->json($ob);
});
