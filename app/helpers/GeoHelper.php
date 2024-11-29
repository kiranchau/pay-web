<?php

class GeoHelper {

	public static function reverseGeocode($args) {
		global $config;
		$ch =curl_init("https://maps.googleapis.com/maps/api/geocode/json?latlng=" . rawurlencode($args['lat'] . ',' . $args['lng']));
		curl_setopt($ch, CURLOPT_TIMEOUT, 5);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		$res = curl_exec($ch);

		if (curl_errno($ch)) {
			return false;
		}

		$res = json_decode($res);
		if ($res->status == 'OK' && count($res->results) > 0) {
			$result = $res->results[0];
			return $result;
		}

		return false;
	}

}
