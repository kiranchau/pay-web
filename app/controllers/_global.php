<?php

$global_hook = function($req, $res) {
	$host = $_SERVER['HTTP_HOST'];
	$origin = $_SERVER['HTTP_ORIGIN'];

	$referrer = trim($_SERVER['HTTP_REFERER']);
	$parts = parse_url($_SERVER['HTTP_REFERER']);
	$referrer = implode('', [$parts['scheme'], '://', $parts['host'], $parts['path']]);
	$referrer = preg_replace('#/$#', '', $referrer);
	$system = Sys::factory()->where('id = 5')->first();
	global $config;

	$skipList = [
		'/sms/incoming',
		'/load-js',
	];

	$res->systemCode = $system->code;
	$config->system = $system;
	$config->app_url = $system->url;
};

$client_filter = function($req, $res) {
	$user_id = $_SESSION['account_id'];
	if (!$user_id) {
		$user_id = $_SESSION['user_id'];
	}

	$skip = [
		'/',
		'/signin/code',
		'/signin',
		'/signout',
		'/ping',
	];

	$ob = new StdClass;

	if (!$user_id && !in_array($res->uri, $skip)) {
		$ob->status = 2;
		$ob->error = LocalizedString::getString('error.not-authorized', 'You are not authorized to perform this action.');
	}

	if ($res->uri != '/ping') {
		$_SESSION['last_interaction'] = time();
	}

	$user = Account::factory()->findStat($user_id);

	if ($user_id && $user->system_id == $req->config->system->id) {
		$res->user = $user;
		if ($user->parent > 0) {
			$account = Account::factory()->findStat($user->parent);
		}

		if (!$account) {
			$account = $user;
		}
		$user->account_id = $account->id;
		$res->account = $account;
	}
	else {
		$ob->status = 2;
		$ob->error = LocalizedString::getString('error.unauthorized', 'Unauthorized access.');
		return $res->json($ob);
	}
};

$patient_filter = function($req, $res) {
	$pid = $_SESSION['user_id'];
	$ob = new StdClass;

	if ($pid) {
		$res->user = $user = Account::factory()->findStat($pid);
		$res->user->card = PatientCard::factory()
			->where('patient_id = ?', $pid)
			->plain()
			->first();
		$res->account = $user;
	}
	else {
		$ob->status = 2;
		$ob->error = LocalizedString::getString('error.unauthorized', 'Unauthorized access.');
		return $res->json($ob);
	}
};


$path_hook = function($req, $res) {
	$host = $_SERVER['HTTP_HOST'];
	$uri = $res->uri;
	$uri = preg_replace('#^/pay(-demo)?#', '', $uri);
	$uri = preg_replace('#^/prx#', '', $uri);
	return $uri;
};
