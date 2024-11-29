<?php

class HyperWalletHelper {

    public static function fetchUser($userToken) {
        $data = new StdClass;

        try {
            $hw = new HyperWalletV3();

            if ($userToken && substr($userToken , 0, 3) == 'usr') {
                $data->user = $hw->get('/users/' . $userToken, array());
            }
        }
        catch(Exception $e) {
            $error = LocalizedString::getString('error.error-encountered', 'An error was encountered') . ": " . $e->getMessage();
            $data->errors = $error;
        }

        return $data;
    }

	public static function updateUser($patient, $config, $host_name = null) {
        $output = new StdClass;

        $data = array();
        $data['clientUserId'] = $patient->id."-".$host_name;
        $data['firstName'] = $patient->firstname;
        $data['lastName'] = $patient->lastname;
        $data['middle'] = $patient->middle;
        $data['dateOfBirth'] = $patient->dob;
        $data['mobileNumber'] = $patient->phonenumber;
        $data['profileType'] = 'INDIVIDUAL';

        //Disable setting the email
        // if ($patient->emailaddress) {
        //     $data['email'] = $patient->emailaddress;
        // }
        if ($patient->address) {
            $data['addressLine1'] = $patient->address;
        }
        if ($patient->city) {
            $data['city'] = $patient->city;
        }
        if ($patient->state) {
            $data['stateProvince'] = $patient->state;
        }
        if ($patient->country) {
            $data['country'] = $patient->country;
        }

        if ($patient->zipcode) {
            $data['postalCode'] = $patient->zipcode;
        }
        
        try {
            $hw = new HyperWalletV3();
            $output->user = $hw->put('/users/' . $patient->user_token_card, $data);
        }
        catch (Exception $e) {
            $error = LocalizedString::getString('error.error-encountered', 'An error was encountered') . ": " . $e->getMessage();
            $output->errors = $error;
        }

        return $output;
    }

    //Currently not used
    public static function createUser($patient, $config) {
        $output = new StdClass;

        $data = array(
            'clientUserId' => $patient->id,
            'profileType' => 'INDIVIDUAL',
            'firstName' => $patient->firstname,
            'lastName' => $patient->lastname,
            'dateOfBirth' => $patient->dob,
            // 'email' => $patient->emailaddress,
            'addressLine1' => $patient->address,
            'city' => $patient->city,
            'stateProvince' => $patient->state,
            'country' => $patient->country,
            'postalCode' => $patient->zipcode,
            'programToken' => $config->hyperwallet_programToken
        );

        try {
            $hw = new HyperWalletV3();
            $output->user = $hw->post('/users', $data);
        }
        catch (Exception $e) {
            $error = LocalizedString::getString('error.error-encountered', 'An error was encountered') . ": " . $e->getMessage();
            $output->errors = $error;
        }

        return $output;
    }

    //Currently not used
    public static function assignCard($userToken) {
        $output = new StdClass;

        try {
            $hw = new HyperWalletV3();
            $url = "/users/$userToken/prepaid-cards";
            $data = array(
                'type' => 'PREPAID_CARD',
            );
            $output->data = $hw->post($url, $data);
        }
        catch(Exception $e) {
            $error = LocalizedString::getString('error.service-provided-issues', 'Our service provided is currently experiencing a technical issue') . ': ' . $e->getMessage();
            $output->errors = $error;
        }

        return $output;
    }

    //Currently not used
    public static function replaceCard($userToken, $cardToken) {
        $output = new StdClass;

        try {
            $hw = new HyperWalletV3();
            $url = "/users/$userToken/prepaid-cards";
            $data = array(
                'type' => 'PREPAID_CARD',
                'replacementOf' => $cardToken,
                'replacementReason' => 'DAMAGED'
            );

            $output->data = $hw->post($url, $data);
        }
        catch(Exception $e) {
            $error = LocalizedString::getString('error.service-provided-issues', 'Our service provided is currently experiencing a technical issue') . ': ' . $e->getMessage();
            $output->errors = $error;
        }

        return $output;
    }

    public static function fetchCard($icn) {
        $output = new StdClass;

        try {
            $hw = new HyperWalletV3();
            $url = "/instant-issue-prepaid-cards?inventoryControlNumber=$icn";

            $apiOutput = $hw->get($url, array());
            $output->data = $apiOutput->data[0];
        }
        catch(Exception $e) {
            $error = LocalizedString::getString('error.service-provided-issues', 'Our service provided is currently experiencing a technical issue') . ': ' . $e->getMessage();
            $output->errors = $error;
        }

        return $output;
    }

    public static function updateCard($token, $userToken) {
        $output = new StdClass;

        try {
            $hw = new HyperWalletV3();
            $url = "/instant-issue-prepaid-cards/$token";
            $data = array();
            $data['userToken'] = $userToken;

            $apiOutput = $hw->put($url, $data);
            $output->data = $apiOutput;
        }
        catch(Exception $e) {
            $error = LocalizedString::getString('error.service-provided-issues', 'Our service provided is currently experiencing a technical issue') . ': ' . $e->getMessage();
            $output->errors = $error;
        }

        return $output;
    }

    public static function fetchCardBalance($userToken, $cardToken) {
        $output = new StdClass;

        try {
            $hw = new HyperWalletV3();
            $url = "/users/$userToken/prepaid-cards/$cardToken/balances";

            $apiOutput = $hw->get($url, array());
            $output->data = $apiOutput->data[0];
        }
        catch(Exception $e) {
            $error = LocalizedString::getString('error.service-provided-issues', 'Our service provided is currently experiencing a technical issue') . ': ' . $e->getMessage();
            $output->errors = $error;
        }

        return $output;
    }
}
