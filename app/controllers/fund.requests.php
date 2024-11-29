<?php

$app->get('/funding/requests', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$records = [];
	$cards = CardRequest::factory()
		->select('"card" as _type, card_request.*')
		->where('date_approved is not null or date_voided is not null')
		->order('date_added desc')
		->plain()
		->find();

	$funds = FundingRequest::factory()
		->select('"funds" as _type, funding_request.*')
		->where('date_approved is not null or date_voided is not null')
		->order('date_added desc')
		->plain()
		->find();

	$records = array_merge($records, $cards);
	$records = array_merge($records, $funds);

	foreach ($records as $i => &$record) {
		if ($record->_type == 'card') {
			$record->_description = $record->num . ' card(s) ordered';
			$record->code = 'RTPC' . str_pad($record->id, 6, '0', STR_PAD_LEFT);
		}
		else {
			$record->_description = Helper::formatMoney($record->amount) . ' funds requested via ' . $record->transfer_type;
			$record->code = $record->ref_id == null ? 'RTPF' . str_pad($record->id, 6, '0', STR_PAD_LEFT) : $record->ref_id;
		}
		$record->id = '' . $i;

		$record->user = Account::factory()
			->select('id, firstname, lastname')
			->where('id = ?', $record->user_id)
			->plain()
			->first();

		if ($record->user) {
			$record->_description .= ' by ' . $record->user->firstname . ' ' . $record->user->lastname . '.';
		}

		if ($record->approved_by) {
			$user = Account::factory()
				->select('id, firstname, lastname')
				->where('id = ?', $record->approved_by)
				->plain()
				->first();

			$record->_description .= ' Approved by ' . $user->firstname . ' ' . $user->lastname . '.';
		}

		if ($record->voided_by) {
			$user = Account::factory()
				->select('id, firstname, lastname')
				->where('id = ?', $record->voided_by)
				->plain()
				->first();
			$record->_description .= ' Voided by ' . $user->firstname . ' ' . $user->lastname . '.';
		}
	}

	usort($records, function($a, $b) {
		return strcmp($b->date_added, $a->date_added);
	});

	$ob->records = $records;

	return $res->json($ob);
});


$app->get('/funding/requests/(?<type>funds|cards)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	if ($req->type == 'cards')
		$model = CardRequest::factory();
	else
		$model = FundingRequest::factory();
	
	$model->plain()
		->order('date_added');

	if ($req->get['pending']) {
		$model->where('date_approved is null and date_voided is null');
	}

	$records = $model->find();

	foreach ($records as $record) {
		if ($req->type == 'funds') {
			if ($record->ref_id) {
				$record->code = $record->ref_id;
			}
			else {
				$record->code = 'RTPF' . str_pad($record->id, 6, '0', STR_PAD_LEFT);
			}
		}
		$record->user = Account::factory()
			->select('id, firstname, lastname')
			->where('id = ?', $record->user_id)
			->plain()
			->first();
	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->post('/funding/requests/approve/(?<type>funds|cards)/(?<id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	if ($req->type == 'funds') {
		$request = FundingRequest::factory()->first($req->id);
	}
	else if ($req->type == 'cards') {
		$request = CardRequest::factory()->first($req->id);
	}

	if ($request && !$request->date_voided) {
		if (!$request->date_approved) {
			$request->date_approved = new DateTime;
			$request->approved_by = $res->user->id;
			$request->save();

			$system = Sys::factory()->select('feature_flag')->where('id = ?', 5)->first();
			$feature_flag = $system->feature_flag;
			if ($feature_flag == 1) {
				//here we fetch wallet information as per payment processor
				$wallet = Wallet::factory()->walletDetails($request->processor,$req->type,$request->program);
			} else {
				$wallet = Wallet::factory()->getForProgram($req->type == 'funds' ? $request->program : 'ius');
			}

			if ($req->type == 'funds') {
				$wallet->balance += $request->amount;
				$wallet->only('balance')->save();
			}
			else if ($req->type == 'cards') {
				$wallet->remaining += $request->num;
				$wallet->only('remaining')->save();
			}

			$ob->title = 'Request Approved';
			$ob->message = LocalizedString::getString('message.request-approved', 'This request has been successfully approved.');
			$params = [];

			$support = new Account;
			$support->emailaddress = $req->config->support_email;
			$support->firstname = 'Support';
			$initiator = Account::factory()->find($request->user_id);

			$recipients = [$initiator, $support];
			$system = $req->config->system;

			foreach ($recipients as $account) {
				$html = $request->generateNotificationEmail($wallet, $initiator, 'Approved');
				$params = array_merge([
					'subject' => ($req->type == 'funds' ? LocalizedString::getString('email.funding', 'Funding', $account->lang) : LocalizedString::getString('email.card', 'Card', $account->lang)) . ' ' . LocalizedString::getString('email.request-approved', 'Request Approved', $account->lang) .': ' . $request->getDisplayID(),
					'headers' => [
						'From' => '"' . $system->name . '" <' . $system->emailaddress . '>',
						'Bcc' => 'test100@redaxle.com',
					],
					'html' => $html,
				], $params);
				$params = array_merge($params, [
					'to' => $account->emailaddress,
					'fields' => [
						'firstname' => $account->firstname,
						'app_url' => $req->config->app_url,
						'title.approved-by' => LocalizedString::getString('title.approved-by', 'Approved By', $account->lang),
						'email.notification.approved-on' => LocalizedString::getString('email.notification.approved-on', 'Approved On', $account->lang),
						'email.notification.voided-by' => LocalizedString::getString('email.notification.voided-by', 'Voided By', $account->lang),
						'email.notification.voided-on' => LocalizedString::getString('email.notification.voided-on', 'Voided On', $account->lang),
						'email.notification.requested-for' => LocalizedString::getString('email.notification.requested-for', 'Requested For', $account->lang),
						'email.notification.requested-by' => LocalizedString::getString('email.notification.requested-by', 'Requested By', $account->lang),
						'email.notification.requested-on' => LocalizedString::getString('email.notification.requested-on', 'Requested On', $account->lang),
						'email.notification.program-id' => LocalizedString::getString('email.notification.program-id', 'Program ID', $account->lang),
						'email.notification.program' => LocalizedString::getString('email.notification.program', 'Program', $account->lang),
						'email.notification.funding-id' => LocalizedString::getString('email.notification.funding-id', 'Funding ID', $account->lang),
						'email.notification.amount-requested' => LocalizedString::getString('email.notification.amount-requested', 'Amount Requested', $account->lang),
						'title.status' => LocalizedString::getString('title.status', 'Status', $account->lang),
						'label.comment' => LocalizedString::getString('label.comment', 'Comment:', $account->lang),
						'email.notification.title' => LocalizedString::getString('email.notification.title', 'This is an auto-notification from RealTime-Pay', $account->lang),
						'email.notification.footer' => LocalizedString::getString('email.notification.footer', 'Contact RealTime customer support if you need assistance at', $account->lang),
					],
				]);
				$account->sendEmail($params);
			}
		}
		else {
			$ob->title = LocalizedString::getString('title.request-already-approved', 'Request Already Approved');
			$ob->message = LocalizedString::getString('message.request-approved-no-action', 'This request has already been approved so no further action was taken.');
		}
		$ob->status = 0;
	}
	else {
		$ob->error = LocalizedString::getString('error.valid-request', 'Could not find a valid request.');
	}

	return $res->json($ob);
});

$app->post('/funding/requests/void/(?<type>funds|cards)/(?<id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	if ($req->type == 'funds') {
		$request = FundingRequest::factory()->first($req->id);
	}
	else if ($req->type == 'cards') {
		$request = CardRequest::factory()->first($req->id);
	}

	if ($request && !$request->date_approved) {
		if (!$request->date_voided) {
			$request->date_voided = new DateTime;
			$request->voided_by = $res->user->id;
			$request->void_reason = $req->post['reason'];
			$request->save();

			$ob->title = 'Request Voided';
			$ob->message = LocalizedString::getString('message.request-voided', 'This request has been successfully voided.');

			if ($req->type == 'cards') {
				$wallet = Wallet::factory()->getForProgram('ius');
			}
			else {
				$system = Sys::factory()->select('feature_flag')->where('id = ?', 5)->first();
				$feature_flag = $system->feature_flag;
				if ($feature_flag == 1) {
					//here we fetch wallet information as per payment processor
					$wallet = Wallet::factory()->walletDetails($request->processor,$req->type,$request->program);
				} else {
					$wallet = Wallet::factory()->getForProgram($req->type == 'funds' ? $request->program : 'ius');
				}
			}
			$params = [];

			$support = new Account;
			$support->emailaddress = $req->config->support_email;
			$support->firstname = 'Support';
			$initiator = Account::factory()->first($request->user_id);

			$recipients = [$initiator, $support];
			$system = $req->config->system;

			foreach ($recipients as $account) {
				$html = $request->generateNotificationEmail($wallet, $initiator, 'Voided');
				$params = array_merge([
					'subject' => ($req->type == 'funds' ? LocalizedString::getString('email.funding', 'Funding', $account->lang) : LocalizedString::getString('email.card', 'Card')) . ' ' . LocalizedString::getString('email.request-voided', 'Request Voided', $account->lang) .': ' . $request->getDisplayID(),
					'headers' => [
						'From' => '"' . $system->name . '" <' . $system->emailaddress . '>',
					],
					'html' => $html,
				], $params);
				$params = array_merge($params, [
					'to' => $account->emailaddress,
					'fields' => [
						'firstname' => $account->firstname,
						'app_url' => $req->config->app_url,
						'title.approved-by' => LocalizedString::getString('title.approved-by', 'Approved By', $account->lang),
						'email.notification.approved-on' => LocalizedString::getString('email.notification.approved-on', 'Approved On', $account->lang),
						'email.notification.voided-by' => LocalizedString::getString('email.notification.voided-by', 'Voided By', $account->lang),
						'email.notification.voided-on' => LocalizedString::getString('email.notification.voided-on', 'Voided On', $account->lang),
						'email.notification.requested-for' => LocalizedString::getString('email.notification.requested-for', 'Requested For', $account->lang),
						'email.notification.requested-by' => LocalizedString::getString('email.notification.requested-by', 'Requested By', $account->lang),
						'email.notification.requested-on' => LocalizedString::getString('email.notification.requested-on', 'Requested On', $account->lang),
						'email.notification.program-id' => LocalizedString::getString('email.notification.program-id', 'Program ID', $account->lang),
						'email.notification.program' => LocalizedString::getString('email.notification.program', 'Program', $account->lang),
						'email.notification.funding-id' => LocalizedString::getString('email.notification.funding-id', 'Funding ID', $account->lang),
						'email.notification.amount-requested' => LocalizedString::getString('email.notification.amount-requested', 'Amount Requested', $account->lang),
						'title.status' => LocalizedString::getString('title.status', 'Status', $account->lang),
						'label.comment' => LocalizedString::getString('label.comment', 'Comment:', $account->lang),
						'email.notification.title' => LocalizedString::getString('email.notification.title', 'This is an auto-notification from RealTime-Pay', $account->lang),
						'email.notification.footer' => LocalizedString::getString('email.notification.footer', 'Contact RealTime customer support if you need assistance at', $account->lang),
					],
				]);
				$account->sendEmail($params);
			}
		}
		else {
			$ob->title = LocalizedString::getString('email.request-already-voided', 'Request Already Voided');
			$ob->message = LocalizedString::getString('message.request-approved-no-action', 'This request has already been approved so no further action was taken.');
		}
		$ob->status = 0;
	}
	else {
		$ob->error = LocalizedString::getString('error.valid-request', 'Could not find a valid request.');
	}

	return $res->json($ob);
});

$app->post('/funding/requests/(?<type>funds|cards)', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	if ($req->type == 'cards')
		$request = CardRequest::factory()->load();
	else {
		$request = FundingRequest::factory()->load();
		$requestNew = FundingRequest::factory()->load();
	}

	$errors = $request->validate();

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if ($req->post['transfer_type'] == "ACH") {
			if ($req->post['amount'] > '5000') {
				$request->amount = (5000 + (($req->post['amount'] - 5000) * 0.2));
				$request->user_id = $res->user->id;
				$request->date_added = new DateTime;
				$request->date_updated = new DateTime;
				$request->save();

				$requestNew->amount = $req->post['amount'] - $request->amount;
				$requestNew->user_id = $res->user->id;
				$requestNew->date_added = new DateTime;
				$requestNew->date_updated = new DateTime;
				$requestNew->ref_id = ('RTPF' . str_pad($request->id, 6, '0', STR_PAD_LEFT)) . '-2';
				$requestNew->save();

				$request->id = $request->id;
				$request->ref_id = ('RTPF' . str_pad($request->id, 6, '0', STR_PAD_LEFT)) . '-1';
				$request->only('ref_id')->save();
				$ob->status = 0;
			}
			else {
				$request->user_id = $res->user->id;
				$request->date_added = new DateTime;
				$request->date_updated = new DateTime;
				$request->save();
				$ob->status = 0;
			}
		}
		else {
			$request->user_id = $res->user->id;
			$request->date_added = new DateTime;
			$request->date_updated = new DateTime;
			$request->save();
			$ob->status = 0;
		}

		$user = $res->user;
		if ($req->type == 'cards') {
			$wallet = Wallet::factory()->getForProgram('ius');
		}
		else {
			$system = Sys::factory()->select('feature_flag')->where('id = ?', 5)->first();
			$feature_flag = $system->feature_flag;
			if ($feature_flag == 1) {
				//here we fetch wallet information as per payment processor
				$wallet = Wallet::factory()->walletDetails($request->processor,$req->type,$request->program);
			} else {
				$wallet = Wallet::factory()->getForProgram($req->type == 'funds' ? $request->program : 'ius');
			}
		}
		$params = [];
		$support = new Account;
		$system = $req->config->system;

		if ($req->type == 'cards') {
			$html = $request->generateNotificationEmail($wallet, $user, 'Pending');

			Account::factory()->sendEmailNotificationFor('card_request_alert', [
				'subject' => "{{email.card-request.new}}",
				'html' => $html,
			]);

			$params = array_merge([
				'subject' => LocalizedString::getString('email.card-request.new', 'New Card Request Created', $user->lang),
				'headers' => [
					'From' => '"' . $system->name . '" <' . $system->emailaddress . '>',
				],
				'html' => $html,
			], $params);
		}
		else if ($req->type == 'funds') {
			if ($req->post['transfer_type'] == "ACH") {
				if ($req->post['amount'] > '5000') {
					$request->amount = $request->amount + $requestNew->amount;
				}
			}
			$html = $request->generateNotificationEmail($wallet, $user, 'Pending');

			Account::factory()->sendEmailNotificationFor('fund_request_alert', [
				'subject' => "{{email.fund-request-new}}",
				'html' => $html,
			]);

			$params = array_merge([
				'subject' => LocalizedString::getString('email.fund-request-new', 'New Funding Request Created', $user->lang),
				'headers' => [
					'From' => '"' . $system->name . '" <' . $system->emailaddress . '>',
				],
				'html' => $html,
			], $params);
		}

		$support->emailaddress = $req->config->support_email;
		$params = array_merge($params, [
			'to' => $support->emailaddress,
			'fields' => [
				'firstname' => 'Support',
				'app_url' => $req->config->app_url,
			],
		]);
		$support->sendEmail($params);
	}

	return $res->json($ob);
});

$app->post('/funding/balance-update', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$hw = new HyperWalletV3;

	$config = $req->config;
	try {
		$response = $hw->get('/programs/' . $config->hyperwallet_programToken . '/accounts/' . $config->hyperwallet_accountToken . '/balances', [
			'currency' => 'USD'
		]);
		$balance = $response->data[0]->amount;
		$wallet = new Wallet;
		$wallet->balance = $balance;
		$wallet->id = 2;
		$wallet->only('balance', 'date_updated')->save();
		$ob->status = 0;
	}
	catch (Exception $e) {
		$ob->error = 'Error making request for balance: ' . $e->getMessage() . PHP_EOL;
	}

	return $res->json($ob);
});
