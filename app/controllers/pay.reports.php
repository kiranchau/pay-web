<?php

function fillColorSheetCell($color, $sheet, $location){
    $sheet->getStyle($location)
    ->getFill()
    ->setFillType(PHPExcel_Style_Fill::FILL_SOLID)
    ->getStartColor()
    ->setRGB($color);
}

function fontColorSheetCell($color, $sheet, $location) {
    $styleArray = array('font'  => array('color' => array('rgb' => $color)));
        
        $sheet->getStyle($location)->applyFromArray($styleArray);
}

function boldFont($sheet, $location) {
    $sheet->getStyle($location)->getFont()->setBold(true);
}

function columnWidthSheetCell($width, $sheet, $column) {
    $sheet->getColumnDimension($column)->setAutoSize(false);
    $sheet->getColumnDimension($column)->setWidth($width);
}

function horizontalRightSheetCell($sheet, $location) {
    $sheet->getStyle($location)->getAlignment()->setHorizontal(PHPExcel_Style_Alignment::HORIZONTAL_RIGHT);
}

function formatSheetCellToAccounting($sheet, $location){
    $sheet->getStyle($location)->getNumberFormat()->setFormatCode('$#,##0.00');
}

function generateExcelDownload($title, $records, $map=[], $req = "") {
	require_once 'app/helpers/phpexcel/Classes/PHPExcel.php';
	ini_set("max_execution_time", 600);
	ini_set("memory_limit", '4G');
	$tz = $req->get['_timezone'];
	$xl = new PHPExcel;
	$xl->getProperties()
		->setCreator('RealTime-Pay')
		->setTitle($title);

	$xl->setActiveSheetIndex(0);
	$xl->getActiveSheet()->setTitle('Report');

	$filename = str_replace(' ', '-', $title) . '-' . date('YmdHis') . '.xlsx';
	// Redirect output to a client’s web browser (Excel2007)
	ob_end_clean();

	$sheet = $xl->getActiveSheet();
	$row = 0;
	$headers = array_values($map);

	if ($headers) {
		$row++;
		foreach ($headers as $col => $header) {
			$sheet->setCellValueByColumnAndRow($col, $row, $header);
		}

		$sheet->freezePane('A' . ($row + 1));

		foreach ($records as $record) {
			$col = 0;
			foreach ($map as $field => $_) {
				$cellValue = $record->{$field};
				if (preg_match('#^date#i', $field)) {
					$ts = strtotime($cellValue);
					if ($ts !== false) {
						$cellValue = strtoupper(date('d-M-Y H:i:s A', $ts));
					}
				}

				if ($field == 'visit_start_date' || $field == 'travel_start_date' || $field == 'travel_end_date') {

					$ts = strtotime($cellValue);
					if ($ts !== false) {
						$cellValue = strtoupper(date('m/d/Y', $ts));
					}
				}

				if ($field == 'submitted_date') {
					$array = explode(', ', $cellValue);
					$ts = strtotime($array[0]);
					if ($ts > 0) {
						$dt = new DateTime(date('Y-m-d H:i:s', $ts), new DateTimeZone('UTC'));
						$cellValue = $dt->setTimezone(new DateTimeZone($tz))->format('m/d/Y h:i:s A');
					}
					else{$cellValue = '-';}
				}

				if ($field == 'icf_date_added') {
					$array = explode(', ', $cellValue);
					$ts = strtotime($array[0]);

					if ($ts > 0) {$cellValue = strtoupper(date('m-d-Y h:i:s A', $ts));}
					else{$cellValue = '-';}
                }

				if ($field == 'visit_starting_date') {
					$array = explode(', ', $cellValue);
					$ts = strtotime($array[0]);
					$split = explode(' ', $cellValue);
					$myTime = $split[1] == "00:00:00" ? "" : strtoupper(date('H:i A', $ts));
					$myDate = strtoupper(date('d-M-Y', $ts));
					$cellValue = $ts > 0 ? $myDate . ' ' . $myTime : '-';
				}

				if ($field == 'travel_departure' || $field == 'travel_return') {
					$array = explode(', ', $cellValue);
					$ts = strtotime($array[0]);
					$split = explode(' ', $cellValue);
					$myTime = $split[1] == "00:00:00," ? "00:00" : strtoupper(date('h:i A', $ts));
					$myDate = strtoupper(date('m/d/Y', $ts));
					$cellValue = $ts > 0 ? $myDate . ' ' . $myTime : '-';
				}

				$sheet->setCellValueByColumnAndRow($col, $row + 1, $cellValue);
				$col++;
			}
			$row++;
		}
		foreach ($headers as $col => $header) {
			$sheet->getColumnDimension(PHPExcel_Cell::stringFromColumnIndex($col))->setAutoSize(true);
		}
	}
	else {
		$sheet->setCellValueByColumnAndRow($col, $row + 1, 'Coming soon');
		$row++;
	}

	header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	header('Content-Disposition: attachment; filename="' . $filename . '"');
	header('Cache-Control: max-age=0');
	// If you're serving to IE 9, then the following may be needed
	header('Cache-Control: max-age=1');
	// If you're serving to IE over SSL, then the following may be needed
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT'); // Date in the past
	header('Last-Modified: '.gmdate('D, d M Y H:i:s').' GMT'); // always modified
	header('Cache-Control: cache, must-revalidate'); // HTTP/1.1
	header('Pragma: public'); // HTTP/1.0

	$writer = PHPExcel_IOFactory::createWriter($xl, 'Excel2007');
	$writer->save('php://output');
	die();
}

function generateExcelBalanceDownload($title, $records, $map=[], $props) {
	require_once 'app/helpers/phpexcel/Classes/PHPExcel.php';
	ini_set("max_execution_time", 600);
	ini_set("memory_limit", '4G');

	$xl = new PHPExcel;
	$xl->getProperties()
		->setCreator('RealTime-Pay')
		->setTitle($title);

	$xl->setActiveSheetIndex(0);
	$xl->getActiveSheet()->setTitle('Report');

	$filename = str_replace(' ', '-', $title) . '-' . date('YmdHis') . '.xlsx';
	// Redirect output to a client’s web browser (Excel2007)
	ob_end_clean();
    $finalBalance = number_format($props->beginningBalance + $props->deposits - $props->withdrawls, 2);
    $withdrawls = number_format($props->withdrawls, 2);
    $deposits = number_format($props->deposits, 2);
    $withdrawals = number_format($props->withdrawls, 2);
    $beginningBalance = number_format($props->beginningBalance, 2);
    $currentDate = date('Y-m-d H:i:s');
    $firstname = $props->user->firstname;
    $lastname = $props->user->lastname;

	$sheet = $xl->getActiveSheet();
    $sheet->setCellValueByColumnAndRow(0, 1, "RealTime-PAY - Balance Detail");
	$sheet->setCellValueByColumnAndRow(0, 2, "Generated on: $currentDate by $firstname $lastname");
	$sheet->setCellValueByColumnAndRow(0, 3, "Date Filter: $props->startDate - $props->endDate");
    $sheet->setCellValueByColumnAndRow(0, 5, "Activity Summary");
	$row = 6;
	if(Sys::getFeatureFlag() == 1){
		$sheet->setCellValueByColumnAndRow(0, $row, "Note");
		$sheet->setCellValueByColumnAndRow(1, $row++, "This report will show the payment balance for the selected payment processor. If all payment processors are selected, the balance is the balance across all processors.");
		$sheet->mergeCells("B6:I6");
	}
	$sheet->setCellValueByColumnAndRow(0, $row, "Beginning Balance on $props->startDate");
    $sheet->setCellValueByColumnAndRow(1, $row++, "$$beginningBalance");
    $sheet->setCellValueByColumnAndRow(0, $row, "Deposits/Additions");
    $sheet->setCellValueByColumnAndRow(1, $row++, "$$deposits");
    $sheet->setCellValueByColumnAndRow(0, $row, "Withdrawls/Subtractions");
    $sheet->setCellValueByColumnAndRow(1, $row++, "$$withdrawls");
    $sheet->setCellValueByColumnAndRow(0, $row, "Ending Balance on $props->endDate");
    $sheet->setCellValueByColumnAndRow(1, $row++, "$$finalBalance");
    fillColorSheetCell('a0c13c', $sheet, "A1");
    fillColorSheetCell('a0c13c', $sheet, "A5");
	boldFont($sheet, "A1");
	boldFont($sheet, "A5");
	$sheet->getStyle('B7')->getNumberFormat()->setFormatCode("_(\"$\"* #,##0.00_);_(\"$\"* \(#,##0.00\);_(\"$\"* \"-\"??_);_(@_)");
	$sheet->getStyle('B8')->getNumberFormat()->setFormatCode("_(\"$\"* #,##0.00_);_(\"$\"* \(#,##0.00\);_(\"$\"* \"-\"??_);_(@_)");
	$sheet->getStyle('B9')->getNumberFormat()->setFormatCode("_(\"$\"* #,##0.00_);_(\"$\"* \(#,##0.00\);_(\"$\"* \"-\"??_);_(@_)");
	$sheet->getStyle('B10')->getNumberFormat()->setFormatCode("_(\"$\"* #,##0.00_);_(\"$\"* \(#,##0.00\);_(\"$\"* \"-\"??_);_(@_)");
	$headers = array_values($map);

	if ($headers) {
		$row++;
		foreach ($headers as $col => $header) {
			$sheet->setCellValueByColumnAndRow($col, $row, $header);
		}

		$sheet->freezePane('A' . ($row + 1));
		$alphabet = range('A', 'Z');

		foreach ($records as $record) {
			$col = 0;
			foreach ($map as $field => $_) {
				$cellValue = $record->{$field};
				if (preg_match('#^date#i', $field)) {
					$ts = strtotime($cellValue);
					if ($ts !== false) {
						$cellValue = strtoupper(date('d-M-Y H:i:s A', $ts));
					}
				}
				if ($field == 'visit_start_date') {
					$ts = strtotime($cellValue);
					if ($ts !== false) {
						$cellValue = strtoupper(date('d-M-Y', $ts));
					}
				}

				$sheet->setCellValueByColumnAndRow($col, $row + 1, $cellValue);
				$col++;

				if ($field == 'credit' || $field == 'debit' || $field == 'daily_balance') {
					$sheet->getStyle($alphabet[$col - 1] . $row)->getNumberFormat()->setFormatCode("_(\"$\"* #,##0.00_);_(\"$\"* \(#,##0.00\);_(\"$\"* \"-\"??_);_(@_)");
				}
			}
			$row++;
		}
		foreach ($headers as $col => $header) {
			$sheet->getColumnDimension(PHPExcel_Cell::stringFromColumnIndex($col))->setAutoSize(true);
		}
	}
	else {
		$sheet->setCellValueByColumnAndRow($col, $row + 1, 'Coming soon');
		$row++;
	}

	header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	header('Content-Disposition: attachment; filename="' . $filename . '"');
	header('Cache-Control: max-age=0');
	// If you're serving to IE 9, then the following may be needed
	header('Cache-Control: max-age=1');
	// If you're serving to IE over SSL, then the following may be needed
	header('Expires: Mon, 26 Jul 1997 05:00:00 GMT'); // Date in the past
	header('Last-Modified: '.gmdate('D, d M Y H:i:s').' GMT'); // always modified
	header('Cache-Control: cache, must-revalidate'); // HTTP/1.1
	header('Pragma: public'); // HTTP/1.0

	$writer = PHPExcel_IOFactory::createWriter($xl, 'Excel2007');
	$writer->save('php://output');
	die();
}

$report_filter = function($req, $res, $date_field='patient_request.date_approved') {
	$getDate = function($val) {
		try {
			$dt = new DateTime($val); //createFromFormat('d-M-Y', $val);
			return $dt->format('Y-m-d');
		}
		catch (Exception $e) {
			return '';
		}
	};

	$date_start = $date_end = '';

	if ($req->get['date_start']) {
		$date_start = $getDate($req->get['date_start']);
	}
	if ($req->get['date_end']) {
		$date_end = $getDate($req->get['date_end']);
	}

	$where = '1';
	if ($date_start) {
		$where .= " and DATE(" . $date_field . ") >= DATE('{$date_start}') ";
	}
	if ($date_end) {
		$where .= " and DATE(" . $date_field . ") <= DATE('{$date_end}') ";
	}
	if ($req->get['control_number']) {
		$cn = $req->get['control_number'];
		$where .= " and patient_card.control_number = '{$cn}' ";
	}
	if ($req->get['mrn']) {
		$mrn = intval($req->get['mrn']);
		$where .= " and patient_request.patient_id = '{$mrn}' ";
	}
	if ($req->get['study_id']) {
		$study_id = intval($req->get['study_id']);
		$where .= " and study.id = '$study_id' ";
	}
	if ($req->get['patient_request_study_id']) {
		$study_id = intval($req->get['patient_request_study_id']);
		$where .= " and patient_request.study_id = '$study_id' ";
	}

	if ($req->get['sites']) {
		$site_id = intval($req->get['sites']);
		$where .= " and patient_travel_request.site_id = '$site_id' ";
	}
	if ($req->get['travel_Status']) {
		$travel_Status = $req->get['travel_Status'];
		$where .= " and patient_travel_request.status = '$travel_Status' ";
	}
	$req->whereCriteria = $where;
};

$report_filter_generator = function($date_field) use($report_filter) {
	return function($req, $res) use($report_filter, $date_field) {
		return $report_filter($req, $res, $date_field);
	};
};

// For Travel Report
$app->get('/reports/subject-travel-report', $client_filter,  $report_filter_generator('patient_travel_request.date_added'), function($req, $res) {
	$ob = new StdClass;
	$where = str_replace("patient_request","patient_travel_request", $req->whereCriteria);
	$records = PatientRequest::factory()
			->select("patient_travel_request.id,
				patient_travel_request.study_id,
				patient_travel_request.comment,
				patient_travel_request.patient_id,
				study.protocol,
				travel_status.status as travel_status,
				study.title as studyname,
				study_visit.name as visit_name,
				patient_travel_request.visit_start_date as visit_starting_date,
				patient_travel_request.travel_end_date,
				patient_travel_request.travel_start_date,
				GROUP_CONCAT(distinct travel_request_type.departure_date ORDER BY travel_request_type.label SEPARATOR ', ') as travel_departure,
				GROUP_CONCAT(distinct travel_request_type.return_date ORDER BY travel_request_type.label SEPARATOR ', ') as travel_return,
				patient_travel_request.date_added as submitted_date,
				GROUP_CONCAT(
				distinct travel_request_type.label ORDER BY travel_request_type.label SEPARATOR ', ') as request_types,
				concat(account.firstname, ' ', account.lastname) as submitted_by,
				study_site.name as study_site_name")
			->table("(
				SELECT MAX(id) AS max_id, visit_id
				FROM patient_travel_request
				WHERE deleted = 0
				GROUP BY visit_id
			) AS latest
			JOIN patient_travel_request AS patient_travel_request ON latest.max_id = patient_travel_request.id
				join patient on patient_travel_request.patient_id = patient.id
				join account on account.id = patient_travel_request.submitted_by
				left join travel_status on travel_status.id = patient_travel_request.status
				left join study_site on study_site.id = patient_travel_request.site_id
				join study on study.id = patient_travel_request.study_id
				left join study_visit on study_visit.id = patient_travel_request.visit_id
				left join travel_request_type on patient_travel_request.id = travel_request_type.travel_request_id and travel_request_type.selected = 1")
			->where("account.deleted = 0 and patient_travel_request.deleted = 0 and " . $where)
			->group("patient_travel_request.id")
			->order("patient_travel_request.id DESC")
			->plain()
			->find();
		if ($req->get['excel'])
		{
			$map = [
				'study_id' => 'Study Id',
				'studyname' => 'Study Name',
				'protocol' => 'Protocol',
				'study_site_name' => 'Site',
				'patient_id' => 'MRN',
				'submitted_by' => 'Submitted By',
				'submitted_date' => 'Submitted Date',
				'visit_name' => 'Visit Name',
				'visit_starting_date' => 'Visit Date/Time',
				'request_types' => 'Type Of Travel',
				'travel_departure' => 'Travel Departure',
				'travel_return' => 'Travel Return',
				'travel_start_date' => 'Travel Start Date',
				'travel_end_date' => 'Travel End Date',
				'travel_status' => 'Status',
				'comment' => 'Comment',
			];
			generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map, $req);
		}
		$ob->records = $records;
		return $res->json($ob);
	});

$app->get('/reports/stipend-loads', $client_filter, $report_filter, function($req, $res) {
	$ob = new StdClass;

	$whereCriteria = "{$req->whereCriteria}";

	$feature_flag = Sys::getFeatureFlag();

	if ($req->get['study_id']) {
		$study_id = intval($req->get['study_id']);
		$whereCriteria .= " and study.id = '$study_id'";
	}

	if ($req->get['processor']) {
		$processor = $req->get['processor'];
		$whereCriteria .= " and patient_request.processor = $processor";
	}

	$records = PatientRequest::factory()
		->select("patient_request.id,
			patient_request.patient_id,
			patient_request.date_approved,
			patient_request.transaction_id,
			patient_request.user_approved,
			patient_request.amount,
			patient_request.notes,
			patient_request.status,
			patient_study.study_number,
			concat(user.firstname, ' ', user.lastname) as user_approved_text,
			sponsor.name as sponsor,
			study.protocol,
			patient_card.control_number,
			concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0, substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1, 1)) as initials,
			patient_visit.date as patient_visit_date,
			study_visit_original.name as visit_name,
			study_site.name as study_site_name,
			patient_request.processor,
			pay_processor.name as processor_name")
		->table("patient_request
			left join patient_card on patient_request.card_id = patient_card.id
			join patient on patient_request.patient_id = patient.id
			join patient_study on patient.id = patient_study.patient_id
				and patient_study.site_id = patient_request.site_id
				and patient_study.study_id = patient_request.study_id
				and patient_study.deleted = 0
			join account on account.id = patient_request.patient_id
			left join account user on user.id = patient_request.user_approved
			left join study_site on study_site.id = patient_study.site_id
			left join study on study.id = patient_study.study_id
			left join sponsor on sponsor.id = study.sponsor_id
			left join patient_visit on patient_visit.id = patient_request.patient_visit_id
			left join study_visit_original on study_visit_original.id = patient_request.original_visit
			left join pay_processor on pay_processor.id = patient_request.processor")
		->where("patient_request.date_approved is not null
			and patient_request.status != " . PatientRequest::STATUS_VOIDED .
		" and account.deleted = 0 and " . $whereCriteria)
		->group("patient_request.id")
		->order("patient_request.date_approved")
		->plain()
		->find();
		
	foreach ($records as &$record) {
		if ($record->patient_visit_date) {
			$record->patient_visit_date = strtoupper(Helper::date('d-M-Y', $record->patient_visit_date));
		}
	}

	$map = [
		'study_site_name' => 'Site',
		'sponsor' => 'Sponsor',
		'protocol' => 'Protocol',
		'patient_id' => 'MRN',
		'study_number' => 'Study ID #',
		'initials' => 'Initials',
		'visit_name' => 'Visit Name',
		'patient_visit_date' => 'Visit Date',
		'amount' => 'Amount',
		'control_number' => 'Control Number',
		'user_approved_text' => 'Issued By',
		'date_approved' => 'Transaction Date/Time',
		'transaction_id' => 'Transaction ID',
		'notes' => 'Notes',
	];

	if($feature_flag == 1){
	   $map['processor_name'] = 'Payment Processor';
	}
	if ($req->get['excel']) {
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;
	return $res->json($ob);
});

$app->get('/reports/card-loads', $client_filter, $report_filter, function($req, $res) {
	$ob = new StdClass;

	$whereCriteria = "{$req->whereCriteria}";

	if ($req->get['study_id']) {
		$study_id = intval($req->get['study_id']);
		$whereCriteria .= " and study.id = '$study_id'";
	}

	$records = PatientRequest::factory()
		->select("patient_request.id,
			patient_request.card_id,
			patient_request.patient_id,
			patient_request.date_approved,
			patient_request.transaction_id,
			patient_request.user_approved,
			patient_request.amount,
			patient_request.notes,
			patient_study.study_number,
			concat(user.firstname, ' ', user.lastname) as user_approved_text,
			sponsor.name as sponsor,
			study.protocol,
			patient_card.control_number,
			concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0, substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1, 1)) as initials,
			patient_visit.date as patient_visit_date,
			study_visit_original.name as visit_name,
			study_site.name as study_site_name")
		->table("patient_request
			join patient_card on patient_request.card_id = patient_card.id
			join patient on patient_request.patient_id = patient.id
			join patient_study on patient.id = patient_study.patient_id
				and patient_study.site_id = patient_request.site_id
				and patient_study.study_id = patient_request.study_id
			join account on account.id = patient_request.patient_id
			left join account user on user.id = patient_request.user_approved
			left join study_site on study_site.id = patient_study.site_id
			left join study on study.id = patient_study.study_id
			left join sponsor on sponsor.id = study.sponsor_id
			left join patient_visit on patient_visit.id = patient_request.patient_visit_id
			left join study_visit on study_visit.id = patient_visit.visit_id
			left join study_visit_original on study_visit_original.id = patient_request.original_visit")
		->where("patient_request.date_approved is not null
			and patient_request.status != " . PatientRequest::STATUS_VOIDED .
			" and account.deleted = 0 and " . $whereCriteria)
		->order("patient_request.id")
		->group("patient_request.date_approved")
		->plain()
		->find();
	foreach ($records as &$record) {
		if ($record->patient_visit_date) {
			$record->patient_visit_date = strtoupper(Helper::date('d-M-Y', $record->patient_visit_date));
		}
	}

	if ($req->get['excel']) {
		$map = [
			'study_site_name' => 'Site',
			'sponsor' => 'Sponsor',
			'protocol' => 'Protocol',
			'patient_id' => 'MRN',
			'study_number' => 'Study ID #',
			'initials' => 'Initials',
			'visit_name' => 'Visit Name',
			'patient_visit_date' => 'Visit Date',
			'amount' => 'Amount',
			'control_number' => 'Control Number',
			'user_approved_text' => 'Issued By',
			'date_approved' => 'Transaction Date/Time',
			'transaction_id' => 'Transaction ID',
			'notes' => 'Notes',
		];
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;
	return $res->json($ob);
});

$app->get('/reports/bank-deposits', $client_filter, $report_filter, function($req, $res) {
	$ob = new StdClass;

	$whereCriteria = "{$req->whereCriteria}";
	
	$feature_flag = Sys::getFeatureFlag();

	if ($req->get['study_id']) {
		$study_id = intval($req->get['study_id']);
		$whereCriteria .= " and study.id = '$study_id'";
	}

	if ($req->get['processor']) {
		$processor = $req->get['processor'];
		$whereCriteria .= " and patient_request.processor = $processor";
	}

	$records = PatientRequest::factory()
		->select("patient_request.id,
			patient_request.patient_id,
			patient_request.date_approved,
			patient_request.transaction_id,
			patient_request.user_approved,
			patient_request.amount,
			patient_request.notes,
			patient_request.amount_usd,
			patient_request.conversion_rate,
			patient_study.study_number,
			concat(user.firstname, ' ', user.lastname) as user_approved_text,
			sponsor.name as sponsor,
			study.protocol,
			concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0, substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1 ,1)) as initials,
			patient_visit.date as patient_visit_date,
			study_visit_original.name as visit_name,
			study_site.name as study_site_name,
			patient_request.processor,
			pay_processor.name as processor_name")
		->table("patient_request
			join patient on patient_request.patient_id = patient.id
			join patient_study on patient.id = patient_study.patient_id
				and patient_study.study_id = patient_request.study_id
				and patient_study.site_id = patient_request.site_id
			join account on account.id = patient_request.patient_id
			join account user on user.id = patient_request.user_approved
			left join study_site on study_site.id = patient_study.site_id
			join study on study.id = patient_study.study_id
			join sponsor on sponsor.id = study.sponsor_id
			left join patient_visit on patient_visit.id = patient_request.patient_visit_id
			left join study_visit on study_visit.id = patient_visit.visit_id
			left join study_visit_original on study_visit_original.id = patient_request.original_visit
			left join pay_processor on pay_processor.id = patient_request.processor")
		->where("patient_request.date_approved is not null
		and account.deleted = 0
		and patient.bank_account_id > 0
		and patient_request.status != " . PatientRequest::STATUS_VOIDED . " and " . $whereCriteria)
		->group("patient_request.id")
		->order("patient_request.date_approved")
		->plain()
		->find();
	foreach ($records as &$record) {
		if ($record->patient_visit_date) {
			$record->patient_visit_date = strtoupper(Helper::date('d-M-Y', $record->patient_visit_date));
		}
	}

	$map = [
		'study_site_name' => 'Site',
		'sponsor' => 'Sponsor',
		'protocol' => 'Protocol',
		'patient_id' => 'MRN',
		'study_number' => 'Study ID #',
		'initials' => 'Initials',
		'visit_name' => 'Visit Name',
		'patient_visit_date' => 'Visit Date',
		'amount' => 'Amount',
		'amount_usd' => 'Amount USD',
		'conversion_rate' => 'Conversion Rate',
		'user_approved_text' => 'Issued By',
		'date_approved' => 'Transaction Date/Time',
		'transaction_id' => 'Transaction ID',
		'notes' => 'Notes',
	];

	if($feature_flag == 1){
		$map['processor_name'] = 'Payment Processor';
	}
	
	if ($req->get['excel']) {
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}
	$ob->records = $records;
	return $res->json($ob);
});
$app->get('/reports/deposit-history', $client_filter, $report_filter, function($req, $res) {
	$ob = new StdClass;

    $feature_flag = Sys::getFeatureFlag();
    $whereCriteria = "{$req->whereCriteria}";

	if ($req->get['processor']) {
		$processor = $req->get['processor'];
		$whereCriteria .= " and patient_request.processor = $processor";
	}
	$records = PatientRequest::factory()
		->select("patient_request.id,
			patient_request.patient_id,
			patient_request.date_approved,
			patient_request.transaction_id,
			patient_request.user_approved,
			patient_request.amount,
			patient_request.currency,
			patient_request.notes,
			patient_request.amount_usd,
			patient_request.conversion_rate,
			patient_request.bank_account_id,
			patient_request.card_id,
			patient_study.study_number,
			concat(user.firstname, ' ', user.lastname) as user_approved_text,
			sponsor.name as sponsor,
			study.protocol,
			concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0, substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1 ,1)) as initials,
			study_site.name as study_site_name,
			patient_request.processor,
			pay_processor.name as processor_name")
		->table("patient_request
			join patient on patient_request.patient_id = patient.id
			join patient_study on patient.id = patient_study.patient_id
				and patient_study.study_id = patient_request.study_id
				and patient_study.site_id = patient_request.site_id
			join account on account.id = patient_request.patient_id
			join account user on user.id = patient_request.user_approved
			left join study_site on study_site.id = patient_study.site_id
			join study on study.id = patient_study.study_id
			join sponsor on sponsor.id = study.sponsor_id
			left join pay_processor on pay_processor.id = patient_request.processor")
		->where("patient_request.date_approved is not null
		and account.deleted = 0
		and patient.bank_account_id > 0
		and patient_request.bank_account_id > 0
		and patient_request.status != " . PatientRequest::STATUS_VOIDED . " and " . $whereCriteria)
		->group("patient_request.id")
		->order("patient_request.date_approved")
		->plain()
		->find();

	$map = [
			'study_site_name' => 'Site',
			'sponsor' => 'Sponsor',
			'protocol' => 'Protocol',
			'patient_id' => 'MRN',
			'study_number' => 'Study ID #',
			'initials' => 'Initials',
			'amount' => 'Amount',
			'currency' => 'Currency',
			'amount_usd' => 'Amount USD',
			'conversion_rate' => 'Conversion Rate',
			'user_approved_text' => 'Issued By',
			'date_approved' => 'Transaction Date/Time',
			'transaction_id' => 'Transaction ID',
			'notes' => 'Notes',
		  ];

	if ($feature_flag == 1) {
		$map['processor_name'] = 'Payment Processor';
	}	

	if ($req->get['excel']) {
			generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}
	$ob->records = $records;
	return $res->json($ob);

});
$app->get('/reports/balance-detail', $client_filter, $report_filter, function($req, $res) {
	ini_set('memory_limit', '4G');
	$ob = new StdClass;
	
	$getDate = function($val) {
		try {
			$dt = new DateTime($val); //createFromFormat('d-M-Y', $val);
			return $dt->format('Y-m-d');
		}
		catch (Exception $e) {
			return '';
		}
	};

	$date_start = $date_end = '';

	if ($req->get['date_start']) {
		$date_start = $getDate($req->get['date_start']);
	}
	if ($req->get['date_end']) {
		$date_end = $getDate($req->get['date_end']);
	}

	$feature_flag = Sys::getFeatureFlag();
	
	$whereCriteria = "{$req->whereCriteria}";
	if ($feature_flag == 1) {
		if ($req->get['processor']) {
			$processor = $req->get['processor'];
			$whereCriteria .= " and patient_request.processor = $processor";
		} else {
			$processor = '';
		}
	} else {
		$processor = 1;
	}
	$patientRequestFields = [
		"patient_request.id",
		"patient_request.patient_id",
		"patient_request.transaction_id",
		"patient_request.user_approved",
		"patient_study.study_number",
		"concat(user.firstname, ' ', user.lastname) as user_approved_text",
		"sponsor.name as sponsor",
		"study.protocol",
		"patient_card.control_number",
		"concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0 , substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1, 1)) as initials",
		"patient_request.processor",
		"pay_processor.name as processor_name"
	];
	$stipendRequestFields = implode($patientRequestFields, ", ");

	$patientRequestTableQuery = "
		patient_request
		left join patient_card on patient_request.card_id = patient_card.id
		join patient on patient_request.patient_id = patient.id
		join patient_study on patient.id = patient_study.patient_id
			and patient_request.study_id = patient_study.study_id
			and patient_request.site_id = patient_study.site_id
		join account on account.id = patient_request.patient_id
		join account user on user.id = patient_request.user_approved
		join study on study.id = patient_study.study_id
		join sponsor on sponsor.id = study.sponsor_id
		left join pay_processor on pay_processor.id = patient_request.processor
	";
	$stipendRequests = PatientRequest::factory()
		->select("$stipendRequestFields,
			patient_request.date_approved,
			if(patient_request.amount_usd > 0, patient_request.amount_usd, patient_request.amount) as debit")
		->table("$patientRequestTableQuery")
		->where("patient_request.date_approved is not null and account.deleted = 0 and " . $whereCriteria)
		->group("patient_request.id")
		->order("patient_request.date_approved")
		->plain()
		->events(false)
		->find();

	$where = '1';
	$voidRequestsWhereQuery = 'patient_request.status = 6';
	if ($req->get['processor']) {
		$processor = $req->get['processor'];
		$where .= " and funding_request.processor = $processor";
		$voidRequestsWhereQuery .= " and patient_request.processor = $processor";
	}

	if ($date_start) {
		$where .= " and funding_request.date_approved >= '{$date_start}' ";
		$voidRequestsWhereQuery .= " and date(patient_request.date_voided) >= '{$date_start}'";
	}

	if ($date_end) {
		$where .= " and funding_request.date_approved <= '{$date_end}' ";
		$voidRequestsWhereQuery .= " and date(patient_request.date_voided) <= '{$date_end}' ";
	}

	$voidRequests = PatientRequest::factory()
		->select("$stipendRequestFields,
			concat(voider.firstname, ' ' , voider.lastname) as user_voided_text,
			patient_request.date_voided as date_approved,
			if(patient_request.amount_usd > 0, patient_request.amount_usd, patient_request.amount) as credit")
		->table("$patientRequestTableQuery join account voider on voider.id = patient_request.user_voided")
		->where("patient_request.date_voided is not null and account.deleted = 0 and " . $voidRequestsWhereQuery)
		->group("patient_request.id")
		->order("patient_request.date_voided")
		->plain()
		->find();

	$loadRequests = FundingRequest::factory()
		->select("funding_request.id,
			funding_request.date_approved,
			funding_request.amount as credit,
			concat(requester.firstname, ' ', requester.lastname) as user_issued_text,
			concat(approver.firstname, ' ', approver.lastname) as user_approved_text,
			funding_request.processor,
			pay_processor.name as processor_name")
		->table("funding_request
			left join account requester on requester.id = funding_request.user_id
			left join account approver on approver.id = funding_request.approved_by
			left join pay_processor on pay_processor.id = funding_request.processor")
		->where("date_approved is not null and funding_request.date_voided is null and " . $where)
		->group("funding_request.id")
		->plain()
		->events(false)
		->find();

	$records = [];

	$records = array_merge($records, $stipendRequests);
	$records = array_merge($records, $loadRequests);
	$records = array_merge($records, $voidRequests);

	foreach ($records as $i => $record) {
		$record->id = '' . $i;
	}

	$startingBalance = Reports::getBegginningBalance($date_start, $processor);
	$balances = Reports::calculateBalances($records, $startingBalance);
	$records = $balances['records'];
	$ob->records = $records;

	$map = [
		'date_approved' => 'Transaction Date/Time',
		'transaction_id' => 'Transaction ID',
		'sponsor' => 'Sponsor',
		'protocol' => 'Protocol',
		'control_number' => 'Control Number',
		'patient_id' => 'MRN',
		'study_number' => 'Study ID #',
		'initials' => 'Initials',
		'user_issued_text' => 'Issued By',
		'user_approved_text' => 'Approved By',
		'credit' => 'Deposit / Additions',
		'debit' => 'Withdrawal / Subtractions',
		'daily_balance' => 'Ending Daily Balance',
	];

	if($feature_flag == 1){
		$map['processor_name'] = 'Payment Processor';
	}

	if ($req->get['excel']) {
        $props = new StdClass;
        $props->user = $res->user;
        $props->startDate = $date_start;
        $props->endDate = $date_end;
        $props->beginningBalance = $date_start ? $startingBalance : 0;
        $props->deposits = $balances['deposits'];
        $props->withdrawls = $balances['withdrawals'];

		try {
			generateExcelBalanceDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map, $props);
		}
		catch (Exception $e) {
			var_dump($e);
		}
	}

	return $res->json($ob);
});

$app->get('/reports/study-payments', $client_filter, $report_filter, function($req, $res) {
	ini_set("memory_limit", '4G');
	$ob = new StdClass;
	$detailed = $req->get['detailed'] == 1;
	
	$whereCriteria = "{$req->whereCriteria} and patient_request.date_approved is not null and patient_request.status != " . PatientRequest::STATUS_VOIDED . " and account.deleted = 0";

	if ($req->get['payment_type'] == 1) {
		$whereCriteria = $whereCriteria .= " and patient_visit.id  is NOT NULL";
	} 
	else if ($req->get['payment_type'] == 2) {
		$whereCriteria = $whereCriteria .= " and patient_visit.id  is NULL";
	}

	$initialRecords = PatientRequest::factory()
		->select("patient_request.id,
				patient_request.patient_id,
				patient_request.date_request,
				patient_request.date_approved,
				patient_request.transaction_id,
				patient_request.user_approved,
				patient_request.amount,
				patient_request.amount_usd,
				patient_request.conversion_rate,
				patient_request.notes,
				patient_study.study_number,
				patient_request.visit_id,
				patient_request.currency,
				concat(user.firstname, ' ', user.lastname) as user_approved_text,
				sponsor.name as sponsor,
				study.protocol,
				patient_card.control_number,
				concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0, substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1, 1)) as initials,
				study_visit_original.name as study_visit_name,
				study_site.name as study_site_name")
		->table("patient_request				
				left join patient_card on patient_request.card_id = patient_card.id
				join patient on patient_request.patient_id = patient.id
				join patient_study on patient.id = patient_study.patient_id
					and patient_study.study_id = patient_request.study_id
					and patient_study.site_id = patient_request.site_id
				join account on account.id = patient_request.patient_id
				join account user on user.id = patient_request.user_approved
				left join study_site on study_site.id = patient_study.site_id
				join study on study.id = patient_study.study_id
				join sponsor on sponsor.id = study.sponsor_id
				left join patient_visit as reimbursment_visit on reimbursment_visit.id = patient_request.visit_id
				left join patient_visit on patient_visit.id = patient_request.patient_visit_id
				left join study_visit_original on study_visit_original.id = patient_request.original_visit")
		->where($whereCriteria)
		->group("patient_request.id")
		->order("patient_request.date_approved")
		->plain()
		->find();
			 
	$records = [];
	if ($detailed) {
		$types = [];
		foreach (ReimbursementItemType::factory()->order('sortorder')->find() as $record) {
			$types[$record->id] = $record;
		}
		foreach ($initialRecords as $record) {
			$records[] = $record;

			$stats = PatientRequestItem::factory()
				->raw('select a.request_id as id, b.name, sum(a.amount) as amount, a.type_id
					from patient_request_item a 
					join reimbursement_item_type b on a.type_id = b.id
					where a.request_id = ?
					group by a.id
					order by b.name', $record->id)
				->find();

			$counter = 0;

			foreach ($stats as $itemGroup) {
				$_ob = new StdClass;
				$_ob->id = $record->id . '-' . $itemGroup->type_id . '-' . $counter;
				$_ob->date_approved = '';
				$_ob->transaction_id = '';
				$_ob->sponsor = '';
				$_ob->protocol = '';
				$_ob->control_number = '';
				$_ob->patient_id = '';
				$_ob->initials = $itemGroup->name;
				$_ob->amount = $itemGroup->amount;
				$records[] = $_ob;
				$counter++;
			}

		}
	}
	else {
		$records = $initialRecords;
	}

	if ($req->get['excel']) {
		$map = [
			'study_site_name' => 'Site',
			'sponsor' => 'Sponsor',
			'protocol' => 'Protocol',
			'patient_id' => 'MRN',
            'study_number' => 'Study ID #',
			'initials' => 'Initials',
			'study_visit_name' => 'Visit Name',
			'visit_start_date' => 'Visit Date',
			'date_request'=>'Reimbursement Submit Date',
			'amount' => 'Amount',
			'amount_usd' => 'Amount USD',
			'currency' => 'Currency',
			'conversion_rate' => 'Conversion Rate',
			'control_number' => 'Control Number',
			'date_approved' => 'Transaction Date/Time',
			'user_approved_text' => 'Issued By',
			'transaction_id' => 'Transaction ID',
		];

		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->get('/reports/study-payment-totals', $client_filter, $report_filter, function($req, $res) {
	$ob = new StdClass;

	$records = PatientRequest::factory()
		->select('study.id,
			count(distinct patient_request.patient_id) as unique_subjects,
			sum(patient_request.amount_usd) as payment_total_usd,
			count(*) as num_payments,
			round(sum(patient_request.amount_usd) / count(*), 2) as payment_average_usd,
			sponsor.name as sponsor,
			study.protocol')
		->table('patient_request
			left join patient_card on patient_request.card_id = patient_card.id
			join patient_study on patient_request.patient_id = patient_study.patient_id 
				and patient_study.study_id = patient_request.study_id
				and patient_study.site_id = patient_request.site_id
				and patient_study.deleted = 0
			join patient on patient_request.patient_id = patient.id
			left join account on patient.id = account.id
			left join account user on user.id = patient_request.user_approved
			join study on study.id = patient_study.study_id
			join sponsor on sponsor.id = study.sponsor_id')
		->where("patient_request.date_approved is not null
			and patient_request.status != " . PatientRequest::STATUS_VOIDED . 
			" and account.deleted = 0 
			and patient_request.amount_usd != 0 
			and patient_request.transaction_id is not null and " . $req->whereCriteria)
		->group('study.id')
		->order('patient_request.patient_id')
		->plain()
		->find();

	if ($req->get['excel']) {
		$map = [
			'sponsor' => 'Sponsor',
			'protocol' => 'Protocol',
			'unique_subjects' => 'Unique Subjects Paid',
			'num_payments' => 'No. of Payments',
			'payment_total_usd' => 'Total Payments USD',
			'payment_average_usd' => 'Average Payments USD',
		];
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->get('/reports/subject-totals-study', $client_filter, $report_filter, function($req, $res) {
	$ob = new StdClass;
	$records = PatientRequest::factory()
		->select("patient_request.id as id,
			patient.id as mrn,
			patient_study.study_number,
			concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0, substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1, 1)) as initials,
			patient_card.control_number,
			patient_card.date_added,
			count(distinct patient_request.patient_id) as unique_subjects,
			sum(patient_request.amount) as payment_total,
			count(*) as num_payments,
			round(sum(patient_request.amount) / count(*), 2) as payment_average,
			sponsor.name as sponsor,
			study.protocol,
			study_site.name as study_site_name")
		->table("patient_request
			left join patient_card on patient_request.card_id = patient_card.id
			join patient on patient_request.patient_id = patient.id
			left join patient_study on patient.id = patient_study.patient_id
				and patient_study.study_id = patient_request.study_id
				and patient_study.site_id = patient_request.site_id
			join account on account.id = patient_request.patient_id
			join account user on user.id = patient_request.user_approved
			left join study_site on study_site.id = patient_study.site_id
			left join study on study.id = patient_study.study_id
			left join sponsor on sponsor.id = study.sponsor_id")
		->where("patient_request.date_approved is not null
			and patient_request.status != " . PatientRequest::STATUS_VOIDED .
			" and account.deleted = 0 
			and patient_study.deleted != 1 and " . $req->whereCriteria)
		->group("patient_request.patient_id, patient_request.site_id")
		->order("patient_request.date_approved")
		->plain()
		->find();

	if ($req->get['excel']) {
		$map = [
			'study_site_name' => 'Site',
			'sponsor' => 'Sponsor',
			'protocol' => 'Protocol',
			'mrn' => 'MRN',
			'study_number' => 'Study ID #',
			'initials' => 'Initials',
			'control_number' => 'Control Number',
			'date_added' => 'Date Card Issued',
			'num_payments' => 'No. of Payments',
			'payment_total' => 'Total Payments',
			'payment_average' => 'Average Payment',
		];
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->get('/reports/voided-cards', $client_filter, $report_filter_generator('patient_card_self.date_voided'), function($req, $res) {
	$ob = new StdClass;
	$records = PatientRequest::factory()
		->select("patient_card.id,
				patient_card.patient_id,
				concat(assigner.firstname, ' ', assigner.lastname) as assignedby_name,
				concat(voider.firstname, ' ', voider.lastname) as voidedby_name,
				patient_card.control_number,
				patient_card.old_control_number,
				patient_card.name,
				patient_card_self.name as old_name,
				patient_card_self.date_added,
				patient_card_self.date_voided,
				patient_card.balance,
				patient_card_self.void_reason,
				study_site.name as study_site_name")
		->table("patient_card patient_card
			join patient_card patient_card_self 
			on patient_card.old_control_number = patient_card_self.control_number
			LEFT join account voider on voider.id = patient_card_self.void_user_id
			join account assigner on assigner.id = patient_card.user_id
				left join study_site on patient_card.void_site_id = study_site.id")
		->where($req->whereCriteria)
		->order("patient_card.id")
		->plain()
		->find();

	if ($req->get['excel']) {
		$map = [
			'study_site_name' => 'Site',
			'assignedby_name' => 'Assigned By',
			'date_added' => 'Date Assigned',
			'patient_id' => 'MRN',
			'old_name' => 'Voided Card Number',
			'old_control_number' => 'Voided Control Number',
			'name' => 'New Card Number',
			'control_number' => 'New Control Number',
			'balance' => 'Ending Balance',
			'voidedby_name' => 'Voided By',
			'date_voided' => 'Date Voided',
			'void_reason' => 'Void Reason',
		];
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->get('/reports/voided-transactions', $client_filter, $report_filter_generator('funding_request.date_voided'), function($req, $res) {
	$ob = new StdClass;

    $feature_flag = Sys::getFeatureFlag();
	$where = str_replace("patient_request","funding_request", $req->whereCriteria);

	if ($req->get['processor']) {
		$processor = $req->get['processor'];
		$where .= " and funding_request.processor = $processor";
	}
	
	$records = PatientRequest::factory()
		->select("funding_request.id,
		concat(creator.firstname, ' ', creator.lastname) as creator_name,
		concat(voidUser.firstname, ' ', voidUser.lastname) as voidedby_name,
		funding_request.date_added,
		funding_request.date_voided,
		funding_request.amount,
		funding_request.transfer_type,
		funding_request.void_reason,
		funding_request.program,
		funding_request.processor,
		pay_processor.name as processor_name")
		->table("funding_request
		join account voidUser on voidUser.id = funding_request.voided_by
		join account creator on creator.id = funding_request.user_id
		left join pay_processor on pay_processor.id= funding_request.processor")
		->where("funding_request.date_voided is not null and " . $where)
		->order("funding_request.date_voided")
		->plain()
		->find();

		$map = [
			'creator_name' => 'Initiated By',
			'date_added' => 'Date Initiated',
			'amount' => 'Amount',
			'transfer_type' => 'Transfer Type',
			'voidedby_name' => 'Voided By',
			'date_voided' => 'Date Voided',
			'void_reason' => 'Reason / Notes',
		];
		if ($feature_flag == 1) {
			$map['processor_name'] = 'Payment Processor';
        }

	if ($req->get['excel']) {
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->get('/reports/system-users', $client_filter, $report_filter, function($req, $res) {
	$ob = new StdClass;
	if($req->get['active'] == 1) {
		$where .= " and account.active = 1 ";
	}
	else if($req->get['active'] == 0) {
		$where .= " and account.active = 0 ";
	}
	else if($req->get['active'] == 2){
		$where .= 'and account.active is not NULL';
	}
	$accounts = Account::factory()
        ->raw("select
                account.id,
                account.firstname,
                account.lastname,
                account.emailaddress,
                account.lang,
                account.phonenumber,
                account.company,
                account.active,
                account.status,
                ssu.role,
                ss.name as site_name
            from account
            join study_site_user ssu on ssu.user_id = account.id
            join study_site ss on ss.id = ssu.site_id
            where account.type = 'siteuser' 
                and account.deleted = 0 $where
            order by lastname, firstname
        ")
        ->events(false)
        ->plain()
        ->find();
	foreach ($accounts as &$record) {
		if($record->active == 1){
			$record->active = 'Active';
		}else{
			$record->active = 'Inactive';
		}
		if($record->role == 1){
			$record->role = 'Research Coordinator';
		}else if($record->role == 2){
			$record->role = 'Provider';
		}else if($record->role == 3){
			$record->role = 'Site Manager';
		}else{
			$record->role = '';
		}
	}
	foreach ($accounts as $account) {
		$studies = Study::factory()
			->raw("
				select
					concat(sponsor.name, ' - ', study.protocol, ' - ', study.title) as _study_name
				from study
				join sponsor on sponsor.id = study.sponsor_id
				join study_site_user_access on study_site_user_access.study_id = study.id
				where study_site_user_access.user_id = ?
				order by sponsor.name, protocol
			", $account->id)
			->events(false)
			->plain()
			->find();
			$studyNames = array();
			foreach ($studies as $study) {
				$studyNames[] = $study->_study_name;
			}
			$account->studyNamesString = implode(', ', $studyNames);
			$metaRecords = AccountMeta::factory()
			->select("account_meta.name")
			->table("account_meta")
			->where('account_meta.account_id = ? and account_meta.deleted = 0', 
				$account->id)
			->events(false)
			->find();
			$notifMap = [
				'patient_email_verification' => 'Subject Email Verification',
				'patient_setup_alert' => 'Subject Account Setup',
				'patient_card_assigned' => 'Subject Card Assigned',
			];
			$privMap = [
				'assign_card' => 'Assign Cards',
				'stipend_approval' => 'Approve Stipends',
				'review_reimbursement' => 'Review Reimbursements',
				'subject_request_approval' => 'Approve/Deny Reimbursements',
				'delete_patients' => 'Delete Subjects',
			];
			$privs = array();
			$notifs = array();
			foreach ($metaRecords as $mr) {
				if (array_key_exists($mr->name, $notifMap)) {
					$notifs[] = $notifMap[$mr->name];
				}
				else if (array_key_exists($mr->name, $privMap)) {
					$privs[] = $privMap[$mr->name];
				}
			}
			$account->privileges = implode(', ', $privs);
        	$account->notifications = implode(', ', $notifs);
		}
		if ($req->get['excel']) {
			$map = [
				'active' => 'User Status',
				'firstname' => 'First Name',
				'lastname' => 'Last Name',
				'phonenumber' => 'phone #',
				'emailaddress' => 'Email',
				'lang' => 'Language',
				'company' => 'Company',
				'site_name' => 'Site Name',
				'role' => 'Role',
				'studyNamesString' => 'Studies',
				'privileges' => 'Privileges',
				'notifications' => 'Notifications',
			];
			generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $accounts, $map);
		}
	$ob->records = $accounts;
	return $res->json($ob);
});
$app->get('/reports/voided-reimbursements', $client_filter, $report_filter_generator('patient_request.date_voided'), function($req, $res) {
	$ob = new StdClass;

    $feature_flag = Sys::getFeatureFlag();
    $whereCriteria = "{$req->whereCriteria}";

	if ($req->get['processor']) {
		$processor = $req->get['processor'];
		$whereCriteria .= " and patient_request.processor = $processor";
	}

	$records = PatientRequest::factory()
	->select('patient_request.id,
			patient_request.patient_id,
			patient_request.date_approved,
			patient_request.transaction_id,
			if(account.country = "US", patient_request.amount, patient_request.amount_usd) as amount,
			patient_request.notes,
			CONCAT(SUBSTR(account.firstname, 1, 1), IF(LENGTH(patient.middle) > 0, SUBSTR(patient.middle, 1, 1), "-"), SUBSTR(account.lastname, 1, 1)) as initials,
			patient_card.control_number,
			patient_study.study_number,
			study.protocol,
			sponsor.name as sponsor,
			patient_request.date_recalled,
			patient_request.date_voided,
			CONCAT(recalled.firstname, " ", recalled.lastname) as _user_recalled_name,
			CONCAT(voided.firstname, " ", voided.lastname) as _user_voided_name,
			study_site.name as study_site_name,
			patient_request.processor,
			pay_processor.name as processor_name
			')
		->table('patient_request
			join patient on patient_request.patient_id = patient.id
			left join account on patient.id = account.id
			left join account as recalled on recalled.id = patient_request.user_recalled
			left join account as voided on voided.id = patient_request.user_voided
			left join patient_card on patient_request.card_id = patient_card.id
			join patient_study on patient.id = patient_study.patient_id
				and patient_study.site_id = patient_request.site_id
				and patient_study.study_id = patient_request.study_id
			left join study_site on study_site.id = patient_study.site_id
			join study on patient_study.study_id = study.id
			join sponsor on study.sponsor_id = sponsor.id
			left join pay_processor on pay_processor.id = patient_request.processor')
		->where("patient_request.date_voided is not null and patient_request.status = 6 and account.deleted = 0 and " . $whereCriteria)
		->group('patient_request.id')
		->order('patient_request.date_voided')
		->plain()
		->find();

		$map = [
			'study_site_name' => 'Site',
			'sponsor' => 'Sponsor',
			'protocol' => 'Protocol',
			'patient_id' => 'MRN',
			'study_number' => 'Study ID #',
			'initials' => 'Initials',
			'amount' => 'Amount',
			'control_number' => 'Control Number',
			'_user_recalled_name' => 'Recalled By',
			'date_approved' => 'Transaction Date/Time',
			'transaction_id' => 'Transaction ID',
			'date_recalled' => 'Date Recalled',
			'date_voided' => 'Date Voided',
			'_user_voided_name' => 'Voided By',
			'notes' => 'Notes',
		];

	if ($feature_flag == 1) {
		$map['processor_name'] = 'Payment Processor';
	}

	if ($req->get['excel']) {
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->get('/reports/icf-audit', $client_filter, $report_filter_generator('patient_study.icf_date_added'), function($req, $res) {
	$ob = new StdClass;
	$niftyEngineModel = new NiftyEngine\Model;
	$whereCriteria = "{$req->whereCriteria}";

	if ($req->get['study_id']) {
		$study_id = intval($req->get['study_id']);
		$whereCriteria .= " and study.id = '$study_id'";
	}
	$where = str_replace("patient_request","patient_study", $req->whereCriteria);
	$records = PatientRequest::factory()
		->select("sponsor.name as sponsor,
			study.protocol,
			study.id as study_id,
			patient_study.patient_id,
			study_site.name as study_site_name,
			concat(substr(account.firstname, 1, 1), if(length(patient.middle) > 0, substr(patient.middle, 1, 1), '-'), substr(account.lastname, 1, 1)) as initials,
			concat(user.firstname, ' ', user.lastname) as user_approved,
			user.emailaddress,
			patient_study.icf_date_added")
		->table("patient_study
			join study on patient_study.study_id = study.id
			left join sponsor on sponsor.id = study.sponsor_id
			join account on account.id = patient_study.patient_id
			join patient on patient_study.patient_id = patient.id
			left join account user on user.id = patient_study.icf_user_id
			left join study_site on study_site.id = patient_study.site_id")
		->where("study.icf_verification and " . $where)
		->group("study.protocol, study_site.id, patient_study.patient_id")
		->order("patient_study.icf_date_added")
		->plain()
		->find();
	foreach ($records as &$record) {
		if ($record->patient_visit_date) {
			$record->patient_visit_date = strtoupper(Helper::date('d-M-Y', $record->patient_visit_date));
		}
	}

	if ($req->get['excel']) {
		$map = [
			'sponsor' => 'Sponsor',
			'protocol' => 'Protocol',
			'study_id' => 'Study ID',
			'patient_id' => 'MRN',
			'initials' => 'Patient Initials',
			'study_site_name' => 'Site Name',
			'user_approved' => 'Staff Name',
			'emailaddress' => 'Staff Email',
			'icf_date_added' => 'ICF Verification Date/Time',
		];
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;
	return $res->json($ob);
});

$app->get('/reports/stipend-payments', $client_filter, $report_filter, function($req, $res) {
	$ob = new StdClass;

	// echo $req->whereCriteria;

	$whereCriteria = $req->whereCriteria .= " AND patient_visit_id > 0 AND patient_request.status = 2";
	$AgeRange = $req->get['age_range'];
	if ($AgeRange==1):
		$whereCriteria .= " AND (patient.dob != '0000-00-00' && IF(patient.dob != '0000-00-00', FLOOR((CURDATE() - patient.dob)/10000),0) < 18) ";
	  endif;
	  if ($AgeRange==2):
		$whereCriteria .= " AND IF(patient.dob != '0000-00-00', FLOOR((CURDATE() - patient.dob)/10000),0) >= 18 ";
	  endif;
	  if ($AgeRange==3):
		$whereCriteria .= " AND patient.dob = '0000-00-00' ";
	  endif;

	$whereCriteria .= " AND patient_request.status != " . PatientRequest::STATUS_VOIDED;

	$records = PatientRequest::factory()
		->select("patient_request.patient_id AS mrn,
			patient.ssn,
			concat(patient_account.firstname, ' ', patient_account.lastname) as name,
			patient.address,
			patient.address2,
			patient_account.city,
			patient_account.state,
			patient_account.zipcode,
			SUM(patient_request.amount) as amount,
			sponsor.name as sponsor,
			study.protocol")
		->table("patient_request
			join account AS patient_account on patient_request.patient_id = patient_account.id
			join patient on patient_request.patient_id = patient.id
			left join study on study.id = patient_request.study_id
			left join sponsor on sponsor.id = study.sponsor_id")
		->where($whereCriteria)
		->group("patient_request.patient_id")
		->having("amount >= 600")
		->order("patient_request.date_added")
		->plain()
		->find();

	foreach($records as $record) {
		$patient = Patient::factory()->find($record->mrn);
		$record->study_site_name = $patient->site->name;
	}

	if ($req->get['excel']) {
		$map = [
			'sponsor' => 'Sponsor',
			'protocol' => 'Protocol',
			'study_site_name' => 'Site',
			'mrn' => 'MRN',
			'ssn' => 'SSN',
			'name' => 'Name',
			'address' => 'Address Line 1',
			'address2' => 'Address Line 2',
			'city' => 'City',
			'state' => 'State',
			'zipcode' => 'Zip Code',
			'amount' => 'Amount Paid'
		];
		// generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);

		require_once 'app/helpers/phpexcel/Classes/PHPExcel.php';
		ini_set("max_execution_time", 600);
		ini_set("memory_limit", '4G');

		$xl = new PHPExcel;
		$xl->getProperties()
			->setCreator('RealTime-Pay')
			->setTitle($title);

		$xl->setActiveSheetIndex(0);
		$xl->getActiveSheet()->setTitle('Report');

		$report_title = str_replace('(', '', $req->get['title']);
		$report_title = str_replace(')', '', $report_title);
		$report_title = str_replace(' ', '-', $report_title);
		$report_title = isset($req->get['title']) ? $report_title : 'Report';
		
		$filename = $report_title . '-' . date('YmdHis') . '.xlsx';
		// Redirect output to a client’s web browser (Excel2007)
		ob_end_clean();

		$sheet = $xl->getActiveSheet();
		$row = 1;
		$headers = array_values($map);

		$startDate = $req->get['date_start'];
		if ($startDate !== '') {
			$startDate = strtoupper(DateTime::createFromFormat('Y-m-d', $startDate)->format('j/M/Y'));
		}
		$endDate = $req->get['date_end'];
		if ($endDate !== '') {
			$endDate = strtoupper(DateTime::createFromFormat('Y-m-d', $endDate)->format('j/M/Y'));
		}

		$startDateDisplay;
		if ($startDate !== ''){
			$startDateDisplay = $startDate;
		} else {
			$startDateDisplay = '-';
		}

		$endDateDisplay;
		if ($endDate !== ''){
			$endDateDisplay = $endDate;
		} else {
			$endDateDisplay = '-';
		}

		$ageDisplay;
		if ($AgeRange == 1) {
			$ageDisplay = 'Under 18 Years of Age';
		} else if ($AgeRange == 2) {
			$ageDisplay = '18 Years of Age and Older';
		 } else if ($AgeRange == 3){
			$ageDisplay = 'No DOB';
		 } else {
			$ageDisplay = 'All Ages';
		 }

		$sheet->setCellValue("E{$row}", "Start Date: {$startDateDisplay}");
		horizontalRightSheetCell($sheet, "E{$row}");

		$sheet->setCellValue("A{$row}", Sys::factory()->select('name')->scalar());
		boldFont($sheet,"A{$row}");
		$row++;

		$sheet->setCellValue("E{$row}", "End Date: {$endDateDisplay}");
		horizontalRightSheetCell($sheet, "E{$row}");

		$sheet->setCellValue("A{$row}", "Stipend Payment (1099)");
		boldFont($sheet,"A{$row}");
		$row++;

		$sheet->setCellValue("E{$row}", "Age Range: {$ageDisplay}");
		horizontalRightSheetCell($sheet, "E{$row}");

		$sheet->setCellValue("A{$row}", strtoupper(date('l, j/M/Y')));

		for ($i = 1; $i <= $row; $i++) {
			$sheet->mergeCells("A{$i}:D{$i}");
			$sheet->mergeCells("E{$i}:L{$i}");
		}

		$row++;

		$reportHeader = [
			['col' => 'A', 'width' => 20, 'title' => 'Sponsor'],
			['col' => 'B', 'width' => 20, 'title' => 'Protocol'],
			['col' => 'C', 'width' => 20, 'title' => 'Site'],
			['col' => 'D', 'width' => 10, 'title' => 'MRN'],
			['col' => 'E', 'width' => 10, 'title' => 'SSN'],
			['col' => 'F', 'width' => 25, 'title' => 'Name'],
			['col' => 'G', 'width' => 35, 'title' => 'Address Line 1'],
			['col' => 'H', 'width' => 35, 'title' => 'Address Line 2'],
			['col' => 'I', 'width' => 20, 'title' => 'City'],
			['col' => 'J', 'width' => 15, 'title' => 'State'],
			['col' => 'K', 'width' => 15, 'title' => 'Zip Code'],
			['col' => 'L', 'width' => 20, 'title' => 'Amount Paid']
		];

		foreach ($reportHeader as $col => $header) {
			$sheet->setCellValueByColumnAndRow($col, $row, $header['title']);

			$colLetter = $header['col'];

			fillColorSheetCell('2392A5', $sheet, "{$colLetter}{$row}");
			fontColorSheetCell('ffffff', $sheet, "{$colLetter}{$row}");
			boldFont($sheet, "{$colLetter}{$row}");

			columnWidthSheetCell($header['width'], $sheet, $colLetter);
		}

		if ($headers) {
			// foreach ($headers as $col => $header) {
			// 	$sheet->setCellValueByColumnAndRow($col, $row, $header);
			// }

			$sheet->freezePane('A' . ($row + 1));

			$isOdd = true;
			foreach ($records as $record) {
				$col = 0;
				foreach ($map as $field => $_) {
					$cellValue = $record->{$field};
					if (preg_match('#^date#i', $field)) {
						$ts = strtotime($cellValue);
						if ($ts !== false) {
							$cellValue = strtoupper(date('d-M-Y H:i:s A', $ts));
						}
					}
					$sheet->setCellValueByColumnAndRow($col, $row + 1, $cellValue);
					$colString = PHPExcel_Cell::stringFromColumnIndex($col);
					$rowAdd = $row + 1;
					if ($isOdd) {
						fillColorSheetCell('ededed', $sheet, "{$colString}{$rowAdd}");
					} else {
						fillColorSheetCell('ffffff', $sheet, "{$colString}{$rowAdd}");
					}

					if ($colString == "L") {
						formatSheetCellToAccounting($sheet, "{$colString}{$rowAdd}");
					}
					$col++;
				}

				
				$isOdd = !$isOdd;
				$row++;
			}
		}
		else {
			$sheet->setCellValueByColumnAndRow($col, $row + 1, 'Coming soon');
			$row++;
		}

		header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		header('Content-Disposition: attachment; filename="' . $filename . '"');
		header('Cache-Control: max-age=0');
		// If you're serving to IE 9, then the following may be needed
		header('Cache-Control: max-age=1');
		// If you're serving to IE over SSL, then the following may be needed
		header('Expires: Mon, 26 Jul 1997 05:00:00 GMT'); // Date in the past
		header('Last-Modified: '.gmdate('D, d M Y H:i:s').' GMT'); // always modified
		header('Cache-Control: cache, must-revalidate'); // HTTP/1.1
		header('Pragma: public'); // HTTP/1.0

		$writer = PHPExcel_IOFactory::createWriter($xl, 'Excel2007');
		$writer->save('php://output');
		die();

	}

	$ob->records = $records;

	return $res->json($ob);
});

$app->get('/reports/card-assignment', $client_filter, $report_filter_generator('patient_card.date_added'), function($req, $res) {
	$ob = new StdClass; 
	$where = str_replace("patient_request","patient_card", $req->whereCriteria);
	$records = PatientRequest::factory()
		->select("patient_card.id,
				patient_card.patient_id,
				patient_card.control_number,
				patient_card.void_user_id,
				patient_card.name as card_number,
				patient_card.date_added as assigned_date,
				study_site.name,
				patient_study.study_id,
				patient_study.site_id,
				GROUP_CONCAT(distinct study_site.name SEPARATOR ', ') as site_name,
				GROUP_CONCAT(distinct study.protocol SEPARATOR ', ') as protocol")
		->table("patient_card
				left join patient_study on patient_card.patient_id = patient_study.patient_id
				left join study_site on patient_study.site_id = study_site.id
				left join study on patient_study.study_id = study.id")
		->where("patient_card.date_voided is null and " . $where)
		->group("patient_card.id")
		->order("patient_card.id")
		->plain()
		->find();
	foreach ($records as &$record) {
		if ($record->assigned_date) {
			$record->assigned_date = strtoupper(Helper::date('d-M-Y', $record->assigned_date));
		} 
		if($record->void_user_id == 0){
			$record->void_user_id = 'Active';
		}else{
			$record->void_user_id = 'Voided';
		}
	}
	if ($req->get['excel']) {
		$map = [
		'site_name' => 'Site',
		'protocol' => 'Protocol (s)',
		'patient_id' =>'MRN',
		'void_user_id'=> 'Card Status',
		'card_number' => 'Card Number',
		'control_number' => 'Control Number',
		'assigned_date' =>'Assigned Date',
		];
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);
	}

	$ob->records = $records;
	return $res->json($ob);
});

$app->get('/reports/ending-daily-balance', $client_filter, $report_filter_generator('tblEndingDailyBalance.date_ending'), function($req, $res) {
	$ob = new StdClass;
	$where = str_replace("patient_request", "tblEndingDailyBalance", $req->whereCriteria);
	$records = EndingDailyBalance::factory()
		->select("date_ending,
			daily_ending_balance,
			processor")
		->table("tblEndingDailyBalance")
		->where($where)
		->plain()
		->find();
	foreach ($records as &$record) { 
		if($record->processor == 1){
			$record->processor = 'Hyperwallet';
		}
	}

	if ($req->get['excel']) {
		$map = [
		'date_ending' => 'Date',
		'daily_ending_balance' => 'RealTime Ending Balance (USD)',
		'processor' =>'Payment Processor',
		];
		generateExcelDownload(isset($req->get['title']) ? $req->get['title'] : 'Report', $records, $map);

  }

	$ob->records = $records;
	return $res->json($ob);
});

$app->get('/reports/reimbursement-detail', $client_filter, $report_filter, function($req, $res) {
	ini_set("max_execution_time", 600);
	ini_set("memory_limit", '4G');
	$ob = new StdClass;

		$whereCriteria = "{$req->whereCriteria}";


		$records = PatientRequest::factory()
		->select("patient_request_item.id,
				patient_request.id as patient_request_id,
				patient_request.patient_id,
				patient_request.site_id,
				patient_request.study_id,
				patient_request.date_approved,
				patient_request.date_added,
				patient_request.status,
				ROUND(patient_request_item.amount, 2) as amount,
				patient_request.conversion_rate, 
				country.default_currency as currency,
				ROUND(patient_request_item.amount / patient_request.conversion_rate, 2) as amount_usd,
				study_site.name as study_site_name,
				study.protocol,
				patient_study.study_number,
				study_visit.name as study_visit_name,
				reimbursement_item_type.name as reimbursement_item_type")
		->table('patient_request
			left join study_site ON patient_request.site_id = study_site.id
			left join study ON patient_request.study_id = study.id
			left join patient_study ON patient_request.patient_id = patient_study.patient_id
			left join study_visit ON patient_request.visit_id = study_visit.id
			left join patient_request_item ON patient_request.id = patient_request_item.request_id
			left join reimbursement_item_type ON reimbursement_item_type.id = patient_request_item.type_id
			left join account ON patient_request.patient_id = account.id
			left join country ON account.country = country.code')
		->where("patient_request.status = 2
				AND patient_request.date_approved is NOT NULL
				AND patient_request.visit_id is NOT NULL 
				AND patient_request_item.type_id is NOT NULL and " . $whereCriteria)
		->group('patient_request.patient_id, patient_request_item.id')
		->order('patient_request.date_approved')
		->plain()
		->find();

		$itemTypes = PatientRequest::factory()
		->select("reimbursement_item_type.name,
				SUM( ROUND(patient_request_item.amount / patient_request.conversion_rate, 2)) as finalsum")
		->table('patient_request
				left join study ON patient_request.study_id = study.id
				left join patient_request_item ON patient_request.id = patient_request_item.request_id
				left join reimbursement_item_type ON reimbursement_item_type.id = patient_request_item.type_id')
		->where("patient_request.status = 2
				AND patient_request.date_approved is NOT NULL
				AND patient_request.visit_id is NOT NULL  
				AND patient_request_item.type_id is NOT NULL and " . $whereCriteria)
		->group('patient_request_item.type_id')
		->order('reimbursement_item_type.id')
		->plain()
		->find();

	if ($req->get['excel']) {
		$map = [
			'study_site_name' => 'Site',
			'protocol' => 'Protocol',
			'patient_id' => 'MRN',
			'study_number' => 'Study ID #',
			'reimbursement_item_type' => 'Reimbursement Type',
			'study_visit_name' => 'Visit Name',
			'date_added' => 'Reimbursement Submit Date',
			'amount' => 'Amount',
			'currency' => 'Currency',
			'conversion_rate' => 'Conversion Rate',
			'amount_usd' => 'Amount in USD',
		];
		require_once 'app/helpers/phpexcel/Classes/PHPExcel.php';
		ini_set("max_execution_time", 600);
		ini_set("memory_limit", '4G');
		$xl = new PHPExcel;
		$xl->getProperties()
			->setCreator('RealTime-Pay')
			->setTitle($title);

		$xl->setActiveSheetIndex(0);
		$xl->getActiveSheet()->setTitle('Report');

		$filename = 'Reimbursement Details.xlsx';
		ob_end_clean();

		$sheet = $xl->getActiveSheet();
		$row = 0;
		$headers = array_values($map);

		$row++;

		$reportHeader = [
			['col' => 'A', 'width' => 35, 'title' => 'Site'],
			['col' => 'B', 'width' => 20, 'title' => 'Protocol'],
			['col' => 'C', 'width' => 15, 'title' => 'MRN'],
			['col' => 'D', 'width' => 20, 'title' => 'Study ID #'],
			['col' => 'E', 'width' => 35, 'title' => 'Reimbursement Type'],
			['col' => 'F', 'width' => 35, 'title' => 'Visit Name'],
			['col' => 'G', 'width' => 35, 'title' => 'Reimbursement Submit Date'],
			['col' => 'H', 'width' => 15, 'title' => 'Amount'],
			['col' => 'I', 'width' => 15, 'title' => 'Currency'],
			['col' => 'J', 'width' => 15, 'title' => 'Conversion Rate'],
			['col' => 'K', 'width' => 15, 'title' => 'Amount in USD']
		];

		foreach ($reportHeader as $col => $header) {
			$sheet->setCellValueByColumnAndRow($col, $row, $header['title']);
			$colLetter = $header['col'];
			boldFont($sheet, "{$colLetter}{$row}");
			columnWidthSheetCell($header['width'], $sheet, $colLetter);
			$sheet->getStyle("{$colLetter}{$row}")->getAlignment()->setHorizontal(PHPExcel_Style_Alignment::HORIZONTAL_CENTER);
		}

		if ($headers) {
			$sheet->freezePane('A' . ($row + 1));

			$isOdd = true;
			foreach ($records as $record) {
				$col = 0;
				foreach ($map as $field => $_) {
					$cellValue = $record->{$field};
					if (preg_match('#^date#i', $field)) {
						$ts = strtotime($cellValue);
						if ($ts !== false) {
							$cellValue = strtoupper(date('d-M-Y H:i:s A', $ts));
						}
					}

					if ($field == 'submitted_date') {
						$array = explode(', ', $cellValue);
						$ts = strtotime($array[0]);
						if ($ts > 0) {
							$dt = new DateTime(date('Y-m-d H:i:s', $ts), new DateTimeZone('UTC'));
							$cellValue = $dt->setTimezone(new DateTimeZone($tz))->format('m/d/Y h:i:s A');
						}
						else{$cellValue = '-';}
					}

					$sheet->setCellValueByColumnAndRow($col, $row + 1, $cellValue);
					$colString = PHPExcel_Cell::stringFromColumnIndex($col);
					$rowAdd = $row + 1;
					if ($colString == "L") {
						formatSheetCellToAccounting($sheet, "{$colString}{$rowAdd}");
					}
					$sheet->getStyle("{$colString}{$rowAdd}")->getAlignment()->setHorizontal(PHPExcel_Style_Alignment::HORIZONTAL_CENTER);
					$col++;
				}
				
				$isOdd = !$isOdd;
				$row++;
			}
		}
		else {
			$sheet->setCellValueByColumnAndRow($col, $row + 1, 'Coming soon');
			$row++;
		}
		
		$xl->createSheet();
		$boldFontStyle = [
			'font' => [
				'bold' => true,
				'size' => 12,
			],
		];
		$xl->setActiveSheetIndex(1)->setCellValue('A1','Total USD');
		$xl->setActiveSheetIndex(1)->getStyle('A1')->applyFromArray($boldFontStyle);
		$xl->setActiveSheetIndex(1)->getStyle('B2')->applyFromArray($boldFontStyle);
		$xl->getActiveSheet()->setTitle('Item Summary');

		$list = 3;
		$grandTotal = 0;
		foreach($itemTypes as $itemTypeList){
			if($itemTypeList->finalsum != NULL){
				$xl->setActiveSheetIndex(1)->setCellValue('A'.$list,$itemTypeList->name);
				$cellAList = 'A' . $list;
				$xl->setActiveSheetIndex(1)->getStyle($cellAList)->applyFromArray($boldFontStyle);
				$xl->setActiveSheetIndex(1)->setCellValue('B'.$list,'$'.number_format($itemTypeList->finalsum, 2)); 
				$cellAList = 'B' . $list;
				$xl->setActiveSheetIndex(1)->getStyle($cellAList)->applyFromArray($boldFontStyle);
				$grandTotal = $grandTotal + $itemTypeList->finalsum;
				$list++;
				$listRecord = $list + 1;
			}
		}

		$xl->setActiveSheetIndex(1)->setCellValue('B1', '$'.number_format($grandTotal, 2));
		$xl->setActiveSheetIndex(1)->getStyle('B1')->applyFromArray($boldFontStyle);
		$xl->setActiveSheetIndex(1)->setCellValue('A'.$listRecord,'Grand Total');
		$cellAList = 'A' . $listRecord;
		$xl->setActiveSheetIndex(1)->getStyle($cellAList)->applyFromArray($boldFontStyle);
		$xl->setActiveSheetIndex(1)->setCellValue('B'.$listRecord, '$'.number_format($grandTotal, 2));
		$xl->setActiveSheetIndex(1)->getStyle($cellAList)->applyFromArray($boldFontStyle);
		$cellAList = 'B' . $listRecord;
		$xl->setActiveSheetIndex(1)->getStyle($cellAList)->applyFromArray($boldFontStyle);
    	$xl->setActiveSheetIndex(1)->getColumnDimension(PHPExcel_Cell::stringFromColumnIndex(0))->setWidth(30);
		$xl->setActiveSheetIndex(1)->getColumnDimension(PHPExcel_Cell::stringFromColumnIndex(1))->setWidth(30);

		header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		header('Content-Disposition: attachment; filename="' . $filename . '"');
		header('Cache-Control: max-age=0');
		header('Cache-Control: max-age=1');
		header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
		header('Last-Modified: '.gmdate('D, d M Y H:i:s').' GMT');
		header('Cache-Control: cache, must-revalidate');
		header('Pragma: public');
		
		$xl->setActiveSheetIndex(0);
		$writer = PHPExcel_IOFactory::createWriter($xl, 'Excel2007');
		$writer->save('php://output');
		die();
	}

	$ob->records = $records;
	return $res->json($ob);
});

