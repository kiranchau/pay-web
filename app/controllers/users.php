<?php

$app->get('/users', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$model = Account::factory()
		->order('lastname, firstname')
		->plain();

	if (!$res->account || !$res->user || empty($res->account->id) || empty($res->user->id)) {
		$ob->error = '';
		return $res->json($ob);
	}

	$user = $res->user;
	if (intval($user->id) === 1) {
		$model->where('type in (?, ?, ?)', 'user', 'company', 'client')
			->order('system_id');
	}
	else {
		$model->where('system_id = ? and type = ?', $res->user->system_id, 'user');
	}

	$records = $model->plain()->find();

	foreach ($records as $record) {
		unset($record->password);
		$record->password = '';

		$options = AccountMeta::factory()
			->select('name, value')
			->where('account_id = ? and privilege = 1 and deleted = 0', $record->id)
			->find();

		$record->options = new StdClass;
		$record->privileges = new StdClass;

		foreach ($options as $option) {
			$record->options->{$option->name} = $option->value;
			//$record->{'_priv_' . $option->name} = $priv->value;
		}
	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->delete('/users/(?<id>\d+)', $client_filter, function($req, $res) {
	$user = $res->user;

	$ob = new StdClass;
	$record = Account::factory()->first($req->id);
	if ($record && ($record->id == $user->id || $record->system_id == $user->system_id)) {
		$record->delete();
	}

	$ob->deleted = true;

	return $res->json($ob);
});

$app->post('/users', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$user = $res->user;

	$record = Account::factory()->load();
	$record->id = $req->post['id'];

	$record->system_id = $req->config->system->id;

	$allowedFields = [
		'firstname',
		'lastname',
		'company',
		'emailaddress',
		'date_added',
		'date_updated',
		'phonenumber',
		'phone_mobile',
		'street',
		'city',
		'state',
		'zipcode',
		'country',
		'password',
		'account_status',
	];

	$errors = $record->validate();

	if ($errors) {
		$ob->status = 2;
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime;
			$record->parent = $user->parent > 0 ? $user->parent : $user->id;
			$record->type = 'user';
		}
		$record->date_updated = new DateTime;
		if ($record->password) {
			$record->password = password_hash($record->password, PASSWORD_DEFAULT);
		}
		$record->save();
		$record->saveOptions($record->options);

		$ob->record = $record->refresh()->toPlain();
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/edit-profile', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = Account::factory()->load();
	$record->id = $res->user->id;
	$record->firstname = $res->user->firstname;
	$errors = $record->validate();
	$savedAccount = Account::factory()->first($record->id);

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$record->only('company', 'phonenumber', 'fax', 'timezone', 'emailaddress')->save();

		$user = Account::factory()->where('id = ?', $record->id)->first();

		$ob->status = 0;

		if ($savedAccount->emailaddress != $record->emailaddress) {
			$record->email_verified = 0;
			$record->date_email_verified = null;
			$record->only('email_verified', 'date_email_verified')->save();
			if ($user->attemptEmailVerification()) {
				$ob->status = 1;
			}
		}
		$ob->record = $record->refresh()->toPlain();
	}

	return $res->json($ob);
});

$app->post('/update-language', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = Account::factory()->load();
	$record->id = $res->user->id;
	$record->firstname = $res->user->firstname;
	$savedAccount = Account::factory()->first($record->id);

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$record->only('lang')->save();

		$user = Account::factory()->where('id = ?', $record->id)->first();

		$ob->status = 0;
		$ob->record = $record->refresh()->toPlain();
	}

	return $res->json($ob);
});

$app->get('/users/(?<id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$user = $res->user;
	$ob->record = Account::factory()
		->plain()
		->where('id = ?', $req->id)
		->first();

	return $res->json($ob);
});

$app->post('/edit-password', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$tmp = Account::factory()->load();
	$account = Account::factory()->where('id =?', $res->user->id)->first();
	$errors=[];
	if (!password_verify($tmp->current_password, $account->password)) {
		$errors['current_password'] = LocalizedString::getString('error.incorrect-password', 'The password you entered is incorrect.');
	}

	if (!$tmp->password) {
		$errors['password'] = LocalizedString::getString('error.password-mismatch', 'The two passwords did not match.');
	}
	else if (!$tmp->isValidPassword($tmp->password)) {
		$errors['password'] = LocalizedString::getString('error.invalid-password-criteria', 'Please enter password meeting the following criteria: must be at least 10 characters long, must contain at least one uppercase character, must contain at least one digit, must contain at least one non-alphanumeric character.');

	}
	if ($tmp->password != $tmp->_password) {
		$errors['_password'] = LocalizedString::getString('error.password-mismatch', 'The two passwords did not match.');
	}

	if ($account->hasPasswordBeenUsedRecently()) {
		$errors['password'] = 'Please enter a password that has not been used in the last year.';
	}
	if ($account->hasRecentPasswordMatches()) {
		$errors['password'] = 'This password has been recently used. Please enter a new password.';
	}

	if ($account->hasPasswordBeenUsedRecently()) {
		$errors['password'] = 'Please enter a password that has not been used in the last year.';
	}
	if ($account->hasRecentPasswordMatches()) {
		$errors['password'] = 'This password has been recently used. Please enter a new password.';
	}

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$account->password = password_hash($tmp->password, PASSWORD_DEFAULT);
		$account->date_updated = new DateTime;
		$account->only('password', 'date_updated', 'date_password')
			->save();
		$ob->status = 0;
	}

	return $res->json($ob);
});
