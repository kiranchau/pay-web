<?php

class Mailer {

	public static function send($args) {
		global $config;
		$from_set = false;
		$headers = $args['headers'] ?: [];
		$subject = $args['subject'] ?: '';
		$text = $args['text'] ?: '';
		$html = $args['html'] ?: '';
		$to = $args['to'] ?: $config->webmaster_email;
		$fields = $args['fields'] ?: [];
		$trimlines = isset($args['trim']) ? $args['trim'] : true;
		$theme = isset($args['theme']) ? $args['theme'] : true;

		if ($fields) {
			foreach ($fields as $key => $val) {
				$find = '{{' . $key . '}}';
				$rep = is_scalar($val) ? $val : print_r($val, true);
				$text = str_replace($find, $rep, $text);
				$html = str_replace($find, $rep, $html);
				$subject = str_replace($find, $rep, $subject);
			}
		}

		if ($trimlines) {
			$pat = "#^[ \t]+#m";
			$text = preg_replace($pat, '', $text);
			$html = preg_replace($pat, '', $html);
		}

		$body = $text;

		$headers['MIME-Version'] = '1.0';
		if ($html && !$text) {
			$headers['Content-Type'] = 'text/html; charset=UTF-8';
			$headers['Content-Transfer-Encoding'] = 'base64';
			if ($theme)
				$body = self::theme($html);
			else
				$body = $html;
		}

		foreach ($headers as $key => $val) {
			$key = trim($key);
			if (strtolower($key) == 'from')
				$from_set = true;
		}

		if (!$from_set)
			$headers['From'] = $config->from_header;

		foreach ($headers as $key => &$val)
			$val = $key . ': ' . $val;

		$headers = implode("\r\n", $headers);

		if (filter_var($to, FILTER_VALIDATE_EMAIL)) {
			$to = '<' . $to . '>';
		}

		if (defined('DEBUG_EMAIL_TO_FILE') && DEBUG_EMAIL_TO_FILE) {
			$email_file_name = DEBUG_EMAIL_FILE;
			$jsondata = file_get_contents($email_file_name);
			$arr_data = json_decode($jsondata, true);
			$emailData = [
				'to' => $to,
				'subject' => $subject,
				'body' => $body,
				'headers' => $headers,
				'email_flag' => $config->email_flag,
			];
			array_push($arr_data, $emailData);
			$jsondata = json_encode($arr_data, JSON_PRETTY_PRINT);
			file_put_contents($email_file_name, $jsondata);
			return;
		} else {
			$sub = '=?UTF-8?B?' . base64_encode($subject) . '?=';
			$bod = base64_encode($body);
			return mail($to, $sub, $bod, $headers, $config->email_flag);
		}
	}

	public static function theme($inner) {
		$nl = "\n";

		$styleMap = [
			'info_table_style' => 'max-width: 580px; border: 1px solid #ddd; border-collapse: separate; border-spacing: 1px',
			'action_button_style' => 'display: inline-block; padding: 8px 20px; border-radius: 6px; background: #191919; color: #fff; border: 1px solid transparent; text-decoration: none',
			'hollow_button_style' => 'display: inline-block; padding: 8px 20px; border-radius: 6px; color: #191919; border: 1px solid #191919; text-decoration: none',
		];

		$html = <<<EOD
<!doctype html>
<html lang="en">
<head></head>
<body>
<div style="background: #f5f5f5; padding: 10px;">
	<div style="border-radius: 3px; background: #fff; margin: 0 auto; width: 100%; max-width: 560px; padding: 10px">
		$inner
	</div>
</div>
</body>
</html>
EOD;

		foreach ($styleMap as $key => $style)
			$html = str_replace('{{' . $key . '}}', $style, $html);

		return $html;
	}

}
