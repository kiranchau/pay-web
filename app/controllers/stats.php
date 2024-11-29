<?php

function createPatientStudyStatusDateTable() {
    NiftyEngine\Model::factory()->raw('DELETE FROM patient_study_status_date where 1')->query();
    $sql = "
            INSERT INTO patient_study_status_date (`pk`, `newvalue`, `date_added`)
            SELECT pk, newvalue, MAX(date_added)
            FROM audit_entry 
            WHERE tablename = 'patient_study' AND field = 'status' 
            GROUP BY pk, newvalue, YEAR(date_added), MONTH(date_added);";
    NiftyEngine\Model::factory()->raw($sql)->query();
}

function createStudyStatusDateTable() {
    NiftyEngine\Model::factory()->raw('DELETE FROM study_status_date where 1')->query();
    $sql = "
            INSERT INTO study_status_date (`pk`, `newvalue`, `date_added`)
            SELECT pk, newvalue, MAX(date_added)
            FROM audit_entry 
            WHERE tablename = 'study' AND field = 'status' 
            GROUP BY pk, newvalue, YEAR(date_added), MONTH(date_added);";
    NiftyEngine\Model::factory()->raw($sql)->query();
}

function createStudySiteStatusDateTable() {
    NiftyEngine\Model::factory()->raw('DELETE FROM study_site_status_date where 1')->query();
    $sql = "
            INSERT INTO study_site_status_date (`pk`, `newvalue`, `date_added`)
            SELECT pk, newvalue, MAX(date_added)
            FROM audit_entry 
            WHERE tablename = 'study_site' AND field = 'status' 
            GROUP BY pk, newvalue, YEAR(date_added), MONTH(date_added);";
    NiftyEngine\Model::factory()->raw($sql)->query();
}

$app->get('/stats/active', $client_filter, function($req, $res) {
    $ob = new StdClass;

    $ts = strtotime(date('Y-m-01'));
    $startTimestamp = strtotime('-7 month', $ts);
    $startDate = date('Y-m-01', $startTimestamp);
    $today = date('Y-m-d');

    // echo $startDate;
    // echo $today;

    $dates = [];
    foreach (range(0, 8) as $n) {
        $offset = 8 - $n;
        $dates[] = date('Y-m-01', strtotime('-' . $n . ' month', $ts));
    }

    $dates = array_reverse($dates);

    if ($res->user->type == 'siteuser') {
        $_data = [];
        foreach ($dates as $key => $date) {

            $_data[$date] = [
                'date' => $date,
                'count' => 0,
            ];
        }

        $newDates = array_reduce($dates, function($c, $d) {
            $date = DateTime::createFromFormat('Y-m-d', $d)->format('F');
            $c[$d] = ['name' => $date];
            return $c;
        }, []);

        foreach ($_data as $k => $v) {

            $newDates[$k]['Studies'] = $v['count'];
        }

        foreach ($_data as $k => $v) {

            $newDates[$k]['Sites'] = $v['count'];
        }

        foreach ($_data as $k => $v) {

            $newDates[$k]['Subjects'] = $v['count'];
        }

        $ob->records = array_values($newDates);
        return $res->json($ob);
    }

    createPatientStudyStatusDateTable();
    createStudyStatusDateTable();
    createStudySiteStatusDateTable();

    $passStudy = Study::factory()
    ->select("
        study.id, 
        study.status, 
        DATE_FORMAT(study.date_updated, '%Y-%m-01') as date")
    ->where("status = 0 and date_updated < '{$startDate}'")->plain()->find();

    $passStudySite = StudySite::factory()
    ->select("
        study_site.id, 
        study_site.status, 
        DATE_FORMAT(study_site.date_updated, '%Y-%m-01') as date")
    ->where("status = 0 and date_updated < '{$startDate}'")->plain()->find();

    $passPatientStudy = PatientStudy::factory()
    ->select("
        patient_study.id, 
        patient_study.status, 
        DATE_FORMAT(patient_study.date_updated, '%Y-%m-01') as date")
    ->where("patient_study.status = 0 and patient_study.deleted = 0 and patient_study.patient_id != 0 and date_updated <= '{$startDate}'")->plain()->find();

    $studyModel = Study::factory()
    ->select("
        study.id,
        (select temp.newvalue from study_status_date as temp where temp.pk = study.id and temp.date_added = max(study_status_date.date_added)) as status,
        DATE_FORMAT(study_status_date.date_added, '%Y-%m-01') as date")
    ->table("
        study
        JOIN study_status_date on study.id = study_status_date.pk")
    ->where('
        DATE(study_status_date.date_added) >= ? 
        and DATE(study_status_date.date_added) <= ?', $startDate, $today)
    ->group('study.id, YEAR(study_status_date.date_added), MONTH(study_status_date.date_added)')
    ->order('date')
    ->plain()->find();

    $studySiteModel = StudySite::factory()
    ->select("
        study_site.id,
        (select temp.newvalue from study_site_status_date as temp where temp.pk = study_site.id and temp.date_added = max(study_site_status_date.date_added)) as status,
        DATE_FORMAT(study_site_status_date.date_added, '%Y-%m-01') as date")
    ->table("
        study_site
        JOIN study_site_status_date on study_site.id = study_site_status_date.pk")
    ->where('
        DATE(study_site_status_date.date_added) >= ? 
        and DATE(study_site_status_date.date_added) <= ?', $startDate, $today)
    ->group('study_site.id, YEAR(study_site_status_date.date_added), MONTH(study_site_status_date.date_added)')
    ->order('date')
    ->plain()->find();

    $patientStudyModel = PatientStudy::factory()
    ->select("
        ps.id,
        (select temp.newvalue from patient_study_status_date as temp where temp.pk = ps.id and temp.date_added = max(patient_study_status_date.date_added)) as status,
        DATE_FORMAT(patient_study_status_date.date_added, '%Y-%m-01') as date")
    ->table('
        patient_study as ps
        JOIN patient_study_status_date on ps.id = patient_study_status_date.pk')
    ->where('
        ps.deleted = 0
        and ps.patient_id != 0
        and DATE(patient_study_status_date.date_added) >= ? 
        and DATE(patient_study_status_date.date_added) <= ?', $startDate, $today)
    ->group('ps.id, YEAR(patient_study_status_date.date_added), MONTH(patient_study_status_date.date_added)')
    ->order('date')
    ->plain()->find();

    $dataStudy = [];
    $dataStudySite = [];

    $_passStudy = [];
    foreach($passStudy as $m) {
        $_passStudy[$m->id] = $m;
    }

    $_passStudySite = [];
    foreach($passStudySite as $m) {
        $_passStudySite[$m->id] = $m;
    }

    $_passPatientStudy = [];
    foreach($passPatientStudy as $m) {
        $_passPatientStudy[$m->id] = $m;
    }

    function initData($dates, $firstData, $data) {
        $_data = [];
        foreach ($dates as $key => $date) {

            if ($key == 0) {    
                $_data[$date] = [
                    'date' => $date,
                    'count' => 0,
                    'data' => $firstData
                ];
    
            } else {
                $_data[$date] = [
                    'date' => $date,
                    'count' => 0,
                    'data' => [],
                    'prev' => []
                ];
            }
        }

        foreach ($data as $stats) {
            $_data[$stats->date]['data'][$stats->id] = $stats;
        }

        return $_data;
    }

    function updateData(&$data, $fristDate, $status) {
        $lastDate = '';
        foreach ($data as $d) {

            if($d['date'] == $fristDate) {
                foreach ($d['data'] as $stats) {
                    if ($stats->status == 0) {
                        $data[$d['date']]['count'] += 1;
                        $data[$d['date']]['prev'][$stats->id] = $stats;
                    }
                }
            } else {
    
                $data[$d['date']]['prev'] = $data[$lastDate]['prev'];
                
                foreach ($data[$lastDate]['prev'] as $stats) {
    
                    $key = $stats->id;
                    $new = $d['data'][$key];

                    if(array_key_exists($key, $d['data']) && $new->status == $status){
                        unset($data[$d['date']]['prev'][$stats->id]);
                    }
                }
    
                foreach ($d['data'] as $stats) {
                    if ($stats->status != $status) {
                        $data[$d['date']]['prev'][$stats->id] = $stats;
                    }
                }
    
    
                $data[$d['date']]['count'] = count($data[$d['date']]['prev']);
    
            } 
    
            $lastDate = $d['date'];
        }
    }

    $fristDate = $dates[0];
    $dataStudy = initData($dates, $_passStudy, $studyModel);
    $dataStudySite = initData($dates, $_passStudySite, $studySiteModel);
    $dataPatientStudy = initData($dates, $_passPatientStudy, $patientStudyModel);
    updateData($dataStudy, $fristDate, 2);
    updateData($dataStudySite, $fristDate, 1);
    updateData($dataPatientStudy, $fristDate, 2);

    $newDates = array_reduce($dates, function($c, $d) {

        $date = DateTime::createFromFormat('Y-m-d', $d)->format('F');
        $c[$d] = ['name' => $date];
        return $c;
    }, []);

    foreach ($dataStudy as $k => $v) {
        
        $newDates[$k]['Studies'] = $v['count'];
    }

    foreach ($dataStudySite as $k => $v) {
        
        $newDates[$k]['Sites'] = $v['count'];
    }

    foreach ($dataPatientStudy as $k => $v) {
        
        $newDates[$k]['Subjects'] = $v['count'];
    }

    $ob->records = array_values($newDates);

    return $res->json($ob);
});