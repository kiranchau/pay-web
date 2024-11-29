<?php

class PayPal {

	public function __construct($creds=null) {
		global $config;
		if ($creds) {

		}
		else {
			$this->config = new StdClass;
			if ($config->paypal_api_username)
				$this->config->api_username = $config->paypal_api_username;
			if ($config->paypal_api_username)
				$this->config->api_password = $config->paypal_api_password;
			if ($config->api_password)
				$this->config->api_signature = $config->paypal_api_signature;
		}
	}

	public function post($path, $params, $args=[]) {
		return $this->request($path, 'POST', $params, $args);
	}

	public function get($path, $params, $args=[]) {
		return $this->request($path, 'GET', $params, $args);
	}

	private function request($path, $method='GET', $params=[], $args=[]) {
		global $config;
		$ch = curl_init();
		$path = rtrim($path, '/');
		//$url = 'https://svcs.paypal.com/Invoice/' . $path;
		$url = 'https://api.paypal.com/v1/' . $path;
		curl_setopt($ch, CURLOPT_TIMEOUT, 10);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge([
			'Accept: application/json',
			'Accept-Language: en_US',
			'Accept-Language: en_US',
		], $args['headers'] ?: []));
		curl_setopt($ch, CURLOPT_USERPWD, $config->paypal_api_clientid . ':' . $config->paypal_api_secret);
		$method == strtoupper($method);

		if ($params) {
			$tmp = [];
			foreach ($params as $key => $val)
				$tmp[] = "$key=$val";
			$params = implode('&', $tmp);
		}

		if ($method == 'GET') {
			if ($params)
				$url .= '?' . $params;
		}
		else if ($method == 'POST') {
			curl_setopt($ch, CURLOPT_POST, true);
			if ($params)
				curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
		}

		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		var_dump($url);
		curl_setopt($ch, CURLOPT_URL, $url);

		$res = curl_exec($ch);

		if (curl_errno($ch))
			throw new Exception('Problem while making PayPal request: ' . curl_error($ch));

		curl_close($ch);

		return json_decode($res);
	}

}
