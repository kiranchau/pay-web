const {Locale} = RTBundle;

var PanelStudyStipendLoads = React.createClass({

    getDefaultProps: function() {
		return {
            panelProps: {},
            studyID: null,
            endpoint: '/reports/stipend-loads'
		};
    },

    getInitialState: function() {
		return {
			criteria: {
				date_start: '',
				date_end: '',
			},
			downloadURL: '',
			downloadKey: '',
		};
    },

    setCriteriaValue: function(key, val) {
		var criteria = this.state.criteria;
		criteria[key] = val;
		this.setState({
			criteria: criteria,
		});
    },
    
    handleExcelDownload: function(e) {
		e.preventDefault();
		var criteria = _.extend({}, {...this.state.criteria, ...{'patient_request_study_id': this.props.studyID}}, {
			excel: 1,
			_sessid: localStorage.getItem('sessid'),
		});
		var queryParams = _.map(criteria, function(val, key) {
			return key + '=' + val;
		}).join('&');
		var url = this.props.endpoint + '?' + queryParams;
		this.setState({
			downloadURL: url,
			downloadKey: _.uuid(),
		});
	},
    
    handleClearDates: function() {
		var criteria = this.state.criteria;
		criteria.date_start = '';
		criteria.date_end = '';

		this.setState({
			criteria: criteria,
		});
    },
    
    handleReportRun: function(e) {
        e.preventDefault();
		if (this.state.processing) {
			return;
		}
		if (this.state.run) {
			this.refs.dt.handleUpdate();
			this.setState({
				processing: true,
			});
		}
		else {
			this.setState({
				run: true,
				processing: true,
			});
		}
	},
	
	handleCloseReport: function() {
		this.setState({
			run: false,
			processing: false,
		});
	},

	render: function() {

		const queryParams = _.map({...this.state.criteria, ...{'patient_request_study_id': this.props.studyID}}, function(val, key) {
			return key + '=' + val;
		}).join('&');

        const datePickerProps = {
			changeYear: true,
			showPickerIcon: true,
			style: {
				maxWidth: 140,
			},
		};

		const dateTimeFormat = 'DD-MMM-YYYY hh:mm:ss A';
		const dateMerge = {
			sortWithValue: false,
			value: function(val) {
				const mom = moment.utc(val);
				if (mom.isValid()) {
					return mom.local().format(dateTimeFormat).toUpperCase();
				}
				return '--';
			}
		};

        return (
            <Panel title={Locale.getString('title.audit-stipend-loads', 'Audit Stipend Loads')} bodyStyle={{padding: '27px 8px'}}>
                {this.state.run &&
                <Dialog modal="true" title={Locale.getString('title.report-audit-stipend-loads', 'Report Audit Stipend Loads')} onClose={this.handleCloseReport} buttons={<button type="button" onClick={this.handleCloseReport}>{Locale.getString('button.close', 'Close')}</button>}>
                    <DataTable
                        ref="dt"
                        endpoint={this.props.endpoint + '?' + queryParams}
                        fields={{
							date_approved: _.extend({
								label: Locale.getString('title.transaction-date-time', 'Transcation Date/Time'),
							}, dateMerge),
							transaction_id: Locale.getString('title.transaction-id', 'Transcation ID'),
							user_approved_text: Locale.getString('title.issued-by', 'Issued By'),
							sponsor: Locale.getString('title.sponsor', 'Sponsor'),
							protocol: Locale.getString('title.protocol', 'Protocol'),
							control_number: Locale.getString('label.control-number', 'Control Number'),
							patient_id: 'MRN',
							study_number: Locale.getString('title.study-id-#', 'Study ID #'),
							initials: Locale.getString('title.initials', 'Initials'),
							visit_name: Locale.getString('title.visit-name', 'Visit Name'),
							patient_visit_date: Locale.getString('title.visit-date', 'Visit Date'),
							notes: Locale.getString('label.notes', 'Notes'),
							amount: {
								label: Locale.getString('title.amount', 'Amount'),
								align: 'right',
							},
						}}
                        onLoaded={this.handleLoaded}
                        sortable={false}
                        onActionButtons={function() {
                            return (
                                <a href="#!" className="button action" onClick={this.handleExcelDownload}
                                    style={{color: '#fff', backgroundColor: _.primaryBrandColor()}}><i className="fa fa-file-excel-o" /> {Locale.getString('button.download', 'Download')}</a>
                            );
                        }.bind(this)}
                        createButtonLabel=""
                        controls={null}
                    />
                </Dialog>
                }


                <div className='form' style={{maxWidth: 302, marginLeft: 'auto', marginRight: 'auto'}}>
                    <ClinicalDatePicker {...datePickerProps} style={{maxWidth: 118}} iconStyle={{fontSize: 12}} onChange={this.setCriteriaValue.bind(null, 'date_start')} value={this.state.criteria.date_start} />
                    {' - '}
                    <ClinicalDatePicker {...datePickerProps} style={{maxWidth: 118}} iconStyle={{fontSize: 12}} onChange={this.setCriteriaValue.bind(null, 'date_end')} value={this.state.criteria.date_end} />

                    <span><a style={{cursor: 'pointer', marginLeft: 2}} onClick={this.handleReportRun}>{Locale.getString('button.run', 'Run')}</a>   <a onClick={this.handleExcelDownload}><img height="20" style={{position: 'relative', top: 5, cursor: 'pointer', marginLeft: 2}} alt={this.props.appName} src='/assets/images/excel.gif' /></a></span>

                    <div style={{paddingTop: 8}}>
                        {(this.state.criteria.date_start || this.state.criteria.date_end) &&
                        <a href="#!" onClick={this.handleClearDates}>&times; {Locale.getString('button.clear-dates', 'Clear Dates')}</a>}
                    </div>

                </div>

				{this.state.downloadURL &&
				<iframe 
					key={this.state.downloadKey}
					style={{opacity: 0, zIndex: -5, position: 'absolute', left: -200, top: -200, width: 5, height: 5}}
					src={_.endpoint(this.state.downloadURL)} />}
           
        </Panel>
        )
    },
});