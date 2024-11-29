<?php

$app->get('/dashboard/(?<processor>\d+)', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$processor = $req->processor ? $req->processor : 1;
	if ($res->user->type == 'siteuser') {
		$ob->patients = Patient::factory()
			->select('distinct account.id, account.firstname, account.lastname, account.date_updated, patient.middle')
			->table('account join patient on patient.id = account.id
				left join patient_study on patient.id = patient_study.patient_id
					and patient_study.deleted = 0
				join study_site_user_access on study_site_user_access.study_id = patient_study.study_id
				join study_site_user on study_site_user.site_id = patient_study.site_id
					and study_site_user.user_id = study_site_user_access.user_id
			')
			->where('account.deleted = 0 and account.type = ? and study_site_user_access.user_id = ?', 'patient', $res->user->id)
			->order('account.date_updated desc')
			->group('account.id')
			->plain()
			->limit(5)
			->find();

		$ob->reimbursements = [];
		$ob->wallet = (object)[
			'pendingFunds'      => 0,
			'pendingCards'      => 0,
			'pending_cards_num' => 0
		];

		$ob->ius_wallet = (object)[
			'balance'      => 0,
			'issued'       => 0,
			'remaining'    => 0,
			'pendingFunds' => 0,
			'pendingCards' => 0,
		];

		$ob->ius_wallet = (object)[
			'balance'      => 0,
			'issued'       => 0,
			'remaining'    => 0,
			'pendingFunds' => 0,
			'pendingCards' => 0,
		];

		$ob->site_active_count    = 0;
		$ob->study_active_count   = 0;
		$ob->subject_active_count = 0;

		return $res->json($ob);
	}

	$ob->patients = Patient::factory()
		->select('distinct a.id, a.firstname, a.lastname, a.date_updated, p.middle, a.deleted')
		->table('account a join patient p on p.id = a.id')
		->where('a.deleted = 0 and a.type = ?', 'patient')
		->order('date_updated desc')
		->plain()
		->limit(5)
		->find();

	$ob->reimbursements = PatientRequest::factory()
		->select('pr.*, a.firstname as _firstname, a.lastname as _lastname, p.middle as _middle, p.site_id as _site_id, a.country as _country, currency.symbol as _symbol')
		->table('patient_request pr join patient p on p.id = pr.patient_id join account a on a.id = p.id
			left join patient_bank_account on p.id = patient_bank_account.patient_id left join currency on patient_bank_account.currency = currency.code left join study on pr.study_id = study.id')
		->where('pr.status = ? and
		IF(pr.date_approved IS NULL,
		study.visit_stipends = 1 OR
		study.manage_reimbursements = 1, 1)', PatientRequest::STATUS_PENDING)
		->order('pr.date_added desc')
		->limit(10)
		->plain()
		->find();
		switch ($processor) {
			case 1:
				$iusWalletId = 1;
				$ousWalletId = 2; 
				break;
			case 2:
				$iusWalletId = 3;
				$ousWalletId = 4;
				break;
			default:
				$iusWalletId = 1;
				$ousWalletId = 2; 
				break;
		}
	$ius_wallet = Wallet::factory()
		->select('balance, issued, remaining')
		->plain()
		->where('id = ?', $iusWalletId)
		->first();
	$ius_wallet->pendingFunds = FundingRequest::factory()
		->select('sum(amount)')
		->where("date_approved is null and date_voided is null and program = 'ius' and processor = ?", $processor)
		->scalar() ?: 0;
	$ous_wallet = Wallet::factory()
		->select('balance, issued, remaining')
		->plain()
		->where('id = ?', $ousWalletId)
		->first();
	$ous_wallet->pendingFunds = FundingRequest::factory()
		->select('sum(amount)')
		->where("date_approved is null and date_voided is null and program = 'ous' and processor = ?", $processor)
		->scalar() ?: 0;
	$ius_wallet->pendingCards = CardRequest::factory()
		->select('count(*)')
		->where('date_approved is null and date_voided is null')
		->scalar() ?: 0;
	$ob->ous_wallet = $ous_wallet;
	$ob->ius_wallet = $ius_wallet;
	$ob->wallet     = $ius_wallet;
	$ob->wallet->pending_cards_num = CardRequest::factory()->select('SUM(num)')->where('date_approved is null and date_voided is null')->scalar() ?: 0;

	$siteActiveCount    = StudySite::factory()->where('status = 0')->count();
	$studyActiveCount   = Study::factory()->where('status = 0')->count();
	$subjectActiveCount = PatientStudy::factory()->where('status = 0 and deleted = 0 and patient_id != 0')->count();

    $ob->site_active_count    = intval($siteActiveCount);
    $ob->study_active_count   = intval($studyActiveCount);
    $ob->subject_active_count = intval($subjectActiveCount);
	
	return $res->json($ob);
});
