<?php

$app->get('/tasks', function($req, $res) {
    $ob = new StdClass;
    
    $where = 'task.deleted = 0';

    if ($req->get['study_id']) {
        $study_id = $req->get['study_id'];
        $where .= " and task.study_id = $study_id";
    }
    if ($req->get['site_id']) {
        $site_id = $req->get['site_id'];
        $where .= " and task.site_id = $site_id";
    }
    if ($req->get['overdue']) {
        $where .= ' and task.date_due is not null and task.date_due < CURDATE() and task.date_completed is null';
    }

    $model = Task::factory()
        ->select("
            task.*,
            group_concat(concat(au.firstname, ' ', au.lastname) separator ', ') as _assigned,
            group_concat(au.id) as _assigned_ids,
            concat(comp.firstname, ' ', comp.lastname) as _completed,
            if(task.study_id > 0, concat(sponsor.name, ' - ', study.protocol), '') as _study,
            study_site.name as _site,
            milestone_type.name AS _milestone_type_name
        ")
        ->table("
            task
            left join study on task.study_id = study.id
            left join sponsor on sponsor.id = study.sponsor_id
            left join study_site on study_site.id = task.site_id
            left join task_user on task_user.task_id = task.id
            left join account au on  au.id = task_user.user_id
            left join account comp on comp.id = task.completed_id
            left join milestone_type on task.type_id = milestone_type.id
        ")
        ->plain()
        ->where($where)
        ->order('date_added desc')
        ->group('task.id');

    $ob->records = $model->find();

    return $res->json($ob);
});

$app->post('/tasks', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = Task::factory()->load();
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
        unset($record->completed_user);
        $record->save();
        $record->saveContacts();

		$ob->status = 0;
		$ob->record = Task::factory()->plain()->first($record->id);
	}

	return $res->json($ob);
});

$app->delete('/tasks/(?<id>\d+)', function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$record = Task::factory()->first($req->id);
    if($record) {
        $record->deleted = 1;
        $record->save();

        $ob->status = 0;
        $ob->deleted = true;
    }

	return $res->json($ob);
});