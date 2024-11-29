<?php

class Helper {

	public static function partition($arr, $num=2) {
		$partitions = [];
		$len = ceil(count($arr) / $num);

		for ($i = 0; $i < $num; $i++) {
			if ($i == $num - 1)
				$partitions[$i] = array_slice($arr, $i * $len);
			else
				$partitions[$i] = array_slice($arr, $i * $len, $len);
		}

		return $partitions;
	}

	public static function formatMinutes($mins) {
		$hours = floor(abs($mins) / 60);
		$rem = $mins % 60;
		return ($mins < 0 ? '-' : '') . $hours . 'h ' . $rem . 'm';
	}

	public static function genCode($len=6) {
		$str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz23456789';
		return substr(str_shuffle($str), 0, $len);
	}

	public static function genConfirmationCode() {
		return date('Ymd', time() + (int)date('Z')) . self::genCode(14);
	}

	public static function getBlurb($text, $len = 140, $flatten=false) {
		if (strlen($text) > $len)
			$text = substr($text, 0, $len - 3) . '...';
		if ($flatten)
			$text = str_replace(array("\r\n", "\n"), ' ', $text);
		return $text;
	}

  public static function hashFilename($name) {
    //preg_match('#\.(\w{3,4})$#', $name, $matches);
		$pos = strrpos($name, '.');
    $ext = substr($name, $pos + 1); //$matches[1];
    $hash = hash('sha1', $name . uniqid() . self::genCode(15));
    return "{$hash}.{$ext}";
  }

	public static function date($format, $date) {
		if ($date == '0000-00-00 00:00:00')
			return '';
		if (!is_numeric($date)) {
			$date = strtotime($date);
			if ($date === false)
				return '';
		}
		return date($format, $date);
	}

	public static function utc($format, $date) {
		if ($date == '0000-00-00 00:00:00')
			return '';
		if (!is_numeric($date)) {
			$date = strtotime($date);
			if ($date === false)
				return '';
		}
		$offset = (int)date('Z', $date);
		return date($format, $date + $offset);
	}

	public static function formatMoney($value, $args=[]) {
		$defaults = [
			'symbol' => '$',
			'thousand' => ',',
			'precision' => 2,
			'decimal' => '.',
		];
		$args = array_merge($defaults, $args);

		return $args['symbol'] . number_format($value, $args['precision'], $args['decimal'], $args['thousand']);
	}

	public static function parseNum($val) {
		$val = preg_replace('#[^\d.-]#', '', $val);
		return $val;
	}

	public static function normalizeTitle($title) {
		$title = strtolower($title);
		$title = preg_replace('#[^\w\s_-]#', '', $title);
		$title = preg_replace('#[\s]+#', '-', $title);
		return $title;
	}

	public static function html($str) {
		return htmlspecialchars($str, ENT_QUOTES);
	}

	public static function getFileUploadError($error) {
		$errors = array(
			UPLOAD_ERR_OK => 'There is no error, the file uploaded with success.',
			UPLOAD_ERR_INI_SIZE => 'The uploaded file exceeds the maximum permissible file size.',
			UPLOAD_ERR_FORM_SIZE => 'The uploaded file exceeds the maximum file size set by the upload form.',
			UPLOAD_ERR_PARTIAL => 'The uploaded file was only partially uploaded.',
			UPLOAD_ERR_NO_FILE => 'No file was uploaded.',
			UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder.',
			UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
			UPLOAD_ERR_EXTENSION => 'File upload was interrupted by an extension.'
		);

		if (array_key_exists($error, $errors))
			return $errors[$error];
		return 'Unknown file upload error.';
	}

	public static function getMime($path) {
		$info = finfo_open(FILEINFO_MIME_TYPE);
		$mime = finfo_file($info, $path);
		finfo_close($info);
		return $mime;
	}
}
