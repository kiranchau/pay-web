<?php

$app->get('/study-researchers', $client_filter, function($req, $res) {
    $ob = new StdClass;
    $ob->records = StudyResearcher::factory()->plain()->order('name')->find();
    return $res->json($ob);
});

$app->post('/study-researchers', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = StudyResearcher::factory()->load();
	$record->id = $req->post['id'];
	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime;
		}
		$record->date_updated = new DateTime;
		$record->save();

		$ob->record = StudyResearcher::factory()->plain()->first($record->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});