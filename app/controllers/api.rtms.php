<?php

$rtms_filter = function($req, $res) {
    $ipWhitelist = [
        '199.79.50.230', // Dallas
        //'23.239.28.97', // dev4
        '3.132.218.237',
    ];

    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?: $_SERVER['REMOTE_ADDR'];
    if (!in_array($ip, $ipWhitelist)) {
        echo $res->json([
            'status' => 2,
            'error' => 'You do not have access to this endpoint.',
        ]);
        die();
    }
};

$app->get('/api/v1/rtms/pay-contacts', $rtms_filter, function($req, $res) {
	$ob = new StdClass;
		
	$ob->payEnabled = true;
	$ob->status = 0;
	$ob->records = Account::factory()
		->select('account.emailaddress as email, account.firstname, account.lastname')
		->table('account
			join account_meta on account_meta.account_id = account.id and account_meta.deleted = 0')
		->where("account.type = 'user' and account.deleted = 0 and account_meta.name = 'funding_management'")
		->plain()
		->find();

	return $res->json($ob);
});

$app->get('/api/v1/rtms/active-users', $rtms_filter, function($req, $res) {
	$ob = new stdClass;
	$ob->status = 2;

	$accounts = Account::factory()
		->select('firstname as FirstName, lastname as LastName, emailaddress as EMail, id as UserID')
		->where("type = 'user' and deleted = 0")
		->order('FirstName')
		->plain()
		->find();

	$ob->records = $accounts;

	$ob->status = 0;
	return $res->json($ob);
});

$app->get('/api/v1/rtms/site-users', $rtms_filter, function($req, $res) {
    $ob = new StdClass;

    $accounts = Account::factory()
        ->raw("
            select
                account.id,
                account.firstname,
                account.lastname,
                account.emailaddress,
                account.lang,
                account.phonenumber,
                account.company,
                account.active,
                account.status,
                ssu.role,
                ss.name as site_name
            from account
            join study_site_user ssu on ssu.user_id = account.id
            join study_site ss on ss.id = ssu.site_id
            where account.type = 'siteuser'
                and account.deleted = 0
            order by lastname, firstname
        ")
        ->events(false)
        ->plain()
        ->find();

    $roleMap = [
        1 => 'Research Coordinator',
        2 => 'Provider',
        3 => 'Site Manager',
    ];

    $notifMap = [
        'patient_email_verification' => 'Subject Email Verification',
        'patient_setup_alert' => 'Subject Account Setup',
        'patient_card_assigned' => 'Subject Card Assigned',
    ];

    $privMap = [
        'assign_card' => 'Assign Cards',
        'stipend_approval' => 'Approve Stipends',
        'review_reimbursement' => 'Review Reimbursements',
        'subject_request_approval' => 'Approve/Deny Reimbursements',
        'delete_patients' => 'Delete Subjects',
    ];

    foreach ($accounts as $account) {
        $account->studies = Study::factory()
            ->raw("
                select
                    study.id,
                    study.protocol,
                    sponsor.name as sponsor_name
                from study
                join sponsor on sponsor.id = study.sponsor_id
                join study_site_user_access on study_site_user_access.study_id = study.id
                where study_site_user_access.user_id = ?
                order by sponsor_name, protocol
            ", $account->id)
            ->events(false)
            ->plain()
            ->find();

        $metaRecords  = AccountMeta::factory()
            ->where('account_id = ? and deleted = 0', $account->id)
            ->events(false)
            ->find();

        $privs = [];
        $notifs = [];

        $account->status = $account->active == 1 ? 'Active' : 'Inactive';

        foreach ($metaRecords as $mr) {
            if (array_key_exists($mr->name, $notifMap)) {
                $notifs[] = $notifMap[$mr->name];
            }
            else if (array_key_exists($mr->name, $privMap)) {
                $privs[] = $privMap[$mr->name];
            }
        }

        $account->role_name = $roleMap[$account->role] ?: '';
        $account->privileges = $privs;
        $account->notifications = $notifs;

    }

    $ob->records = $accounts;

    return $res->json($ob);
});
