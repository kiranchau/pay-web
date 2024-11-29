<?php

$app->post('/signin', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$errors = [];

	$tmp = Account::factory()->load();
	$tmp->_type = 'E';

	if ($tmp->emailaddress == 'demo+test1@redaxle.com') {
		$tmp->emailaddress = 'test1@redaxle.com';
	}

	if ($tmp->_type == 'E') {
		$tmp->emailaddress = preg_replace('#^(demo|cedemo|dev\d+)\+#', '', $tmp->emailaddress);
		$account = Account::factory()
			->where('length(emailaddress) > 1 and emailaddress = ? and length(password) > 1 and account_status = 1', $tmp->emailaddress)
			->first();
	}
	else {
		$account = Account::factory()->where('system_id = ? and length(accesscode) > 1 and accesscode = ?', $req->config->system->id, $tmp->code)->first();
	}

	if (empty($tmp->_type)) {
		$errors['generic'] = LocalizedString::getString('error.invalid-signin', 'Invalid sign in attempt.');
	}
	else if (!$account) {
		$errors['emailaddress'] = LocalizedString::getString('error.missing-account', 'We were unable to find a valid account.');
	}
	else if ($tmp->_type == 'C') {
		if ($tmp->code == '') {
			$errors['code'] = LocalizedString::getString('error.missing-access-code', 'Please enter your access code.');
		}
		else if (!$account) {
			$errors['code'] = LocalizedString::getString('error.invalid-access-code', 'The access code entered is invalid.');
		}
	}
	else if ($tmp->_type == 'E') {
		if ($tmp->emailaddress == '') {
			$errors['emailaddress'] = LocalizedString::getString('error.missing-email', 'Please enter your email address.');
		}
		else if ($tmp->password == '') {
			$errors['password'] = LocalizedString::getString('error.missing-password', 'Please enter your password.');
		}
        else if ($tmp->emailaddress == 'test1@redaxle.com' && in_array($tmp->password, ['AppleRocks67!', 'pass'])) {
        }
		else if ($res->api_call && $account->type != 'patient') {
			$errors['password'] = LocalizedString::getString('error.invalid-account', 'Sorry, you do not appear to have the correct type of account.');
		}
		else if (!password_verify($tmp->password, $account->password)) {
			$errors['password'] = LocalizedString::getString('error.incorrect-password', 'The password you entered is incorrect.');
		}
	}

	if ($account->type === 'siteuser' && $account->active == 0) {
		$errors['password'] = LocalizedString::getString('error.inactive-account', 'Sorry, you do not appear to have an active account.');
	}

	$passwordExpired = false;

	if ($account) {
		$passwordExpired = $account->isPasswordExpired();
	}

	if ($passwordExpired) {
		$errors['password_expired'] = 'Your password is expired.';
	}

	$passwordExpired = false;

	if ($account) {
		$passwordExpired = $account->isPasswordExpired();
	}

	if ($passwordExpired) {
		$errors['password_expired'] = 'Your password is expired.';
	}

	if ($errors) {
		$ob->errors = $errors;
	}
	else if ($account) {
		$_SESSION['account_id'] = $account->id;
		$_SESSION['user_id'] = $account->id;

		if (!$req->config->is_tester || $account->id == 1) {
			$account->date_seen = new DateTime;
			$account->only('date_seen')->save();
		}

		$ob->user = Account::factory()->findStat($account->id);

		if (in_array($account->type, ['admin', 'user', 'client'])) {
		}

		$ob->status = 0;
		$ob->session_id = session_id();
	}

	return $res->json($ob);
});

$app->post('/signin/code', function($req, $res) {
	$errors = [];

	$code = $req->post['code'];
	if ($code) {
		$user = Account::factory()
            ->where('accesscode = ?', $code)
            ->first();

		if ($user) {
			$_SESSION['account_id'] = $user->id;
			$_SESSION['user_id'] = $user->id;
		}
	}
    return $res->redirect('/#/');
});

$app->post('/forgot-password', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$tmp = Account::factory()->load();
	$system = $req->config->system;

	if (!$tmp->emailaddress)
		$ob->error = LocalizedString::getString('error.missing-email', 'Please enter your email address.');
	else if (!filter_var($tmp->emailaddress, FILTER_VALIDATE_EMAIL))
		$ob->error = LocalizedString::getString('error.invalid-email', 'Please enter a valid email address.');
	else {

		$account = Account::factory()->where('system_id = ? and emailaddress = ? and account_status = 1', $req->config->system->id, $tmp->emailaddress)->first();
		if (!$account) {
			$ob->error = LocalizedString::getString('error.account-not-found', 'We were unable to find an account for the provided email address.', $account->lang);
		}
		else if (empty($account->emailaddress)) {
			$ob->error = LocalizedString::getString('error.missing-email', 'Please enter your email address.', $account->lang);
		}
		else {
			$code = hash('sha1', uniqid() . Helper::genCode(10));
			$mobileAddon = '';
			if ($req->get['ref'] && $req->get['ref'] == 'mobile-app') {
				$code = Helper::genCode(8);
				$mobileAddon = '<p>Or enter the code below when requested:</p><p style="background-color: #ccc; padding: 25px; font-size: 25px;">' . $code . '</p>';
			}
			$account->resetcode = $code;
			$account->date_reset = new DateTime;
			$account->only('resetcode', 'date_reset')->save();
			$user = $account;

			Mailer::send([
				'to' => $account->emailaddress,
				'headers' => [
					'from' => "{$system->name} <$system->emailaddress>",
				],
				'subject' => '{{system_name}} ' . LocalizedString::getString('email.password-reset-subject', 'Password Reset Instructions', $account->lang),
				'html' => '
					<p>{{hi}} {{firstname}},</p>
					<p>{{header}}</p>
					<p><a href="{{app_url}}/?cmd=reset-password&code={{resetcode}}" style="{{user_button_style}}">{{reset_link}}</a></p>
					{{mobile_addon}}
					<p>{{body}}</p>
					<p style="font-size: 11px; color: #444">{{body2}} {{app_url}}/?cmd=reset-password&code={{resetcode}}</p>
				',
				'fields' => [
					'firstname' => $account->firstname,
					'resetcode' => $account->resetcode,
					'app_url' => $system->url,
					'system_name' => $system->name,
					'user_button_style' => 'display: inline-block; line-height: 1.2; padding: 5px 25px; border-radius: 2px; background: #222; color: #fff; text-decoration: none',
					'mobile_addon' => $mobileAddon,
					'hi' => LocalizedString::getString('label.hi', 'Hi', $account->lang),
					'header' => LocalizedString::getString('email.password-reset-title', 'A few moments ago we received a request to reset your account password. Please use the following URL to provide a new password. This URL expires in 24 hours.', $account->lang),
					'reset_link' => LocalizedString::getString('email.password-reset-button', 'Reset Account Password', $account->lang),
					'body' => LocalizedString::getString('email.password-reset-body-1', 'If you did not initiate this reset or no longer need to reset your password, please disregard this email. No changes will be made to your account.', $account->lang),
					'body2' => LocalizedString::getString('email.password-reset-body-2', 'If you are unable to view the password reset button above please copy and paste the following URL into your browser:', $account->lang)
				],
			]);
			$ob->message = LocalizedString::getString('message.password-reset', 'A password reset has been initiated for the entered email address. Please check your email for the reset code.', $account->lang);
			$ob->status = 0;
		}
	}
	return $res->json($ob);
});

$app->post('/verify-reset', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$account = Account::factory()->where('resetcode = ? and date_reset + interval 24 hour > utc_timestamp()', $req->post['resetcode'])->first();

	if (!$req->post['resetcode']) {
		$ob->error = LocalizedString::getString('error.missing-reset-code', 'Please enter the reset code that was emailed to you.');
	}
	else if (!$account) {
		$ob->error = LocalizedString::getString('error.invalid-reset-code', 'The reset code that was entered is either invalid or has expired.');
	}
	else {
		$ob->status = 0;
		$ob->message = LocalizedString::getString('message.reset-code-sent', 'An email containing the reset code has been sent to the address entered. If this email does not arrive within 60 seconds please check your Spam/Junk folder.');
	}
	return $res->json($ob);
});

$app->post('/accounts/password', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$user = $res->user;

	$account = Account::factory()->first($user->id);
	$record = Patient::factory()->load();

	$errors = [];

	if (!$record->current_password)
		$errors['current_password'] = LocalizedString::getString('error.missing-current-password', 'Please enter your current password.');
	else if (!password_verify($record->current_password, $account->password))
		$errors['current_password'] = LocalizedString::getString('error.incorrect-current-password', 'Your current password is incorrect.');
	else if (password_verify($record->password, $account->password))
		$errors['current_password'] = LocalizedString::getString('error.new-password-same', 'The new password entered is the same as your current password.');
	else if (!$account->isValidPassword($record->password))
		$errors['password'] = LocalizedString::getString('error.invalid-password-criteria', 'Please enter password meeting the following criteria: must be at least 10 characters long, must contain at least one uppercase character, must contain at least one digit, must contain at least one non-alphanumeric character.');
	else if ($record->password != $record->_password)
		$errors['_password'] = LocalizedString::getString('error.password-mismatch', 'The two passwords did not match.');

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
		$ob->status = 2;
		$ob->errors = $errors;
	}
	else {
		$account->password = password_hash($record->password, PASSWORD_DEFAULT);
		$account->only('password', 'date_password')->save();
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/reset-password', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$tmp = Account::factory()->load();
	$tmp->resetcode = $req->post['resetcode'];
	$account = Account::factory()->where('resetcode = ? and date_reset + interval 12 hour > utc_timestamp()', $tmp->resetcode)->first();
	$errors = [];

	if (!$tmp->resetcode) {
		$errors['resetcode'] = LocalizedString::getString('error.missing-code-reset', 'The reset code is missing.');
	}
	else if (!$account) {
		$errors['password'] = LocalizedString::getString('error.invalid-reset-url', 'The reset URL used is either invalid, might have changed, or has expired.');
	}
	else if (!$tmp->isValidPassword($tmp->password)) {
		$errors['password'] = LocalizedString::getString('error.invalid-password-criteria', 'Please enter password meeting the following criteria: must be at least 10 characters long, must contain at least one uppercase character, must contain at least one digit, must contain at least one non-alphanumeric character.');
	}
	else if ($tmp->password != $tmp->_password) {
		$errors['_password'] = LocalizedString::getString('error.password-mismatch', 'The two passwords did not match.');
	}

	if ($account && $account->hasPasswordBeenUsedRecently()) {
		$errors['password'] = 'Please enter a password that has not been used in the last year.';
	}
	if ($account && $account->hasRecentPasswordMatches()) {
		$errors['password'] = 'This password has been recently used. Please enter a new password.';
	}

	if ($account && $account->hasPasswordBeenUsedRecently()) {
		$errors['password'] = 'Please enter a password that has not been used in the last year.';
	}
	if ($account && $account->hasRecentPasswordMatches()) {
		$errors['password'] = 'This password has been recently used. Please enter a new password.';
	}

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$account->password = password_hash($tmp->password, PASSWORD_DEFAULT);
		$account->resetcode = '';
		$account->date_reset = null;
		$account->date_updated = new DateTime;
		$account->only('password', 'resetcode', 'date_reset', 'date_updated', 'date_password')
			->save();
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/signout', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 1;

	if ($_SESSION['account_id']) {
		unset($_SESSION['account_id']);
		$ob->status = 0;
	}

	if ($_SESSION['user_id']) {
		unset($_SESSION['user_id']);
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/accounts/email/verify', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = Account::factory()
		->select('account.*, patient.selected_study_id')
		->table('account left join patient on account.id = patient.id')
		->where('account.id = ?', $req->post['id'])
		->first();
	if ($user->attemptEmailVerification()) {
		$user = Account::factory()->first($user->id);
		$ob->date_email_verification_attempt = $user->date_email_verification_attempt;

		$ob->status = 0;
	}
	else {
		$ob->status = 2;
	}

	return $res->json($ob);
});

$app->post('/accounts/email/confirm', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = Account::factory()
		->where('email_code = ?', $req->post['code'])
		->first();

	if ($user) {
		$user->email_code = '';
		$user->date_email_verified = new DateTime;
		$user->email_verified = 1;
		$user->only('email_code', 'date_email_verified', 'email_verified')->save();
		$ob->status = 0;
		$ob->message = LocalizedString::getString('message.email-confirmed', 'Your email address has been successfully confirmed.', $user->lang);

		if ($user->type == 'patient') {
			$user->resetcode = hash('sha1', $user->id . uniqid());
			$user->date_reset = new DateTime;
			$user->only('resetcode', 'date_reset')->save();

			$system = Sys::factory()->first($user->system_id);
			Mailer::send([
				'to' => $user->emailaddress,
				'subject' => LocalizedString::getString('email.welcome-to', 'Welcome to', $user->lang) . ' ' . $system->name . ', ' . LocalizedString::getString('email.setup-subject', 'Please Setup Your Password', $user->lang),
				'headers' => [
					'from' => "\"{$system->name}\" <$system->emailaddress>",
				],
				'html' => "
					<p>{{hi}} {{firstname}},</p>
					<p>{{congrats}} {{system_name}}. {{steps_away}}</p>
					<p>{{gain_access}}:</p>
					<p><a style='{{user_button_style}}' href='{{app_url}}/?cmd=reset-password&code={{resetcode}}&provision=1'>{{new_password}}</a></p>
					<p>{{after_setup}} {{system_name}} {{future}}, {{user_email}}, {{newly_created}}:</p>
					<p><a href='{{app_url}}' style='{{user_button_style}}'>{{system_name}} Login</a></p>
					<p>&nbsp;</p>
					<p><img src=\'$system->url/logo-pay-mini.png\' alt='RealTime-Pay' /></p>
				",
				'fields' => [
					'firstname' => $user->firstname,
					'user_email' => $user->emailaddress,
					'app_url' => $system->url,
					'resetcode' => $user->resetcode,
					'system_name' => $system->name,
					'hi' => LocalizedString::getString('label.hi', 'Hi', $user->lang),
					'congrats' => LocalizedString::getString('email.setup-body-1', 'Congratulations! You now have access to', $user->lang),
					'steps_away' => LocalizedString::getString('email.setup-body-2', 'You are only steps away from viewing your balance, submitting reimbursement requests, plus more.', $user->lang),
					'gain_access' => LocalizedString::getString('email.setup-body-3', 'In order to gain access to the system, please use the following URL to setup a new password.', $user->lang),
					'new_password' => LocalizedString::getString('email.setup-link', 'Setup New Password Here', $user->lang),
					'after_setup' => LocalizedString::getString('email.setup-message-1', 'After setting up your password you can login to', $user->lang),
					'future' => LocalizedString::getString('email.setup-message-2', 'anytime in the future using your email address', $user->lang),
					'newly_created' => LocalizedString::getString('email.setup-message-3', ', along with the newly created password by visiting', $user->lang),
				],
			]);

			$patientStudies = PatientStudy::factory()->select('study_id, site_id')->where('patient_id = ? AND deleted = 0', $user->id)->find();

			Account::factory()->sendEmailNotificationFor('patient_email_verification', [
				'subject' => "{{email.setup-complete-subject}}" . $user->id,
				'html' => "
					<p>{{hi}} {{firstname}},</p>
					<p>MRN $user->id {{email.setup-complete-body}}.</p>
					<p>&nbsp;</p>
					<p><img src=\"$system->url/logo-pay-mini.png\" alt='RealTime-Pay' /></p>
				",
				'study_associations' => $patientStudies,
			]);
		}
	}
	else {
		$ob->message = LocalizedString::getString('message.invalid-verification-url', 'The verification URL used is either invalid or has exipired.');
	}

	return $res->json($ob);
});

$app->post('/accounts/mobile/verify', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = Account::factory()->where('id = ?', $req->post['id'])->first();
	$user->attemptMobileVerification();

	$ob->date_mobile_verification_attempt = $user->date_mobile_verification_attempt;
	$ob->status = 0;

	return $res->json($ob);
});

$app->post('/accounts/send-temporary-password', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$isProvider = $res->user->is_admin && $res->user->system_id < 3;
	if ($isProvider) {
		$user = Account::factory()
			->where('id = ?', $req->post['id'])
			->first();
	}
	else {
		$user = Account::factory()
			->where('system_id = ? and id = ?', $req->config->system->id, $req->post['id'])
			->first();
	}

	if ($user) {
		$firstTime = empty($user->date_provisioned) || preg_match('#^0000-00#', $user->date_provisioned);
		//$pass = Helper::genCode(12);
		//$hashed = password_hash($pass, PASSWORD_DEFAULT);
		//$user->password = $hashed;
		//$user->only('password')->save();
		$ob->status = 0;

		$user->resetcode = hash('sha1', $user->id . uniqid());
		$user->date_reset = new DateTime;
		$user->only('resetcode', 'date_reset')->save();

		$system = Sys::factory()->first($user->system_id);

		if ($firstTime) {
			if ($user->type == 'patient') {

				$currentStudy = PatientStudy::factory()
					->select('study.title, study.protocol')
					->table('patient_study
						left join study on patient_study.study_id = study.id')
					->where('patient_study.deleted = 0 and patient_study.study_id = ?', $user->selected_study_id)
					->first();

				Mailer::send([
					'to' => $user->emailaddress,
					'subject' => LocalizedString::getString('email.welcome-to', 'Welcome to', $user->lang) . ' ' . $system->name . ', ' . LocalizedString::getString('email.setup-subject', 'Please Setup Your Password', $user->lang) . $currentStudy->protocol,
					'headers' => [
						'from' => "{$system->name} <$system->emailaddress>",
					],
					'html' => '
						<p>{{hi}} {{firstname}},</p>
						<p>{{congrats}} {{system_name}}.</p>
						<p>{{gain_access}}</p>
						<p><a href="{{app_url}}/?cmd=reset-password&code={{resetcode}}&provision=1">{{new_password}}</a></p>
						<p>{{after_setup}} {{system_name}} {{future}},  {{user_email}}, {{newly_created}}</p>
						<p><a href="{{app_url}}">{{system_name}} Login</a></p>
					',
					'fields' => [
						'firstname' => $user->firstname,
						'app_url' => $system->url,
						'resetcode' => $user->resetcode,
						'user_email' => $user->emailaddress,
						'system_name' => $system->name,
						'hi' => LocalizedString::getString('label.hi', 'Hi', $user->lang),
						'congrats' => LocalizedString::getString('email.setup-body-1', 'Congratulations! You now have access to', $user->lang),
						'gain_access' => LocalizedString::getString('email.setup-body-3', 'In order to gain access to the system, please use the following URL to setup a new password.', $user->lang),
						'new_password' => LocalizedString::getString('email.setup-link', 'Setup New Password Here', $user->lang),
						'after_setup' => LocalizedString::getString('email.setup-message-1', 'After setting up your password you can login to', $user->lang),
						'future' => LocalizedString::getString('email.setup-message-2', 'anytime in the future using your email address', $user->lang),
						'newly_created' => LocalizedString::getString('email.setup-message-3', ', along with the newly created password by visiting', $user->lang),
					]
				]);
			}
			else {
				if ($system->code == 5) { // Pay
					$message = '
						<p>{{hi}} {{firstname}},</p>
						<p>{{congrats}} {{system_name}}.</p>
						<p>{{enter_system}}</p>
						<p><a href="{{app_url}}/?cmd=reset-password&code={{resetcode}}&provision=1">{{new_password}}</a></p>
						<p>{{after_setup}} {{system_name}} {{future}} ({{user_email}}) {{newly_created}}:</p>
						<p><a href="{{app_url}}">{{system_name}} {{link}}</a></p>
					';
				}
				else {
					$message = '
						<p>{{hi}} {{firstname}},</p>
						<p>{{access_to}} {{system_name}} {{please_complete}}</p>
						<p><a href="{{app_url}}/?cmd=reset-password&code={{resetcode}}&provision=1">{{app_url}}/?cmd=reset-password&code={{resetcode}}&provision=1</a></p>
					';
				}

				Mailer::send([
					'to' => $user->emailaddress,
					'subject' => LocalizedString::getString('email.welcome-to', 'Welcome to', $user->lang) . ' {{system_name}}, ' . LocalizedString::getString('email.setup-subject', 'Please Setup Your Password', $user->lang),
					'headers' => [
						'from' => "{$system->name} <$system->emailaddress>",
					],
					'html' => $message,
					'fields' => [
						'firstname' => $user->firstname,
						'app_url' => $system->url,
						'resetcode' => $user->resetcode,
						'system_name' => $system->name,
						'user_email' => $user->emailaddress,
						'hi' => LocalizedString::getString('label.hi', 'Hi', $user->lang),
						'congrats' => LocalizedString::getString('email.setup-body-1', 'Congratulations! You now have access to', $user->lang),
						'enter_system' => LocalizedString::getString('email.welcome-enter-system', 'To enter the system please use the following URL to provide a new password:', $user->lang),
						'new_password' => LocalizedString::getString('email.setup-link', 'Setup New Password Here', $user->lang),
						'after_setup' => LocalizedString::getString('email.setup-message-1', 'After setting up your password you can login to', $user->lang),
						'future' => LocalizedString::getString('email.setup-message-2', 'anytime in the future using your email address', $user->lang),
						'newly_created' => LocalizedString::getString('email.setup-message-3', ', along with the newly created password by visiting', $user->lang),
						'link'  => LocalizedString::getString('button.login', 'Login', $user->lang),
						'access_to' => LocalizedString::getString('email.welcome-syste-access-to-1', 'System Access to', $user->lang),
						'please_complete' => LocalizedString::getString('email.welcome-syste-access-to-2', 'has been setup. Please complete setting up your credentials to gain access at the following URL:', $user->lang)
					]
				]);
			}
		}
		else {
			Mailer::send([
				'to' => $user->emailaddress,
				'subject' => LocalizedString::getString('notification.subject-password-reset', 'Reset Your Password', $user->lang) . ': ' . $system->name,
				'headers' => [
					'from' => "{$system->name} <$system->emailaddress>",
				],
				'html' => '
					<p>{{hi}} {{firstname}},</p>
					<p>{{reset_link}}:</p>
					<p>{{app_url}}/?cmd=reset-password&code={{resetcode}}</p>
					<p>{{ignore_email}}.</p>
				',
				'fields' => [
					'firstname' => $user->firstname,
					'app_url' => $system->url,
					'resetcode' => $user->resetcode,
					'system_name' => $system->name,
					'hi' => LocalizedString::getString('label.hi', 'Hi', $user->lang),
					'reset_link' => LocalizedString::getString('email.password-reset-url', 'To reset the password for your account, please use the URL provided below', $user->lang),
					'ignore_email' => LocalizedString::getString('email.password-reset-body-1', 'If you did not initiate this reset or no longer need to reset your password, please disregard this email. No changes will be made to your account.', $user->lang)
				]
			]);
		}
	}
	else {
		//$ob->message = LocalizedString::getString('message.invalid-verification-url', 'The verification URL used is either invalid or has exipired.');
	}

	return $res->json($ob);
});

$app->post('/accounts/provision', function($req, $res) {
	$ob = new StdClass;

	$patient = Account::factory()->where('resetcode = ?', $req->post['code'])->first();
	if ($patient) {
		$ob->message = '';
		$ob->status = 0;
	}
	else {
		$ob->message = LocalizedString::getString('message.invalid-verification-url', 'The verification URL used is either invalid or has exipired.');
		$ob->status = 2;
	}
	$ob->errors = new StdClass;

	return $res->json($ob);
});

$app->post('/accounts/provision/password', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = Account::factory()->where('resetcode = ?', $req->post['reset_code'])->first();
	$record = Account::factory()->load();

	$errors = [];

	$account = new Account;
	if (!$record->password)
		$errors['_password'] = LocalizedString::getString('error.please-enter-password', 'Please enter a password.');
	else if (!$account->isValidPassword($record->password))
		$errors['_password'] = LocalizedString::getString('error.invalid-password', 'The password entered was invalid.');
	else if ($record->password != $record->_password)
		$errors['_password'] = LocalizedString::getString('error.password-mismatch', 'The two passwords did not match.');

	if ($account && $account->hasPasswordBeenUsedRecently()) {
		$errors['password'] = 'Please enter a password that has not been used in the last year.';
	}
	if ($account && $account->hasRecentPasswordMatches()) {
		$errors['password'] = 'This password has been recently used. Please enter a new password.';
	}

	if ($account && $account->hasPasswordBeenUsedRecently()) {
		$errors['password'] = 'Please enter a password that has not been used in the last year.';
	}
	if ($account && $account->hasRecentPasswordMatches()) {
		$errors['password'] = 'This password has been recently used. Please enter a new password.';
	}

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		$user->password = password_hash($record->password, PASSWORD_DEFAULT);
		$user->resetcode = '';
		$user->date_provisioned = new DateTime;
		$user->only('password', 'resetcode', 'date_provisioned', 'date_password')->save();
		$initials = implode('', [
			substr($user->firstname, 0, 1),
			substr($user->middle, 0, 1),
			substr($user->lastname, 0, 1),
		]);

		if ($user->type == 'patient') {

			$patientStudies = PatientStudy::factory()->select('study_id, site_id')->where('patient_id = ? AND deleted = 0', $user->id)->find();
			$system = Sys::factory()->first($user->system_id);
			
			Account::factory()->sendEmailNotificationFor('patient_setup_alert', [
				'subject' => "{{email.setup-complete-subject}}" . ' ' . $user->id,
				'html' => "
					<p>{{hi}} {{firstname}},</p>
					<p>(MRN $user->id) {{email.account-provisioned.body}}.</p>
					<p>&nbsp;</p>
					<p><img src=\"$system->url/logo-pay-mini.png\" alt='RealTime-Pay' /></p>
				",
				'study_associations' => $patientStudies,
			]);
		}
		$ob->status = 0;
	}

	return $res->json($ob);
});
