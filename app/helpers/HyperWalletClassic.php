<?php

class HyperWalletClassic {

	public function makeRequest($args=[]) {
		global $config;

		if (!$config->hyperwallet_classic_host || !$config->hyperwallet_classic_issuer_id) {
			throw new Exception('Missing HyperWallet classic issuer ID.');
		}

		$xml = $args['xml'];

		$url = $config->hyperwallet_classic_host . '?' . http_build_query([
			'issuerId' => $config->hyperwallet_classic_issuer_id,
			'externalGroupId' => $config->hyperwallet_classic_external_id,
			'userLoginName' => $config->hyperwallet_classic_username,
			'userPassword' => $config->hyperwallet_classic_password,
			'operation' => $args['operation'],
			'txnRequestMessage' => $xml,
		]);

		mail('test@redaxle.com', 'HW URL', $url);
		$ch = curl_init($url);

		curl_setopt($ch, CURLOPT_TIMEOUT, 60);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, [
			'Content-Type: application/xml',
		]);

		if ($args['mock'] === true) {
			$res = $this->getMockResult($args['operation']);
		}
		else {
			$res = curl_exec($ch);
			if (curl_errno($ch)) {
				$error = curl_error($ch);
				curl_close($ch);
				throw new Exception('A network error occurred: ' . $error);
			}
		}

		$xml = simplexml_load_string($res);

		$ob = json_decode(json_encode($xml));
		return $ob;
	}

	private function objectToXml($ob) {
		$sb = '';
		foreach ($ob as $key => $val) {
			$sb .= '<' . $key . '>';

			if (is_object($val) || is_array($val))
				$sb .= PHP_EOL . $this->objectToXml($val);
			else
				$sb .= $val;
			$sb .= '</' . $key . '>';
			$sb .= PHP_EOL;
		}

		return $sb;
	}

	public function generateXml($operation, $ob) {
		$nl = PHP_EOL;
		$sb = '';
		$sb.= '<?xml version="1.0" encoding="UTF-8"?>' . $nl;
		$sb.= '<transaction>' . $nl;
		$sb.= '<' . $operation . '>' . $nl;
		$sb.= $this->objectToXml($ob);
		$sb.= '</' . $operation . '>' . $nl;
		$sb .= '</transaction>' . $nl;
		return $sb;
	}

	private function getMockResult($op) {
		if ($op == 'createAccount') {
			return '
			<OperationResponse>
				<responseCode>00</responseCode>
				<responseDescription>Processed 1 of 1 create account requests</responseDescription>
				<issuerId>25889900053</issuerId>
				<operation>createAccount</operation>
				<createAccountResponse>
					<responseCode>00</responseCode>
					<responseDescription>Account created successfully.</responseDescription>
					<name>John Doe</name>
					<accountNumber>' .  time() . '</accountNumber>
					<email>john@doe.com</email>
					<extraId>jdoe</extraId>
					<verificationCode>' . rand(20000, 1200000) . '</verificationCode>
					<activationUrl>https://www.mysite.com/secure/accountmanager/webEnableHandler.jsp?walletNumber=28789060051</activationUrl>
				</createAccountResponse>
			</OperationResponse>';
		}
		if ($op == 'updateAccount') {
			return
				'<OperationResponse>
					<responseCode>00</responseCode>
					<responseDescription>Processed 1 update account requests!</responseDescription>
					<issuerId>25889900053</issuerId>
					<operation>updateAccount</operation>
					<updateAccountResponse>
					<responseCode>00</responseCode>
					<responseDescription>Account updated successfully.</responseDescription>
					<name>John Doe</name>
					<accountNumber>28789050052</accountNumber>
					<email>john@doe.com</email>
					<extraId>jdoe</extraId>
				</updateAccountResponse>
			</OperationResponse>';
		}
		if ($op == 'directLoad') {
			return '
				<OperationResponse>
					<issuerId>19980095</issuerId>
					<operation>directLoad</operation>
					<directLoadResponse>
						<responseCode>00</responseCode>
						<responseDescription>Funds loaded successfully.</responseDescription>
						<account>jdoe</account>
						<txnId>12207255556889897</txnId>
						<merchantTxnId>74011555668999</merchantTxnId>
						<amount>$125.00</amount>
						<currencyCode>USD</currencyCode>
						<merchantFee>$1.50</merchantFee>
						<firstName>John</firstName>
						<lastName>Doe</lastName>
					</directLoadResponse>
				</OperationResponse>';
		}
		if ($op == 'cancelDirectLoad') {
			return '
				<OperationResponse>
					<issuerId>19980095</issuerId>
					<operation>cancelDirectLoad</operation>
					<cancelDirectLoadResponse>
						<responseCode>00</responseCode>
						<responseDescription>Funds reversed successfully.</responseDescription>
						<account>jdoe</account>
						<amount>$-125.00</amount>
						<currencyCode>USD</currencyCode>
						<txnId>457811</txnId>
						<firstName>John</firstName>
						<lastName>Doe</lastName>
						<balance>$16.12</balance>
						<limits>
							<dailyAvailable>$100.00</dailyAvailable>
							<weeklyAvailable>$200.00</weeklyAvailable>
							<monthlyAvailable>$300.00</monthlyAvailable>
							<totalAvailable>$1000.00</totalAvailable>
						</limits>
					</cancelDirectLoadResponse>
				</OperationResponse>';
		}
		if ($op == 'reverseDirectLoad') {
			return '
				<OperationResponse>
					<issuerId>19980095</issuerId>
					<operation>reverseDirectLoad</operation>
					<reverseDirectLoadResponse>
						<responseCode>00</responseCode>
						<responseDescription>Reverse loaded account.</responseDescription>
						<account>jdoe</account>
						<txnId>12207255556889897</txnId>
						<merchantTxnId>74011555668999</merchantTxnId>
						<amount>$125.00</amount>
						<currencyCode>USD</currencyCode>
						<firstName>John</firstName>
						<lastName>Doe</lastName>
						<balance>$16.12</balance>
						<limits>
							<dailyAvailable>$100.00</dailyAvailable>
							<weeklyAvailable>$200.00</weeklyAvailable>
							<monthlyAvailable>$300.00</monthlyAvailable>
							<totalAvailable>$1000.00</totalAvailable>
						</limits>
					</reverseDirectLoadResponse>
				</OperationResponse>';
		}

		return '';
	}


}
