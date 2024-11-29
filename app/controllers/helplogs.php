<?php

$app->get('/helplogs', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->records = HelpLog::factory()
		->order('priority, status, date_added desc')
		->plain()
		->find();

	return $res->json($ob);
});

$app->post('/helplogs', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$record = HelpLog::factory()->load();
	$record->id = $req->post['id'];
	$savedHelpLog = HelpLog::factory()->first($req->post['id']);
	$errors = $record->validate();
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime;
		}
		$record->date_updated = new DateTime;
		$record->user_id = $res->user->id;
		$record->subject = $req->post['subject'];
		$record->message = $req->post['message'];
		$record->priority = $req->post['priority'] == '' ? '' : $req->post['priority'];
		$record->status = $req->post['status'];
		if (!$record->status) {
			$record->status = 1;
		}
		if (!$savedHelpLog || $savedHelpLog->status != $record->status || $savedHelpLog->message != $record->message || $savedHelpLog->subject != $record->subject || $savedHelpLog->priority != $record->priority) {
			$record->handleHelplog();
		}
		$record->save();
		$ob->status = 0;
		$ob->record = HelpLog::factory()->plain()->first($record->id);
	}

	return $res->json($ob);
});

$app->delete('/helplogs/:id', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$user = $res->user;

	$record = HelpLog::factory()->first($req->id);
	if ($record) {
		$record->delete();
		$ob->status = 0;
	}

	return $res->json($ob);

});

