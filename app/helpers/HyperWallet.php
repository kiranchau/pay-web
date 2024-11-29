<?php

require_once 'OAuth.php';

class HyperWallet {
  /* Contains the last HTTP status code returned. */
  public $http_code;
  /* Contains the last API call. */
  public $url;
  /* Set up the API root URL. */
  public $host = "https://demo.paylution.com/";
  /* Set timeout default. */
  public $timeout = 30;
  /* Set connect timeout. */
  public $connecttimeout = 30; 
  /* Verify SSL Cert. */
  public $ssl_verifypeer = FALSE;
  /* Respons format. */
  public $format = 'json';
  /* Decode returned json data. */
  public $decode_json = TRUE;
  /* Contains the last HTTP headers returned. */
  public $http_info;
  /* Immediately retry the API call if the response was not successful. */
  //public $retry = TRUE;

  /**
   * Set API URLS
   */
  function accessTokenURL()  { return $this->host . 'oauth/1.0/accessToken'; }
  function authorizeURL()    { return $this->host . 'oauth/1.0/authorize'; }
  function requestTokenURL() { return $this->host . 'oauth/1.0/requestToken'; }

  /**
   * Debug helpers
   */
  function lastStatusCode() { return $this->http_status; }
  function lastAPICall() { return $this->last_api_call; }

  /**
   * construct TwitterOAuth object
   */
  function __construct($consumer_key, $consumer_secret, $oauth_token = NULL, $oauth_token_secret = NULL) {
    global $config;
    $this->host = $config->hyperwallet_host; //MyConfigItem('RTPHost');
    $this->sha1_method = new OAuthSignatureMethod_HMAC_SHA1();
    $this->consumer = new OAuthConsumer($consumer_key, $consumer_secret);
    if (!empty($oauth_token) && !empty($oauth_token_secret)) {
      $this->token = new OAuthConsumer($oauth_token, $oauth_token_secret);
    } else {
      $this->token = NULL;
    }
    
  }


  /**
   * Get a request_token from Twitter
   *
   * @returns a key/value array containing oauth_token and oauth_token_secret
   */
  function getRequestToken($oauth_callback) {
    $parameters = array();
    $parameters['oauth_callback'] = $oauth_callback; 
    $request = $this->oAuthRequest($this->requestTokenURL(), 'GET', $parameters);
    $token = OAuthUtil::parse_parameters($request);
    $this->token = new OAuthConsumer($token['oauth_token'], $token['oauth_token_secret']);
    return $token;
  }

  /**
   * Get the authorize URL
   *
   * @returns a string
   */
  function getAuthorizeURL($token, $sign_in_with_hyperWallet = TRUE) {
    if (is_array($token)) {
      $token = $token['oauth_token'];
    }
    if (empty($sign_in_with_hyperWallet)) {
      return $this->authorizeURL() . "?oauth_token={$token}";
    } else {
       return $this->authenticateURL() . "?oauth_token={$token}";
    }
  }

  /**
   * Exchange request token and secret for an access token and
   * secret, to sign API calls.
   *
   * @returns array("oauth_token" => "the-access-token",
   *                "oauth_token_secret" => "the-access-secret",
   *                "user_id" => "9436992",
   *                "screen_name" => "abraham")
   */
  function getAccessToken($oauth_verifier) {
    $parameters = array();
    $parameters['oauth_verifier'] = $oauth_verifier;
    $request = $this->oAuthRequest($this->accessTokenURL(), 'GET', $parameters);
    $token = OAuthUtil::parse_parameters($request);
    $this->token = new OAuthConsumer($token['oauth_token'], $token['oauth_token_secret']);
    return $token;
  }

  /**
   * One time exchange of username and password for access token and secret.
   *
   * @returns array("oauth_token" => "the-access-token",
   *                "oauth_token_secret" => "the-access-secret",
   *                "user_id" => "9436992",
   *                "screen_name" => "abraham",
   *                "x_auth_expires" => "0")
   */  
  function getXAuthToken($username, $password) {
    $parameters = array();
    $parameters['x_auth_username'] = $username;
    $parameters['x_auth_password'] = $password;
    $parameters['x_auth_mode'] = 'client_auth';
    $request = $this->oAuthRequest($this->accessTokenURL(), 'POST', $parameters);
    $token = OAuthUtil::parse_parameters($request);
    $this->token = new OAuthConsumer($token['oauth_token'], $token['oauth_token_secret']);
    return $token;
  }

  /**
   * GET wrapper for oAuthRequest.
   */
  function get($url, $parameters = array()) {
    $response = $this->oAuthRequest($url, 'GET', $parameters);
    if ($this->format === 'json' && $this->decode_json) {
      return json_decode($response, true);
    }
    return $response;
  }
  
  /**
   * POST wrapper for oAuthRequest.
   */
  function post($url, $parameters = array()) {
    $response = $this->oAuthRequest($url, 'POST', $parameters);
    if ($this->format === 'json' && $this->decode_json) {
      return json_decode($response);
    }
    return $response;
  }
  
  function put($url, $parameters = array()) {
    $response = $this->oAuthRequest($url, 'PUT', $parameters);
    if ($this->format === 'json' && $this->decode_json) {
      return json_decode($response);
    }
    return $response;
  }

  /**
   * DELETE wrapper for oAuthReqeust.
   */
  function delete($url, $parameters = array()) {
    $response = $this->oAuthRequest($url, 'DELETE', $parameters);
    if ($this->format === 'json' && $this->decode_json) {
      return json_decode($response);
    }
    return $response;
  }

  function headerParameters()
  {
      $request = OAuthRequest::from_consumer_and_token($this->consumer, $this->token, $method, $url, $parameters);
      $request->sign_request($this->sha1_method, $this->consumer, $this->token);
      
      return $request->get_parameters();
  }
  
  /**
   * Format and sign an OAuth / API request
   */
  function oAuthRequest($url, $method, $parameters) {
    if (strrpos($url, 'https://') !== 0 && strrpos($url, 'http://') !== 0) {
      $url = "{$this->host}{$url}";
    }
    if ($method == 'GET' || $method == 'PUT')
    {
        $request = OAuthRequest::from_consumer_and_token($this->consumer, $this->token, $method, $url);
    }
    else
    {
        $request = OAuthRequest::from_consumer_and_token($this->consumer, $this->token, $method, $url, $parameters);
    }
    
    $request->sign_request($this->sha1_method, $this->consumer, $this->token);
    $header = $request->to_header();
    
    switch ($method) {
    case 'GET':
      return $this->http($url, 'GET', $header);
    case 'PUT':
      return $this->http($url, 'PUT', $header, $parameters);
    //case 'POST':
    //  return $this->http($url, 'POST', $header, $parameters);
    default:
      return $this->http($url, $method, $header, OAuthUtil::build_post_parameters($parameters));
      //return $this->http($request->get_normalized_http_url(), $method, $request->to_postdata());
    }
  }

  /**
   * Make an HTTP request
   *
   * @return API results
   */
  function http($url, $method, $header, $postfields = NULL) {
    $this->http_info = array();
    $ci = curl_init();
    /* Curl settings */
    //curl_setopt($ci, CURLOPT_USERAGENT, $this->useragent);
    //curl_setopt($ci, CURLOPT_CONNECTTIMEOUT, $this->connecttimeout);
    //curl_setopt($ci, CURLOPT_TIMEOUT, $this->timeout);
    curl_setopt($ci, CURLOPT_RETURNTRANSFER, TRUE);
    //curl_setopt($ci, CURLOPT_HTTPHEADER, array('Expect:'));
    curl_setopt($ci, CURLOPT_SSL_VERIFYPEER, $this->ssl_verifypeer);
    curl_setopt($ci, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1_2);
    //curl_setopt($ci, CURLOPT_SSL_CIPHER_LIST, 'TLSv1');
    //curl_setopt($ci, CURLOPT_HEADERFUNCTION, array($this, 'getHeader'));
    curl_setopt($ci, CURLOPT_HEADER, FALSE);
    //curl_setopt($ci, CURLOPT_HTTPHEADER, array($header, 'accept: application/json', 'Content-Type: application/json')); 

    curl_setopt($ci, CURLOPT_CUSTOMREQUEST, $method);
    switch ($method) {
      case 'GET':
        curl_setopt($ci, CURLOPT_HTTPHEADER, array($header, 'accept: application/json')); 
        break;
      case 'PUT':
        curl_setopt($ci, CURLOPT_BINARYTRANSFER, TRUE);
        curl_setopt($ci, CURLOPT_HTTPHEADER, array($header, 'accept: application/json', 'Content-Type: application/json')); 
        curl_setopt($ci, CURLOPT_PUT, TRUE);
        
        $putData = tmpfile();
        $toPut = OAuthUtil::build_put_parameters($postfields);
        $ret = fwrite($putData, $toPut);
        fseek($putData, 0);
            
        curl_setopt($ci, CURLOPT_INFILE, $putData);
        curl_setopt($ci, CURLOPT_INFILESIZE, strlen($toPut));
        break;
      case 'POST':
        curl_setopt($ci, CURLOPT_HTTPHEADER, array($header, 'accept: application/json', 'Content-Type: application/x-www-form-urlencoded', 'Content-Length: ' . strlen($postfields))); 
        curl_setopt($ci, CURLOPT_POST, TRUE);
        curl_setopt($ci, CURLOPT_POSTFIELDS, $postfields);
        break;
      case 'DELETE':
        curl_setopt($ci, CURLOPT_CUSTOMREQUEST, 'DELETE');
        if (!empty($postfields)) {
          $url = "{$url}?{$postfields}";
        }
    }

    curl_setopt($ci, CURLOPT_URL, $url);
    $response = curl_exec($ci);
    $this->http_code = curl_getinfo($ci, CURLINFO_HTTP_CODE);
    $this->http_info = array_merge($this->http_info, curl_getinfo($ci));

    if ($this->http_code != 200) {
        $msg = "A problem was encountered while making this API request.";
        $msg.= " Below are the details to pass on to your developer or HyperWallet (productionsupport@hyperwallet.com).\n\n";
        $msg.= "API Endpoint: $url\n\n";
        $msg.= "Request Data:\n";
        $msg.= print_r($postfields, true) . "\n\n";
        $msg.= "Response:\n";
				$json = json_decode($response);
				if (json_last_error()) {
					if (function_exists('json_last_error_msg')) {
						$msg.= "JSON Error: " . json_last_error_msg();
					}
					$msg.= PHP_EOL;
					$msg.= $response;
				}
				else {
					$msg.= print_r($json, true) . "\n\n";
				}
        $msg.= "cURL Request Info\n";
        $msg.= print_r($this->http_info, true);

        global $config;
        mail("test@redaxle.com,$config->support_email", 'HyperWallet API Issue for ' . $config->system->url, $msg, "From: RealTime CTMS <$config->support_email>", '-f ' . $config->support_email);
    }

	$msg = "";
	$msg.= "API Endpoint: $url\n\n";
	$msg.= "Request Data:\n";
	$msg.= print_r($postfields, true) . "\n\n";
	$msg.= "Response:\n";
			$json = json_decode($response);
			if (json_last_error()) {
				if (function_exists('json_last_error_msg')) {
					$msg.= "JSON Error: " . json_last_error_msg();
				}
				$msg.= PHP_EOL;
				$msg.= $response;
			}
			else {
				$msg.= print_r($json, true) . "\n\n";
			}
	$msg.= "cURL Request Info\n";
	$msg.= print_r($this->http_info, true);

	global $config;
	//mail("todd@redaxle.com", 'GlobalPay HyperWallet API Call: ' . $config->system->url, $msg, "From: RealTime CTMS <$config->support_email>", '-f ' . $config->support_email);

    $this->url = $url;
    if ($method == "PUT") fclose($putData);
    curl_close ($ci);
    return $response;
  }

  /**
   * Get the header info to store.
   */
  function getHeader($ch, $header) {
    $i = strpos($header, ':');
    if (!empty($i)) {
      $key = str_replace('-', '_', strtolower(substr($header, 0, $i)));
      $value = trim(substr($header, $i + 2));
      $this->http_header[$key] = $value;
    }
    return strlen($header);
  }
}
