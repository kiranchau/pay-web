<?php

function sendReimbursementReviewedAlertNotification($firstTime, $savedRequest, $patientRequest, $user) {
	global $config;
	$system = $config->system;
	
	if ($firstTime && $patientRequest->status == PatientRequest::STATUS_REVIEW || 
	(!$firstTime && 
	$savedRequest && $savedRequest->status != PatientRequest::STATUS_REVIEW &&
	$patientRequest && $patientRequest->status == PatientRequest::STATUS_REVIEW)) {
		$moneyArgs = [
			'symbol' => $patientRequest->_symbol,
		];
		$amount = Helper::formatMoney($patientRequest->amount, $moneyArgs);

		$_visit_name = '';
		if ($patientRequest->visit_id) {
			$_visit_name = StudyVisit::factory()->select('name')->where('id = ?', $patientRequest->visit_id)->scalar();
		}

		$patient = Account::factory()
		->table('account join patient on patient.id = account.id')
		->where('account.id = ?', $patientRequest->patient_id)
		->first();

		$_study = new StdClass;
		$_study->study_id = $patientRequest->study_id;
		$_study->site_id = $patientRequest->site_id;

		$buttonStyle = "
		style='
		display: inline-block;
		cursor: pointer;
		color: #fff;
		background-color: #2292a4;
		padding-top: 6px;
		padding-bottom: 6px;
		text-align: center;
		border-radius: 3px;
		font-weight: bold;
		width: 160px;'";
		
		Account::factory()->sendEmailNotificationFor('reimbursement_reviewed_alert', [
			'subject' => "{{email.reimbursement-reviewed-subject}}" . ' ' . $patient->id . ' | ' . $_visit_name,
			'footer' => '<p style="font-size: 11px; color: #444">' . "{{email.reimbursement-reviewed-footer}}",
			'html' => "
				<p>{{hi}} {{firstname}},</p>
				<p>$user->firstname $user->lastname {{email.reimbursement-reviewed-title}}</p>

				<div>MRN: {$patient->id}</div>
				<div>{{title.visit}}: {$_visit_name}</div>
				<div>{{label.amount}}: {$amount}</div>

				<p>{{email.reimbursement-reviewed-body}}</p>
				
				<p><a style='text-decoration:none' href='{{app_url}}/?cmd=view-requests-site-reviewed' ><span {$buttonStyle}>{{button.view-requests}}</span></a></p>
				<p>&nbsp;</p>
				<p><img src=\"$system->url/logo-pay-mini.png\" alt='RealTime-Pay' /></p>
			",
			"study_association" => $_study,
		]);
	}
}

function basicPatientRequest() {
	return PatientRequest::factory()
		->select("
			patient_request.*, 
			study_visit.name as _visit_name,
			IF(study_site.payment_method is null, 
				0, 
				IF(study_site.payment_method = 'bank', 
					IF(patient_bank_account.id is null, 0, 1),
					IF(patient_card.id is null, 0, 1)
				)
			) as _extra__has_payment_method")
		->table('
			patient_request 
			left join study_visit on patient_request.visit_id = study_visit.id
			left join patient_bank_account on patient_request.patient_id = patient_bank_account.patient_id
			left join patient_card on patient_request.patient_id = patient_card.patient_id and patient_card.date_voided is null
			left join study_site on patient_request.site_id = study_site.id')
		->order('date_added desc')
		->plain();

}
$app->post('/patients/(?<request>requests|visits)/recall', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$user = $res->user;
	global $config;
	$errors = [];

	$type = '';
	if ($req->request == 'requests') {
		$type = 'reimbursement';
	} else if ($req->request == 'visits') {
		$type = 'stipend';
	}

	$patientRequestID = intval($req->get['request_id']);
	$patientRequest = PatientRequest::factory()->first($patientRequestID);
	if ($patientRequest) {
		$patientRequest->status = PatientRequest::STATUS_RECALLED;
		$patientRequest->date_recalled = new DateTime;
		$patientRequest->user_recalled = $user->id;
		$patientRequest->date_updated = new DateTime;
		$patientRequest->only('date_updated', 'status', 'date_recalled', 'user_recalled')->save();
		$patientRequest->recallEmailNotification($type);
		$ob->status = 0;
	}
	else {
		$ob->errors = ['message' => LocalizedString::getString('error.unable-to-find', 'Unable to find this') . " {$type} " . LocalizedString::getString('error.request', 'request') . '.'];
	}

	return $res->json($ob);
});

$app->post('/patients/(?<request>requests|visits)/void', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$user = $res->user;

	global $config;
	$errors = [];

	$type = '';
	if ($req->request == 'requests') {
		$type = 'reimbursement';
	} else if ($req->request == 'visits') {
		$type = 'stipend';
	}

	$patientRequestID = intval($req->get['request_id']);
	$patientRequest = PatientRequest::factory()->first($patientRequestID);
	if ($patientRequest) {

		if ($type == 'reimbursement') {
			$items = PatientRequestItem::factory()->where('request_id = ?', $patientRequest->id)->find();
			$copyItems = array_map(function ($item) {
				return $item->copyAsNew();
			}, $items);
			
			$copyPatientRequest = $patientRequest->copyAsDraft();
			$copyPatientRequest->date_request = new DateTime;
			$copyPatientRequest->date_added = new DateTime;
			$copyPatientRequest->date_updated = new DateTime;
			$copyPatientRequest->save();
	
			if($copyPatientRequest->id) {
				foreach($copyItems as $item) {
					$item->request_id = $copyPatientRequest->id;
					$item->date_added = new DateTime;
					$item->date_updated = new DateTime;
					$item->save();
					$item->syncCopies();
				}
			}
		}

		$patientRequest->status = PatientRequest::STATUS_VOIDED;
		$patientRequest->date_updated = new DateTime;
		$patientRequest->date_voided = new DateTime;
		$patientRequest->user_voided = $user->id;
		
		$ob->currency = $patientRequest->currency;
		$patientRequest->only('date_updated', 'status','user_voided', 'date_voided')->save();

		$patient = Account::factory()
			->table('patient join account on account.id = patient.id')
			->where('account.id = ?', $patientRequest->patient_id)
			->first();

		if ($patient) {
			$paymentMethod = StudySite::factory()
							->select('payment_method')
							->where('id = ?', $patientRequest->site_id)
							->scalar();
			$patientcountry = strtoupper($patient->country);
			$feature_flag = Sys::getFeatureFlag();
			if($feature_flag == 1 && $paymentMethod === 'bank') {
				$countryData = Country::factory()
				->select('country.processor')
				->where('code = ?', $patientcountry)
				->plain()
				->first();
				if($countryData->processor == 1) {
					$program = $patient->country == 'US' ? 'ius' : 'ous';
				} else {
					$program = $patient->country == 'US' ? 'prepaid_ius' : 'prepaid_ous';
				}
			} else {
				$program = $patient->country == 'US' ? 'ius' : 'ous';
			}
			$wallet = Wallet::factory()->getForProgram($program);

			if ($program == 'ous' || $program == 'prepaid_ous') {
				$exchangeRate = new OpenExchangeRate;
				$patientRequest->conversion_rate = $exchangeRate->GetConversionRate($patientRequest->currency, 'USD');
				$patientRequest->amount_usd = round($patientRequest->amount / $patientRequest->conversion_rate, 2);
				$patientRequest->only('conversion_rate', 'amount_usd')->save();
				$wallet->balance += $patientRequest->amount_usd;
			}
			else {
				$wallet->balance += $patientRequest->amount;
			}

			$wallet->date_updated = new DateTime;
			$wallet->only('balance', 'date_updated')->save();
			$wallet->handleBalanceChange();
		}
		else {
			$ob->errors = ['message' => LocalizedString::getString('error.find-subject', 'Unable to find subject for this reimbursement request.')];
			return $res->json($ob);
		}
		$ob->status = 0;
	}
	else {
		$ob->errors = ['message' => LocalizedString::getString('error.find-subject', 'Unable to find subject for this reimbursement request.')];
	}

	return $res->json($ob);

});

/**
* Get Patient Requests / Reimbursements for patient study
*
* @param route  number  $patient_id
* @param route  number  $study_id
* @param query  string  $exclude_reimbursement_statuses optional exclude patient requests with status  format 6,5,3
*/
$app->get('/patients/requests/(?<patient_id>\d+)/(?<study_id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	 $records = basicPatientRequest()
		->where('patient_request.patient_id = ? and patient_visit_id = 0 and patient_request.study_id = ? and patient_request.site_id = ? and patient_request.study_id > 0', $req->patient_id, $req->study_id, $req->get['site_id']);

	if (isset($req->get['exclude_reimbursement_statuses']) && $req->get['exclude_reimbursement_statuses'] != '') {
		$niftyEngineModel = new NiftyEngine\Model;
		$exclude_statuses = $niftyEngineModel->escape($req->get['exclude_reimbursement_statuses']);
		$w = " and patient_request.status NOT IN ({$exclude_statuses}) ";

		$records->appendToWhere($w);
	}

	$ob->records = $records->findLoaded();

	return $res->json($ob);
});

$app->get('/patients/requests/(?<requests_id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$r = basicPatientRequest()
		->where('patient_request.id = ?', $req->requests_id)
		->findLoaded();
		if (count($r) > 0) {
			$ob->record = $r[0];
		} else {
			$ob->record = new StdClass;
		}
		
	return $res->json($ob);
});

$app->delete('/patients/requests/(?<patient_id>\d+)/(?<study_id>\d+)/(?<request_id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$request = PatientRequest::factory()->first($req->request_id);
	if ($request) {
		if ($request->status == 0) {
			$request->delete();
		}
		$ob->deleted = true;
	}

	return $res->json($ob);
});

$app->post('/patients/requests/compute-distance-amount', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$patient = Patient::factory()->first($req->post['patient_id']);
	$itemType = ReimbursementItemType::factory()->first($req->post['type_id']);
	$itemType->cost_per_mile = ReimbursementItemCost::factory()
		->select('cost_per_mile')
		->where('type_id = ? and study_id = ?', $itemType->id, $req->post['study_id'])
		->plain()
		->scalar();
	$studyTitle = Study::factory()
		->select('study.title')
		->where('id = ?', $req->post['study_id'])
		->scalar();

	$error = '';
	if (!$patient) {
		$error = 'Could not find the subject for this calculation.';
	}
	else if (!$req->post['study_id']) {
		$error = 'Please select a Study.';
	}
	else if (!$req->post['type_id']) {
		$error = 'A valid item type was not specified.';
	}
	else if (!$itemType->cost_per_mile) {
		$error = "Please have an administrator set the cost per mile of $studyTitle.";
	}
	else if ($itemType->address_based == 1) {
		$start = PatientRequestAddress::factory()->loadFrom($req->post['start']);
		$end = PatientRequestAddress::factory()->loadFrom($req->post['end']);
		$patientRequestItem = PatientRequestItem::factory();
		$patientRequestItem->distance = $patientRequestItem->computeDistance($start, $end);

		if ($req->post['roundtrip']) {
			$patientRequestItem->distance *= 2;
		}

		$ob->distance = $patientRequestItem->distance;
		$ob->amount = round(($patientRequestItem->distance * $itemType->cost_per_mile), 2);

		if ($patientRequestItem->distance <= 0) {
			$error = 'The distance could not be computed for one or more address items.';
		}
	}

	if ($error) {
		$ob->error = $error;
	}
	else {
		$ob->status = 0;
	}
	
	return $res->json($ob);
});

/**
* Create Patient Request
*
* @param route  number  $patient_id
* @param route  number  $study_id
* @param body  string  $visit_id
* @param body  array[PatientRequestItem]  $items
* @param body  string  $_amount_ack optional reqest
* @param body  string  $id optional reqest id
* @param body  string  $amount optional reqest study_id
* @param body  string  $status optional reqest status
*/

$app->post('/patients/requests', $client_filter, function($req, $res) {
	$ob = new StdClass;
	

	$patient = Account::factory()
		->table('account join patient on patient.id = account.id')
		->where('account.id = ?', $req->patient_id ?: $req->post['patient_id'])
		->first();

	if (!$patient) {
		return $res->json($ob);
	}

	$savedRequest = null;
	$firstTime;
	if ($req->post['id']) {
		$patientRequest = PatientRequest::factory()->first($req->post['id']);
		$savedRequest = PatientRequest::factory()->first($req->post['id']);
		$firstTime = false;
	}
	else {
		$patientRequest = new PatientRequest;
		$patientRequest->patient_id = $patient->id;
		$patientRequest->study_id = $req->study_id ?: $req->post['study_id'];
		$patientRequest->site_id = PatientStudy::factory()
			->select('patient_study.site_id')
			->where('patient_study.study_id = ? and patient_study.patient_id = ? and patient_study.deleted = 0', $patientRequest->study_id, $patientRequest->patient_id)
			->scalar();
		//$patientRequest->status = PatientRequest::STATUS_DRAFT;
		$patientRequest->date_added = new DateTime;
		$patientRequest->date_request = new DateTime;
		$ba = PatientBankAccount::factory()
			->select('patient_bank_account.*, currency.symbol')
			->table('patient_bank_account left join currency on patient_bank_account.currency = currency.code')
			->where('patient_id = ?', $patient->id)
			->plain()
			->first();
		$patientRequest->currency = $ba->currency;
		$patientRequest->_symbol = $ba->symbol;
		$firstTime = true;
	}

	$country = PatientStudy::factory()
		->select('country')
		->table('patient_study
			left join study_site on patient_study.site_id = study_site.id
				and patient_study.deleted = 0')
		->where('patient_study.deleted = 0 and patient_study.patient_id = ? and patient_study.study_id = ?', $patient->id, $patientRequest->study_id)
		->scalar();

	$errors = [];

	if (!$req->post['items'] && !$patientRequest->patient_visit_id) {
		$errors['generic'] = LocalizedString::getString('error.min-reimbursement-items', 'Please add at least one item to this reimbursement request.');
	}

	$requestItems = [];
	$tmpAmount = 0;
	if ($req->post['items']) {
		foreach ($req->post['items'] as $item) {
			$patientRequestItem = PatientRequestItem::factory()->loadFrom($item);
			$itemType = ReimbursementItemType::factory()->first($patientRequestItem->type_id);
			$itemType->cost_per_mile = ReimbursementItemCost::factory()
				->select('cost_per_mile')
				->where('type_id = ? and study_id = ?', $itemType->id, $patientRequest->study_id)
				->scalar();

			if ($itemType->address_based == 1 && $itemType->cost_per_mile > 0 && $item['distance'] == 0) {
				$start = PatientRequestAddress::factory()->loadFrom($item['address_start']);
				$end = PatientRequestAddress::factory()->loadFrom($item['address_end']);
				$patientRequestItem->distance = $patientRequestItem->computeDistance($start, $end);
				if ($patientRequestItem->roundtrip) {
					$patientRequestItem->distance = round($patientRequestItem->distance * 2, 2);
				}
				$tmpAmount += round($patientRequestItem->distance * $itemType->cost_per_mile, 2);
				if ($patientRequestItem->distance <= 0) {
					$errors['distance'] = LocalizedString::getString('error.distance-not-computed', 'The distance could not be computed for one or more address items.');
				}
			}
			else if ($itemType->address_based == 1 && $itemType->cost_per_mile > 0 && $patientRequestItem->distance > 0) {
				$tmpAmount += round($patientRequestItem->distance * $itemType->cost_per_mile, 2);
			}
			else {
				$patientRequestItem->distance = 0;
				$patientRequestItem->amount = $patientRequestItem->amount;
				$tmpAmount += $patientRequestItem->amount;
			}
			$requestItems[] = $patientRequestItem;
		}
	}
	else if ($patientRequest->patient_visit_id) {
		$tmpAmount = $patientRequest->amount;
	}


	$program = $patient->country == 'US' ? 'ius' : 'ous';
	if (!$patient->country) {
		$program = $country == 'US' ? 'ius' : 'ous';
	}
	$wallet = Wallet::factory()->getForProgram($program);

	$tmpConvertedAmount = $tmpAmount;
	if ($program == 'ous') {
		$er = new OpenExchangeRate;
		$cr = $er->GetConversionRate($patientRequest->currency, 'USD'); 
		$tmpConvertedAmount = round($tmpAmount / $cr, 2);
	}

	if ($tmpConvertedAmount > floatval($wallet->balance)) {
		$errors['generic'] = LocalizedString::getString('error.funding-wallet-low-funds', 'The funding wallet does not have enough funds to pay this reimbursement.');
	}
	$coverage = SystemOption::factory()
		->select('value')
		->where('name = ?', 'stipend_reimbursement_coverage')
		->scalar();

	if ($tmpConvertedAmount <= $req->config->stipend_amount_minimum) {
		$errors['generic'] = LocalizedString::getString('error.amount-not-exceed', 'The entered amount must exceed') . $patientRequest->_symbol . '5.00';
	}

	if ((!$savedRequest || $savedRequest && $tmpConvertedAmount > $savedRequest->amount) && $tmpConvertedAmount > $coverage && !$req->post['_amount_ack']) {
		$errors['_over_threshold'] = LocalizedString::getString('error.amount-exceeds-stipend', 'This amount is greather than the stipend threshold.');
	}

	if ($errors) {
		$ob->status = 2;
		$ob->errors = $errors;
		return $res->json($ob);
	}

	unset($patientRequest->visit_name);
	$patientRequest->visit_id = intval($req->post['visit_id']);
	$patientRequest->status = $req->post['status'];
	$patientRequest->date_updated = new DateTime;
	$patientRequest->save();

	$amount = 0;
	$savedItems = [];

	foreach ($requestItems as $patientRequestItem) {
		$itemType = ReimbursementItemType::factory()->first($patientRequestItem->type_id);
		$itemType->cost_per_mile = ReimbursementItemCost::factory()
			->select('cost_per_mile')
			->where('type_id = ? and study_id = ?', $itemType->id, $patientRequest->study_id)
			->scalar();
		$patientRequestItem->request_id = $patientRequest->id;

		if (!is_numeric($patientRequestItem->id)) {
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
					->where('patient_id = ? and address = ? and ifnull(address, "") != "" and city = ? and state = ? and zipcode = ?', $patient->id, $tmp->address, $tmp->city, $tmp->state, $tmp->zipcode)
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
			$amount += round($patientRequestItem->amount, 2);
		}
		$patientRequestItem->save();
		$savedItems[] = $patientRequestItem->id;
	}

	if ($patientRequest->id && $requestItems) {
		$patientRequest->syncItems($savedItems);
	}

	$patientRequest->amount = $amount;
	if ($program === 'ius') {
		$patientRequest->amount_usd = $amount;
		$patientRequest->conversion_rate = 1;
	}

	$patientRequest->save();

	$patientRequest->transaction_id = date('Ymd-') . Helper::genCode(4);

	if ($patientRequest->status == PatientRequest::STATUS_APPROVED 
		&& (!$savedRequest || $savedRequest 
			&& ($savedRequest->status < PatientRequest::STATUS_APPROVED || $savedRequest->status == PatientRequest::STATUS_VOIDED))) {
		$pr = PatientRequest::factory()->where('id = ?', $patientRequest->id)->first();
		$card = PatientCard::factory()->where('id = ?', $patient->card_id)->first();

		$paymentMethod = StudySite::factory()
			->select('payment_method')
			->where('id = ?', $patientRequest->site_id)
			->scalar();


		if ($patient->bank_account_id > 0 && $paymentMethod === 'bank') {
			$bankAccount = PatientBankAccount::factory()->first($patient->bank_account_id);
			if (!$bankAccount) {
				$ob->errors = ['generic' => LocalizedString::getString('error.retrieve-bank-account', 'Could not retrieve an actual bank account for this subject.')];
				return $res->json($ob);
			}

			$postedAmount = $patientRequest->amount;

			try {
				$exchangeRate = new OpenExchangeRate;
				$patientRequest->conversion_rate = $exchangeRate->getConversionRate($patientRequest->currency, 'USD');
				$patientRequest->amount_usd = $postedAmount / $patientRequest->conversion_rate;
			}
			catch (Exception $e) {
				$ob->errors = ['generic' => LocalizedString::getString('error.currency-conversion', 'Could not perform currency conversion')];
				return $res->json($ob);
			}

			if ($req->config->hyperwallet_enabled) {
				$config = $req->config;

				$hpw = new HyperWalletV3();

				$payFields = [
					'clientPaymentId' => $patientRequest->transaction_id,
					'amount' => $postedAmount,
					'currency' => $bankAccount->currency,
					'purpose' => 'OTHER',
					'destinationToken' => $bankAccount->hyperwallet_account_num,
					'programToken' => $config->hyperwallet_programToken,
				];

				try {
					$payment = $hpw->post('/payments', $payFields);
					$patientRequest->payment_token = $payment->token;
					$patientRequest->bank_account_id = $patient->bank_account_id;
					$patientRequest->only('payment_token', 'bank_account_id')->save();
				}
				catch (Exception $e) {
					$ob->errors = ['generic' => LocalizedString::getString('error.error-encountered', 'An error was encountered') . ': ' . $e->getMessage()];
					return $res->json($ob);
				}
			}

			$bankAccount->balance += $postedAmount;
			$bankAccount->date_updated = new DateTime;
			$bankAccount->save();

			$wallet->balance -= $patientRequest->amount_usd;
			$wallet->only('balance')->save();
			$wallet->handleBalanceChange();
		}
		else if ($patient->card_id > 0 && $paymentMethod === 'card') {
			if ($req->config->hyperwallet_enabled) {
				$config = $req->config;
				require_once 'app/helpers/HyperWallet.php';

				$hpw = new HyperWalletV3();
				$postedAmount = $patientRequest->amount;

				$payFields = [
					'clientPaymentId' => $patientRequest->transaction_id,
					'amount' => number_format($amount, 2),
					'currency' => 'USD',
					'purpose' => 'OTHER',
					'destinationToken' => $card->token,
					'programToken' => $config->hyperwallet_programToken,
				];

				try {
					$payment = $hpw->post('/payments', $payFields);
					$patientRequest->payment_token = $payment->token;
					$patientRequest->only('payment_token')->save();
				}
				catch (Exception $e) {
					$ob->errors = ['generic' => LocalizedString::getString('error.error-encountered', 'An error was encountered') . ': ' . $e->getMessage()];
					return $res->json($ob);
				}
			}

			$card->balance += floatval($req->post['amount']);
			$card->date_updated = new DateTime;
			$card->save();

			$wallet->balance -= $pr->amount_usd;
			$wallet->only('balance')->save();
			$wallet->handleBalanceChange();
		}

		if (!$patientRequest->date_approved || $patientRequest->date_approved === '0000-00-00 00:00:00') {
			$patientRequest->date_approved = new DateTime;
		}

		if (!$patientRequest->user_approved) {
			$patientRequest->user_approved = $res->user->id;
		}

		$patientRequest->card_id = $card->id;

		$moneyArgs = [
			'symbol' => $patientRequest->_symbol,
		];

		if ($patient->mobile_verified) {
			$patient->sendText(LocalizedString::getString('label.hi', 'Hi', $patient->lang) . " {$patient->firstname}, " . Helper::formatMoney($patientRequest->amount, $moneyArgs) . " " . LocalizedString::getString('notification.message-card-deposit', 'has just been loaded onto your RealTime-PAY Card and is available immediately.', $patient->lang));
		}

		if ($patient->email_verified) {
			$patient->sendEmail([
				'subject' => LocalizedString::getString('email.card-deposit-title', 'RealTime-PAY Card Deposit Notification', $patient->lang),
				'html' => '
					<p>{{hi}} {{firstname}},</p>
					<p>{{amount}} {{just_loaded}}</p>
				',
				'fields' => [
					'firstname' => $patient->firstname,
					'amount' => Helper::formatMoney($patientRequest->amount, $moneyArgs),
					'hi' => LocalizedString::getString('label.hi', 'Hi', $patient->lang),
					'just_loaded' => LocalizedString::getString('notification.message-card-deposit', 'has just been loaded onto your RealTime-PAY Card and is available immediately.', $patient->lang),
				],
			]);
		}
		$patientRequest->save();
	}

	if ($patientRequest->patient_visit_id) {
		$patientRequest->amount = PatientVisit::factory()
			->select('study_visit.stipend') 
			->table('patient_visit left join study_visit on patient_visit.visit_id = study_visit.id')
			->where('patient_visit.id = ?', $patientRequest->patient_visit_id)
			->scalar();
		$patientRequest->save();
	}

	sendReimbursementReviewedAlertNotification($firstTime, $savedRequest, $patientRequest, $res->user);

	$ob->status = 0;

	return $res->json($ob);
});

$app->post('/patients/request/pay/reverse', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = $res->user;

	$patientRequest = PatientRequest::factory()
		->where('id = ?', $req->post['id'])
		->first();

	if (!$patientRequest) {
		$ob->error = 'There was an issue retrieving the request to pay.';
	}
	else {
		$pr = PatientRequest::factory();
		$pr->id = $patientRequest->id;
		$pr->status = 1;
		$pr->date_approved = null;
		$pr->user_approved = 0;
		$pr->user_cancelled = 0;
		$pr->user_recalled = 0;
		$pr->date_recalled  = null;
		$pr->date_voided  = null;
		$pr->user_voided  = 0;
		$pr->date_denied  = null;
		$pr->date_cancelled  = null;
		$pr->user_denied  = 0;
		$pr->card_id = 0;
		$pr->transaction_id = '';
		$pr->date_updated = new DateTime;
		$pr->save();

		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/patients/requests/(?<patient_id>\d+)/(?<study_id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$patient = Account::factory()
		->table('account join patient on patient.id = account.id')
		->where('account.id = ?', $req->patient_id)
		->first();

	$country = PatientStudy::factory()
		->select('study_site.country')
		->table('patient_study
			left join study_site on patient_study.site_id = study_site.id')
		->where('patient_study.deleted = 0 and patient_study.patient_id = ? and patient_study.study_id = ?', $patient->id, $req->study_id)
		->scalar();

	$user = $res->user;

	if (!$patient) {
		return $res->json($ob);
	}

	$_country = Country::factory()
		->select('country.name, country.active, country.default_currency')
		->table('
			 study_site
				join country on study_site.country = country.code')
		->where('study_site.id = ?', $req->post['site_id'])
		->plain()
		->first();

	$errors = [];

	if((!isset($patientRequest->patient_visit_id) || intval($req->post['patient_visit_id'])) == 0 &&
		!isset($req->post['visit_id']) || intval($req->post['visit_id']) == 0) {
		$errors['generic'] = LocalizedString::getString('error.select-visit', 'Please select a visit.');
		$ob->errors = $errors;
		return $res->json($ob);
	} else if (!$_country->name) {
		$errors['generic'] = LocalizedString::getString('error.add-country', 'Please add a country.');
		$ob->errors = $errors;
		return $res->json($ob);
	} else if ($_country->name && $_country->active == 0) {
		$errors['generic'] = LocalizedString::getString('error.activate-country', 'Please activate this country: ') . $_country->name;
		$ob->errors = $errors;
		return $res->json($ob);
	} else if ($_country->name && !$_country->default_currency) {
		$errors['generic'] = LocalizedString::getString('error.set-currency-country', 'Please set the currency for this country') . $_country->name;
		$ob->errors = $errors;
		return $res->json($ob);
	}

	$savedRequest = null;
	$firstTime;
	if ($req->post['id']) {
		$patientRequest = PatientRequest::factory()->first($req->post['id']);
		$savedRequest = PatientRequest::factory()->first($req->post['id']);
		$firstTime = false;
	}
	else {
		$patientRequest = new PatientRequest;

		$currentStudy = PatientStudy::factory()
			->select('patient_study.study_id,
				patient_study.site_id,
				patient_study.status')
			->where('patient_study.patient_id = ? and patient_study.study_id = ?  and patient_study.site_id = ? and patient_study.deleted = 0', $req->patient_id, $req->study_id, $req->post['site_id'])
			->first();

		if ($currentStudy && $currentStudy->status == 2) {
				$errors['generic'] = LocalizedString::getString('error.create-reimbursement', 'Please create a reimbursement on a patient in an active study');
			}

		if ($errors) {
			$ob->errors = $errors;
			return $res->json($ob);
		}

		if ($req->post['_study_id'] > 0) {
			$patientStudy = PatientStudy::factory()
				->where('patient_id = ?
					and patient_study.deleted = 0
					and patient_study.study_id = ?', $patient->id, intval($req->post['_study_id']))
				->first();
			$patientRequest->study_id = intval($req->study_id);
			$patientRequest->site_id = intval($req->post['site_id']);
		}
		else {
			$patientRequest->study_id = $req->study_id;
			$patientRequest->site_id = $currentStudy->site_id;
		}
		$patientRequest->patient_id = $patient->id;

		$studyVisit = StudyVisit::factory()->first(intval($req->post['visit_id']));

		$studyVisitOriginal = StudyVisitOriginal::factory();
		$studyVisitOriginal->visit_id   = $studyVisit->id;
		$studyVisitOriginal->name       = $studyVisit->name;
		$studyVisitOriginal->baseline   = $studyVisit->baseline;
		$studyVisitOriginal->stipend    = $studyVisit->stipend;
		$studyVisitOriginal->sort_order = $studyVisit->sort_order;
		$studyVisitOriginal->date_added = new DateTime;
		$studyVisitOriginal->save();

		$patientRequest->original_visit = $studyVisitOriginal->id;

		//$patientRequest->status = PatientRequest::STATUS_DRAFT;
		$patientRequest->date_added = new DateTime;
		$patientRequest->date_request = new DateTime;
		$ba = PatientBankAccount::factory()
			->select('patient_bank_account.*, currency.symbol')
			->table('patient_bank_account left join currency on patient_bank_account.currency = currency.code')
			->where('patient_id = ?', $patient->id)
			->plain()
			->first();
		$patientRequest->currency = $ba->currency;
		$patientRequest->_symbol = $ba->symbol;
		$firstTime = true;
	}

	$errors = [];

	if (!$req->post['items'] && !$patientRequest->patient_visit_id) {
		$errors['generic'] = LocalizedString::getString('error.min-reimbursement-items', 'Please add at least one item to this reimbursement request.');
	}

	$requestItems = [];
	$tmpAmount = 0;
	if ($req->post['items']) {
		foreach ($req->post['items'] as $item) {
			$patientRequestItem = PatientRequestItem::factory()->loadFrom($item);
			$itemType = ReimbursementItemType::factory()->first($patientRequestItem->type_id);
			$itemType->cost_per_mile = ReimbursementItemCost::factory()
				->select('cost_per_mile')
				->where('type_id = ? and study_id = ?', $itemType->id, $patientRequest->study_id)
				->scalar();

			if ($itemType->address_based == 1 && $itemType->cost_per_mile > 0 && $item['distance'] == 0) {
				$start = PatientRequestAddress::factory()->loadFrom($item['address_start']);
				$end = PatientRequestAddress::factory()->loadFrom($item['address_end']);
				$patientRequestItem->distance = $patientRequestItem->computeDistance($start, $end);
				if ($patientRequestItem->roundtrip) {
					$patientRequestItem->distance = round($patientRequestItem->distance * 2, 2);
				}
				$tmpAmount += round($patientRequestItem->distance * $itemType->cost_per_mile, 2);
				if ($patientRequestItem->distance <= 0) {
					$errors['distance'] = LocalizedString::getString('error.distance-not-computed', 'The distance could not be computed for one or more address items.');
				}
			}
			else if ($itemType->address_based == 1 && $itemType->cost_per_mile > 0 && $patientRequestItem->distance > 0) {
				$tmpAmount += round($patientRequestItem->distance * $itemType->cost_per_mile, 2);
			}
			else {
				$patientRequestItem->distance = 0;
				$patientRequestItem->amount = $patientRequestItem->amount;
				$tmpAmount += $patientRequestItem->amount;
			}
			$requestItems[] = $patientRequestItem;
		}
	}
	else if ($patientRequest->patient_visit_id) {
		$tmpAmount = $patientRequest->amount;
	}

	$patientcountry = strtoupper($patient->country);
	
	$feature_flag = Sys::getFeatureFlag();
	$paymentMethod = StudySite::factory()
			->select('payment_method')
			->where('id = ?', $patientRequest->site_id)
			->scalar();
	if ($feature_flag == 1 && $paymentMethod === 'bank') {
		$country_processor = Country::factory()
							->select('country.processor')
							->where('code = ?', $patientcountry)
							->plain()
							->first();
		if (!$patient->zipcode && $country_processor->processor == 2 && $req->post['status'] == PatientRequest::STATUS_APPROVED) {
			$ob->errors = ['generic' => LocalizedString::getString('error.postal-code', 'Please fill in the subject Postal Code.')];
			return $res->json($ob);
		}
		if($country_processor->processor == 1) {
			$program = $patient->country == 'US' ? 'ius' : 'ous';
		} else {
			$program = $patient->country == 'US' ? 'prepaid_ius' : 'prepaid_ous';
		}
	} else {
		$program = $patient->country == 'US' ? 'ius' : 'ous';
		if (!$patient->country) {
			$program = $country == 'US' ? 'ius' : 'ous';
		}
	}		
	$wallet = Wallet::factory()->getForProgram($program);

	$coverage = SystemOption::factory()
		->select('value')
		->where('name = ?', 'stipend_reimbursement_coverage')
		->scalar();

	$tmpConvertedAmount = $tmpAmount;

	$getCurrency = PatientRequest::factory()
		->select('patient_bank_account.currency, 
			patient_request.patient_id')
		->table('patient_request
			LEFT JOIN patient_bank_account ON patient_bank_account.patient_id  = patient_request.patient_id ')
		->where('patient_request.patient_id = ?', $req->patient_id)
		->find();
	
	if ($patientRequest->currency == NULL && $program == 'ous') {
		$patientRequest->currency = $getCurrency[0]->currency;
		$er = new OpenExchangeRate;
		$cr = $er->GetConversionRate($patientRequest->currency, 'USD');
		$tmpConvertedAmount = round($tmpAmount / $cr, 2);
	} else if ($program == 'ous' || $program == 'prepaid_ous') {
		$er = new OpenExchangeRate;
		$cr = $er->GetConversionRate($patientRequest->currency, 'USD'); 
		$tmpConvertedAmount = round($tmpAmount / $cr, 2);
	}

	if ($tmpConvertedAmount > floatval($wallet->balance)) {
		$errors['generic'] = LocalizedString::getString('error.funding-wallet-low-funds', 'The funding wallet does not have enough funds to pay this reimbursement.');
	}

	if ($patientRequest->patient_visit_id == 0 && $tmpConvertedAmount <= $req->config->stipend_amount_minimum) {
		$errors['generic'] = LocalizedString::getString('error.amount-not-exceed', 'The entered amount must exceed') . $patientRequest->_symbol . '5.00';
	}

	if ((!$savedRequest || $savedRequest && $tmpConvertedAmount > $savedRequest->amount) && $tmpConvertedAmount > $coverage && !$req->post['_amount_ack']) {
		$errors['_over_threshold'] = LocalizedString::getString('error.amount-exceeds-stipend', 'This amount is greather than the stipend threshold.');
	}

	if ($errors) {
		$ob->status = 2;
		$ob->errors = $errors;
		return $res->json($ob);
	}

	$patientRequest->visit_id = intval($req->post['visit_id']);
	$patientRequest->status = $req->post['status'];

	if($patientRequest->status == PatientRequest::STATUS_CANCELLED) {
		$patientRequest->date_cancelled = new DateTime;
		$patientRequest->user_cancelled = $user->id;
	} else if ($patientRequest->status == PatientRequest::STATUS_APPROVED) {
		if (!$patientRequest->date_approved || $patientRequest->date_approved === '0000-00-00 00:00:00') {
			$patientRequest->date_approved = new DateTime;
		}

		if (!$patientRequest->user_approved) {
			$patientRequest->user_approved = $res->user->id;
		}
	} else if ($patientRequest->status == PatientRequest::STATUS_DENIED) {
		$patientRequest->date_denied = new DateTime;
		$patientRequest->user_denied = $user->id;
	} else if ($patientRequest->status == PatientRequest::STATUS_RECALLED) {
		$patientRequest->date_recalled = new DateTime;
		$patientRequest->user_recalled = $user->id;
	} else if ($patientRequest->status == PatientRequest::STATUS_VOIDED) {
		$patientRequest->date_voided = new DateTime;
		$patientRequest->user_voided = $user->id;
	}
	
	unset($patientRequest->visit_name);
	$patientRequest->date_updated = new DateTime;
	$patientRequest->save();

	$amount = 0;
	$savedItems = [];

	foreach ($requestItems as $patientRequestItem) {
		$itemType = ReimbursementItemType::factory()->first($patientRequestItem->type_id);
		$itemType->cost_per_mile = ReimbursementItemCost::factory()
			->select('cost_per_mile')
			->where('type_id = ? and study_id = ?', $itemType->id, $patientRequest->study_id)
			->scalar();
		$patientRequestItem->request_id = $patientRequest->id;

		if (!is_numeric($patientRequestItem->id)) {
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
					->where('patient_id = ? and address = ? and ifnull(address, "") != "" and city = ? and state = ? and zipcode = ?', $patient->id, $tmp->address, $tmp->city, $tmp->state, $tmp->zipcode)
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
			$amount += round($patientRequestItem->amount, 2);
		}
		unset($patientRequestItem->address_start);
		unset($patientRequestItem->address_end);
		$patientRequestItem->save();
		$savedItems[] = $patientRequestItem->id;
	}

	if ($patientRequest->id && $requestItems) {
		$patientRequest->syncItems($savedItems);
	}
	$getCurrency = PatientRequest::factory()
		->select('currency')
		->where("patient_id = ? AND currency IS NOT NULL AND TRIM(currency) <> '' ", $req->patient_id )
		->order('id DESC')
		->limit('1')
		->find();

	if ($patientRequest->currency == NULL) {
		$patientRequest->currency = $getCurrency[0]->currency;
	}

	$patientRequest->amount = $amount;
	if ($program == 'ous'|| $program == 'prepaid_ous') {
		$exchangeRate = new OpenExchangeRate;
		$patientRequest->conversion_rate = $exchangeRate->GetConversionRate($patientRequest->currency, 'USD');
		$patientRequest->amount_usd = round($patientRequest->amount / $patientRequest->conversion_rate, 2);
	}
	else {
		$patientRequest->conversion_rate = 1;
		$patientRequest->amount_usd = $amount;
	}

	$patientRequest->save();


	$patientRequest->transaction_id = date('Ymd-') . Helper::genCode(4);

	if ($user->type == 'siteuser' && $patientRequest->status == PatientRequest::STATUS_PENDING && (!$savedRequest || $savedRequest && $savedRequest->status < PatientRequest::STATUS_PENDING)) {
		$site = StudySite::factory()
			->select('study_site.*')
			->table('study_site_user join study_site on study_site.id = study_site_user.site_id')
			->where('study_site_user.user_id = ?', $user->id)
			->first();

		$_study = new StdClass;
		$_study->study_id = $patientRequest->study_id;
		$_study->site_id = $patientRequest->site_id;
		$system = $req->config->system;

		Account::factory()->sendEmailNotificationFor('subject_request_approval', [
			'subject' => "{{email.reimbursement-request-subject}}" . ' ' . $patient->id,
			'html' => "
				<p>{{hi}} {{firstname}},</p>
				<p>$user->firstname $user->lastname {{email.reimbursement-reviewed-title}}" . Helper::formatMoney($amount) . ". {{email.reimbursement-reviewed-body}}.</p>
				<p><a href='{{app_url}}' style='{{user_button_style}}'>{{button.view-requests}}</a></p>
				<p>&nbsp;</p>
				<p><img src=\"$system->url/logo-pay-mini.png\" alt='RealTime-Pay' style='max-height: 60px' /></p>
			",
			"study_association" => $_study,
			"exclude_accounts" => [$user->id]
		]);
	}

	if ($patientRequest->status == PatientRequest::STATUS_APPROVED && (!$savedRequest || $savedRequest && $savedRequest->status < PatientRequest::STATUS_APPROVED)) {
		$pr = PatientRequest::factory()->where('id = ?', $patientRequest->id)->first();
		$card = PatientCard::factory()->where('id = ?', $patient->card_id)->first();
		$paymentMethod = StudySite::factory()
			->select('payment_method')
			->where('id = ?', $patientRequest->site_id)
			->scalar();

		if ($patient->bank_account_id > 0 && $paymentMethod === 'bank') {
			$bankAccount = PatientBankAccount::factory()->first($patient->bank_account_id);
			if (!$bankAccount) {
				$ob->errors = ['generic' => LocalizedString::getString('error.retrieve-bank-account', 'Could not retrieve an actual bank account for this subject.')];
				return $res->json($ob);
			}
			if($feature_flag == 1 && $country_processor->processor == 2) {
				
				try {
					$prepaidTech = new PrepaidTech();
				
					if ($bankAccount->prepaidtech_account_num) {
						$request_body = [
							"payee" => [
							  "identifier"=>$bankAccount->prepaidtech_account_num,
								 ],
							  "currency"=>$bankAccount->currency,
							  "amount"=>round($amount, 2),
							  "externalIdentifier"=>$patientRequest->transaction_id,
							];
						$payment = $prepaidTech->post('/payments', $request_body);
						$patientRequest->payment_token = $payment->payment->identifier;
						$patientRequest->only('payment_token')->save();
					} else {
						$uri_segments = explode('.', parse_url($_SERVER['SERVER_NAME'], PHP_URL_PATH));
						$patientEmail = $patient->emailaddress ? $patient->emailaddress : $uri_segments[0].'.'.$patientRequest->site_id.'.'.$patient->id.'@dashsolutions.com';
						$request_body = [
							"payee" => [
										"externalIdentifier"=>"",
										"iban"=>$bankAccount->account_num,
										"email"=>$patientEmail,
										"firstName"=>$patient->firstname,
										"lastName"=>$patient->lastname,
										"address"=> [
														"line1"=>$patient->address,
														"line2"=>$patient->address2,
														"locality"=>$patient->city,
														"region"=>$patient->state,
														"country"=>$patient->country,
														"postalCode"=>$patient->zipcode,
													],
									  ],
							"currency"=>$bankAccount->currency,
							"amount"=>round($amount, 2),
							"externalIdentifier"=>$patientRequest->transaction_id,
						];
						$payment = $prepaidTech->post('/payments', $request_body);
						$bankAccount->prepaidtech_account_num = $payment->payment->payeeIdentifier;
						$patientRequest->payment_token = $payment->payment->identifier;
						$patientRequest->only('payment_token')->save();
						$bankAccount->only('prepaidtech_account_num')->save();
					}
				}
				catch (Exception $e) {
					$ob->errors = ['generic' => LocalizedString::getString('error.error-encountered', 'An error was encountered') . ': ' . $e->getMessage()];
					return $res->json($ob);
				}
			} else {
				if ($req->config->hyperwallet_enabled) {
					$config = $req->config;

					$hpw = new HyperWalletV3();

					$payFields = [
						'clientPaymentId' => $patientRequest->transaction_id,
						'amount' => number_format($amount, 2),
						'currency' => $bankAccount->currency,
						'purpose' => 'OTHER',
						'destinationToken' => $bankAccount->hyperwallet_account_num,
						'programToken' => $config->hyperwallet_programToken,
					];

					try {
						$payment = $hpw->post('/payments', $payFields);
						$patientRequest->payment_token = $payment->token;
						$patientRequest->only('payment_token')->save();
					}
					catch(Exception $e) {
						$ob->errors = ['generic' => LocalizedString::getString('error.error-encountered', 'An error was encountered') . ': ' . $e->getMessage()];
					}
				}
			}
			$patientRequest->bank_account_id = $bankAccount->id;

			if($feature_flag == 1){
				$patientRequest->processor = $country_processor->processor;
			}
			$bankAccount->balance += $amount;
			$bankAccount->date_updated = new DateTime;
			$bankAccount->save();

			$wallet->balance -= $patientRequest->amount_usd;
			$wallet->only('balance')->save();
			$wallet->handleBalanceChange();
		}
		else if ($patient->card_id > 0 && $paymentMethod === 'card') {
			if ($req->config->hyperwallet_enabled) {
				$config = $req->config;
				require_once 'app/helpers/HyperWallet.php';

				$hpw = new HyperWalletV3();
				$postedAmount = $patientRequest->amount;

				$payFields = [
					'clientPaymentId' => $patientRequest->transaction_id,
					'amount' => number_format($amount, 2),
					'currency' => 'USD',
					'purpose' => 'OTHER',
					'destinationToken' => $card->token,
					'programToken' => $config->hyperwallet_programToken,
				];

				try {
					$payment = $hpw->post('/payments', $payFields);
					$patientRequest->payment_token = $payment->token;
					$patientRequest->only('payment_token')->save();
				}
				catch (Exception $e) {
					$ob->errors = ['generic' => LocalizedString::getString('error.error-encountered', 'An error was encountered') . ': ' . $e->getMessage()];
					return $res->json($ob);
				}
			}

			$card->balance += $pr->amount;
			$card->date_updated = new DateTime;
			$card->save();

			$wallet->balance -= $pr->amount_usd;
			$wallet->only('balance')->save();
			$wallet->handleBalanceChange();
		}


		if (!$patientRequest->date_approved || $patientRequest->date_approved === '0000-00-00 00:00:00') {
			$patientRequest->date_approved = new DateTime;
		}

		if (!$patientRequest->user_approved) {
			$patientRequest->user_approved = $res->user->id;
		}
		$patientRequest->card_id = $card->id;

		$moneyArgs = [
			'symbol' => $patientRequest->_symbol,
		];

		if ($patient->mobile_verified) {
			$patient->sendText(LocalizedString::getString('label.hi', 'Hi', $patient->lang) . " {$patient->firstname}, " . Helper::formatMoney($patientRequest->amount, $moneyArgs) . " " . LocalizedString::getString('notification.message-card-deposit', 'has just been loaded onto your RealTime-PAY Card and is available immediately.', $patient->lang));
		}

		if ($paymentMethod == 'card' && $patient->email_verified) {
			$patient->sendEmail([
				'subject' => LocalizedString::getString('email.card-deposit-title', 'RealTime-PAY Card Deposit Notification', $patient->lang),
				'html' => '
					<p>{{hi}} {{firstname}},</p>
					<p>{{amount}} {{just_loaded}}</p>
				',
				'fields' => [
					'firstname' => $patient->firstname,
					'amount' => Helper::formatMoney($patientRequest->amount, $moneyArgs),
					'hi' => LocalizedString::getString('label.hi', 'Hi', $patient->lang),
					'just_loaded' => LocalizedString::getString('notification.message-card-deposit', 'has just been loaded onto your RealTime-PAY Card and is available immediately.', $patient->lang),
				],
			]);
		}
		$patientRequest->save();
	}

	if ($patientRequest->patient_visit_id) {
		$patientRequest->amount = PatientVisit::factory()
			->select('study_visit.stipend') 
			->table('patient_visit left join study_visit on patient_visit.visit_id = study_visit.id')
			->where('patient_visit.id = ?', $patientRequest->patient_visit_id)
			->scalar();
		//$patientRequest->save();
	}

	sendReimbursementReviewedAlertNotification($firstTime, $savedRequest, $patientRequest, $res->user);

	$ob->status = 0;

	return $res->json($ob);
});

$app->post('/patients/requests/approve', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	global $config;

	$pr = PatientRequest::factory()->first($req->post['request_id']);
	$patient = Account::factory()
		->table('patient join account on account.id = patient.id')
		->where('account.id = ?', $pr->patient_id)
		->first();

	$patientcountry = strtoupper($patient->country);
	$feature_flag = Sys::getFeatureFlag();
	$paymentMethod = StudySite::factory()
			->select('payment_method')
			->where('id = ?', $pr->site_id)
			->scalar();	
	if($feature_flag == 1 && $paymentMethod === 'bank') {
		$country_processor = Country::factory()
				->select('country.processor')
				->where('code = ?', $patientcountry)
				->plain()
				->first();
		if (!$patient->zipcode && $country_processor->processor == 2) {
			$ob->errors = ['message' => LocalizedString::getString('error.postal-code', 'Please fill in the subject Postal Code.')];
			return $res->json($ob);
		}
		if($country_processor->processor == 1) {
			$program = $patient->country == 'US' ? 'ius' : 'ous';
		} else {
			$program = $patient->country == 'US' ? 'prepaid_ius' : 'prepaid_ous';
		}
	} else {
		$program = strtoupper($patient->country) == 'US' ? 'ius' : 'ous';
	}

	$wallet = Wallet::factory()->getForProgram($program);
	unset($pr->visit_name);

	if (!$patient) {
		$ob->errors = ['message' => LocalizedString::getString('error.find-subject', 'Unable to find subject for this reimbursement request.')];
		return $res->json($ob);
	}
	else if (!$wallet) {
		$ob->errors = ['message' => LocalizedString::getString('error.find-funding-wallet', 'Unable to find a funding wallet for this request.')];
		return $res->json($ob);
	}
	if ($pr && $pr->status != PatientRequest::STATUS_APPROVED) {
		$pr->transaction_id = date('Ymd-') . Helper::genCode(4);

		$getCurrency = PatientRequest::factory()
			->select('currency,conversion_rate')
			->where("patient_id = ? AND currency IS NOT NULL AND TRIM(currency) <> '' ", $pr->patient_id )
			->order('id DESC')
			->limit('1')
			->find();
		
		if ($pr->currency == NULL) {
			$pr->currency = $getCurrency[0]->currency;
			$pr->conversion_rate = $getCurrency[0]->conversion_rate; 
			$pr->amount_usd = round($pr->amount / $pr->conversion_rate, 2);
		} else if ($program == 'ous' || $program == 'prepaid_ous') {
			$exchangeRate = new OpenExchangeRate;
			$pr->conversion_rate = $exchangeRate->GetConversionRate($pr->currency, 'USD');
			$pr->amount_usd = round($pr->amount / $pr->conversion_rate, 2);
		} else {
			$pr->conversion_rate = 1;
			$pr->amount_usd = $pr->amount;
		}

		$pr->save();

		if ($patient->bank_account_id && $paymentMethod === 'bank') {
			$ba = PatientBankAccount::factory()->where('id = ?', $patient->bank_account_id)->first();
			if (!$ba) {
				$ob->error = ['message' => LocalizedString::getString('error.missing-connected-bank-account', 'This subject no longer has a connected bank account.')];
				return $res->json($ob);
			}
			if($feature_flag == 1 && $country_processor->processor == 2) {
				try {
					$prepaidTech = new PrepaidTech();
				
					if ($ba->prepaidtech_account_num) {
						$request_body = [
							"payee" => [
							  "identifier"=>$ba->prepaidtech_account_num,
								 ],
							  "currency"=>$ba->currency,
							  "amount"=>round($pr->amount, 2),
							  "externalIdentifier"=>$pr->transaction_id,
							];
						$payment = $prepaidTech->post('/payments', $request_body);
					} else {
						$uri_segments = explode('.', parse_url($_SERVER['SERVER_NAME'], PHP_URL_PATH));
						$patientEmail = $patient->emailaddress ? $patient->emailaddress : $uri_segments[0].'.'.$pr->site_id.'.'.$pr->patient_id.'@dashsolutions.com';
						$request_body = [
							"payee" => [
										"externalIdentifier"=>"",
										"iban"=>$ba->account_num,
										"email"=>$patientEmail,
										"firstName"=>$patient->firstname,
										"lastName"=>$patient->lastname,
										"address"=> [
														"line1"=>$patient->address,
														"line2"=>$patient->address2,
														"locality"=>$patient->city,
														"region"=>$patient->state,
														"country"=>$patient->country,
														"postalCode"=>$patient->zipcode,
													],
									  ],
							"currency"=>$ba->currency,
							"amount"=>round($pr->amount, 2),
							"externalIdentifier"=>$pr->transaction_id,
						];
						$payment = $prepaidTech->post('/payments', $request_body);
						$ba->prepaidtech_account_num = $payment->payment->payeeIdentifier;
						$ba->only('prepaidtech_account_num')->save();
					}
				}
				catch (Exception $e) {
					$ob->errors = [
					'message' => LocalizedString::getString('error.loading-funds-bank-account', 'There was a problem loading funds to the subject\'s bank account:') . ': ' . $e->getMessage()
					];
					return $res->json($ob);
				}
			} else {
				if ($req->config->hyperwallet_enabled) {
	
					try {
						$hw = new HyperWalletV3();
					}
					catch(Exception $e) {
						$ob->error = [
							'message' => LocalizedString::getString('error.authenticating-hyper-wallet', 'There was a problem authenticating with HyperWallet.')
						];
						return $res->json($ob);
					}
					try {
						$paymentFields = [
							'clientPaymentId' => $pr->transaction_id,
							'amount' => number_format($pr->amount, 2),
							'currency' => $ba->currency,
							'purpose' => 'OTHER',
							'destinationToken' => $ba->hyperwallet_account_num,
							'programToken' => $config->hyperwallet_programToken
						];
	
						$payment = $hw->post('/payments', $paymentFields);
						mail('test@redaxle.com', 'OUS Payment Result', print_r($payment, true));
					}
					catch (Exception $e) {
						$ob->errors = [
						'message' => LocalizedString::getString('error.loading-funds-bank-account', 'There was a problem loading funds to the subject\'s bank account:') . ': ' . $e->getMessage()
						];
						return $res->json($ob);
					}
				}
			}

			$pr->bank_account_id = $ba->id;
			$pr->status = PatientRequest::STATUS_APPROVED;

			if (!$pr->date_approved || $pr->date_approved === '0000-00-00 00:00:00') {
				$pr->date_approved = new DateTime;
			}
	
			if (!$pr->user_approved) {
				$pr->user_approved = $res->user->id;
			}

			if($feature_flag == 1){
				$pr->processor = $country_processor->processor;
			}

			$pr->currency = $ba->currency;
			$pr->payment_token = $payment->token ? $payment->token : $payment->payment->identifier;

			$getCurrency = PatientRequest::factory()
				->select('currency,conversion_rate')
				->where("patient_id = ? AND currency IS NOT NULL AND TRIM(currency) <> '' ", $pr->patient_id )
				->order('id DESC')
				->limit('1')
				->find();

			if ($pr->currency == NULL) {
				$pr->currency = $getCurrency[0]->currency;
				$pr->conversion_rate = $getCurrency[0]->conversion_rate; 
				$pr->amount_usd = round($pr->amount / $pr->conversion_rate, 2);
			} else {
				try {
					$exchangeRate = new OpenExchangeRate;
					$pr->conversion_rate = $exchangeRate->getConversionRate($pr->currency, 'USD'); 
					$pr->amount_usd = $pr->amount / $pr->conversion_rate;
				}
				catch (Exception $e) {
					return $res->json([
						'errors' => ['generic' => 'Unable to retrieve currency conversion rate for transaction ' . $pr->id]
					]);
				}
			}

			$pr->only(
				'bank_account_id',
				'status',
				'date_approved',
				'user_approved',
				'currency',
				'payment_token',
				'conversion_rate',
				'amount_usd',
				'transaction_id',
				'processor'
			)->save();

			$ba->balance += $pr->amount_usd;
			$ba->date_updated = new DateTime;
			$ba->only('balance', 'date_updated')->save();

			$wallet->balance -= $pr->amount_usd;
			$wallet->only('balance')->save();

			$wallet->handleBalanceChange();

			$moneyArgs = [
				'symbol' => $pr->_symbol,
			];
			if ($patient->emailaddress && $patient->deposit_notifications == 1) {
				$patient->sendEmail([
					'subject' => LocalizedString::getString('notification.subject-bank-deposit', 'RealTime-PAY Bank Deposit Notification'),
					'html' => '
						<p>{{hi}} {{firstname}},</p>
						<p>{{amount}} {{bank_deposit}}</p>
					',
					'fields' => [
						'firstname' => $patient->firstname,
						'amount' => Helper::formatMoney($pr->amount, $moneyArgs),
						'hi' => LocalizedString::getString('label.hi', 'Hi'),
						'bank_deposit' => LocalizedString::getString('notification.message-bank-deposit', 'has just been loaded to your bank account. These funds will arrive in your account in 2-4 business days.'),
					],
				]);
			}
			$ob->message = Helper::formatMoney($pr->amount, $moneyArgs) . ' ' . LocalizedString::getString('message.successfully-loaded', 'has been successfully loaded to') . ' ' . ($card->name ? $card->name : $ba->bank_name);
		}
		else {
			$moneyArgs = [
				'symbol' => $pr->_symbol,
			];
			$card = PatientCard::factory()->where('id = ?', $patient->card_id)->first();
			if (!$card) {
				$ob->errors = ['message' => LocalizedString::getString('error.missing-active-stipend-card', 'This subject no longer has an active stipend card.')];
				return $res->json($ob);
			}
			else {
				if ($req->config->hyperwallet_enabled) {
					$config = $req->config;

					try {
						$hw = new HyperWalletV3();
					}
					catch(Exception $e) {
						$ob->errors = [
							'message' => LocalizedString::getString('error.authenticating-hyper-wallet', 'There was a problem authenticating with HyperWallet.')
						];
						return $res->json($ob);
					}
					try {
						$paymentFields = [
							'clientPaymentId' => $pr->transaction_id,
							'amount' => number_format($pr->amount, 2),
							'currency' => 'USD',
							'purpose' => 'OTHER',
							'destinationToken' => $card->token,
							'programToken' => $config->hyperwallet_programToken 
						];
	
						$payment = $hw->post('/payments', $paymentFields);
						mail('test@redaxle.com', 'OUS Payment Result', print_r($payment, true));

						$pr->payment_token = $payment->token;

						$card->balance += $pr->amount_usd;
						$card->date_updated = new DateTime;
						$card->save();

						$wallet->balance -= $pr->amount_usd;
						$wallet->only('balance')->save();
						$wallet->handleBalanceChange();

						$pr->status = PatientRequest::STATUS_APPROVED;
						if (!$pr->date_approved || $pr->date_approved === '0000-00-00 00:00:00') {
							$pr->date_approved = new DateTime;
						}
				
						if (!$pr->user_approved) {
							$pr->user_approved = $res->user->id;
						}
						
						$pr->card_id = $card->id;
						$pr->save();
						if ($patient->mobile_verified) {
							$patient->sendText(LocalizedString::getString('label.hi', 'Hi', $patient->lang) . " {$patient->firstname}, " . Helper::formatMoney($pr->amount, $moneyArgs) . " " . LocalizedString::getString('notification.message-card-deposit', 'has just been loaded onto your RealTime-PAY Card and is available immediately.', $patient->lang));
						}
						if ($patient->email_verified) {
							$patient->sendEmail([
							'subject' => LocalizedString::getString('email.card-deposit-title', 'RealTime-PAY Card Deposit Notification', $patient->lang),
							'html' => '
								<p>{{hi}} {{firstname}},</p>
								<p>{{amount}} {{just_loaded}}</p>
							',
							'fields' => [
								'firstname' => $patient->firstname,
								'amount' => Helper::formatMoney($pr->amount, $moneyArgs),
								'hi' => LocalizedString::getString('label.hi', 'Hi', $patient->lang),
								'just_loaded' => LocalizedString::getString('notification.message-card-deposit', 'has just been loaded onto your RealTime-PAY Card and is available immediately.', $patient->lang)
								],
							]);
						}

						$ob->message = Helper::formatMoney($pr->amount, $moneyArgs) . ' mes ' . ($card->name ? $card->name : $pr->bank_account_id);

					}
					catch (Exception $e) {
						$ob->errors = [
						'message' => LocalizedString::getString('error.loading-funds-bank-account', 'There was a problem loading funds to the subject\'s card') . ': ' . $e->getMessage()
						];
						return $res->json($ob);
					}
				} else {
					$ob->errors = ['message' => 'Hyperwallet is not enabled.'];
					return $res->json($ob);
				}
			}
		}
	}

	$ob->status = 0;

	return $res->json($ob);
});

$app->post('/patients/requests/deny', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$pr = PatientRequest::factory()->first($req->post['request_id']);
	$patient = Account::factory()
		->table('patient join account on account.id = patient.id')
		->where('account.id = ?', $pr->patient_id)
		->first();

	if (!$patient) {
		return $res->json($ob);
	}

	if ($pr && !$pr->date_denied) {
		$pr->status = PatientRequest::STATUS_DENIED;
		$pr->date_denied = new DateTime;
		$pr->only('status', 'date_denied')->save();
		$ob->message = LocalizedString::getString('message.reimbursement-declined', 'This reimbursement request has been declined.', $patient->lang);
		$moneyArgs = [
			'symbol' => $pr->_symbol,
		];
		if ($patient->email_verified) {
			$patient->sendEmail([
				'subject' => LocalizedString::getString('message.notification.subject-card-reimbursement-decline', 'TRealTime-PAY Card Reimbursement Declined', $patient->lang),
				'html' => '
					<p>{{hi}} {{firstname}},</p>
					<p>{{card_decline}} {{amount}} {{has_been_declined}}</p>
				',
				'fields' => [
					'firstname' => $patient->firstname,
					'amount' => Helper::formatMoney($pr->amount, $moneyArgs),
					'hi' => LocalizedString::getString('label.hi', 'Hi', $patient->lang),
					'card_decline' => LocalizedString::getString('email.card-decline', 'Unfortunately a recent reimbursement request for', $patient->lang),
					'has_been_declined' => LocalizedString::getString('email.has-been-declined', 'has been declined.', $patient->lang),
				],
			]);
		}
	}

	$ob->status = 0;

	return $res->json($ob);
});

/**
* Get Patient Request / Reimbursement
*
* @param query  string  $page  page number  optional
* @param query  string  $limit  optional
* @param query  string  $sortField  optional
* @param query  string  $sortDir  optional
* @param query  string  $search  optional
* @param query  string  $reimbursement_status  optional
* @param query  string  $study_id  optional
* @param query  string  $site_id  optional
* @param query  string  $exclude_reimbursement_statuses optional exclude patient requests with status  format 6,5,3
*/

$app->get('/patients/requests', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$page = $req->get['page'] ?: 1;
	$limit = 15;
	$userID = intval($res->user->id);

	if ($req->get['limit']) {
		$niftyEngineModel = new NiftyEngine\Model;

		$order = 'patient_request.date_added desc ';
		if ($req->get['sortField'] && $req->get['sortDir']) {
			$order = $niftyEngineModel->escape($req->get['sortField']) . " " . $niftyEngineModel->escape($req->get['sortDir']);
		}

		$where = 'account.deleted = 0 and 
		IF(patient_request.date_approved IS NULL,
		study.visit_stipends = 1 OR
		study.manage_reimbursements = 1, 1)';

		if ($res->user->type === 'siteuser') {
			$where .= " and study_site_user_access.user_id = $userID";
			$tableClause = "study_site_user
				left join study_site_user_access on study_site_user_access.user_id = study_site_user.user_id
				left join study_site_map on study_site_map.study_id = study_site_user_access.study_id
					and study_site_map.site_id = study_site_user.site_id
				left join patient_request on patient_request.study_id = study_site_map.study_id
					and patient_request.site_id = study_site_map.site_id";
		}
		else {
			$tableClause = "patient_request";
		}


		$t = "
		$tableClause
		left join patient_visit on patient_visit.id = patient_request.patient_visit_id
		left join study_visit on study_visit.id = patient_visit.visit_id
		left join account on patient_request.patient_id = account.id
		left join account as recalled_user on patient_request.user_recalled = recalled_user.id
		left join account as voided_user on patient_request.user_voided = voided_user.id
		left join patient_request_item on patient_request.id = patient_request_item.request_id
		left join patient on patient_request.patient_id = patient.id
		left join patient_bank_account on patient_request.patient_id = patient_bank_account.patient_id
		left join patient_card on patient_request.patient_id = patient_card.patient_id and patient_card.date_voided is null
		left join study_site on patient_request.site_id = study_site.id
		left join study on patient_request.study_id = study.id";

		$records = PatientRequest::factory()
			->select("
				patient_request.*, 
				study_visit.name as visit_name,
				count(patient_request_item.id) as _num_items,
				CONCAT(recalled_user.firstname, ' ', recalled_user.lastname) as _recalled_user_name,
				CONCAT(voided_user.firstname, ' ', voided_user.lastname) as _voided_user_name,
				IF(study_site.payment_method is null, 
					0, 
					IF(study_site.payment_method = 'bank', 
						IF(patient_bank_account.id is null, 0, 1),
						IF(patient_card.id is null, 0, 1)
					)
				) as _extra__has_payment_method")
			->table($t)
			->where($where)
			->group('patient_request.id')
			->order($order);



		$numRecords = PatientRequest::factory()
			->select("count(distinct patient_request.id)")
			->table($t)
			->where($where);

		if ($req->get['search']) {
			$se = "'%" . $niftyEngineModel->escape($req->get['search']) . "%'";
			$w = " and ( CONVERT(patient_request.amount, char) LIKE $se
			or patient_request.transaction_id LIKE $se
			or study_visit.name LIKE $se
			or account.firstname LIKE $se
			or account.lastname LIKE $se
			or patient.middle LIKE $se
			or concat(LEFT(account.firstname, 1), LEFT(patient.middle, 1), LEFT(account.lastname, 1))LIKE $se
			or CONVERT(patient_request.patient_id, char) LIKE $se
			or IF(patient_request.date_approved is not null, 'APPROVED', '') LIKE $se
			or if(patient_request.date_denied is not null, 'DENIED', '') LIKE $se )";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		if (isset($req->get['reimbursement_status'])) {
			$status = $niftyEngineModel->escape($req->get['reimbursement_status']);
			$w = " and patient_request.status = {$status} ";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		if (isset($req->get['study_id']) && $req->get['study_id'] != '') {
			$study_id = $niftyEngineModel->escape($req->get['study_id']);
			$w = " and patient_request.study_id = {$study_id} ";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		if (isset($req->get['site_id']) && $req->get['site_id'] != '') {
			$site_id = $niftyEngineModel->escape($req->get['site_id']);
			$w = " and patient_request.site_id = {$site_id} ";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		if (isset($req->get['exclude_reimbursement_statuses']) && $req->get['exclude_reimbursement_statuses'] != '') {
			$exclude_statuses = $niftyEngineModel->escape($req->get['exclude_reimbursement_statuses']);
			$w = " and patient_request.status NOT IN ({$exclude_statuses}) ";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		$numRecords = $numRecords->scalar();
		$numPages = ceil($numRecords / $req->get['limit']);

		$records = $records->limit(($page - 1) * $limit, $limit)
		->plain()
		->findLoaded();

		$ob->records = $records;
		$ob->numPages = $numPages;
	}
	else {
	 $ob->records = PatientRequest::factory()
		->select('patient_request.*')
		->table('patient_request join account on account.id = patient_request.patient_id')
		->where('account.deleted = 0 and patient_request.status >= ?', PatientRequest::STATUS_PENDING)
		->order('patient_request.date_added desc')
		->plain()
		->findLoaded();
	}

	foreach ($ob->records as $record) {
		$record->patient = Account::factory()
			->table('account a join patient p on a.id = p.id')
			->select('a.id, a.firstname, p.middle, a.lastname, p.selected_study_id')
			->plain()
			->where('a.id = ?', $record->patient_id)
			->first();
	}

	return $res->json($ob);
});



// Patient Travel Request Data API.
$app->get('/patients/travelrequests', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$niftyEngineModel = new NiftyEngine\Model;
	$page = $niftyEngineModel->escape($req->get['page']) ?: 1;
	$limit = 15;
	$userID = intval($res->user->id);

	if ($req->get['limit']) {
		$order = 'patient_travel_request.date_added desc ';
		if ($req->get['sortField'] && $req->get['sortDir']) {
			$order = $niftyEngineModel->escape($req->get['sortField']) . " " . $niftyEngineModel->escape($req->get['sortDir']);
		}

		$where = 'account.deleted = 0';

		if ($res->user->type === 'siteuser') {
			$where .= " and study_site_user_access.user_id = $userID";
			$tableClause = "(
				SELECT MAX(id) AS max_id, visit_id
				FROM patient_travel_request
				WHERE deleted = 0
				GROUP BY visit_id
			) AS latest
			JOIN patient_travel_request AS patient_travel_request ON latest.max_id = patient_travel_request.id
			LEFT JOIN study_site_user AS study_site_user ON study_site_user.site_id = patient_travel_request.site_id
			LEFT JOIN study_site_user_access AS study_site_user_access ON study_site_user_access.user_id = study_site_user.user_id
			LEFT JOIN study_site_map AS study_site_map ON study_site_map.study_id = study_site_user_access.study_id AND study_site_map.site_id = study_site_user.site_id";
		}
		else {
			$tableClause = "(
				SELECT MAX(id) AS max_id, visit_id
				FROM patient_travel_request
				WHERE deleted = 0
				GROUP BY visit_id
			) AS latest
			JOIN patient_travel_request AS patient_travel_request ON latest.max_id = patient_travel_request.id";
			$where .= ' and patient_travel_request.deleted = 0';
		}


		$t = "
		$tableClause
		left join patient_visit on patient_visit.id = patient_travel_request.visit_id
		left join study_visit on study_visit.id = patient_travel_request.visit_id
		left join account on patient_travel_request.patient_id = account.id
		left join patient on patient_travel_request.patient_id = patient.id
		left join patient_bank_account on patient_travel_request.patient_id = patient_bank_account.patient_id
		left join study_site on patient_travel_request.site_id = study_site.id
		left join travel_request_type on patient_travel_request.id = travel_request_type.travel_request_id and travel_request_type.selected = 1
		left join study on patient_travel_request.study_id = study.id
		left join sponsor on study.sponsor_id = sponsor.id";


		$records = PatientRequest::factory()
			->select("
				patient_travel_request.*,
				study.protocol,
				sponsor.name,
				study_site.name as site_name,
				GROUP_CONCAT(
				distinct travel_request_type.label ORDER BY travel_request_type.label SEPARATOR ', ') as request_types,
				GROUP_CONCAT(distinct travel_request_type.departure_date ORDER BY travel_request_type.label SEPARATOR ', ') as travel_departure,
				GROUP_CONCAT(distinct travel_request_type.return_date ORDER BY travel_request_type.label SEPARATOR ', ') as travel_return,
				study_visit.name as visit_name")
			->table($t)
			->where($where)
			->group('patient_travel_request.id')
			->order($order);



		$numRecords = PatientRequest::factory()
			->select("count(distinct patient_travel_request.id)")
			->table($t)
			->where($where);

		if ($req->get['search']) {
			$se = "'%" . $niftyEngineModel->escape($req->get['search']) . "%'";
			$w = " and ( CONVERT(patient_travel_request.id, char) LIKE $se
			or study_site.name LIKE $se
			or study_visit.name LIKE $se
			or study.protocol LIKE $se
			or sponsor.name LIKE $se
			or concat(LEFT(account.firstname, 1), LEFT(patient.middle, 1), LEFT(account.lastname, 1))LIKE $se
			or CONVERT(patient_travel_request.patient_id, char) LIKE $se
			or IF(patient_travel_request.date_approved is not null, 'APPROVED', '') LIKE $se
			or if(patient_travel_request.date_denied is not null, 'DENIED', '') LIKE $se )";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		if (isset($req->get['reimbursement_status'])) {
			$status = $niftyEngineModel->escape($req->get['reimbursement_status']);
			$w = " and patient_travel_request.status = {$status} ";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		if (isset($req->get['study_id']) && $req->get['study_id'] != '') {
			$study_id = $niftyEngineModel->escape($req->get['study_id']);
			$w = " and patient_travel_request.study_id = {$study_id} ";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		if (isset($req->get['site_id']) && $req->get['site_id'] != '') {
			$site_id = $niftyEngineModel->escape($req->get['site_id']);
			$w = " and patient_travel_request.site_id = {$site_id} ";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		if (isset($req->get['exclude_reimbursement_statuses']) &&$req->get['exclude_reimbursement_statuses'] != '') {
			$exclude_statuses = $niftyEngineModel->escape($req->get['exclude_reimbursement_statuses']);
			$w = " and patient_travel_request.status NOT IN ({$exclude_statuses}) ";

			$records->appendToWhere($w);
			$numRecords->appendToWhere($w);
		}

		$numRecords = $numRecords->scalar();
		$numPages = ceil($numRecords / $niftyEngineModel->escape($req->get['limit']));

		$records = $records->limit(($page - 1) * $limit, $limit)
		->plain()
		->findLoaded();

		$ob->records = $records;
		$ob->numPages = $numPages;
	}
	else {
	 $ob->records = PatientRequest::factory()
		->select('patient_request.*')
		->table('patient_request join account on account.id = patient_request.patient_id')
		->where('account.deleted = 0 and patient_travel_request.status >= ?', PatientRequest::STATUS_PENDING)
		->order('patient_request.date_added desc')
		->plain()
		->findLoaded();
	}

	foreach ($ob->records as $record) {
		$record->patient = Account::factory()
			->table('account a join patient p on a.id = p.id')
			->select('a.id, a.firstname, p.middle, a.lastname, p.selected_study_id')
			->plain()
			->where('a.id = ?', $record->patient_id)
			->first();
	}
	return $res->json($ob);
});

$app->post('/patients/travelrequests/accept', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$niftyEngineModel = new NiftyEngine\Model;
	$pr = PatientTravelRequest::factory()->first($niftyEngineModel->escape($req->post['request_id']));
	$patient = Account::factory()
		->table('patient join account on account.id = patient.id')
		->where('account.id = ?', $pr->patient_id)
		->first();

	if (!$patient) {
		return $res->json($ob);
	}

	if ($pr) {
		$pr->status = 2;
		$pr->date_approved = new DateTime;
		$pr->save();
		$ob->message = LocalizedString::getString('message.Travel-approved', 'This Travel request has been approved.', $patient->lang);
	}
	$ob->status = 0;
	return $res->json($ob);
});

$app->post('/patients/travelrequests/deny', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$niftyEngineModel = new NiftyEngine\Model;
	$pr = PatientTravelRequest::factory()->first($niftyEngineModel->escape($req->post['request_id']));
	$patient = Account::factory()
		->table('patient join account on account.id = patient.id')
		->where('account.id = ?', $pr->patient_id)
		->first();

	if (!$patient) {
		return $res->json($ob);
	}

	if ($pr) {
		$pr->status = 3;
		$pr->date_denied = new DateTime;
		$pr->save();
		$ob->message = LocalizedString::getString('message.travel-declined', 'This Travel request has been deny.', $patient->lang);
	}
	$ob->status = 0;
	return $res->json($ob);
});


$app->post('/patients/travelrequests/cancel', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$niftyEngineModel = new NiftyEngine\Model;
	$pr = PatientTravelRequest::factory()->first($niftyEngineModel->escape($req->post['request_id']));
	$patient = Account::factory()
		->table('patient join account on account.id = patient.id')
		->where('account.id = ?', $pr->patient_id)
		->first();

	if (!$patient) {
		$ob->message = LocalizedString::getString('message.patient-id-is-required', 'Patient id is required.', $patient->lang);
		return $res->json($ob);
	}

	if ($pr) {
		$pr->status = 4;
		$pr->date_cancel = new DateTime;
		$pr->save();
		$ob->message = LocalizedString::getString('message.travel-cancelled', 'This Travel request has been cancelled.', $patient->lang);
	}
	$ob->status = 0;
	return $res->json($ob);
});




$app->post('/patients/requests/upload', $client_filter, function($req, $res) {
  $file = (object)$_FILES['file'];
  $name = $file->name;
  $ob = new StdClass;
  $ob->status = 2; 

  $hash = hash('sha1', $file->name . uniqid() . rand());
  $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
  $dir = PatientRequestItemFile::getDirectory();

  if ($file->error) {
		$ob->error = Helper::getFileUploadError($file->error);
	}
  else if ($file->size > PatientRequestItemFile::MAX_UPLOAD_SIZE * pow(1024, 2)) {
		$ob->error = LocalizedString::getString('error.file-exceeds', 'The uploaded file exceeds the maximum permitted file size of 10MB.');
	}
  else if (move_uploaded_file($file->tmp_name, $dir . $hash)) {
		$dt = new DateTime('now', new DateTimeZone('UTC'));
		$thumb = '';

		$mime = Helper::getMime($dir . $hash);
		if (preg_match('#^image#', $mime)) {
			$resizer = new ImageResizer(400, 400);
			$thumb = hash('sha1', uniqid() . $file->hash);
			$resizer->crop($dir . $hash, $dir . $thumb);
		}

		$file = PatientRequestItemFile::factory();
		$file->name = $name;
		$file->size = filesize($dir . $hash);
		$file->hash = $hash;
		$file->mime = $mime;
		$file->thumbnail = $thumb;
		$file->date_added = new DateTime;
		$file->date_uploaded = new DateTime;
		$file->date_updated = new DateTime;
		$file->save();

		$ob->file = [
			'hash' => $file->hash,
			'name' => $file->name,
			'size' => $file->size,
			'mime' => $file->mime,
			'date_uploaded' => $dt->format('Y-m-d H:i:s'),
			'thumbnail' => $file->thumbnail,
		];

		$ob->status = 0;
	}
	else {
		$ob->error = LocalizedString::getString('error.saving-uploaded-file', 'Unabled to save the uploaded file. Please contact us if this problem persists.');
	}

	return $res->json($ob);
});

$app->get('/patients/requests/download/:hash', function($req, $res) {
	$ob = new StdClass;
	$file = PatientRequestItemFile::factory()
		->where('hash = ?', $req->hash)
		->first();
	if ($file) {
		return $res->viewfile($file->getPath(), $file->mime, $file->name);
	}
    else {
        $file = PatientRequestItemFile::factory()
            ->where('thumbnail = ?', $req->hash)
            ->first();
        if ($file) {
            return $res->viewfile($file->getPath(true), $file->mime, $file->name);
        }
    }

	return 'Could not find the requested resource.';
});
