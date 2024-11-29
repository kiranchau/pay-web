<?php

$app->get('/milestones', $client_filter, function($req, $res) {
    $ob = new StdClass;
    $ob->records = Milestone::factory()->plain()->order('name')->find();
    return $res->json($ob);
});

$app->post('/milestones', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = Milestone::factory()->load();
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

		$ob->record = Milestone::factory()->plain()->first($record->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->get('/milestone-types', $client_filter, function($req, $res) {
    $ob = new StdClass;
    $ob->records = MilestoneType::factory()->plain()->order('name')->find();
    return $res->json($ob);
});

$app->post('/milestone-types', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = MilestoneType::factory()->load();
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

		$ob->record = MilestoneType::factory()->plain()->first($record->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});

