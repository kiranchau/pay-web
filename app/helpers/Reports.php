<?php

class Reports {

	public function getBegginningBalance($dateStart, $processor) {
        $patientRequestTableQuery = "
            patient_request
            join patient on patient_request.patient_id = patient.id
            join patient_study on patient.id = patient_study.patient_id
                and patient_request.study_id = patient_study.study_id
                and patient_request.site_id = patient_study.site_id
            join account on account.id = patient_request.patient_id
            join account user on user.id = patient_request.user_approved
            join study on study.id = patient_study.study_id
            join sponsor on sponsor.id = study.sponsor_id
        ";

        $where = '1';

        if ($dateStart) {
            $where .= " and Date(date_approved) < '{$dateStart}' ";
        }
        if ($processor) {
            $where .= " and processor = '{$processor}' ";
        }

        $stipendRequests = Balance::factory()
            ->select('amount')
            ->where($where)->plain()->find();

        $stipendAmount = 0;

        foreach ($stipendRequests as $record) {
            $stipendAmount += $record->amount;
        }


        $where = '1';
        $voidRequestsWhereQuery = 'patient_request.status = 6';
        if ($dateStart) {
            $where .= " and funding_request.date_approved < '{$dateStart}' ";
            $voidRequestsWhereQuery .= " and date(patient_request.date_voided) < '{$dateStart}'";
        }

        if ($processor) {
            $where .= " and funding_request.processor = $processor";
            $voidRequestsWhereQuery .= " and patient_request.processor = $processor";
        }

        $voidRequests = PatientRequest::factory()
            ->select('sum(if(patient_request.amount_usd > 0, patient_request.amount_usd, patient_request.amount))')
            ->table($patientRequestTableQuery)
            ->where("$voidRequestsWhereQuery
                and patient_request.date_voided is not null
                and account.deleted = 0")
            ->scalar();

        $loadRequests = FundingRequest::factory()
		    ->select('sum(amount)')
		    ->where("$where
                and date_approved is not null
                and funding_request.date_voided is null")
		    ->scalar();

        return $loadRequests + $voidRequests - $stipendAmount;
    }

    public function calculateBalances($records, $startingBalance) {
        usort($records, function($a, $b) {
            if ($a->date_approved == $b->date_approved)
                return 0;
            else if ($a->date_approved < $b->date_approved)
                return -1;
            return 1;
        });
    
        $deposits = 0;
        $withdrawals = 0;
        $balance = $startingBalance;
        $lastDate = '';
        $recordIndex = 0;
    
        while ($recordIndex < count($records)) {
            $record = $records[$recordIndex];
            $nextRecord = $records[$recordIndex + 1];
            $date = UIHelper::date('Y-m-d', $record->date_approved);
            $nextDate = UIHelper::date('Y-m-d', $nextRecord->date_approved);
    
            if ($record->credit > 0) {
                $deposits += $record->credit;
                $balance += $record->credit;
            }
            else if ($record->debit > 0) {
                $withdrawals += $record->debit;
                $balance -= $record->debit;
            }
    
            if ($nextDate != $date || !$recordIndex) {
                $record->daily_balance = number_format($balance, 2);
            }
    
            $lastDate = $date;
            $recordIndex++;
        }

        return array('records' => $records, 'withdrawals' => $withdrawals, 'deposits' => $deposits);
    }
}