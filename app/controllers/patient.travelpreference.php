<?php

$app->get('/patients/(?<patient_id>\d+)/travelpreference', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->record = TravelPref::factory()->plain()->where('patient_id = ?', $req->patient_id)->first();
	return $res->json($ob);
});

$app->post('/patients/(?<patient_id>\d+)/travelpreference', $client_filter, function($req, $res) {
	$ob = new StdClass;
	$ob->status = 2;

	$ob->postData = $req->post;

	$record = TravelPref::factory()->load();
	$record->id = $req->post['id'];
	$errors = $record->validate();

	if ($errors) {
		$ob->errors = $errors;
	}
	else {
		if (!$record->id) {
			$record->date_added = new DateTime;
		}

		$record->date_updated = new DateTime;
		$record->save();

		$ob->status = 0;
		$ob->record = TravelPref::factory()->plain()->first($record->id);
	}

	return $res->json($ob);
});

$app->get('/patients/(?<patient_id>\d+)/travelpreference/pdf', $client_filter, function($req, $res) {

	require_once('app/helpers/fpdf/fpdf.php');
	require_once('app/helpers/fpdi/src/autoload.php');
		
	$ob = new StdClass;
	$ob->status = 2;

	$pref = TravelPref::factory()
	->plain()
	->select('
		travel_pref.*,
		flight_seat_pref.name AS seat_pref_name,
		time_pref1.name AS time_pref1_name,
		time_pref2.name AS time_pref2_name,
		time_pref3.name AS time_pref3_name')
	->table('
		travel_pref
		LEFT JOIN flight_time_pref AS time_pref1 ON travel_pref.flight_time1 = time_pref1.id
		LEFT JOIN flight_time_pref AS time_pref2 ON travel_pref.flight_time2 = time_pref2.id
		LEFT JOIN flight_time_pref AS time_pref3 ON travel_pref.flight_time3 = time_pref3.id
		LEFT JOIN flight_seat_pref ON travel_pref.flight_seat = flight_seat_pref.id
	')
	->where('patient_id = ?', $req->patient_id)->first();
	if (!$pref) {
		return $res->json($ob);
	}

	$location = new StdClass;
	if ($pref->address_same_patient == 1) {
		$patient = Patient::factory()
		->select('account.*, patient.*, account.id as id')
		->table('account join patient on patient.id = account.id')
		->where('patient.id = ?', $req->patient_id)
		->plain()
		->first();
		
		$location->country = $patient->country;
		$location->address = $patient->address;
		$location->address2 = $patient->address2;
		$location->city = $patient->city;
		$location->state = $patient->state;
		$location->zipcode = $patient->zipcode;
	} else {

		$location->country = $pref->country;
		$location->address = $pref->address;
		$location->address2 = $pref->address2;
		$location->city = $pref->city;
		$location->state = $pref->state;
		$location->zipcode = $pref->zipcode;
	}

	$ob->status = 0;
	$pdf = new FPDF();
	$pdf->SetFont('Arial');
	$pdf->SetTextColor(0, 0, 0);

	$lineHeight = 4.5;
	$fieldLineHeight = 10;
	$pdf->AddPage();

	$writeKeyValue = function($key, $val) use ($pdf, $lineHeight) {
		$pdf->SetFont('', 'B');
		$pdf->Write($lineHeight, $key . ' ');
		$pdf->SetFont('', '');
		$pdf->MultiCell(0, $lineHeight, $val);
	};

	$writeValue = function($val, $width, $_lineHeight) use ($pdf, $lineHeight) {
		$height = isset($_lineHeight) ? $_lineHeight : $lineHeight;
		$pdf->Cell($width, $height, $val);
	};

	$pdf->MultiCell(0, $lineHeight, 'Travel Preferences');
	$pdf->Ln($lineHeight);

	$writeKeyValue('MRN:', $pref->patient_id);
	$pdf->Ln($lineHeight);
	$pdf->SetFont('', 'B');
	$pdf->Cell(0, 7, 'Emergency Contact Information:', 1);
	$pdf->SetFont('', '');
	$pdf->Ln(10);

	//row
	$writeValue("First Name:", 40);
	$writeValue("MI:", 10);
	$writeValue("Last Name:", 50);
	//col 2
	$writeValue("Same address as patient:", 0);
	$pdf->Ln();

	$pdf->SetFont('', 'B');
	$writeValue($pref->firstname, 40);
	$writeValue($pref->middle, 10);
	$writeValue($pref->lastname, 50);
	//col 2
	$writeValue($pref->address_same_patient == 1 ? 'Yes' : 'No', 0);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);
	
	//row
	$writeValue("Date of Birth:", 100);
	$writeValue("Country:", 0);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$oDate = new DateTime($pref->dob);
	$sDate = strtoupper($oDate->format("j-M-Y"));
	$writeValue($pref->dob == '0000-00-00' ? '' : $sDate, 100);
	$writeValue($location->country, 0);
	$pdf->Ln($fieldLineHeight);
	$pdf->SetFont('', '');

	//row
	$writeValue("E-mail:", 100);
	$writeValue("Address 1:", 0);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue($pref->emailaddress, 100);
	$writeValue($location->address, 0);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("Mobile Phone:", 100);
	$writeValue("Address 2:", 0);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue($pref->phone_mobile, 100);
	$writeValue($location->address2, 0);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("Home Phone:", 100);
	$writeValue("City:", 0);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue($pref->phone_home, 100);
	$writeValue($location->city, 0);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("", 100);
	$writeValue("State / Province:", 50);
	$writeValue("Postal Code:", 50);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue('', 100);
	$writeValue($location->state, 50);
	$writeValue($location->zipcode, 50);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	$pdf->Ln();
	$pdf->Ln();

	$pdf->SetFont('', 'B');
	$pdf->Cell(0, 7, 'Car Service:', 1);
	$pdf->SetFont('', '');
	$pdf->Ln(10);

	//row
	$pdf->SetFont('', 'B');
	$writeValue("Pick Up Location", 100);
	$writeValue("Drop Off Location", 0);
	$pdf->SetFont('', '');
	$pdf->Ln(6);

	$writeValue("Country:", 100);
	$writeValue("Country:", 0);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue($pref->car_pickup_country, 100);
	$writeValue($pref->car_dropoff_country, 0);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("Company Address 1:", 100);
	$writeValue("Company Address 1:", 0);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue($pref->car_pickup_address, 100);
	$writeValue($pref->car_dropoff_address, 0);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("Company Address 2:", 100);
	$writeValue("Company Address 2:", 0);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue($pref->car_pickup_address2, 100);
	$writeValue($pref->car_dropoff_address2, 0);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("City:", 100);
	$writeValue("City:", 0);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue($pref->car_pickup_city, 100);
	$writeValue($pref->car_dropoff_city, 0);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("State / Province:", 50);
	$writeValue("Postal Code:", 50);
	$writeValue("State / Province:", 50);
	$writeValue("Postal Code:", 50);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue($pref->car_pickup_state, 50);
	$writeValue($pref->car_pickup_zipcode, 50);
	$writeValue($pref->car_dropoff_state, 50);
	$writeValue($pref->car_dropoff_zipcode, 50);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("Special Accommodations:", 100);
	$writeValue("Special Accommodations:", 0);
	$pdf->Ln();
	//col 2

	$pdf->SetFont('', 'B');
	$x = $pdf->GetX();
	$y = $pdf->GetY();

	$pdf->MultiCell(90, 4.5, $pref->car_pickup_accommodations);
	$pdf->SetXY($x + 100, $y);
	$pdf->MultiCell(90, 4.5, $pref->car_dropoff_accommodations);
	$pdf->SetFont('', '');

	$pdf->AddPage();

	$pdf->SetFont('', 'B');
	$pdf->Cell(0, 7, 'Airline Reservations:', 1);
	$pdf->SetFont('', '');
	$pdf->Ln(10);

	//row
	$pdf->SetFont('', 'B');
	$writeValue("Flight Time Preference", 0);
	$pdf->SetFont('', '');
	$pdf->Ln(6);

	//row
	$writeValue("1st Choice:", 66);
	$writeValue("Airline Preference:", 62);
	$writeValue("Frequent Flyer # (If applicable):", 66);
	$pdf->Ln();

	$pdf->SetFont('', 'B');
	$writeValue($pref->time_pref1_name, 66);
	$writeValue($pref->flight_airline, 62);
	$writeValue($pref->flight_frequent_flyer, 66);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("2nd Choice:", 66);
	$writeValue("Seating Preference:", 62);
	$writeValue("Transportation To/From Airport:", 66);
	$pdf->Ln();

	$pdf->SetFont('', 'B');
	$writeValue($pref->time_pref2_name, 66);
	$writeValue($pref->seat_pref_name, 62);
	$writeValue($pref->flight_has_trans > 0 ? $pref->flight_has_trans == 1 ? 'No' : 'Yes' : '', 66);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);
	$xx = $pdf->GetX();
	//row
	$writeValue("3rd Choice:", 66);

	$x = $pdf->GetX();
	$y = $pdf->GetY();

	$pdf->MultiCell(55, 4.5, 'Airport Preference (If multiple airports are in the area):');
	$yy = $pdf->GetY();
	$pdf->SetXY($x + 62, $y);
	$pdf->MultiCell(62, 4.5, 'Special Accommodations:');
	$pdf->SetFont('', '');

	$pdf->SetXY($xx, $yy);

	$pdf->SetFont('', 'B');
	$writeValue($pref->time_pref3_name, 66);
	$writeValue($pref->flight_airport, 62);
	$pdf->MultiCell(62, 4.5, $pref->flight_accommodations);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	// $pdf->Ln();
	// $pdf->Ln();

	$pdf->SetFont('', 'B');
	$pdf->Cell(0, 7, 'Hotel Reservations:', 1);
	$pdf->SetFont('', '');
	$pdf->Ln(10);

	//row
	$writeValue("Hotel Chain Preference:", 100);
	$writeValue("Room Preference:", 0);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$writeValue($pref->hotel_chain, 100);
	$writeValue($pref->hotel_room, 0);
	$pdf->SetFont('', '');
	$pdf->Ln($fieldLineHeight);

	//row
	$writeValue("Special Accommodations:", 200);
	$pdf->Ln();
	//col 2
	$pdf->SetFont('', 'B');
	$pdf->MultiCell(200, 4.5, $pref->hotel_accommodations);
	$pdf->SetFont('', '');

	$pdf->Output('D',"{$pref->patient_id}_travelpreference.pdf");
	

	return $res->json($ob);
});