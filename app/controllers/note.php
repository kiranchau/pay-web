<?php

$app->get('/notes', function($req, $res) {
	$ob = new StdClass;

	$model = Task::factory()
	->select("
		progress_note.*, 
		concat(account.firstname, ', ', account.lastname) AS _account_name,
		note_type.name AS _note_type_name
	")
	->table('
		progress_note
		left join account on account.id = progress_note.account_id
		left join note_type on progress_note.type_id = note_type.id')
	->plain()
	->where('progress_note.deleted = 0')
	->order('date_added desc');

    if ($req->get['study_id']) {
        $model->where('progress_note.study_id = ? and progress_note.deleted = 0', $req->get['study_id']);
    }
    if ($req->get['site_id']) {
        $model->where('progress_note.site_id = ? and progress_note.deleted = 0', $req->get['site_id']);
	}
	
	$ob->records = $model->find();

	return $res->json($ob);
});

$app->post('/notes', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$record = ProgressNote::factory()->load();
	$record->id = $req->post['id'];
	$record->account_id = $res->user->id;
	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if ($record->id) {
			$record->date_updated = new DateTime;
		} else {
			$record->date_added = new DateTime;
		}

		$record->save();
		$ob->status = 0;
		$ob->record = ProgressNote::factory()->first($record->id);
	}

	return $res->json($ob);
});

$app->get('/notes/(?<id>\d+)', function($req, $res) {
	$ob = new StdClass;

	$ob->record = ProgressNote::factory()
		->plain()
		->first($req->id);

	return $res->json($ob);
});

$app->delete('/notes/(?<id>\d+)', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = ProgressNote::factory()->first($req->id);
    if($record) {
        $record->deleted = 1;
        $record->save();

        $ob->status = 0;
        $ob->deleted = true;
    }

	return $res->json($ob);
});

$app->get('/note-types', $client_filter, function($req, $res) {
    $ob = new StdClass;
    $ob->records = NoteType::factory()->plain()->order('name')->find();
    return $res->json($ob);
});

$app->post('/note-types', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = NoteType::factory()->load();
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

		$ob->record = NoteType::factory()->plain()->first($record->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});
$app->get('/travel_status_table', $client_filter, function($req, $res) {
    $ob = new StdClass;
    $ob->records = TravelStatus::factory()->plain()->order('sort_order')->find();
    return $res->json($ob);
});

$app->post('/travel_status_table', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = TravelStatus::factory()->load();
	$record->id = $req->post['id'];
	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->added_date = new DateTime;
		}
		$record->date_updated = new DateTime;
		$record->save();

		$ob->record = TravelStatus::factory()->plain()->first($record->id);
		$ob->status = 0;
	}

	return $res->json($ob);
});
