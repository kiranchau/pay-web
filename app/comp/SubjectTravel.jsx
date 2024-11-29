const {Locale} = RTBundle;
var SubjectTravel = React.createClass({

	getRouteInfo: function() {
		return {
			heading: Locale.getString('title.subject-travel', 'Subject Travel'),
			path: '/subject-travel',
		};
	},

	getInitialState: function() {
		return {
			dialog : null,
			studies: [],
			sites  : [],
			filteredReimbursementStatus: '1',
			filteredSiteID: '',
			filteredStudyID: '',
			allCountries: [],
		};
	},

	handleDialogClose: function() {
		this.setState({
			dialog: null,
		});
	},

	componentDidMount: function() {
		const {urlParams} = this.props;
		if (urlParams && urlParams.cmd == 'view-requests') {
			const data = {filteredReimbursementStatus: '1'};
			if (urlParams.status) {data.filteredReimbursementStatus = urlParams.status}
			if (urlParams.study_id) {data.filteredStudyID = urlParams.study_id}
			if (urlParams.site_id) {data.filteredSiteID = urlParams.site_id}
			this.setState(data, () => {this.refs.dt.handleUpdate();});
			this.props.setGlobalState({
				urlParams: {},
				appLoading: false
			});
		}

		$.get(_.endpoint(`/studies-sites`), (res) => {
			this.setState({
                studies: res.studies,
                sites  : res.sites
            }, () => {this.refs.dt.handleUpdate();});
		});
		
		$.get(_.endpoint(`/countries`), (res) => {
			this.setState({
                allCountries: res.records,
            });
        });
	},
	
	handleApprovalConfirmation: function(id) {
		$.post(_.endpoint('/patients/travelrequests/accept'), {request_id: id}, function(res) {
			this.setState({
				dialog: (
					<Dialog width={300} onClose={this.handleDialogClose} buttons={<button type="button" onClick={this.handleDialogClose}>{Locale.getString('label.okay', 'Okay')}</button>}>
						<div>
							{res.message &&
							<p>{res.message}</p>}
							{res.error &&
							<p>{res.error}</p>}
						</div>
					</Dialog>
				)
			});
			this.handleUpdate();
		}.bind(this));
	},

	handleDenialConfirmation: function(id) {
		$.post(_.endpoint('/patients/travelrequests/deny'), {request_id: id}, function(res) {
			this.setState({
				dialog: (
					<Dialog width={300} onClose={this.handleDialogClose} buttons={<button type="button" onClick={this.handleDialogClose}>{Locale.getString('label.okay', 'Okay')}</button>}>
						<div>
							{res.message &&
							<p>{res.message}</p>}
							{res.error &&
							<p>{res.error}</p>}
						</div>
					</Dialog>
				)
			});
			this.handleUpdate();
		}.bind(this));
	},

	handleCancelConfirmation: function(id) {
		$.post(_.endpoint('/patients/travelrequests/cancel'), {request_id: id}, function(res) {
			this.setState({
				dialog: (
					<Dialog width={300} onClose={this.handleDialogClose} buttons={<button type="button" onClick={this.handleDialogClose}>{Locale.getString('label.okay', 'Okay')}</button>}>
						<div>
							{res.message &&
							<p>{res.message}</p>}
							{res.error &&
							<p>{res.error}</p>}
						</div>
					</Dialog>
				)
			});
			this.handleUpdate();
		}.bind(this));
	},

	stopPropagation(e) {
		e.stopPropagation();
	},

	handleApproval: function(id, e) {
		e.stopPropagation();
		this.setState({
			dialog: (
				<ConfirmationDialog title={Locale.getString('title.confirm-approval', 'Confirm Approval')} onConfirm={this.handleApprovalConfirmation.bind(null, id)} onCancel={this.handleDialogClose}>
					{Locale.getString('message.approve-travel', 'Are you sure you want to approve this request?')}
				</ConfirmationDialog>
			)
		});
	},

	handleDenial: function(id, e) {
		e.stopPropagation();
		this.setState({
			dialog: (
				<ConfirmationDialog title={Locale.getString('title.confirm-denial', 'Confirm Denial')} onConfirm={this.handleDenialConfirmation.bind(null, id)} onCancel={this.handleDialogClose}>
					{Locale.getString('message.deny-travel', 'Are you sure you want to deny this request?')}
				</ConfirmationDialog>
			)
		});
	},

	handleCancel: function(id, e) {
		e.stopPropagation();
		this.setState({
			dialog: (
				<ConfirmationDialog title={Locale.getString('title.confirm-cancel', 'Confirm Cancel')} onConfirm={this.handleCancelConfirmation.bind(null, id)} onCancel={this.handleDialogClose}>
					{Locale.getString('message.cancel-travel', 'Are you sure you want to Cancel this request?')}
				</ConfirmationDialog>
			)
		});
	},

	handleMessage: function(id, e) {
		e.stopPropagation();
		this.setState({
				dialog: (
					<MessageDialog user={this.props.user} requestID={id} onUpdate={this.refs.dt.handleUpdate} title={Locale.getString('title.reimbursement-queries', 'Reimbursement Queries')} onConfirm={this.handleDenialConfirmation.bind(null, id)} onCancel={this.handleDialogClose}>
					</MessageDialog>
				)
			});
	},

	handleUpdate: function() {
		this.refs.dt.handleUpdate();
	},

	confirmRecall: function(id, e) {
		e.stopPropagation();
		this.setState({
			dialog:
				<ConfirmationDialog title={Locale.getString('title.confirm-recall', 'Confirm Recall')} onConfirm={this.acceptRecall.bind(null, id)} onCancel={this.denyRecall.bind(null, id)}>
					{Locale.getString('message.recall-reimb', 'Are you sure you want to recall this reimbursement?')}
				</ConfirmationDialog>,
		});
	},

	confirmVoid: function(id, e) {
		e.stopPropagation();
		this.setState({
			dialog:
				<ConfirmationDialog title={Locale.getString('label.confirm-void', 'Confirm Void')} onConfirm={this.acceptVoid.bind(null, id)} onCancel={this.denyVoid.bind(null, id)}>
					{Locale.getString('message.void-reimb', 'Are you sure you want to void this reimbursement?')}
				</ConfirmationDialog>
		});
	},

	denyVoid: function(id, e) {
		this.handleDialogClose();
	},

	acceptVoid: function(data, e) {
		$.post(_.endpoint('/patients/' + (data.patient_visit_id > 0 ? 'visits' : 'requests') +'/void?request_id=' + data.id), function(res) {
			if (res.status < 2) {
				this.handleDialogClose();
				this.handleUpdate();
			}
			else {
					console.log(res.errors);
			}
		}.bind(this));
	},

	acceptRecall: function(id, e) {
		$.post(_.endpoint('/patients/requests/recall?request_id=' + id), function(res) {
			if (res.status < 2) {
				this.handleDialogClose();
				this.handleUpdate();
			}
			else {
				console.log(res.errors);
			}
		}.bind(this));
	},

	denyRecall: function(id, e) {
		this.handleDialogClose();
	},

	handleReimbursementFilter: function(e) {
		this.setState({
			filteredReimbursementStatus: e.target.value,
		}, () => {
			this.refs.dt.setState({page: 1}, this.refs.dt.handleUpdate)
		});
	},

	handleStudyFilter: function(e) {
		this.setState({
			filteredStudyID: e.target.value,
		}, () => {
			this.refs.dt.setState({page: 1}, this.refs.dt.handleUpdate)
		});
	},

	handleSiteFilter: function(e) {
		this.setState({
			filteredSiteID: e.target.value,
		}, () => {
			this.refs.dt.setState({page: 1}, this.refs.dt.handleUpdate)
		});
	},

	filterReimbursementFunc: function() {
		const status = this.state.filteredReimbursementStatus;
		const studyID = this.state.filteredStudyID;
		const siteID = this.state.filteredSiteID;
		
		return function(record) {
			const c = [record.status == status];
			c.push(siteID == '' || record.site_id == siteID)
			c.push(studyID == '' || record.study_id == studyID)
			return _.all(c);
		}.bind(this);
	},

	handleReimbursementFilters: function() {
		return (
			<span>
				<select onChange={this.handleReimbursementFilter} value={parseFloat(this.state.filteredReimbursementStatus) || 0} style={{marginLeft: 8, width: 160}}>
					{_.map(_.patientTravelStatuses(), (v) => {
						return (<option value={v.status} key={v.status}>{v.title}</option>)
					})}
				</select>
				<select onChange={this.handleStudyFilter} style={{marginLeft: 8, width: 160}} value={ this.state.filteredStudyID && this.state.studies.length ? this.state.studies.find(s => { return s.id == this.state.filteredStudyID}).id : '' }>
					<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
					{_.map(this.state.studies, function(study) {
						let protocol = study.protocol.length > 20 ? (study.protocol.substr(0, 20) + '...') : study.protocol;
						return <option key={study.id} value={study.id}>{study._sponsor_name + ' - ' + protocol}</option>;
					})}
				</select>
				<select onChange={this.handleSiteFilter} style={{marginLeft: 8, width: 160}} value={ this.state.filteredSiteID && this.state.sites.length ? this.state.sites.find(s => { return s.id == this.state.filteredSiteID}).id : '' }>
					<option value="">{Locale.getString('option.all-sites', 'All Sites')}</option>
					{_.map(this.state.sites, function(site) {
						return <option key={site.id} value={site.id}>{site.name}</option>;
					})}
				</select>
			</span>
		);
	},

	render: function() {
		const handleApproval = this.handleApproval;
		const handleDenial = this.handleDenial;
		const handleCancel = this.handleCancel;
		const dateTimeFormat = 'DD-MMM-YYYY hh:mm:ss A';
		const patientProps = {};
		const isSiteUser = this.props.user.type === 'siteuser';
		const canApproveReimbursements = this.props.user.options.subject_request_approval;
		const self = this;
		return (
			<div className="page">
				{this.state.dialog}
				<DataTable
					{...this.props}
					{...patientProps}
					ref="dt"
					identifier="id"
					dialogClassName="patient"
					remotePaging={true}
					requestParams={{reimbursement_status: this.state.filteredReimbursementStatus, study_id: this.state.filteredStudyID, site_id: this.state.filteredSiteID}}
					endpoint="/patients/travelrequests"
					form={PatientRequestForm}
					editOnRowClick={false}
					editTitle={Locale.getString('label.reimbursement-request', 'Reimbursement Request')}
					optionsClassName='col-md-10 form'
					additionalClassName= 'col-md-2'
					onBeforeEdit={(params) => {
						return {
							...params,
							...{
							title: Locale.getString('label.reimbursement-request', 'Reimbursement Request') + ' - ' + params.record.patient.id + ' - ' + params.record.patient.firstname + ' ' + params.record.patient.lastname}
						}
					}}
					className="has-controls"
					onFilters={this.handleReimbursementFilters}
					fields={{
						site_id: {
							label: Locale.getString('title.site', 'Site'),
							value: (id) => {
								const site = this.state.sites.find(s => { return s.id == id});
								return this.state.sites.length ? site ? site.name: '' : '';
							},
							sortWithValue: true,
						},
						study_id: {
							label: Locale.getString('title.study', 'Study'),
							value: (id) => {
								const study = this.state.studies.find(s => { return s.id == id});
								let name = '';
								if (study) {
									let protocol = study.protocol.length > 20 ? (study.protocol.substr(0, 20) + '...') : study.protocol;
									name = `${study._sponsor_name} - ${protocol}`;
								}
								return name;
							},
							sortWithValue: true,
						},
						firstname: {
							label: Locale.getString('label.subject', 'Subject'),
							value: function() {
								let parts = [
									this.patient.firstname ? this.patient.firstname.charAt(0) : '-',
									this.patient.middle ? this.patient.middle.charAt(0) : '-',
									this.patient.lastname ? this.patient.lastname.charAt(0) : '-',
								];
								return parts.join('').toUpperCase();
							},
							sortWithValue: true,
						},
						id: {
							label: 'MRN',
							value: function() {
								return this.patient_id;
							},
							sortValue: function(val) {
								return parseInt(this.patient_id);
							}
						},
						visit_name: {
							label: Locale.getString('title.visit', 'Visit'),
							value: function(val) {
								return this.visit_name;
							},
						},
						visit_start_date: {
							label: Locale.getString('title.visit_start_date', 'Visit Date Time'),
							value: function(val) {
								let mom = moment.utc(val);
								if (mom.isValid() && val) {
										return mom.format('DD-MMM-YYYY, HH:mm').toUpperCase();
								}
								return '--';
							},
						},
						request_types: {
							label: Locale.getString('title.request_types', 'Type Of Travel'),
							value: function(val) {
								return this.request_types;
							},
						},
						travel_departure: {
							label: Locale.getString('title.travel_start_date', 'Departure Date Time'),
							value: function(val) {
								let mom = moment.utc(val);
								if (mom.isValid() && val) {
										return mom.format('MM/DD/YYYY hh:mm:ss A').toUpperCase();
								}
								return '--';
							},
						},
						travel_return: {
							label: Locale.getString('title.travel_end_date', 'Return Date Time'),
							value: function(val) {
								let mom = moment.utc(val);
								if (mom.isValid() && val) {
										return mom.format('MM/DD/YYYY hh:mm:ss A').toUpperCase();
								}
								return '--';
							},
						},
						status: {
							style: {width: '25%', textAlign: 'right'},
							sortable: false,
							label: '',
							value: function(val) {
								let displayDate = function(label, datetime) {
									let mom = moment.utc(datetime);
									if (mom.isValid()) {
										return label + ' ' + mom.local().format(dateTimeFormat);
									}
									return 'N/A';
								};
								let styleButtonApprove = {color: '#090'};
								if (val == 1 || val == 1.1) {
									let queryButtonStyle = {};
									if (this._num_unresolved == 0) {
										queryButtonStyle.color = '#555';
									}
									else if ( this._num_unresolved > 0) {
										queryButtonStyle.color = '#f00';
									}
									return (
										<div className="record-controls">
											{(!isSiteUser || isSiteUser && 
											(self.props.user.options && parseInt(self.props.user.options.stipend_approval) === 1 && parseInt(this.patient_visit_id) > 0) ||
											self.props.user.options && parseInt(canApproveReimbursements) === 1 && parseInt(this.patient_visit_id) == 0) &&
											<span>
												<button onClick={handleDenial.bind(null, this.id)} type="button" className="deny" 
												title={Locale.getString('title.deny', 'Deny')} style={{color: '#900'}}><i className="fa fa-ban" /></button>
												<button onClick={handleCancel.bind(null, this.id)} type="button" className="canceled" 
												title={Locale.getString('title.canceled', 'Canceled')} style={{color: '#900'}}><i className="fa fa-times" /></button>
											</span>}
										</div>
									);
								}
								else if (val == 2) {
									return (
										<div className="record-controls">
											<button onClick={handleDenial.bind(null, this.id)} type="button" className="deny" 
											title={Locale.getString('title.deny', 'Deny')} style={{color: '#900'}}><i className="fa fa-ban" /></button>
											<button onClick={handleCancel.bind(null, this.id)} type="button" className="canceled" 
											title={Locale.getString('title.canceled', 'Canceled')} style={{color: '#900'}}><i className="fa fa-times" /></button>
										</div>
									);
								}
								else if (val == 3) {
									return displayDate('Denied', this.date_denied);
								}
								else if (val == 4) {
									return displayDate('Cancelled', this.date_cancel);
								}
							}
						},
					}}
				/>
			</div>
		);
	}
});