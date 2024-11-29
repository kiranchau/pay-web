<?php

$app->get('/requests/messages/(?<request_id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$records = PatientRequestMessage::factory()
		->select('patient_request_message.*, account.type as _account_type')
		->table('patient_request_message left join account on patient_request_message.user_id = account.id')
		->where('request_id = ?', $req->request_id)
		->order('date_added')
		->plain()
		->find();
	$ob->records = $records;

	return $res->json($ob);
});

$app->post('/requests/messages', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = PatientRequestMessage::factory()->load();
	$record->id = $req->post['id'];
	$record->request_id = $req->post['request_id'];

	$errors = $record->validate();
	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->user_id = $res->user->id;
			$record->date_added = new DateTime;
		}

		$record->date_updated = new DateTime;
		$record->save();
		$record->emailNotification(); 
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->post('/resolved/messages/:request_id', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$messages = PatientRequestMessage::factory()
		->where('request_id = ? and resolved = 0', $req->request_id)
		->find();
	foreach($messages as $message) {
		$message->resolved = 1;
		$message->date_resolved = new DateTime;
		$message->resolved_by = $res->user->id;
		$message->save();
	}
	$ob->status = 0;

	return $res->json($ob);
});
