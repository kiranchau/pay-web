const {Locale} = RTBundle;

var PatientRequestView = React.createClass({

	getRouteInfo: function() {
		return {
			heading: Locale.getString('title.subject-payments', 'Subject Payments'),
			path: '/reimbursements',
		};
	},

	getInitialState: function() {
		return {
			dialog : null,
			studies: [],
			sites  : [],
			filteredReimbursementStatus: '1.0',
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
			const data = {filteredReimbursementStatus: '1.1'};
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
		if (!this.state.saving) { 
			this.setState({ saving: true }) 
		}
		else {  return; }

		$.post(_.endpoint('/patients/requests/approve'), {request_id: id}, function(res) {
			if (res.status < 2) {
				this.setState({
					saving: false,
					dialog: (
						<Dialog width={300} title={Locale.getString('title.success', 'Success')} onClose={this.handleDialogClose} buttons={<button type="button" onClick={this.handleDialogClose}>{Locale.getString('label.okay', 'Okay')}</button>}>
							<p>{res.message}</p>
						</Dialog>
					),
				});
			}
			else {
				this.setState({
					saving: false,
					dialog: <Dialog width={300} title={Locale.getString('title.error', 'Error')} onClose={this.handleDialogClose} buttons={<button type="button" onClick={this.handleDialogClose}>{Locale.getString('label.okay', 'Okay')}</button>}>
							<p>{res.errors.message}</p>
						</Dialog>
				});
			}
			this.handleUpdate();
		}.bind(this));
	},
	
	handleDenialConfirmation: function(id) {
		$.post(_.endpoint('/patients/requests/deny'), {request_id: id}, function(res) {
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
				<ConfirmationDialog title={Locale.getString('title.confirm-approval', 'Confrim Approval')} onConfirm={this.handleApprovalConfirmation.bind(null, id)} onCancel={this.handleDialogClose}>
					{Locale.getString('message.approve-reimb', 'Are you sure you want to approve this reimbursement?')}
				</ConfirmationDialog>
			),
		});
	},

	handleDenial: function(id, e) {
		e.stopPropagation();
		this.setState({
			dialog: (
				<ConfirmationDialog title={Locale.getString('title.confirm-denial', 'Confirm Denial')} onConfirm={this.handleDenialConfirmation.bind(null, id)} onCancel={this.handleDialogClose}>
					{Locale.getString('message.deny-reimb', 'Are you sure you want to deny this reimbursement?')}
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

	confirmVoid: function(data, e) {
		e.stopPropagation();
		this.setState({
			dialog:
				<ConfirmationDialog title={Locale.getString('label.confirm-void', 'Confirm Void')} onConfirm={this.acceptVoid.bind(null, data)} onCancel={this.denyVoid.bind(null, data.id)}>
					{Locale.getString('message.void-reimb', 'Are you sure you want to void this reimbursement?')}
				</ConfirmationDialog>
		});
	},

	denyVoid: function(id, e) {
		this.handleDialogClose();
	},

	acceptVoid: function(data, e) {
		$.post(_.endpoint('/patients/requests/void?request_id=' + data.id), function(res) {
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
					{_.map(_.patientRequestStatuses(), (v) => {
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
		var handleApproval = this.handleApproval;
		var handleDenial = this.handleDenial;
		var handleMessage = this.handleMessage;
		var stopPropagation = this.stopPropagation;
		var dateTimeFormat = 'DD-MMM-YYYY hh:mm:ss A';
		var systemSettings = this.state.system_settings;
		var patientProps = {};
		var confirmRecall = this.confirmRecall;
		var confirmVoid = this.confirmVoid;
		var isSiteUser = this.props.user.type === 'siteuser';
		var canApproveStipends = this.props.user.options.stipend_approval;
		const canApproveReimbursements = this.props.user.options.subject_request_approval;
		var self = this;
		
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
					endpoint="/patients/requests"
					form={PatientRequestForm}
					editOnRowClick={true}
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
					// filterFunc={this.filterReimbursementFunc()}
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
								var parts = [
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
						amount: {
							label: Locale.getString('title.amount', 'Amount'),
							style: {
								textAlign: 'right',
								paddingRight: 25,
							},
							sortValue: function(val) {
								return parseFloat(val);
							},
							value: function(val) {
								return (this._symbol ? this._symbol : '$') + val;
							},
						},
						transaction_id: {
							label: Locale.getString('title.stipend-ref-#', 'Stipend Ref. #'),
							value: function(val) {
								if (this.status == 2)
									return val;
								if (val && this.status != 2)
									return <span style={{textDecoration: 'line-through'}}>{val}</span>;
							}
						},
						visit_name: {
							label: Locale.getString('title.visit', 'Visit'),
							value: function(val) {
								return this.visit_name;
							},
						},
						_num_items: {
							label: Locale.getString('title.num-items', 'Num. Items'),
							style: {textAlign: 'center'},
							value: function(val) {
								if (this.patient_visit_id > 0) {
									return '';
								}
								return val;
							},
							sortValue: function(val) {
								return parseInt(this._num_items);
							},
						},
						status: {
							style: {width: '25%', textAlign: 'right'},
							sortable: false,
							label: '',
							value: function(val) {
								var displayDate = function(label, datetime) {
									var mom = moment.utc(datetime);
									if (mom.isValid()) {
										return label + ' ' + mom.local().format(dateTimeFormat);
									}
									return 'N/A';
								};

								const hasPaymentMethod = (this._extra__has_payment_method == '1');
								let buttonApproveTitle = !hasPaymentMethod ? `${Locale.getString('title.please-add-payment', 'Please add a payment method for')} : ${this.patient_id}` : Locale.getString('button.approve', 'Approve');
								let styleButtonApprove = {color: '#090'};
								

								let hasCountryCurrency =  false;
								const country = _.find(self.state.allCountries, {code: this.site.country});
								const countryName = country ? country.name : ""; 
								if (this.site && _.find(self.props.countries, {code: this.site.country})) {
									const _country = _.find(self.props.countries, {code: this.site.country});
									if (_country && _country.default_currency) {hasCountryCurrency = true}
								}

								buttonApproveTitle = !country ? "Please add a country for this request" : buttonApproveTitle;
								buttonApproveTitle = country && country.active == 0 ? `Please activate country: ${countryName}` : buttonApproveTitle;
								buttonApproveTitle = !hasCountryCurrency && country && _.find(self.props.countries, {code: this.site.country})? `Please add a currency to country: ${countryName}` : buttonApproveTitle;
								if (!hasPaymentMethod || !hasCountryCurrency) {
									styleButtonApprove = {
										cursor: 'not-allowed',
										opacity: 0.5
									}
								}

								if (val == 1 || val == 1.1) {
									var queryButtonStyle = {};

									if (this._num_unresolved == 0) {
										queryButtonStyle.color = '#555';
									}
									else if ( this._num_unresolved > 0) {
										queryButtonStyle.color = '#f00';
									}
									return (
										<div className="record-controls">
											<button onClick={handleMessage.bind(null, this.id)} type="button" className="" style={queryButtonStyle} title={Locale.getString('label.view-queries', 'View queries for this reimbursement.')}><i className="fa fa-comments-o" /></button>
											{(!isSiteUser || isSiteUser && 
											(self.props.user.options && parseInt(self.props.user.options.stipend_approval) === 1 && parseInt(this.patient_visit_id) > 0) ||
											self.props.user.options && parseInt(canApproveReimbursements) === 1 && parseInt(this.patient_visit_id) == 0) &&
											<span>
												<button onClick={hasCountryCurrency && hasPaymentMethod ? handleApproval.bind(null, this.id): stopPropagation} type="button" className="approve" style={styleButtonApprove} title={buttonApproveTitle}><i className="fa fa-check" /></button>
												<button onClick={handleDenial.bind(null, this.id)} type="button" className="deny" title={Locale.getString('title.deny', 'Deny')} style={{color: '#900'}}><i className="fa fa-ban" /></button>
											</span>}
										</div>
									);
								}
								else if (val == 2) {
									return (
										<div className="record-controls">
											{displayDate('Approved', this.date_approved)}
											{self.props.user.options.admin_area && (!isSiteUser || isSiteUser && 
											(self.props.user.options && parseInt(self.props.user.options.stipend_approval) === 1 && parseInt(this.patient_visit_id) > 0) ||
											self.props.user.options && parseInt(canApproveReimbursements) === 1 && parseInt(this.patient_visit_id) == 0) &&
											<button type="button" onClick={confirmRecall.bind(null, this.id)}><i className="fa fa-undo" title={Locale.getString('title.recall-reimbursement', 'Recall Reimbursement') + "?"} /></button>}
										</div>
									);
								}
								else if (val == 3) {
									return displayDate('Denied', this.date_denied);
								}
								else if (val == 4) {
									return displayDate('Cancelled', this.date_cancelled);
								}
								else if (val == 5) {
									return (
										<div className="record-controls">
											{displayDate('Approved', this.date_approved) + " " + Locale.getString('label.and-recalled-by', 'and recalled by') + " " + this._recalled_user_name + " " + moment.utc(this.date_recalled).local().format('MMM D, YYYY hh:mm A')}
											{self.props.user.type == 'user' && (_.isFromCTMS(self.props.user.emailaddress) || _.isFromRedAxle(self.props.user.emailaddress)) &&
											<button type="button" className="record-controls" onClick={confirmVoid.bind(null, this)}><i className="fa fa-ban" title={Locale.getString('title.void-reimbursement', 'Void Reimbursement') + "?"} /></button>}
										</div>
									);
								}
								else if (val == 6) {
									return (
										<div className="record-controls">
											<span style={{textDecoration: 'line-through'}}>{displayDate(Locale.getString('option.approved', 'Approved'), this.date_approved)}</span><span>{Locale.getString('label.and-voided-by', 'and voided by') + " " + this._voided_user_name + " " + moment.utc(this.date_voided).local().format('MMM D, YYYY hh:mm A')}</span><b style={{marginLeft: 8}}>{Locale.getString('label.void', 'VOID')}</b>
										</div>
									);
								}
							}
						},
					}}
				/>
			</div>
		);
	}

});
