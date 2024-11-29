<?php

$app->get('/stat', function($req, $res) {
	$ob = new StdClass;

	$aid = $_SESSION['account_id'];
	$_SESSION['last_interaction'] = time();
	$_SESSION['lang'] = $req->get['lang'];

	if ($aid) {
		$ob->user = Account::factory()->findStat($aid);
		$ob->board_columns = []; 
		$ob->status = 0;
		$ob->sessid = session_id();
	}
	else {
		$ob->user = new StdClass;
		$ob->user->options = new StdClass;
		$ob->status = 2;
		$ob->sessid = session_id();
	}
	$ob->systemCode = $res->systemCode;
	$ob->system = Sys::factory()->findPublic($req->config->system->id);

	return $res->json($ob);
});

