<?php

$app->post('/patients/bank-account', $client_filter, function($req, $res) {
	$ob = new StdClass;

	$ob->status = 2;
	$errors = [];

	$form = PatientBankAccount::factory()->load();

	$config = $req->config;

	$patient = Patient::factory()
		->table('account a left join patient p on p.id = a.id')
		->events(false)
		->where('a.id = ?', $req->post['patient_id'])
		->first();
	$form->id = $patient->bank_account_id;
	$form->hyperwallet_account_num = PatientBankAccount::factory()
		->select('hyperwallet_account_num')
		->where('id = ?', $form->id)
		->scalar();
		$feature_flag = Sys::getFeatureFlag();
		$countryInfo = Country::getFirstWithCode(strtoupper($patient->country));
		if($feature_flag == 1 && $countryInfo->processor == 2) {
			$form->prepaidtech_account_num = PatientBankAccount::factory()
				->select('prepaidtech_account_num')
				->where('id = ?', $form->id)
				->scalar();
			$patientStudyInfo = PatientStudy::factory()
						->select('site_id')
						->where('patient_id = ? and study_id = ?', $patient->id, $patient->selected_study_id)
						->first();
		}
	$errors = $form->validate();

	if ($errors) {
		$ob->errors = $errors;
		return $res->json($ob);
	}

	if($feature_flag == 1 && $countryInfo->processor == 2) {
		if (!$patient->zipcode) {
			$errors['generic'] = LocalizedString::getString('error.postal-code', 'Please fill in the subject Postal Code.');
			$ob->errors = $errors;
			return $res->json($ob);
		}
		try {
			$prepaidTech = new PrepaidTech();
		
			$uri_segments = explode('.', parse_url($_SERVER['SERVER_NAME'], PHP_URL_PATH));
			$patientEmail = $patient->emailaddress ? $patient->emailaddress : $uri_segments[0].'.'.$patientStudyInfo->site_id.'.'.$patient->id.'@dashsolutions.com';
			$getPayee = '';
			if ($patient->bank_account_id && $form->prepaidtech_account_num) {
				$getPayee = $prepaidTech->get('/payees/'. $form->prepaidtech_account_num);
			} 
			if ($getPayee->Data->identifier) {
				$request_body = [
					"iban"=>$form->account_num,
					"email"=>$patientEmail,
					"address"=> [
									"line1"=>$patient->address,
									"line2"=>$patient->address2,
									"locality"=>$patient->city,
									"region"=>$patient->state,
									"country"=>$patient->country,
									"postalCode"=>$patient->zipcode,
								],
				];
				$payee = $prepaidTech->put('/payees/'. $form->prepaidtech_account_num, $request_body);
			}
			else {
				$request_body = [
					"externalIdentifier"=>"",
					"iban"=>$form->account_num,
					"email"=>$patientEmail,
					"firstName"=>$patient->firstname,
					"lastName"=>$patient->lastname,
					"address"=> [
									"line1"=>$patient->address,
									"line2"=>$patient->address2,
									"locality"=>$patient->city,
									"region"=>$patient->state,
									"country"=>$patient->country,
									"postalCode"=>$patient->zipcode,
								]
				];
				$payee = $prepaidTech->post('/payees', $request_body);
				$form->prepaidtech_account_num = $payee->payee->identifier;
			}
		}
		catch (Exception $e) {
			$errors['generic'] = LocalizedString::getString('error.error-encountered', 'An error was encountered') .' : '. $e->getMessage();
			$ob->errors = $errors;
			return $res->json($ob);
		}
	}
	else {
		if ($config->hyperwallet_enabled) {
			try {
				$hw = new HyperWalletV3();
				if ($patient->user_token && substr($patient->user_token , 0, 3) == 'usr') {
					$savedHWUser = $hw->get('/users/' . $patient->user_token, array());
				}
			}
			catch(Exception $e) {
				$errors['generic'] = LocalizedString::getString('error.error-encountered', 'An error was encountered') . $e->getMessage();
				$ob->errors = $errors;
				return $res->json($ob);
			}

			if ($savedHWUser) {
				$data = array();
				$data['firstName'] = $patient->firstname;
				$data['lastName'] = $patient->lastname;
				$data['email'] = $patient->emailaddress;
				$data['middle'] = $patient->middle;
				$data['dateOfBirth'] = $patient->dob;
				$data['mobileNumber'] = $patient->phonenumber;
				$data['addressLine1'] = $patient->address;
				$data['city'] = $patient->city;
				$data['stateProvince'] = $patient->state;
				$data['country'] = $patient->country;
				$data['postalCode'] = $patient->zipcode;
				$data['programToken'] = $config->hyperwallet_programToken;
				try {
					$hWUser = $hw->put('/users/' . $patient->user_token, $data);
				}
				catch(Exception $e) {
					$errors['generic'] = LocalizedString::getString('error.update-user-check-email', 'An error was encountered updating the user. Please check if you have an email set. Error') . ': ' . $e->getMessage();
					$ob->errors = $errors;
					return $res->json($ob);
				}
			}
			else {
				$data = array(
					'clientUserId' => $patient->id,
					'profileType' => 'INDIVIDUAL',
					'firstName' => $patient->firstname,
					'lastName' => $patient->lastname,
					'dateOfBirth' => $patient->dob,
					'email' => $patient->emailaddress,
					'addressLine1' => $patient->address,
					'city' => $patient->city,
					'stateProvince' => $patient->state,
					'country' => $patient->country,
					'postalCode' => $patient->zipcode,
					'programToken' => $config->hyperwallet_programToken
				);

				try {
					$hWUser = $hw->post('/users', $data);
					$patient->user_token = $hWUser->token;
					$patient->only('user_token')->save();
		
				}
				catch(Exception $e) {
					$errors['generic'] = LocalizedString::getString('error.error-encountered', 'An error was encountered') . $e->getMessage();
					$ob->errors = $errors;
					return $res->json($ob);
				}
			}
			// search and update or create bank account
			if ($form->hyperwallet_account_num && substr($form->hyperwallet_account_num, 0, 3) === 'trm') {
				try {
					$savedHWBankAccount = $hw->get('/users/' . $patient->user_token . '/bank-accounts/' . $form->hyperWallet_account_num, array());
				}
				catch(Exception $e) {
					$errors['generic'] = LocalizedString::getString('error.error-encountered', 'An error was encountered') . $e->getMessage();
					$ob->errors = $errors;
					return $res->json($ob);
				}
			}

			if ($savedHWBankAccount && $form->country == $patient->country) { //update (delete after)
				$data = array();

				$data['bankName'] = $form->bank_name;
				$data['bankAccountId'] = $form->account_num;
				$data['firstName'] = $patient->firstname;
				$data['lastName'] = $patient->lastname;

				//branch id, bankid, branch name? //Specific changes
				if ($form->country == 'GB' || $form->country == 'AT') {
					$data['bankId'] = $form->routing_num;
					$data['country'] = $patient->country;
					$data['transferMethodCurrency'] = $form->currency;
				}
				else if ($form->country == 'DK'
					|| $form->country == 'NO' ||
					$form->country == 'NL' ||
					$form->country == 'SE' && $form->currency == 'EUR' ||
					$form->country == 'FR' ||
					$form->country == 'DE' ||
					$form->country == 'BE' ||
					$form->country == 'CZ' ||
					$form->country == 'IT' ||
					$form->country == 'HU' ||
					$form->country == 'RO' ||
					$form->country == 'ES' ||
					$form->country == 'PT' ||
					$form->country == 'GR') {
					$data['bankId'] = $form->routing_num;
				}
				else if ($form->country == 'PL') {
					if ($form->currency == 'EUR' && $savedHWBankAccount->currency == 'PL') {
						$data['bankId'] = $form->routing_num;
					}
				}
				else if ($form->country == 'CA' || $form->country == 'AU') {
					$data['bankId'] = $form->bank_code;
					$data['branchId'] = $form->routing_num;
				}
				else if ($form->country == 'US') {
					$data['branchId'] = $form->routing_num;
					$data['transferMethodCurrency'] = $form->currency;
				}
				else if ($form->country == 'CN') {
					$data['bankName'] = $form->bank_name;
					$data['branchName'] = $form->branch_name;
					$data['branchCity'] = $form->branch_city;
					$data['branchStateProvince'] = $form->branch_state_province;
					$data['governmentId'] = $form->national_id;
				}
				else if ($form->country == 'SG' || $form->country == 'NZ') {
					$data['bankId'] = $form->bank_code;
					$data['branchId'] = $form->routing_num;
					$data['postalCode'] = $patient->zipcode;
				}
				else if ($form->country == 'AR') {
					$data['governmentId'] = $form->national_id;
					$data['bankId'] = $form->bank_code;
					$data['bankAccountPurpose'] = 'CHECKING';
				}
				else if ($form->country == 'BR') {
					$data['bankId'] = $form->bank_code;
					$data['branchId'] = $form->routing_num;
					$data['governmentId'] = $form->national_id;
					$data['phoneNumber'] = $patient->phonenumber ? $patient->phonenumber :  $patient->phone_mobile;
					$data['bankAccountPurpose'] = 'CURRENT_ACCOUNT';
				}
				else if ($form->country == 'JP') {
					$data['bankId'] = $form->bank_code;
					$data['branchId'] = $form->routing_num;
					$data['bankAccountPurpose'] = 'CURRENT';
				}
				else if ($form->country == 'CO') {
					$data['bankId'] = $form->routing_num;
					$data['governmentId'] = $form->national_id;
					$data['governmentIdType'] = $form->government_id_type;
					$data['bankAccountPurpose'] = 'CHECKING';
				}
				else if ($form->country == 'IL') {
					$data['bankId'] = $form->bank_code;
					$data['branchId'] = $form->routing_num;
					$data['governmentId'] = $form->national_id;
				}
				else if ($form->country == 'MX') {
					$data['transferMethodCurrency'] = 'MXN';
				}
				else if ($form->country == 'TR') {
					$data['bankId'] = $form->routing_num;
					$data['postalCode'] = $patient->zipcode;
				}

				try {
					$updatedBankAccount = $hw->put('/users/' . $patient->user_token . '/bank-accounts/' . $form->hyperwallet_account_num, $data);
				}
				catch(Exception $e) {
					$errors['generic'] = LocalizedString::getString('error.error-encountered', 'An error was encountered') .' '. $e->getMessage();
					$ob->errors = $errors;
					return $res->json($ob);
				}
			}
			else {
				$fields = array(
					'type' => 'BANK_ACCOUNT',
					'transferMethodCountry' => $form->country,
					'transferMethodCurrency' => $form->currency,
					'bankAccountId' => $form->account_num,
					'bankAccountRelationship' => 'SELF',
					'profileType' => 'INDIVIDUAL',
					'firstName' => $patient->firstname,
					'lastName' => $patient->lastname
				);

				if ($form->country == 'CA' || $form->country == 'AU') {
					$fields['bankId'] = $form->bank_code;
					$fields['branchId'] = $form->routing_num;
				}
				else if (
					$form->country == 'CZ' ||
					$form->country == 'ES' ||
					$form->country == 'DE' ||
					$form->country == 'DK' ||
					$form->country == 'FR' ||
					$form->country == 'NL' ||
					$form->country == 'NO' ||
					$form->country == 'SE' ||
					$form->country == 'HU' ||
					$form->country == 'BE' ||
					$form->country == 'IT' ||
					$form->country == 'RO' ||
					$form->country == 'PT' ||
					$form->country == 'GR' ||
					($form->country == 'PL' && $form->currency == 'EUR')) {
					$fields['bankId'] = $form->routing_num;
				}
				else if ($form->country == 'GB' || $form->country == 'AT') {
					$fields['bankId'] = $form->routing_num;
					$fields['country'] = $patient->country;
				}
				else if ($form->country == 'US') {
					$fields['branchId'] = $form->routing_num;
					$fields['postalCode'] = $patient->zipcode;
					$fields['bankAccountPurpose'] = 'CHECKING';
				}
				else if ($form->country == 'CN') {
					$fields['bankName'] = $form->bank_name;
					$fields['branchName'] = $form->branch_name;
					$fields['branchCity'] = $form->branch_city;
					$fields['branchStateProvince'] = $form->branch_state_province;
					$fields['governmentId'] = $form->national_id;
				}
				else if ($form->country == 'SG' || $form->country == 'NZ') {
					$fields['bankId'] = $form->bank_code;
					$fields['branchId'] = $form->routing_num;
					$fields['postalCode'] = $patient->zipcode;
				}
				else if ($form->country == 'AR') {
					$fields['governmentId'] = $form->national_id;
					$fields['bankId'] = $form->bank_code;
					$fields['bankAccountPurpose'] = 'CHECKING';
				}
				else if ($form->country == 'BR') {
					$fields['bankId'] = $form->bank_code;
					$fields['branchId'] = $form->routing_num;
					$fields['governmentId'] = $form->national_id;
					$fields['phoneNumber'] = $patient->phonenumber ? $patient->phonenumber :  $patient->phone_mobile;
					$fields['bankAccountPurpose'] = 'CURRENT_ACCOUNT';
				}
				else if ($form->country == 'JP') {
					$fields['bankId'] = $form->bank_code;
					$fields['branchId'] = $form->routing_num;
					$fields['bankAccountPurpose'] = 'CURRENT';
				}
				else if ($form->country == 'CO') {
					$fields['bankId'] = $form->bank_code;
					$fields['governmentId'] = $form->national_id;
					$fields['governmentIdType'] = $form->government_id_type;
					$fields['bankAccountPurpose'] = 'CHECKING';
				}
				else if ($form->country == 'IL') {
					$fields['bankId'] = $form->bank_code;
					$fields['branchId'] = $form->routing_num;
					$fields['governmentId'] = $form->national_id;
				}
				else if ($form->country == 'MX') {
					$fields['transferMethodCurrency'] = 'MXN';
				}
				else if ($form->country == 'TR') {
					$fields['bankId'] = $form->routing_num;
					$fields['postalCode'] = $patient->zipcode;
				}

				$fields['addressLine1'] = $patient->address;
				$fields['city'] = $patient->city;
				$fields['stateProvince'] = $patient->state;
				$fields['country'] = $form->country ? $form->country : $patient->country;;

				try {
					$hWBankAccount = $hw->post('/users/' . $patient->user_token . '/bank-accounts', $fields);
					$form->hyperwallet_account_num = $hWBankAccount->token;
					
				}
				catch(Exception $e) {
					$errors['generic'] = LocalizedString::getString('error.error-encountered', 'An error was encountered') .' '.  $e->getMessage();
					$ob->errors = $errors;
					return $res->json($ob);
				}
			}
			
		//end of hyperwallet conditional
		}
	}
	$ba = $form;
	$ba->patient_id = $patient->id;
	$ba->user_id = $res->user->id;
	$ba->date_added = new DateTime;
	$ba->date_updated = new DateTime;
	$ba->account_num = $form->account_num;
	$ba->routing_num = $form->routing_num;
	$ba->bank_name = $form->bank_name;
	$ba->bank_code = $form->bank_code;
	$ba->currency = $form->currency;
	$ba->hyperwallet_account_num = $form->hyperwallet_account_num;
	if($feature_flag == 1 && $countryInfo->processor == 2) {
		$ba->prepaidtech_account_num = $form->prepaidtech_account_num;
	}
	$ba->verification_code = 0; //from HyperWalletClassic
	$ba->_currency_code = $form->_currency_code;
	$ba->_currency_name = $form->_currency_name;
	$ba->_currency_symbol = $form->_currency_symbol;
	$ba->branch_name = $form->branch_name;
	$ba->branch_city = $form->branch_city;
	$ba->branch_state_province = $form->branch_state_province;
	$ba->national_id = $form->national_id;
	$ba->save();
	if ($ba->id) {
		$patient->bank_account_id = $ba->id;
		$patient->only('bank_account_id')->save();
		$ob->record = PatientBankAccount::factory()
			->select('patient_bank_account.*, currency.name as _currency_name, currency.symbol as _currency_symbol, currency.code as _currency_code')
			->table('patient_bank_account left join currency on patient_bank_account.currency = currency.code')
			->where('patient_bank_account.id = ?', $ba->id)
			->plain()->first();
		$ob->status = 0;
	}

	return $res->json($ob);
});


$app->get('/patients/bank-account', $client_filter, function($req, $res) {
    $ob = new StdClass;
    $ob->status = 2;

    $pat = Patient::factory()
	    ->select('p.*')
	    ->table('patient p')
	    ->where('id = ?', $req->get['patient_id'])
	    ->first();

    if ($pat->bank_account_id) {
	    $ob->status = 0;
	    $bank_account = PatientBankAccount::factory()->plain()
			->select('patient_bank_account.*, currency.code as _currency_code, currency.symbol as _currency_symbol, currency.name as _currency_name')
			->table('patient_bank_account left join currency on currency.code = patient_bank_account.currency')
			->where('patient_id = ?', $pat->bank_account_id)
			->first();

	    $ob->record = $bank_account;
    }
    return $res->json($ob);
});

$app->get('/patients/bank-account/default-currency/:field1', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;
	$errors = [];

	$record = Country::factory()
		->select('currency.*')
		->table('country left join currency on currency.code = country.default_currency')
		->where('country.code = ?', $req->field1)
		->plain()
		->first();

	if ($record->code == null) {
		$errors['generic'] = LocalizedString::getString('error.default-currency-not-set', 'Please select a default currency.');
	}
	else {
		$ob->status = 0;
		$ob->record = $record;
	}

	$ob->errors = $errors;
	return $res->json($ob);
});

