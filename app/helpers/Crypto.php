<?php

class Crypto {

	private $keyfile = '';

	public function __construct($keyfile='') {
		$this->keyfile = $keyfile;
	}

	public function getKeyFile() {
		return $this->keyfile;
	}

	public function setKeyFile($keyfile) {
		$this->keyfile = $keyfile;
	}

  private function iv() {
    $size = mcrypt_get_iv_size(MCRYPT_RIJNDAEL_256, MCRYPT_MODE_CBC);
    $iv = mcrypt_create_iv($size, MCRYPT_DEV_URANDOM);
    return base64_encode($iv);
  }

  public function encrypt($str) {

		if (!file_exists($this->keyfile))
			throw new Exception('Missing required keyfile.');

    $key = file_get_contents($this->keyfile);

		if (strlen($key) > 32) {
			throw new Exception('Only 32 bit keys are supported');
		}

    if (strlen($key) != 32) {
      $key = str_pad($key, 32, "\0", STR_PAD_RIGHT);
    }   

		$encodedIV = $this->iv();
    $iv = base64_decode($encodedIV);

    $crypted = mcrypt_encrypt(MCRYPT_RIJNDAEL_256, $key, $str, MCRYPT_MODE_CBC, $iv);
    $crypted = $encodedIV . '$' . base64_encode($crypted);

    return $crypted;
  }

  public function decrypt($str) {
		list($encodedIV, $encrypted) = explode('$', $str);
		if (!$encodedIV || !$encrypted) {
			throw new Exception('Input string not in {iv}${enc} format.');
		}

    $iv = base64_decode($encodedIV);
    $key = file_get_contents($this->keyfile);
    if (strlen($key) != 32) {
      $key = str_pad($key, 32, "\0", STR_PAD_RIGHT);
    }   
    $str = base64_decode($encrypted);
    $plain = mcrypt_decrypt(MCRYPT_RIJNDAEL_256, $key, $str, MCRYPT_MODE_CBC, $iv);
    return trim($plain);
  }

}
