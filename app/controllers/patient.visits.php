<?php

/**
* Get Patient visits
*
* @param route  number  $patient_id
* @param route  number  $studyID
* @param query  string  $site_id optional
* @param query  string  $exclude_statuses optional exclude patient requests with status but still returns study visit  format 6,5,3
*/

$app->get('/patients/visits/(?<patient_id>\d+)/:studyID', $client_filter, function($req, $res) {
	$user = $res->user;
	$ob = new StdClass;
	$patient_id = $req->patient_id;
	$patient = Patient::factory()->first($patient_id);
	$site = StudySite::factory()
		->plain()
		->table("study_site
			left join patient_study on study_site.id = patient_study.site_id")
		->where("patient_study.study_id = ? and patient_study.patient_id = ?", $req->studyID, $patient_id)
		->first();
	$cur = Currency::factory()->first($site->default_currency);
	$country = Country::getFirstWithCode($site->country);
	$fallbackCurrency = Currency::getFirstWithCode($country->default_currency);

	$exclude_statuses = [];
	if ($req->get['exclude_statuses'])  {
		$exclude_statuses = explode(",", $req->get['exclude_statuses']);
	}

	$patient_visits = PatientVisit::getStudySiteVisits($patient_id, $req->studyID, $req->get['site_id'], $exclude_statuses);
	$patient_visits = array_map(function($visit){
		$id = $visit->id;

		$visit->id = $visit->study_visit_id;
		$visit->patient_visit_id = $id;

		return $visit;
	}, $patient_visits);

	$study_visits_templates = StudyVisit::getStudySiteTemplates($req->studyID, $req->get['site_id']);
	$study_visits_templates = array_map(function($visit) use ($patient_id) {
		$visit->patient_id = $patient_id;
		$visit->date = null;
		return $visit;
	}, $study_visits_templates);

	$mergeVisits = function ($study_visits_templates, $patient_visits) {

		$_study_visits_templates = array_reduce($study_visits_templates, function($carry, $visit) {
			$carry["s{$visit->id}"] = $visit;
			return $carry;
		}, []);

		$_patient_visits = array_reduce($patient_visits, function($carry, $visit) {
			$carry["s{$visit->id}"] = $visit;
			return $carry;
		}, []);

		return array_merge($_study_visits_templates, $_patient_visits);

	};

	$records = $mergeVisits($study_visits_templates, $patient_visits);
	$records = StudyVisit::sortNatural($records);

	$num = 1;
	foreach ($records as $record) {
		$record->_num = $num;
		$num++;
		$record->_num_unresolved = PatientRequestMessage::getUnresolvedCountForRequest($record->request_id);
		$ba = PatientBankAccount::getAccount($patient->bank_account_id);
		
		if ($ba && $ba->id > 0) {
			$record->_symbol = $ba->symbol;
		}
		else if ($site->default_currency) {
			$record->_symbol = $cur->symbol;
		}
		else if($country && $country->default_currency) {
			$record->_symbol = $fallbackCurrency->symbol;
		}
		else if (!$site->default_currency && !$country && $patient->card_id > 0) {
			$record->_symbol = '$';
		}
		else {
			$record->_symbol = '$';
		}
	}

	 $ob->records = array_values($records);
	return $res->json($ob);
});
/**
* Update patients visit to complete
* and create a new patient request
*
* @param body  string  $patient_id
* @param body  string  $_study_id
* @param body  string  $visit_id
* @param body  string  $date
* @param body  string  $id optional
* @param query  [PatientRequest::STATUSES]  $exclude_statuses optional will exclude patient visit with a request's status when creating new patient visit
*/

$app->post('/patients/visits/complete', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = $res->user;
	$form = PatientVisit::factory()->load();

	$model = PatientVisit::factory()
		->select("patient_visit.*")
		->table("patient_visit left join patient_request on patient_request.patient_visit_id = patient_visit.id")
		->where('patient_visit.patient_id = ? and patient_visit.visit_id = ?', $form->patient_id, $form->visit_id);

	if ($req->get['exclude_statuses'] && count(explode(",", $req->get['exclude_statuses'])) > 0)  {
		$model->appendToWhere('and patient_request.status NOT IN (?)', $req->get['exclude_statuses']);
	}

	$patientVisit = $model->first();
	

	$patient = Patient::factory()->first($form->patient_id);
	$studyVisit = StudyVisit::factory()->first($form->visit_id);

	$record = PatientVisit::factory()->load();
	$visitDate = $form->date;

	if (!$visitDate || strtotime($visitDate) === false) {
		$ob->error = LocalizedString::getString('error.valid-visit-date', 'Please provide a valid visit date.');
	}
	else {
		if ($patientVisit) {
			$record->id = $patientVisit->id;
		}
		else {
			$record->date_added = new DateTime;
			$record->visit_id = $studyVisit->id;
			$record->patient_id = $form->patient_id;
		}

		$record->date = $visitDate;
		$record->date_completed = new DateTime;
		$record->completed_by = $user->id;
		$record->date_updated = new DateTime;
		$record->save();

		if ($record->id && !$patientVisit) {
			$pr = new PatientRequest;

			$currentStudy = PatientStudy::factory()
				->select('patient_study.study_id, patient_study.site_id')
				->where('patient_study.patient_id = ? and patient_study.study_id = ? and patient_study.site_id = ? and patient_study.deleted = 0', $form->patient_id, $req->post['_study_id'], $req->post['_site_id'])
				->first();
			$site = StudySite::factory()
				->select('study_site.default_currency')
				->first($currentStudy->site_id);

			$cur = Currency::factory()->where('id = ?', $site->default_currency)->first();

			$studyVisitOriginal = StudyVisitOriginal::factory();
			$studyVisitOriginal->visit_id   = $studyVisit->id;
			$studyVisitOriginal->name       = $studyVisit->name;
			$studyVisitOriginal->baseline   = $studyVisit->baseline;
			$studyVisitOriginal->stipend    = $studyVisit->stipend;
			$studyVisitOriginal->sort_order = $studyVisit->sort_order;
			$studyVisitOriginal->date_added = new DateTime;
			$studyVisitOriginal->save();

			$pr->original_visit = $studyVisitOriginal->id;
			$pr->currency = $cur->code;
			$pr->study_id = $currentStudy->study_id;
			$pr->site_id = $currentStudy->site_id;
			$pr->patient_visit_id = $record->id;
			$pr->patient_id = $form->patient_id;
			$pr->date_added = new DateTime;
			$pr->date_request = new DateTime;
			$pr->date_updated = new DateTime;
			$pr->status = PatientRequest::STATUS_PENDING;
			$pr->amount = $studyVisit->stipend;
			$pr->amount_usd = $studyVisit->stipend;
			$pr->save();

			$system = $req->config->system;


			Account::factory()->sendEmailNotificationFor('subject_request_approval', [
				'subject' => "{{email.visit-stipend-request-subject}}" . ' ' . $patient->id . ' - ' . $studyVisit->name,
				'html' => "
					<p>{{hi}} {{firstname}},</p>
					<p>$user->firstname $user->lastname {{email.visit-stipend-request-body-1}} {$studyVisit->name} {{email.visit-stipend-request-body-2}} " . Helper::formatMoney($pr->amount) . ". {{email.please-review}}</p>
					<p><a href='{{app_url}}' style='{{user_button_style}}'>{{email.reimbursement-request-link}}</a></p>
					<p>&nbsp;</p>
					<p><img src=\"$system->url/logo-pay-mini.png\" alt='RealTime-Pay' style='max-height: 60px' /></p>
				",
				"study_association" => $currentStudy,
			]);
		}

		$ob->record = PatientVisit::factory()->plain()->first($record->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/patients/visits/date', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = $res->user;
	$form = PatientVisit::factory()->load();

	$patientVisit = PatientVisit::factory()
		->where('id', $form->patient_visit_id)
		->first();

	$record = PatientVisit::factory()->load();
	$visitDate = $form->date;

	if (!$visitDate || strtotime($visitDate) === false) {
		$ob->error = 'Please provide a valid visit date.';
	}
	else if (!$patientVisit) {
		$ob->error = 'Please provide a valid patient_visit_id.';
	}
	else {
		$record->id = $form->patient_visit_id;
		$record->date_updated = new DateTime;
		$record->date = $visitDate;
		$record->only('date')->save();

		$ob->record = PatientVisit::factory()->plain()->first($record->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/patients/visits/pay', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = $res->user;

	$form = PatientVisit::factory()->load();

	$patientVisit = PatientVisit::factory()
		->where('id = ?', $form->patient_visit_id)
		->first();

	$studyVisit = StudyVisit::factory()->first($patientVisit->visit_id);

	$pr = PatientRequest::factory()
			->where('patient_visit_id = ?', $patientVisit->id)
			->first();

	$paymentMethod = StudySite::factory()
			->select('payment_method')
			->where('id = ?', $pr->site_id)
			->scalar();

	$patient = Account::factory()
		->table('patient join account on account.id = patient.id')
		->where('account.id = ?', $pr->patient_id)
		->first();

	$patientcountry = strtoupper($patient->country);
	$feature_flag = Sys::getFeatureFlag();
	if($feature_flag == 1 && $paymentMethod === 'bank') {
		$country_processor = Country::factory()
		->select('country.processor')
		->where('code = ?', $patientcountry)
		->plain()
		->first();
		if (!$patient->zipcode && $country_processor->processor == 2) {
			$ob->error = LocalizedString::getString('error.postal-code', 'Please fill in the subject Postal Code.');
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
	if ($patientVisit) {
		$card = PatientCard::factory()->where('id = ?', $patient->card_id)->first();
	}

	if (!$patientVisit) {
		$ob->error = LocalizedString::getString('error.issue-retrieving-visit', 'There was an issue retrieving the visit to pay.');
	} else if ($paymentMethod === 'bank' && !$patient->bank_account_id) {
		$ob->error = LocalizedString::getString('error.missing-active-bank-account', 'This subject no longer has a connected bank account.');
	} else if ($paymentMethod === 'card' && !$card) {
		$ob->error = LocalizedString::getString('error.missing-active-stipend-card', 'This subject no longer has an active stipend card.');
	} 
	
	if ($paymentMethod === 'card' && $card) {
		$patientVisit->date_updated = new DateTime;
		$patientVisit->save();
		
		$_country = Country::factory()
		->select('country.name, country.active, country.default_currency,country.processor')
		->table('
			study_site
				join country on study_site.country = country.code')
		->where('study_site.id = ?', $pr->site_id)
		->plain()
		->first();

		if (!$_country->name) {
			$ob->error = LocalizedString::getString('error.add-country', 'Please add a country.');
			return $res->json($ob);
		} else if ($_country->name && $_country->active == 0) {
			$ob->error = LocalizedString::getString('error.activate-country', 'Please activate this country') . ": {$_country->name}.";
			return $res->json($ob);
		} else if ($_country->name && !$_country->default_currency) {
			$ob->error = LocalizedString::getString('error.set-currency-country', 'Please set the currency for this country') . ": {$_country->name}.";
			return $res->json($ob);
		}
		
		$pr = PatientRequest::factory()->where('1');

		if (isset($req->post['_request_id'])) {
			$pr->appendToWhere(' and id = ?', $req->post['_request_id']);
		} else {
			$patientVisit->date_updated = new DateTime;
			$patientVisit->save();
			$pr->appendToWhere(' and patient_visit_id = ?', $patientVisit->id);
		}

		$pr = $pr->first();

		if ($pr && ($pr->status < PatientRequest::STATUS_APPROVED || (isset($req->post['_repay']) && $req->post['_repay'])))  {

			if ($req->config->hyperwallet_enabled) {
				$config = $req->config;
				require_once 'app/helpers/HyperWallet.php';

				try {
					$hw = new HyperWalletV3();
				}
				catch(Exception $e) {
					$ob->error = 'There was a problem authenticating with HyperWallet.';
					return $res->json($ob);
				}

				$transactionID = date('Ymd-') . Helper::genCode(4);
				$payFields = [
					'clientPaymentId' => $transactionID,
					'amount' => number_format($pr->amount, 2),
					'currency' => 'USD',
					'purpose' => 'OTHER',
					'destinationToken' => $card->token,
					'programToken' => $config->hyperwallet_programToken,
				];

				try {
					$payment = $hw->post('/payments', $payFields);
					$pr->payment_token = $payment->token;
					$pr->only('payment_token')->save();

					$pr->status = PatientRequest::STATUS_APPROVED;
					if (!$pr->date_approved || $pr->date_approved === '0000-00-00 00:00:00') {
						$pr->date_approved = new DateTime;
					}
			
					if (!$pr->user_approved) {
						$pr->user_approved = $res->user->id;
					}

					$pr->card_id = $patient->card_id;
					$pr->transaction_id = $transactionID;
					
					$card->balance += $pr->amount;
					$card->date_updated = new DateTime;
					$card->save();

					if(!$pr->original_visit) {
						$studyVisitOriginal = StudyVisitOriginal::factory();
						$studyVisitOriginal->visit_id   = $studyVisit->id;
						$studyVisitOriginal->name       = $studyVisit->name;
						$studyVisitOriginal->baseline   = $studyVisit->baseline;
						$studyVisitOriginal->stipend    = $studyVisit->stipend;
						$studyVisitOriginal->sort_order = $studyVisit->sort_order;
						$studyVisitOriginal->date_added = new DateTime;
						$studyVisitOriginal->save();
			
						$pr->original_visit = $studyVisitOriginal->id;
					}
					
					$pr->save();

					$wallet->balance -= $pr->amount;
					$wallet->only('balance')->save();
					$wallet->handleBalanceChange();

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
								'just_loaded' => LocalizedString::getString('notification.message-card-deposit', 'has just been loaded onto your RealTime-PAY Card and is available immediately.', $patient->lang),
							],
						]);
					}
				}
				catch (Exception $e) {
					$ob->error = LocalizedString::getString('error.error-encountered', 'An error was encountered') . ': ' . $e->getMessage();
					return $res->json($ob);
				}
			} else {
				$ob->error = 'Hyperwallet is not enabled.';
				return $res->json($ob);
			}

		}

		$ob->status = 0;
	} else if ($paymentMethod === 'bank' && $patient->bank_account_id && $pr && $pr->status < PatientRequest::STATUS_APPROVED) {
		// $var_dump('has bank');
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

		$ba = PatientBankAccount::factory()->where('id = ?', $patient->bank_account_id)->first();
		if (!$ba) {
			$ob->error = 'This subject no longer has a connected bank account.';
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
				$ob->error = 'There was a problem loading funds to the subject\'s bank account: ' . $e->getMessage();
				return $res->json($ob);
			}
		} 
		else {
			if ($req->config->hyperwallet_enabled) {
				$config = $req->config;
				try {
					$hw = new HyperWalletV3();
				}
				catch(Exception $e) {
					$ob->error = 'There was a problem authenticating with HyperWallet.';
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
					$ob->error = 'There was a problem loading funds to the subject\'s bank account: ' . $e->getMessage();
					return $res->json($ob);
				}
			}
		}
		$studyVisitOriginal = StudyVisitOriginal::factory();
		$studyVisitOriginal->visit_id   = $studyVisit->id;
		$studyVisitOriginal->name       = $studyVisit->name;
		$studyVisitOriginal->baseline   = $studyVisit->baseline;
		$studyVisitOriginal->stipend    = $studyVisit->stipend;
		$studyVisitOriginal->sort_order = $studyVisit->sort_order;
		$studyVisitOriginal->date_added = new DateTime;
		$studyVisitOriginal->save();

		$pr->original_visit = $studyVisitOriginal->id;

		$pr->bank_account_id = $ba->id;
		$pr->status = PatientRequest::STATUS_APPROVED;
		if (!$pr->date_approved || $pr->date_approved === '0000-00-00 00:00:00') {
			$pr->date_approved = new DateTime;
		}

		if (!$pr->user_approved) {
				$pr->user_approved = $res->user->id;
		}
		$pr->currency = $ba->currency;
		if ($pr->currency == NULL) {
			$pr->currency = $getCurrency[0]->currency;
		}
		$pr->payment_token = $payment->token ? $payment->token : $payment->payment->identifier;
		
		if($feature_flag == 1){
			$pr->processor = $country_processor->processor;
		}

		$pr->only(
			'original_visit',
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
				'subject' => 'RealTime-PAY Bank Deposit Notification',
				'html' => '
					<p>Hi {{firstname}},</p>
					<p>{{amount}} has just been loaded to your bank account. These funds will arrive in your account in 2-4 business days.</p>
				',
				'fields' => [
					'firstname' => $patient->firstname,
					'amount' => Helper::formatMoney($pr->amount, $moneyArgs),
				],
			]);
		}

		$ob->message = Helper::formatMoney($pr->amount, $moneyArgs) . ' has been successfully loaded to ' . $ba->bank_name;
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/patients/visits/pay/reverse', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = $res->user;

	$form = PatientVisit::factory()->load();

	$patientVisit = PatientVisit::factory()
		->where('id = ?', $form->patient_visit_id)
		->first();

	if (!$patientVisit) {
		$ob->error = 'There was an issue retrieving the visit to pay.';
	}
	else {
		$patientVisit->date_updated = new DateTime;
		$patientVisit->date_completed = null;
		$patientVisit->completed_by = 0;
		$patientVisit->date = null;
		$patientVisit->save();

		$pr = PatientRequest::factory()
			->where('patient_visit_id = ?', $patientVisit->id)
			->first();

		if ($pr) {
			$pr->delete();
		}

		$ob->status = 0;
	}

	return $res->json($ob);
});
