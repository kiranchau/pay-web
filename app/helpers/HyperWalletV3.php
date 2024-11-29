<?php

class HyperWalletV3 {

	private $username;
	private $accountID;
	private $password;

	private $baseUrl = 'https://api.sandbox.hyperwallet.com/rest/v3';

	function __construct($username='', $accountID='', $password='') {
		global $config;
		$this->username = $username;
		$this->accountID = $accountID;
		$this->password = $password;

		if ($config->hyperwallet_baseurl) {
			$this->baseUrl = $config->hyperwallet_baseurl;
		}

		if (!$this->username && $config->hyperwallet_username) {
			$this->username = $config->hyperwallet_username;
		}
		if (!$this->accountID && $config->hyperwallet_programNumber) {
			$this->accountID = $config->hyperwallet_programNumber;
		}
		if (!$this->password && $config->hyperwallet_password) {
			$this->password = $config->hyperwallet_password;
		}
	}

	public function makeRequest($path, $method='GET', $params) {
		if (!$this->username || !$this->password || !$this->accountID) {
			throw new Exception('Auth credentials are missing.');
		}
		$ch = curl_init();
		$headers= array();
		$headers[] = 'Content-Type: application/json';
		$headers[] = 'Accept: application/json';

		$userpwd = $this->username . '@' . $this->accountID . ':' . $this->password;
		$url = $this->baseUrl . $path;

		curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($ch, CURLOPT_USERPWD, $userpwd);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		if ($method == 'GET') {
			$url = $this->baseUrl . $path;
			if ($params) {
				$url .= '?' . http_build_query($params);
			}
		}
		else {
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
			curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
		}
		curl_setopt($ch, CURLOPT_URL, $url);
		$raw = curl_exec($ch);

		$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

		if ($http_code >= 300) {
			global $config;

			$http_info = curl_getinfo($ch);

			$msg = "A problem was encountered while making this API request.";
			$msg.= " Below are the details to pass on to your developer or HyperWallet (productionsupport@hyperwallet.com).\n\n";
			$msg.= "API Endpoint: $url\n\n";
			$msg.= "Request Data:\n";
			$msg.= print_r($postfields, true) . "\n\n";
			$msg.= "Response:\n";

			$json = json_decode($raw);
			if (json_last_error()) {
				if (function_exists('json_last_error_msg')) {
					$msg.= "JSON Error: " . json_last_error_msg();
				}
				$msg.= PHP_EOL;
				$msg.= $raw;
			}
			else {
				$msg.= print_r($json, true) . "\n\n";
			}

			$msg.= "cURL Request Info\n";
			$msg.= print_r($http_info, true);

			mail($config->support_email, 'HyperWallet API Request Failure for ' . $config->domain, $msg, "From: RealTime CTMS <$config->support_email>", '-f ' . $config->support_email);
			if ($config->webmaster_email) {
				mail($config->webmaster_email, 'HyperWallet API Request Failure for ' . $config->domain, $msg, "From: RealTime CTMS <$config->support_email>", '-f ' . $config->support_email);
			}
		}

		if (curl_errno($ch)) {
			$error = curl_error($ch);
			curl_close($ch);
			throw new Exception('An error was encountered: ' . $error . '.');
		}
		$json = json_decode($raw);
		if (json_last_error()) {
			throw new Exception('Could not decode json: ' . (function_exists('json_last_error_msg') ? json_last_error_msg() : json_last_error()) . '. Response: ' . $raw);
		}

		if ($json->errors) {
			throw new Exception(($json->errors[0]->fieldName ? $json->errors[0]->fieldName . ' ' : '') . $json->errors[0]->message);
		}
		return $json;
	}

	public function get($path, $params) {
		return $this->makeRequest($path, 'GET', $params);
	}

	public function post($path, $params) {
		return $this->makeRequest($path, 'POST', $params);
	}

	public function put($path, $params) {
		return $this->makeRequest($path, 'PUT', $params);
	}

	public function createUser($params) {
		return $this->makeRequest('/users', 'POST', $params);
	}
}
