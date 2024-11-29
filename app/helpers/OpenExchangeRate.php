<?php

class OpenExchangeRate {

	public function getConversionRate($from, $to) {
		global $config;

		if (!$config->openexchangerate_appid) {
			throw new Exception('Missing configuration for an OpenExchangeRate API app ID. Please configure for conversion rates to work properly.');
		}

		if ($to == 'USD') {
			$url = "https://openexchangerates.org/api/latest.json?app_id={$config->openexchangerate_appid}&base=USD";
		}
		$ch = curl_init($url); 
		if ($ch === false) {
			throw new Exception('OpenExchangeRate: failed to initialize curl session.');
		}	
		curl_setopt($ch, CURLOPT_TIMEOUT, 60);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		$res = curl_exec($ch); 
		if ($res === false) {
			throw new Exception(curl_error($ch), curl_errno($ch));
		}
		if (curl_errno($ch)) {
			$error = curl_error($ch); 
			curl_close($ch);
			throw new Exception('OpenExchangeRate: a network error occurred: ' . $error);
		}
		$result = json_decode($res, true);
		if (!$from) {
			$from = 'USD'; 
		}
		$rate = $result['rates'][$from];
		return $rate;
	}
}
