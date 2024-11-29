<?php

$api_filter = function($req, $res) {
	//$session_id = $req->get['_session_id'] ?: $req->post['_session_id'];
	$res->api_call = true;
};

$app->post('/api/v1/signin', $api_filter, function($req, $res) {
	return $res->reroute('/signin', $req, $res, 'post');
});

$app->post('/api/v1/signout', $api_filter, function($req, $res) {
	return $res->reroute('/signout', $req, $res, 'post');
});

$app->post('/api/v1/forgot-password', $api_filter, function($req, $res) {
	return $res->reroute('/forgot-password', $req, $res, 'post');
});

$app->post('/api/v1/reset-password', $api_filter, function($req, $res) {
	return $res->reroute('/reset-password', $req, $res, 'post');
});

$app->get('/api/v1/patients/dashboard', $api_filter, function($req, $res) {
	return $res->reroute('/patients/dashboard', $req, $res, 'get');
});

$app->get('/api/v1/patients/info', $api_filter, function($req, $res) {
	return $res->reroute('/patients/info', $req, $res, 'get');
});

$app->post('/api/v1/patients/info', $api_filter, function($req, $res) {
	return $res->reroute('/patients/info', $req, $res, 'post');
});

$app->get('/api/v1/patients/reimbursements', $api_filter, function($req, $res) {
	return $res->reroute('/patients/reimbursements', $req, $res, 'get');
});

$app->post('/api/v1/patients/reimbursements', $api_filter, function($req, $res) {
	return $res->reroute('/patients/reimbursements', $req, $res, 'post');
});

$app->get('/api/v1/patients/addresses', $api_filter, function($req, $res) {
	return $res->reroute('/patients/addresses', $req, $res, 'get');
});

$app->post('/api/v1/patients/addresses', $api_filter, function($req, $res) {
	return $res->reroute('/patients/addresses', $req, $res, 'post');
});

$app->get('/api/v1/list/reimbursement-item-types', $api_filter, function($req, $res) {
	return $res->reroute('/list/reimbursement-item-types', $req, $res, 'get');
});

$app->get('/api/v1/settings', $api_filter, function($req, $res) {
	return $res->reroute('/settings', $req, $res, 'get');
});

$app->get('/api/v1/sites/locations/:id', $api_filter, function($req, $res) {
	return $res->reroute('/sites/locations/' . $req->id, $req, $res, 'get');
});

$app->get('/api/v1/attachments/:hash', function($req, $res) {
	return $res->reroute('/patients/requests/download/' . $req->hash, $req, $res, 'get');
});

$app->get('/api/v1/settings/geocode', $api_filter, function($req, $res) {
	return $res->reroute('/settings/geocode', $req, $res, 'get');
});


$app->post('/api/v1/patients/requests/upload', $api_filter, function($req, $res) {
	return $res->reroute('/patients/requests/upload', $req, $res, 'post');
});

$app->post('/api/v1/patients/requests/compute-distance-amount', $api_filter, function($req, $res) {
	return $res->reroute('/patients/requests/compute-distance-amount', $req, $res, 'post');
});

$app->get('/api/v1/patients/studies', $api_filter, function($req, $res) {
	return $res->reroute('/patients/studies', $req, $res, 'get');
});

$app->get('/api/v1/languages', $api_filter, function($req, $res) {
	return $res->reroute('/languages', $req, $res, 'get');
});

$app->get('/api/v1/pay-processor', $api_filter, function($req, $res) {
	return $res->reroute('/pay-processor', $req, $res, 'get');
});

$app->post('/api/v1/update-language', $api_filter, function($req, $res) {
	return $res->reroute('/update-language', $req, $res, 'post');
});

$app->get('/api/v1/studies/visits/:study_id/sites/:site_id', $api_filter, function($req, $res) {
	return $res->reroute('/studies/visits/(?<study_id>\d+)/sites/(?<site_id>\d+)', $req, $res, 'get');
});
