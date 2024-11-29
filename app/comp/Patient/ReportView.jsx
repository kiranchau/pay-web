const {Locale} = RTBundle;

var ReportView = React.createClass({

	getRouteInfo: function() {
		return {
			path: '/reports',
			heading: Locale.getString('title.reports', 'Reports'),
		};
	},

	getInitialState: function() {
		return {
			currentReport: null,
			run: false,
			processing: false,
			studies: [],
			sites: [],
			travel_Status : [],
			criteria: this.initializeSearchCriteria(),
			downloadURL: '',
			downloadKey: '',
		};
	},

	initializeSearchCriteria: function() {
		return {
			date_start: '',
			date_end: '',
			mrn: '',
			control_number: '',
			study_id: '',
			sites : '',
			travel_Status : '',
			detailed: 0
		}
	},

	componentDidMount: function() {
		$.get(_.endpoint('/studies'), function(res) {
			this.setState({
				studies: res.records,
			});
		}.bind(this));

		$.get(_.endpoint('/sites'), function(res) {
			this.setState({
				sites: res.records,
			});
		}.bind(this));

		$.get(_.endpoint('/travel-status'), function(res) {
			this.setState({
				travel_Status: res.records,
			});
		}.bind(this));

	},

	handleReport: function(report, e) {
		e.preventDefault();

		this.setState({
			currentReport: report,
			run: false,
			processing: false,
			criteria: {...this.state.criteria, ...this.initializeSearchCriteria()},
		});
	},

	setCriteriaValue: function(key, val) {
		var criteria = this.state.criteria;
		criteria[key] = val;
		this.setState({
			criteria: criteria,
		});
	},

	handleChange: function(e) {
		var val = e.target.value;
		if (e.target.type == 'checkbox') {
			if (!e.target.checked) {
				val = 0;
			}
		}
		this.setCriteriaValue(e.target.name, val);
	},

	handleReportClose: function() {
		this.setState({
			currentReport: null,
		});
	},

	handleExcelDownload: function(e) {
		e.preventDefault();
		var criteria = _.extend({}, this.state.criteria, {
			title: this.state.currentReport ? this.state.currentReport.title : 'Report',
			excel: 1,
			_sessid: localStorage.getItem('sessid'),
		});
		var queryParams = _.map(criteria, function(val, key) {
			return key + '=' + val;
		}).join('&');
		var url = this.state.currentReport.endpoint + '?' + queryParams;
		this.setState({
			downloadURL: url,
			downloadKey: _.uuid(),
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

	handleLoaded: function(dataTable) {
		this.setState({
			processing: false,
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

	getReports: function() {
		var handleChange = this.handleChange;
		var dateTimeFormat = 'MM/DD/YYYY hh:mm:ss A';
		var dateFormat = 'MM/DD/YYYY';
		var dateTimeMerge = {
			sortWithValue: false,
			value: function(val) {
				var mom = moment.utc(val);
				if (mom.isValid()) {
					return mom.local().format(dateTimeFormat).toUpperCase();
				}
				return '--';
			}
		};

		var dateMerge = {
			sortWithValue: false,
			value: function(val) {
				var mom = moment.utc(val);
				if (mom.isValid()) {
					return mom.local().format(dateFormat).toUpperCase();
				}
				return '--';
			}
        };
        
		var reports = [
			{
				title: Locale.getString('title.audit-stipend-loads', 'Audit Stipend Loads'),
				endpoint: '/reports/stipend-loads',
				fields: {
					study_site_name: Locale.getString('title.site', 'Site'),
					sponsor: Locale.getString('title.sponsor', 'Sponsor'),
					protocol: Locale.getString('title.protocol', 'Protocol'),
					patient_id: 'MRN',
					study_number: Locale.getString('title.study-id-#', 'Study ID #'),
					initials: Locale.getString('title.initials', 'Initials'),
					visit_name: Locale.getString('title.visit-name', 'Visit Name'),
					patient_visit_date: Locale.getString('title.visit-date', 'Visit Date'),
					amount: {
						label: Locale.getString('title.amount', 'Amount'),
						align: 'right',
					},
					control_number: Locale.getString('label.control-number', 'Control Number'),
					user_approved_text:  Locale.getString('title.issued-by', 'Issued By'),
					date_approved: _.extend({
						label: Locale.getString('title.transaction-date-time', 'Transaction Date/Time'),
					}, dateTimeMerge),
					transaction_id: Locale.getString('title.transaction-id', 'Transcation ID'),
					notes: Locale.getString('label.notes', 'Notes'),
				},
				onAdditionalSearchFields: function() {
					return (
						<span>
							<select name="study_id" onChange={this.handleChange} value={this.state.criteria.study_id} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
								{_.map(this.state.studies, function(study) {
									if (study.status != 2) {
										return <option key={study.id} value={study.id}>{study.sponsor.name} - {study.protocol} - {study.title}</option>;
									}
								})}
							</select>
						</span>
					);
				}.bind(this),
			},
			{
				title: Locale.getString('title.audit-bank-deposits', 'Audit Bank Deposits'),
				endpoint: '/reports/bank-deposits',
				fields: {
					study_site_name: Locale.getString('title.site', 'Site'),
					sponsor: Locale.getString('title.sponsor', 'Sponsor'),
					protocol: Locale.getString('title.protocol', 'Protocol'),
					patient_id: 'MRN',
					study_number: Locale.getString('title.study-id-#', 'Study ID #'),
					initials: Locale.getString('title.initials', 'Initials'),
					visit_name: Locale.getString('title.visit-name', 'Visit Name'),
					patient_visit_date: Locale.getString('title.visit-date', 'Visit Date'),
					amount: {
						label: Locale.getString('title.amount', 'Amount'),
						align: 'right',
					},
					amount_usd: {
						label: Locale.getString('title.amount', 'Amount') + 'USD',
						align: 'right',
					},
					conversion_rate: {
						label: Locale.getString('title.conversion-rate', 'Conversion Rate'),
						align: 'right',
					},
					user_approved_text: Locale.getString('title.issued-by', 'Issued By'),
					date_approved: _.extend({
						label: Locale.getString('title.transaction-date-time', 'Transaction Date/Time'),
					}, dateTimeMerge),
					transaction_id: Locale.getString('title.transaction-id', 'Transcation ID'),
					notes: Locale.getString('label.notes', 'Notes'),
				},
				onAdditionalSearchFields: function() {
					return (
						<span>
							<select name="study_id" onChange={this.handleChange} value={this.state.criteria.study_id} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
								{_.map(this.state.studies, function(study) {
									if (study.status != 2) {
										return <option key={study.id} value={study.id}>{study.sponsor.name} - {study.protocol} - {study.title}</option>;
									}
								})}
							</select>
						</span>
					);
				}.bind(this),
			},
			{
				title: Locale.getString('title.balance-detail', 'Balance Detail'),
				endpoint: '/reports/balance-detail',
				fields: {
					date_approved: _.extend({
						label: Locale.getString('title.transaction-date-time', 'Transaction Date/Time'),
					}, dateTimeMerge),
					transaction_id: Locale.getString('title.transaction-id', 'Transcation ID'),
                    sponsor: Locale.getString('title.sponsor', 'Sponsor'),
                    protocol: Locale.getString('title.protocol', 'Protocol'),
                    control_number: Locale.getString('label.control-number', 'Control Number'),
					patient_id: 'MRN',
                    study_number: Locale.getString('title.study-id-#', 'Study ID #'),
                    initials: Locale.getString('title.initials', 'Initials'),
					user_issued_text: Locale.getString('title.issued-by', 'Issued By'),
					user_approved_text: Locale.getString('title.approved-by', 'Approved By'),
					user_voided_text: Locale.getString('title.voided-by', 'Voided By'),
					credit: Locale.getString('title.deposit-additions', 'Deposit / Additions'),
					debit: Locale.getString('title.withdrawl-subtractions', 'Withdrawl / Subtractions'),
					daily_balance: {
						label: Locale.getString('title.ending-daily-balance', 'Ending Daily Balance'),
						align: 'right',
					},
				},
            },
			{
				title: Locale.getString('title.card-load-history', 'Card Load History'),
				endpoint: '/reports/card-loads',
				fields: {
					study_site_name: Locale.getString('title.site', 'Site'),
					sponsor: Locale.getString('title.sponsor', 'Sponsor'),
					protocol: Locale.getString('title.protocol', 'Protocol'),
					patient_id: 'MRN',
					study_number: Locale.getString('title.study-id-#', 'Study ID #'),
					initials: Locale.getString('title.initials', 'Initials'),
					amount: {
						label: Locale.getString('title.amount', 'Amount'),
						align: 'right',
					},
					control_number: Locale.getString('label.control-number', 'Control Number'),
					user_approved_text: Locale.getString('title.issued-by', 'Issued By'),
					date_approved: _.extend({
						label: Locale.getString('title.transaction-date-time', 'Transaction Date/Time'),
					}, dateTimeMerge),
					transaction_id: Locale.getString('title.transaction-id', 'Transcation ID'),
					
					notes: Locale.getString('label.notes', 'Notes'),
				},
				onAdditionalSearchFields: function() {
					return (
						<span style={{marginLeft: 10}}>
							<input name="control_number" type="text" placeholder={Locale.getString('label.control-number', 'Control Number')} style={{maxWidth: 140}} onChange={handleChange} />
							{' '}
							<i className="fa fa-info-circle" title={Locale.getString('title.dash-required', 'Dash is required for the control number.')} style={{fontSize: 15}} />
							&nbsp;
							<input name="mrn" type="text" placeholder="MRN" style={{maxWidth: 100}} onChange={handleChange} />
							<select name="study_id" onChange={this.handleChange} value={this.state.criteria.study_id} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
								{_.map(this.state.studies, function(study) {
									if (study.status != 2) {
										return <option key={study.id} value={study.id}>{study.sponsor.name} - {study.protocol} - {study.title}</option>;
									}
								})}
							</select>
						</span>
					);
				}.bind(this)
			},
			{
				title: Locale.getString('title.bank-deposit-history', 'Bank Deposit History'),
				endpoint: '/reports/deposit-history',
				fields: {
					study_site_name: Locale.getString('title.site', 'Site'),
					sponsor: Locale.getString('title.sponsor', 'Sponsor'),
					protocol: Locale.getString('title.protocol', 'Protocol'),
					patient_id: 'MRN',
					study_number: Locale.getString('title.study-id-#', 'Study ID #'),
					initials: Locale.getString('title.initials', 'Initials'),
					amount: {
                        label: Locale.getString('title.amount', 'Amount'),
                        align: 'right',
                    },
					amount_usd: {
						label: Locale.getString('title.amount', 'Amount') + 'USD',
						align: 'right',
					},
					conversion_rate: {
						label: Locale.getString('title.conversion-rate', 'Conversion Rate'),
						align: 'right',
					},
					user_approved_text: Locale.getString('title.issued-by', 'Issued By'),
					date_approved: _.extend({
						label: Locale.getString('title.transaction-date-time', 'Transaction Date/Time'),
					}, dateTimeMerge),
					transaction_id: Locale.getString('title.transaction-id', 'Transcation ID'),					
					notes: Locale.getString('label.notes', 'Notes'),
				},
				onAdditionalSearchFields: function() {
					return (
						<span>
							<span style={{marginLeft: 10}}>
								<input name="mrn" type="text" placeholder="MRN" style={{maxWidth: 100}} onChange={handleChange} />
							</span>
							<select name="study_id" onChange={this.handleChange} value={this.state.criteria.study_id} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
								{_.map(this.state.studies, function(study) {
									if (study.status != 2) {
										return <option key={study.id} value={study.id}>{study.sponsor.name} - {study.protocol} - {study.title}</option>;
									}
								})}
							</select>
						</span>
					);
				}.bind(this),
			},
			{
				title: Locale.getString('title.payment-detail-study', 'Payment Detail by Study'),
				endpoint: '/reports/study-payments',
				fields: {
					study_site_name: Locale.getString('title.site', 'Site'),
					sponsor: Locale.getString('title.sponsor', 'Sponsor'),
					protocol: Locale.getString('title.protocol', 'Protocol'),
					patient_id: 'MRN',
					study_number: Locale.getString('title.study-id-#', 'Study ID #'),
					initials: Locale.getString('title.initials', 'Initials'),
					study_visit_name: Locale.getString('title.visit-name', 'Visit Name'),
					visit_start_date: {
						label: Locale.getString('title.visit-date', 'Visit Date'),
						sortWithValue: false,
						value: function(val) {
							var mom = moment.utc(val);
							if (mom.isValid() && val) {
									return mom.format(dateFormat).toUpperCase();
							}
							return '--';
						}
					},
					amount: {
						label: Locale.getString('title.amount', 'Amount'),
						align: 'right',
					},
					amount_usd: {
						label: Locale.getString('title.amount', 'Amount') + 'USD',
						align: 'right',
					},
					conversion_rate: {
						label: Locale.getString('title.conversion-rate', 'Conversion Rate'),
						align: 'right',
					},
					currency: {
						label: Locale.getString('label.currency', 'Currency'),
						align: 'right',
					},
					control_number: Locale.getString('label.control-number', 'Control Number'),
					date_approved: _.extend({label: Locale.getString('title.transaction-date-time', 'Transaction Date/Time'),}, dateTimeMerge),
					user_approved_text: Locale.getString('title.issued-by', 'Issued By'),
					transaction_id: Locale.getString('title.transaction-id', 'Transcation ID'),
				},
				onAdditionalSearchFields: function() {
					return (
						<span>
							<select name="study_id" onChange={this.handleChange} value={this.state.criteria.study_id} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
								{_.map(this.state.studies, function(study) {
									if (study.status != 2) {
										return <option key={study.id} value={study.id}>{study.sponsor.name} - {study.protocol} - {study.title}</option>;
									}
								})}
							</select>

							<select name="payment_type" onChange={this.handleChange} value={this.state.criteria.payment_type} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.all-payment-types', 'All Payment Types')}</option>
								{_.map([{key: 1, value: 'Stipend'}, {key: 2, value: 'Reimbursement'}], function(type) {
										return <option key={type.key} value={type.key}>{type.value}</option>;
								})}
							</select>

							<label title={Locale.getString('title.show-reim-breakdown', 'Show a detailed breakdown of the reimbursement types for each subject.')} style={{marginLeft: 10}}>
								<input name="detailed" type="checkbox" value="1" onChange={this.handleChange} checked={this.state.criteria.detailed == 1} /> 
								{' '}
								{Locale.getString('title.show-breakdown', 'Show Breakdown')}
							</label>
						</span>
					);
				}.bind(this),
			},
			{
				title: Locale.getString('title.study-payment-by-date', 'Study Payment Totals by Date'),
				endpoint: '/reports/study-payment-totals',
				fields: {
					sponsor: Locale.getString('title.sponsor', 'Sponsor'),
                    protocol: Locale.getString('title.protocol', 'Protocol'),
					unique_subjects: Locale.getString('title.unique-subjects-paid', 'Unique Subjects Paid'),
					num_payments: Locale.getString('title.num-payments', 'No. of Payments'),
					payment_total: Locale.getString('title.payment-total', 'Total Payments'),
					payment_average: Locale.getString('title.average-payments', 'Average Payment'),
				},
			},

			{
				title: Locale.getString('title.subject-travel-request', 'Subject Travel Request Report'),
				endpoint: '/reports/subject-travel-report',
				fields: {
					study_id: Locale.getString('title.study_id', 'Study ID'),
					studyname: Locale.getString('title.studyname', 'Study Name'),
					protocol: Locale.getString('title.protocol', 'Protocol'),
					study_site_name: Locale.getString('title.site', 'Site'),
					patient_id: 'MRN',
					submitted_by: Locale.getString('title.submitted_by', 'Submitted By'),
					Tsubmitted_date: _.extend({
					label: Locale.getString('title.Tsubmitted_date', 'Submitted Date'),
					}, dateTimeMerge),
					Tsubmitted_date: {
						label: Locale.getString('title.Tsubmitted_date', 'Submitted Date'),
						value: function(val) {
							var mom = moment.utc(val);
							if (mom.isValid() && val) {
									return mom.format('MM/DD/YYYY hh:mmA').toUpperCase();
							}
							return '--';
						}
					},
					visit_name: Locale.getString('title.visit_name', 'Visit Name'),
					visit_starting_date: {
						label: Locale.getString('title.visit_starting_date', 'Visit Date/Time'),
						value: function(val) {
							var mom = moment.utc(val);
							if (mom.isValid() && val) {
									return mom.format('MM/DD/YYYY hh:mmA').toUpperCase();
							}
							return '--';
						}
					},
					request_types: Locale.getString('title.request_types', 'Type Of Travel'),

					travel_departure: {
						label: Locale.getString('title.travel_departure', 'Travel Departure'),
						value: function(val) {
							var mom = moment.utc(val);
							if (mom.isValid() && val) {
									return mom.format('MM/DD/YYYY hh:mmA').toUpperCase();
							}
							return '--';
						}
					},
					travel_return: {
						label: Locale.getString('title.travel_return', 'Travel Return'),
						value: function(val) {
							var mom = moment.utc(val);
							if (mom.isValid() && val) {
									return mom.format('MM/DD/YYYY hh:mmA').toUpperCase();
							}
							return '--';
						}
					},
					travel_start_date: {
						label: Locale.getString('title.travel_start_date', 'Travel Start Date'),
						value: function(val) {
							var mom = moment.utc(val);
							if (mom.isValid() && val) {
									return mom.format('MM/DD/YYYY').toUpperCase();
							}
							return '--';
						}
					},
					travel_end_date: {
						label: Locale.getString('title.travel_end_date', 'Travel End Date'),
						value: function(val) {
							var mom = moment.utc(val);
							if (mom.isValid() && val) {
									return mom.format('MM/DD/YYYY').toUpperCase();
							}
							return '--';
						}
					},
					comment: Locale.getString('title.comment', 'Conmment'),
				},


				onAdditionalSearchFields: function() {
					return (
						<span>
							<select name="study_id" onChange={this.handleChange} value={this.state.criteria.study_id} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
								{_.map(this.state.studies, function(study) {
									if (study.status != 2) {
										return <option key={study.id} value={study.id}>{study.sponsor.name} - {study.protocol} - {study.title}</option>;
									}
								})}
							</select>

							<select name="sites" onChange={this.handleChange} value={this.state.criteria.sites} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.all-site', 'All Site')}</option>
								{_.map(this.state.sites, function(record) {
									return <option key={record.id} value={record.id}>{record.name}</option>;
								})}
							</select>

							<select name="travel_Status" onChange={this.handleChange} value={this.state.criteria.travel_Status} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.travel_Status', 'Travel Status')}</option>
								{_.map(this.state.travel_Status, function(record) {
									return <option key={record.id} value={record.id}>{record.status}</option>;
								})}
							</select>
						</span>
					);
				}.bind(this),
			},

			{
				title: Locale.getString('title.subject-totals-by-study', 'Subject Totals by Study'),
				endpoint: '/reports/subject-totals-study',
				fields: {
					study_site_name: Locale.getString('title.site', 'Site'),
					sponsor: Locale.getString('title.sponsor', 'Sponsor'),
					protocol: Locale.getString('title.protocol', 'Protocol'),
					id: 'MRN',
                    study_number: Locale.getString('title.study-id-#', 'Study ID #'),
					initials: Locale.getString('title.initials', 'Initials'),
					control_number: Locale.getString('label.control-number', 'Control Number'),
					date_added: {
						label: Locale.getString('title.date-card-issued', 'Date Card Issued'),
						sortWithValue: false,
						value: function(val) {
							var m = moment.utc(val);
							if (m.isValid()) {
								return m.local().format('DD-MMM-YYYY hh:mm:ss A').toUpperCase();
							}
							return '-';
						}
					},
					num_payments: Locale.getString('title.num-payments', 'No. of Payments'),
					payment_total: Locale.getString('title.payment-total', 'Total Payments'),
					payment_average: Locale.getString('title.average-payments', 'Average Payment'),
				},
				onAdditionalSearchFields: function() {
					return (
						<select name="study_id" onChange={this.handleChange} style={{marginLeft: 10, maxWidth: 150}}>
							<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
							{_.map(this.state.studies, function(study) {
								if (study.status != 2) {
									return <option key={study.id} value={study.id}>{study.sponsor.name} - {study.protocol} - {study.title}</option>;
								}
							})}
						</select>
					);
				}.bind(this),
			},
			{
				title: Locale.getString('title.voided-cards', 'Voided Cards'),
				endpoint: '/reports/voided-cards',
				fields: {
					study_site_name: Locale.getString('title.site', 'Site'),
					assignedby_name: Locale.getString('title.assigned-by', 'Assigned By'),
					date_added: _.extend({label: Locale.getString('title.date-assigned', 'Date Assigned')}, dateTimeMerge),
					name: Locale.getString('title.display-name', 'Display Name'),
					control_number: Locale.getString('label.control-number', 'Control Number'),
					balance: Locale.getString('title.ending-balance', 'Ending Balance'),
					voidedby_name: Locale.getString('title.voided-by', 'Voided By'),
					date_voided: _.extend({label: Locale.getString('title.date-voided', 'Date Voided')}, dateTimeMerge),
					void_reason: Locale.getString('title.void-reason', 'Void Reason'),
				}
			},
			{
				title: Locale.getString('title.voided-funding-request', 'Void Funding Requests'),
				endpoint: '/reports/voided-transactions',
				fields: {
					creator_name: Locale.getString('title.initiated-by', 'Initiated By'),
					date_added: _.extend({label: Locale.getString('title.date-initiated', 'Date Initiated')}, dateTimeMerge),
					program: {
						label: Locale.getString('title.program', 'Program'),
						value: function(val) {
							if (val) {
								return val.toUpperCase();
							}
							return val;
						},
					},
					amount: {
                        label: Locale.getString('title.amount', 'Amount'),
                    },
					transfer_type: Locale.getString('title.transfer-type', 'Transfer Type'),
					voidedby_name: Locale.getString('title.voided-by', 'Voided By'),
					date_voided: _.extend({label: Locale.getString('title.date-voided', 'Date Voided')}, dateTimeMerge),
					void_reason: Locale.getString('title.void-reason', 'Void Reason'),
				}
            },
			{
				title: Locale.getString('title.voided-transactions', 'Voided Transactions'),
				endpoint: '/reports/voided-reimbursements',
				fields: {
					study_site_name: Locale.getString('title.site', 'Site'),
					sponsor: Locale.getString('title.sponsor', 'Sponsor'),
					protocol: Locale.getString('title.protocol', 'Protocol'),
					patient_id: Locale.getString('title.mrn', 'MRN'),
					study_number: Locale.getString('title.study-id-#', 'Study ID #'),
					initials: Locale.getString('title.initials', 'Initials'),
					amount: {
						label: Locale.getString('title.amount', 'Amount'),
						align: 'right',
					},
					control_number: Locale.getString('label.control-number', 'Control Number'),
					_user_recalled_name: Locale.getString('title.recalled-by', 'Recalled By'),
					date_approved: _.extend({
						label: Locale.getString('title.transaction-date-time', 'Transaction Date/Time'),
					}, dateTimeMerge),
					transaction_id: Locale.getString('title.transaction-id', 'Transcation ID'),
					date_recalled: _.extend({
						label: Locale.getString('title.date-recalled', 'Date Recalled'),
					}, dateTimeMerge),
					date_voided: _.extend({
						label: Locale.getString('title.date-voided', 'Date Voided'),
					}, dateTimeMerge),
					_user_voided_name: Locale.getString('title.voided-by', 'Voided By'),
					notes: Locale.getString('label.notes', 'Notes'),
				},
				onAdditionalSearchFields: function() {
					return (
						<span style={{marginLeft: 10}}>
							<input name="control_number" type="text" placeholder={Locale.getString('label.control-number', 'Control Number')} style={{maxWidth: 140}} onChange={handleChange} />
							{' '}
							<i className="fa fa-info-circle" title={Locale.getString('title.dash-required', 'Dash is required for the control number.')} style={{fontSize: 15}} />
							&nbsp;
							<input name="mrn" type="text" placeholder={Locale.getString('title.mrn', 'MRN')} style={{maxWidth: 100}} onChange={handleChange} />
							<select name="study_id" onChange={this.handleChange} value={this.state.criteria.study_id} style={{marginLeft: 10, maxWidth: 150}}>
								<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
								{_.map(this.state.studies, function(study) {
									if (study.status != 2) {
										return <option key={study.id} value={study.id}>{study.sponsor.name} - {study.protocol} - {study.title}</option>;
									}
								})}
							</select>
						</span>
					);
				}.bind(this),
			},
			{
				title: Locale.getString('title.stipend-payments-1099', 'Stipends Payments (1099)'),
				endpoint: '/reports/stipend-payments',
				identifier: 'mrn',
				fields: {
					sponsor: Locale.getString('title.sponsor', 'Sponsor'),
					protocol: Locale.getString('title.protocol', 'Protocol'),
					mrn: Locale.getString('title.mrn', 'MRN'),
					ssn: Locale.getString('label.ssn', 'SSN'),
					name: Locale.getString('label.name', 'Name'),
					address: Locale.getString('label.address1', 'Address Line 1'),
					address2: Locale.getString('label.address2', 'Address Line 2'),
					city: Locale.getString('label.city', 'City'),
					state: Locale.getString('title.state', 'State'),
					zipcode: Locale.getString('label.zip-postalcode', 'Zip / Postal Code'),
					amount: {
                        label: Locale.getString('title.amount', 'Amount'),
                        align: 'right',
                    },
					
				},
				onAdditionalSearchFields: function() {
					return (
						<span style={{marginLeft: 10}}>
							<select size="1" name="age_range" onChange={handleChange}>
								<option value="0">{Locale.getString('option.all-ages', 'All Ages')}</option>
								<option value="1">{Locale.getString('option.under-18', 'Under 18 Years of Age')}</option>
								<option value="2">{Locale.getString('option.over-18', '18 Years of Age and Older')}</option>
								<option value="3">{Locale.getString('option.no-dob', 'No DOB')}</option>
							</select>
						</span>
					);
				},
			},
		];
		return reports;
	},

	render: function() {
		var reports = this.getReports();
		var queryParams = _.map(this.state.criteria, function(val, key) {
			return key + '=' + val;
		}).join('&');
		var datePickerProps = {
			changeYear: true,
			showPickerIcon: true,
			style: {
				maxWidth: 140,
			},
		};


		const dataTableProps = this.state.currentReport && this.state.currentReport.identifier ? {identifier: this.state.currentReport.identifier} : {};

		try {
			return (
				<div className="page">
					<div className="row">
						<div className="col-sm-3" style={{borderRight: '1px solid #eee'}}>
							<p style={{marginBottom: 30, fontSize: 14}}>{Locale.getString('message.select-report', 'Select report below for report-specific options.')}</p>
							{_.map(reports, function(report) {
								if (report.endpoint)
									return <p style={{fontSize: 14}} key={report.title}><a href="#!" onClick={this.handleReport.bind(null, report)}>{report.title} {this.state.currentReport && this.state.currentReport.title == report.title ? <i className="fa fa-caret-right" /> : null}</a></p>;
								return <p style={{fontSize: 14}} key={report.title}>{report.title}</p>;
							}, this)}
						</div>
						{this.state.currentReport &&
						<div className="col-sm-9">
							<div className="row" style={{marginBottom: 25, borderBottom: '1px solid #eee', paddingBottom: 15}}>
								<div className="col-sm-12 form">
									{Locale.getString('label.date-range', 'Date Range')}: <ClinicalDatePicker {...datePickerProps} onChange={this.setCriteriaValue.bind(null, 'date_start')} value={this.state.criteria.date_start} />
									{' - '}
									<ClinicalDatePicker {...datePickerProps} onChange={this.setCriteriaValue.bind(null, 'date_end')} value={this.state.criteria.date_end} />

									{(this.state.criteria.date_start || this.state.criteria.date_end) &&
									<span> - <a href="#!" onClick={this.handleClearDates}>&times; {Locale.getString('button.clear-dates', 'Clear Dates')}</a></span>}

									{_.isFunction(this.state.currentReport.onAdditionalSearchFields) && this.state.currentReport.onAdditionalSearchFields()}
									<a href="#!" className="button action" onClick={this.handleReportRun} 
										style={{marginLeft: 10, color: '#fff', backgroundColor: _.primaryBrandColor(), padding: '8px 30px'}}>{this.state.processing ? <i className="fa fa-spin fa-spinner" /> : Locale.getString('button.run-report', 'Run Report')}</a>
								</div>
							</div>
							{this.state.run &&
							<DataTable
								{...dataTableProps}
								ref="dt"
								endpoint={this.state.currentReport.endpoint + '?' + queryParams}
								fields={this.state.currentReport.fields}
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
							/>}
						</div>}
					</div>
					{this.state.downloadURL &&
					<iframe 
						key={this.state.downloadKey}
						style={{opacity: 0, zIndex: -5, position: 'absolute', left: -200, top: -200, width: 5, height: 5}}
						src={_.endpoint(this.state.downloadURL)} />}
				</div>
			);
		}
		catch (e) {
			console.log(e);
		}
	}

});

