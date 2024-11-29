<?php

$app->get('/patients/card-balance', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$studyID = intval($req->get['study_id']);
	$paymentMethod = PatientStudy::factory()
		->select('study_site.payment_method')
		->table('patient_study
			join study_site on patient_study.site_id = study_site.id
				and patient_study.deleted = 0')
		->where('patient_study.deleted = 0 and patient_study.study_id = ?
			and patient_study.patient_id = ?', $req->get['study_id'], $req->get['id'])
		->scalar();

	$pat = Patient::factory()
		->select('a.*, p.*')
		->table('account a join patient p on p.id = a.id')
		->where('a.id = ?', $req->get['id'])
		->order('date_updated desc')
		->first();

	if ($paymentMethod === 'bank') {
		$ob->balance = 0;
		$ob->status = 0;
		$ob->type = 'bank_account';
	}
	else if ($paymentMethod === 'card') {
		$ob->type = 'card';
		$card = PatientCard::factory()->first($pat->card_id);

		if ($card) {
			$bal = $card->getActualBalance($pat->user_token_card, $card->token);
			$card->balance = $bal;
			$card->date_balance = new DateTime;
			$card->only('balance', 'date_balance')->save();
			$ob->balance = $bal;
		} else {
			$ob->balance = 0;
		}
		
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/patients/cards/assign', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$domain = Sys::factory()
		->select('domain')
		->first();
	$host = explode('.',$domain->domain);
	$hostName = $host[0];
	$user = $res->user;
	$config = $req->config;
	$ob->status = 2;
	$errors = [];

	$controlNum = trim($req->post['control_number']);
	$patient = Patient::factory()
		->table('account a join patient p on p.id = a.id')
		->events(false)
		->where('a.id = ?', $req->post['patient_id'])
		->first();

	$otherExisting = PatientCard::factory()
		->where('control_number = ?', $controlNum)
		->first();

	if (!$patient->dob)
		$errors['control_number'] = LocalizedString::getString('error.dob-card-assignment', 'The subject\'s date of birth must be provided before a card can be assigned.'); 
	else if ($patient && $patient->card->id)
		$errors['control_number'] = LocalizedString::getString('error.card-already-assigned', 'This subject already has a card assigned. Please replace the current card if necessary.');
	else if (!$controlNum)
		$errors['control_number'] = LocalizedString::getString('error.missing-control-number', 'Please enter a control number.');
	else if (!preg_match('#\d{2,6}-\d{4,}#', $controlNum))
		$errors['control_number'] = LocalizedString::getString('error.invalid-control-number-format', 'The entered control number is not in the expected format: #####-######');
	else if ($otherExisting && $patient->id != $otherExisting->patient_id)
		$errors['control_number'] = LocalizedString::getString('error.subject-already-assigned-card', 'Another subject has already been assigned this card.');
	else if ($otherExisting && $patient->id == $otherExisting->patient_id && $otherExisting->date_voided)
		$errors['control_number'] = LocalizedString::getString('error.card-previously-assigned', 'This card was previously assigned to this subject but it was voided.');

	
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$card = new PatientCard;

		if ($req->config->hyperwallet_enabled) {
			require_once 'app/helpers/HyperWallet.php';
			$config = $req->config;

			$savedCard = HyperWalletHelper::fetchCard($controlNum);

			if ($savedCard->errors) {
				$ob->errors['control_number'] = $savedCard->errors;
				return $res->json($ob);
			}
			else if ($newCard->data->status == 'ACTIVATED') {
				$ob->errors['control_number'] = 'This card is already in use. Please try a different card.';
				return $res->json($ob);
			}
			else {
				$patient->user_token_card = $savedCard->data->userToken;
				$patient->only('user_token_card')->save();
			}

			$hWUser = HyperWalletHelper::updateUser($patient, $config, $hostName);

			if ($hWUser->errors) {
				$ob->errors['control_number'] = $hWUser->errors;
				return $res->json($ob);
			}
			else {
				$card->name = $savedCard->data->cardNumber;
				$card->token = $savedCard->data->token;
			}

			mail('test@redaxle.com', 'HyperWallet Request /instantIssueCards', print_r($hWuser->data, true));
		}
		else {
			$card->name = '**' . rand(20, 99) . ' - ' . rand(1001, 9000);
		}

		$ob->errors = $errors;

		if ($errors) {
			return $res->json($ob);
		}
		$card->patient_id = $patient->id;
		$card->user_id = $res->user->id;
		$card->control_number = $controlNum;
		$card->date_added = new DateTime;
		$card->date_updated = new DateTime;
		$card->save();
		if ($patient->country == 'US') {
			$wallet = Wallet::factory()->getForProgram('ius');
		}
		else {
			$wallet = Wallet::factory()->getForProgram('ous');
		}
		$wallet->remaining--;
		$wallet->issued++;
		$wallet->only('issued', 'remaining')->save();
		$wallet->handleCardAssigned();

		$patient->card_id = $card->id;
		$patient->only('card_id')->save();

		$ob->record = PatientCard::factory()->plain()->first($card->id);
		$ob->status = 0;

		$currentStudy = PatientStudy::factory()
			->select('patient_study.site_id, patient_study.study_id, study_site.name as _study_site_name, study.title as _study_title')
			->table('patient_study
				left join study_site on patient_study.site_id = study_site.id
				left join study on patient_study.study_id = study.id')
			->where('patient_study.patient_id = ?
				and patient_study.study_id = ?
				and patient_study.deleted = 0', $patient->id, $patient->selected_study_id)
			->first();

		$assignedOn = new DateTime('now', new DateTimeZone($config->timezone));
		$studyName = $currentStudy->_study_title;
		$protocol = Study::factory()
			->select('protocol')
			->where('id = ?', $currentStudy->study_id)
			->scalar();

		$system = $config->system;

		Account::factory()->sendEmailNotificationFor('patient_card_assigned', [
			'subject' => "{{email.card-assignment.subject}}" . " $protocol",
			'html' => "
				<p>{{hi}} {{firstname}}, {{email.card-assignment.title}}.</p>
				<p>&nbsp;</p>
				<p>{{title.site}}: $currentStudy->_study_site_name</p>
				<p>MRN: $patient->id</p>
				<p>{{email.card-assignment.site-user}}: $user->firstname $user->lastname</p>
				<p>{{email.card-assignment.assigned-on}}: " . $assignedOn->format('M d, Y') . "</p>
				<p><img src=\"$system->url/logo-pay-mini.png\" alt='RealTime-Pay' /></p>
			",
			'new_card' => 1,
			'study_association' => $currentStudy
		]);

	}
	return $res->json($ob);
});

$app->post('/patients/cards/assign/manual', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$niftyEngineModel = new NiftyEngine\Model;
	$user = $res->user;
	$config = $req->config;
	$ob->status = 2;
	$errors = [];

	if (!$req->post['id']) {
		$errors['id'] = LocalizedString::getString('error.missing-mrn', 'Please enter an MRN.');
		$ob->errors = $errors;
		return $res->json($ob);
	}

	$controlNum = trim($req->post['control_number']);
	$patient = Patient::factory()
		->table('account a join patient p on p.id = a.id')
		->events(false)
		->where('a.id = ?', $req->post['id'])
		->first();

	$prevCard = PatientCard::factory()->where('date_void is null')->first($patient->card_id);

	if (!$controlNum)
		$errors['control_number'] = LocalizedString::getString('error.missing-control-number', 'Please enter a control number.');
	else if (!$patient)
		$errors['id'] = LocalizedString::getString('error.associated-patient', 'An associated patient could not be found.');
	else if (!preg_match('#\d{2,6}-\d{4,}#', $controlNum))
		$errors['control_number'] = LocalizedString::getString('error.invalid-control-number-format', 'The entered control number is not in the expected format: #####-######');
	else if ($prevCard && $patient->id != $prevCard->patient_id)
		$errors['control_number'] = LocalizedString::getString('error.subject-already-assigned-card', 'Another subject has already been assigned this card.');
	if (!$req->post['lastFour'])
		$errors['lastFour'] = LocalizedString::getString('error.last-four-missing', 'Please enter the last 4 digits of the card.');
	if (!$req->post['token'])
		$errors['token'] = LocalizedString::getString('error.card-token-missing', 'Please enter the card token.');
	if (!$req->post['user_token_card'])
		$errors['user_token_card'] = LocalizedString::getString('error.user-token-missing', 'Please enter the user token.');

	
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if ($prevCard) {
			$prevCard->date_updated = new DateTime;
			$prevCard->date_voided = new DateTime;
			$prevCard->void_reason = 'Automatically voided during manual replacement.';
			$prevCard->void_user_id = $user->id;
			$prevCard->save();
		}

		$card = new PatientCard;
		$card->name = '****'  . $req->post['lastFour'];
		$card->patient_id = $patient->id;
		$card->user_id = $res->user->id;
		$card->token = $req->post['token'];
		$card->control_number = $controlNum;
		$card->date_added = new DateTime;
		$card->date_updated = new DateTime;
		$card->save();

		if ($patient->country == 'US') {
			$wallet = Wallet::factory()->getForProgram('ius');
		}
		else {
			$wallet = Wallet::factory()->getForProgram('ous');
		}
		$wallet->remaining--;
		$wallet->issued++;
		$wallet->only('issued', 'remaining')->save();
		$wallet->handleCardAssigned();

		$patient->card_id = $card->id;
		$patient->user_token_card = $req->post['user_token_card'];
		$patient->date_card_assigned = new DateTime;
		$patient->only('card_id', 'user_token_card', 'date_card_assigned')->save();

		$ob->record = PatientCard::factory()->plain()->first($card->id);
		$ob->status = 0;

		$currentStudy = PatientStudy::factory()
			->select('patient_study.site_id, patient_study.study_id, study_site.name as _study_site_name, study.title as _study_title')
			->table('patient_study
				left join study_site on patient_study.site_id = study_site.id
				left join study on patient_study.study_id = study.id')
			->where('patient_study.patient_id = ?
				and patient_study.study_id = ?
				and patient_study.deleted = 0', $patient->id, $patient->selected_study_id)
			->first();

		$assignedOn = new DateTime('now', new DateTimeZone($config->timezone));
		$studyName = $currentStudy->_study_title;
		$protocol = Study::factory()
			->select('protocol')
			->where('id = ?', $currentStudy->study_id)
			->scalar();

		$system = $config->system;
	}
	return $res->json($ob);
});

$app->post('/patients/cards/replace', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->status = 2;
	$errors = [];

	$controlNum = trim($req->post['control_number']);
	$patient = Patient::factory()
		->table('account a join patient p on p.id = a.id')
		->events(true)
		->where('a.id = ?', $req->post['patient_id'])
		->first();

	$otherExisting = PatientCard::factory()
		->where('control_number = ?', $controlNum)
		->first();

	if (!$patient)
		$errors['control_number'] = LocalizedString::getString('error.problem-finding-patient', 'There was a problem finding this patient in the system.');
	else if ($patient && !$patient->card_id)
		$errors['control_number'] = LocalizedString::getString('error.card-not-assigned', 'This subject was not previously assigned a card. Please assign on instead of performing a replacement.');
	else if (!$controlNum)
		$errors['control_number'] = LocalizedString::getString('error.missing-control-number', 'Please enter a control number.');
	else if (!preg_match('#\d{2,6}-\d{4,}#', $controlNum))
		$errors['control_number'] = LocalizedString::getString('error.invalid-control-number-format', 'The entered control number is not in the expected format: #####-######');
	else if ($otherExisting && $patient->id != $otherExisting->patient_id)
		$errors['control_number'] = LocalizedString::getString('error.subject-already-assigned-card', 'Another subject has already been assigned this card.');
	else if ($otherExisting && $patient->id == $otherExisting->patient_id && $otherExisting->date_voided)
		$errors['control_number'] = LocalizedString::getString('error.card-previously-assigned', 'This card was previously assigned to this subject but it was voided.');
	else if ($patient->card && $patient->card->control_number == $controlNum)
		$errors['control_number'] = LocalizedString::getString('error.duplicate-control-number', 'The replacement control number is the same as the control number of the card it is replacing.');
	
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$prevCard = PatientCard::factory()->first($patient->card_id);
		$prevCard->date_updated = new DateTime;
		$prevCard->date_voided = new DateTime;
		$prevCard->void_reason = 'Automatically voided during replacement.';
		$prevCard->void_user_id = $res->user->id;

		$card = new PatientCard;
		$card->name = '**' . rand(20, 99) . ' - ' . rand(1001, 9000);
		$card->patient_id = $patient->id;
		$card->user_id = $res->user->id;
		$card->old_control_number = $patient->card->control_number;
		$card->control_number = $controlNum;
		$card->date_added = new DateTime;
		$card->date_updated = new DateTime;

		if ($req->config->hyperwallet_enabled) {
			$config = $req->config;
			require_once 'app/helpers/HyperWallet.php';

			$newCard = HyperWalletHelper::fetchCard($controlNum);

			if ($newCard->errors) {
				$ob->errors['control_number'] = $newCard->errors;
				return $res->json($ob);
			}
			else if ($newCard->data->status == 'ACTIVATED') {
				$ob->errors['control_number'] = 'This card is already in use. Please try a different card.';
				return $res->json($ob);
			}

			$hwCard = HyperWalletHelper::updateCard($newCard->data->token, $patient->user_token_card);

			if ($hwCard->errors) {
				$ob->errors['control_number'] = $hwCard->errors;
				return $res->json($ob);
			}
			else {
				$card->name = $hwCard->data->cardNumber;
				$card->token = $hwCard->data->token;
				$patient->user_token_card = $hwCard->data->userToken;
				$patient->only('user_token_card')->save();
			}
		}

		$prevCard->save();
		$card->save();

		$wallet = Wallet::factory()->getForProgram('ius');
		$wallet->remaining--;
		$wallet->issued++;
		$wallet->only('issued', 'remaining')->save();
		$wallet->handleCardAssigned();

		$patient->card_id = $card->id;
		$patient->only('card_id')->save();

		$ob->record = PatientCard::factory()->plain()->first($card->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/patients/cards/load', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$request = PatientRequest::factory()->load();
	$amount = preg_replace('#[^\d.]#', '', $request->amount);
	$errors = [];
	if (!$amount || $amount < 10) {
		$errors['amount'] = LocalizedString::getString('error.min-amount', 'Please enter an amount greater than').'$10';
	}

	if (!$request->note) {
		$errors['note'] = LocalizedString::getString('error.reason-manual-load', 'Please indicate the reason for this manual load.');
	}

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/patients/cards/fund', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->status = 2;
	$errors = [];

	$controlNum = trim($req->post['control_number']);
	$patient = Patient::factory()->first($req->post['patient_id']);

	$otherExisting = PatientCard::factory()
		->where('control_number = ?', $controlNum)
		->first();

	if ($patient && !$patient->card->id)
		$errors['control_number'] = LocalizedString::getString('error.card-not-assigned', 'This subject was not previously assigned a card. Please assign on instead of performing a replacement.');
	else if (!$controlNum)
		$errors['control_number'] = LocalizedString::getString('error.missing-control-number', 'Please enter a control number.');
	else if (!preg_match('#\d{2,6}-\d{4,}#', $controlNum))
		$errors['control_number'] = LocalizedString::getString('error.invalid-control-number-format', 'The entered control number is not in the expected format: #####-######');
	else if ($otherExisting && $patient->id != $otherExisting->patient_id)
		$errors['control_number'] = LocalizedString::getString('error.subject-already-assigned-card', 'Another subject has already been assigned this card.');
	else if ($otherExisting && $patient->id == $otherExisting->patient_id && $otherExisting->date_voided)
		$errors['control_number'] = LocalizedString::getString('error.card-previously-assigned', 'This card was previously assigned to this subject but it was voided.');
	
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		// void the current card
		$prevCard = PatientCard::factory()->first($patient->card->id);
		$prevCard->date_updated = new DateTime;
		$prevCard->date_voided = new DateTime;
		$prevCard->void_reason = 'Automatically voided during replacement.';
		$prevCard->void_user_id = $res->user->id;
		$prevCard->void_site_id = $patient->site->site_id;
		$prevCard->save();

		$card = new PatientCard;
		$card->name = '**' . rand(20, 99) . ' - ' . rand(1001, 9000);
		$card->patient_id = $patient->id;
		$card->user_id = $res->user->id;
		$card->control_number = $controlNum;
		$card->date_added = new DateTime;
		$card->date_updated = new DateTime;
		$card->save();

		$patient->card_id = $card->id;
		$patient->only('card_id')->save();

		$ob->record = PatientCard::factory()->plain()->first($card->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});
