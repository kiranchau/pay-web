<?php

$app->get('/audit/patients/(?<id>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->records = NiftyEngine\AuditEntry::factory()
		->select('audit_entry.*, patient_study.study_id')
		->table("audit_entry left join patient_study on field = 'icf_user_id' and patient_study.patient_id = $req->id")
		->where("(pk = ? and tablename in (?, ?) and field not in ('email_code', 'system_id', 'resetcode')) or (field = 'icf_user_id' and pk = patient_study.id)", $req->id, 'account', 'patient'
		)
		->order('audit_entry.date_added desc, audit_entry.op desc')
		->group('audit_entry.id')
		->plain()
		->find();
	
	foreach ($ob->records as $record) {
		if ($record->field == 'password') {
			if ($record->newvalue) {
				$record->newvalue = '*************';
			}
		}
		$record->account = Account::factory()
			->select('id, firstname, lastname')
			->plain()
			->where('id = ?', $record->account_id)
			->first();
	}

	return $res->json($ob);
});
