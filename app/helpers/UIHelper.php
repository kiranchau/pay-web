<?php

class UIHelper {

	public static function display($str, $condition) {
		if ($condition) 
			return $str;
	}

	public static function date($format, $value) {
		if ($value == '0000-00-00 00:00:00')
			return ''; // empty mysql datetime

		$config = $GLOBALS['config'];
		$tz = $config->timezone;

		if (!$tz)
			$tz = 'America/New_York';

		try {
			if (is_numeric($value)) {
				$date = new DateTime('now', new DateTimeZone($tz));
				$date->setDatetime($value);
			}
			else if ($value instanceof DateTime) {
				$date = $value;
				$date->setTimeZone(new DateTimeZone($tz));
			}
			else {
				$date = new DateTime($value, new DateTimeZone('UTC'));
				$date->setTimezone(new DateTimeZone($tz));
			}
		}
		catch (Exception $e) {
			return '';
		}

		if ($format == 'friendly') {
			// displays a date relative to the current time
			$now = new DateTime('now', new DateTimeZone($tz));
			$diff = $now->diff($date, true);

			$days = $diff->format('%a');
			if ($diff->d > 1 || $diff->m > 0 || $diff->y > 0 || $diff->days === false)
				$format = $config->default_date_format;
			else if ($diff->d == 1)
				return "{$diff->d}d {$diff->h}h {$diff->i}m ago";
			else if ($diff->h > 0)
				return "{$diff->h}h {$diff->i}m ago";
			else if ($diff->i > 0)
				return "{$diff->i}m {$diff->s}s ago";
			else
				return "{$diff->s}s ago";
		}
		else if ($format == 'relative') {
			$now = new DateTime('now', new DateTimeZone($tz));
			$same_year = $now->format('Y') == $date->format('Y');
			$same_day = $now->format('Ymd') == $date->format('Ymd');
			if ($same_day) {
				return $date->format('g:i a');
			}
			else if ($same_year) {
				return $date->format('M j');
			}
			return $date->format('M Y');
		}

		return $date->format($format);
	}

}
