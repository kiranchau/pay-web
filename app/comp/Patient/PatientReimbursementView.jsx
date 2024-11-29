const {Locale} = RTBundle;

var PatientReimbursementView = React.createClass({

	getInitialState: function() {
		return {
			countries: {},
			states: {},
			timezones: [],
			siteID: 0,
			_patient: {},
			studyAssociations: [],
		};
	},
	
	componentDidMount: function() {
		$.get(_.endpoint('/settings'), function(res) {
			this.setState({
				countries: res.countries,
				states: res.states,
				timezones: res.timezones,
			});
		}.bind(this));
		$.get(_.endpoint('/patients/info'), function(res) {
			this.setState({
				_patient: res.record,
				siteID: res.record.study.site_id,
			}, this.fetchAssociations);
		}.bind(this));
	},

	fetchAssociations: function() {
		$.get(_.endpoint('/patients/studies?patient_id=' + this.state._patient.id), function(res) {
			this.setState({
				studyAssociations: res.records,
			});
		}.bind(this));
	},

	render: function() {
		var studyAssociations = this.state.studyAssociations;
		var activeCount = _.filter(studyAssociations, function(patientStudy) {
			return patientStudy.status == 0 && patientStudy._study_manage_reimbursements == 1;
		}).length;
		var canSelectStudy = false;
		if (activeCount > 1) {
			canSelectStudy = true;
		}
		return (
			<div className="page">
				<DataTable
					{...this.props}
					{...this.state}
					canSelectStudy={canSelectStudy}
					endpoint="/patients/reimbursements"
					form={PatientRequestForm}
					createButtonLabel={activeCount == 0 ? "" : Locale.getString('button.new-reimbursement', 'New Reimbursement')}
					patientMode={true}
					siteID={this.state.siteID}
					_patient={this.state._patient}
					onCreateRecord={function() {
						return {
							items: [],
						};
					}}
					fields={{
						date_request: {
							label: Locale.getString('label.date', 'Date'),
							value: function(val) {
								return moment.utc(val).local().format('DD-MMM-YYYY hh:mm A').toUpperCase();
							},
						},
						amount: {
							label: Locale.getString('title.amount', 'Amount'),
							value: function(val) {
								return (this._symbol ? this._symbol : '$') + val;
							},
						},
						_num_items: {
							label: Locale.getString('title.num-items', 'Number of Items'),
							style: {textAlign: 'center'},
						},

						_: {
							label: Locale.getString('title.summary', 'Summary'),
							value: function(val) {
								return '';
							}
						},
						_2: {
							label: Locale.getString('title.stipend-ref-#', 'Stipend Ref. #'),
							value: function(val) {
								return '--';
							},
						},
						status: {
							label: Locale.getString('title.status', 'Status'),
							style: {width: '15%'},
							value: function(val) {
								const status = _.patientRequestStatus(val);
								const style = {
									display: 'block',
									color: '#fff',
									backgroundColor: status.color,
									fontSize: 12,
									padding: 5,
								};
								return <span style={style}>{status.title}</span>;
							},
						},
					}}
				/>
			</div>
		);
	}

});
