<?php

$app->post('/account/viewed/patients', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$account = Account::factory()
	->find($req->post['id']);
	if (!$account) {
		$ob->error = LocalizedString::getString('error.set-id', 'Please set id.');
		$ob->status = 2;

	} else {
		$r = AccountPatientView::factory();
		$r->account_id = $res->user->id;
		$r->patient_id = $req->post['id'];
		$r->date_added =  new DateTime;
		$r->save();
	
		$ob->status = 0;
	}

	return $res->json($ob);
});

$app->get('/account/viewed/patients', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->records = 
		AccountPatientView::factory()
		->select('a.id, a.firstname, a.lastname, patient.middle, MAX(account_patient_view.date_added) as date_added')
		->table('
			account a 
			join patient on patient.id = a.id
			join account_patient_view on patient.id = account_patient_view.patient_id')
		->where('
				a.deleted = 0 
				and a.type = ?
				and account_patient_view.account_id = ?', 'patient', $res->user->id)
		->order('MAX(account_patient_view.date_added) desc')
		->group('a.id')
		->plain()
		->limit(15)
		->find();

	$ob->status = 0;
	return $res->json($ob);
});

