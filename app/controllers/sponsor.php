<?php

$app->get('/sponsors', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$model = Sponsor::factory()
		->order('name')
		->plain();

	$ob->records = $model->find();

	return $res->json($ob);
});

$app->post('/sponsors', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = Sponsor::factory()->load();
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

		$ob->record = Sponsor::factory()->plain()->first($record->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});
