<?php

class PrepaidTech {

	private $client_id;
	private $client_secret;
	private $scope;

	function __construct($client_id = '', $client_secret = '', $scope = '') {
		global $config;
		$this->client_id = $client_id;
		$this->client_secret = $client_secret;
		$this->scope = $scope;
		
		if ($config->prepaid_baseUrl) {
			$this->baseUrl = $config->prepaid_baseUrl;
		}
		if (!$this->client_id && $config->prepaid_client_id) {
			$this->client_id = $config->prepaid_client_id;
		}
		if (!$this->client_secret && $config->prepaid_client_secret) {
			$this->client_secret = $config->prepaid_client_secret;
		}
		if (!$this->scope && $config->prepaid_scope) {
			$this->scope = $config->prepaid_scope;
		}
		if ($config->prepaid_tokenUrl) {
			$this->tokenUrl = $config->prepaid_tokenUrl;
		}
	}

	public function makeRequest($path, $method='GET', $params) {
		$dash_token = $this->getToken();
		$ch = curl_init();
        $headers = array(
            'Content-Type: application/json',
            'Cache-Control: no-cache',
            'Authorization: Bearer '.$dash_token,
        );

		$url = $this->baseUrl . $path;
		curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
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
			$msg.= " Below are the details to pass on to your developer or PrepaidTech.\n\n";
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
		if ($http_code == 404 && $method !='GET') {
			throw new Exception($json[0]->errorMessage);
		}
		if ($http_code == 400) {
			throw new Exception($json[0]->errorMessage);
		}
		if($http_code == 500) {
			throw new Exception('Please try after some time now internal server error occurred.');
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

	private function getToken() { 
		if (!$this->client_id || !$this->client_secret || !$this->scope || !$this->tokenUrl) {
			throw new Exception('Auth credentials are missing.');
		}

		$curl = curl_init();
		$params = [
			CURLOPT_URL =>  $this->tokenUrl,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_MAXREDIRS => 10,
			CURLOPT_TIMEOUT => 30,

			CURLOPT_POST => 1,
			CURLOPT_NOBODY => false,
			CURLOPT_HTTPHEADER => array(
				"cache-control: no-cache",
				"content-type: application/x-www-form-urlencoded",
				"accept: */*",
				"accept-encoding: gzip, deflate",
			),
			CURLOPT_POSTFIELDS => "grant_type=client_credentials&client_id=$this->client_id&client_secret=$this->client_secret&scope=$this->scope"
		];

		curl_setopt_array($curl, $params);
		$response = curl_exec($curl);
		$dashResp = json_decode($response);
		return $dash_token = $dashResp->access_token;
	}
}