const {Locale} = RTBundle;

var PatientView = React.createClass({

	getRouteInfo: function() {
		return {
			path: '/patients',
			heading: Locale.getString('title.subjects', 'Subjects'),
		};
	},

	getDefaultProps: function() {
		return {
			dateFormatClinical: 'DD-MMM-YYYY',
		};
	},

	getInitialState: function() {
		return {
			sites: [],
			dialog: null,
			studies: [],
			filterFunc: _.identity,
			filteredSiteID: '',
			filteredStudyID: '',
			enable_ous: false,
		};
	},

	componentDidMount: function() {
		$.get(_.endpoint('/sites'), function(res) {
			this.setState({
				sites: res.records,
			});
		}.bind(this));

		$.get(_.endpoint('/studies'), function(res) {
			this.setState({
				studies: res.records,
			});
		}.bind(this));
		this.loadSettings();

		const {context} = this.props;
		if (!_.isUndefined(context) && !_.isUndefined(context.patientID)) {
			
			$.get(_.endpoint(`/patients?id=${context.patientID}`), (res) => {
				this.refs.patientTable.handleEditRecord({ record: res.records, title: Locale.getString('title.subject-profile', 'Subject Profile')});
				this.props.setGlobalState({
					context: {}
				});
			});
		}
	},

	loadSettings: function() {
		$.get(_.endpoint('/settings'), function(res) {
			var enableOUS = parseInt(res.enable_ous) === 1 ? true : false;
			this.setState({
				enable_ous: enableOUS,
			});
		}.bind(this));
	},

	closeAuditDialog: function() {
		this.setState({
			dialog: null,
		});
	},

	handleAuditTrail: function(id) {
		this.setState({
			dialog: (
				<Dialog title={Locale.getString('title.audit-trial', 'Audit Trail')} onClose={this.closeAuditDialog} zIndex={600} buttons={<button type="button" onClick={this.closeAuditDialog}>{Locale.getString('button.close', 'Close')}</button>}>
					<AuditTrailViewer source={'/audit/patients/' + id} />
				</Dialog>
			)
		});
	},

	handleFilterFunc: function(e) {
		var val = e.target.value;
		var state = this.state;
		var fieldName = e.target.name;
		state[fieldName] = val;
		this.setState(state, this.onUpdate);
	},

	renderFilters: function() {
		var studies = this.state.studies;
		if (this.state.filteredSiteID) {
			studies = _.filter(this.state.studies, function(study, key, collection) {
					return study._sites[this.state.filteredSiteID];
			}, this);
		}

		return (
			<span>
				<select name="filteredSiteID" onChange={this.handleFilterFunc} style={{marginLeft: 8, width: 100}}>
					<option value="">{Locale.getString('option.all-sites', 'All Sites')}</option>
					{_.map(this.state.sites, function(record) {
						return <option key={record.id} value={record.id}>{record.name}</option>;
					})}
				</select>
				<select name="filteredStudyID" onChange={this.handleFilterFunc} style={{marginLeft: 8, width: 100}}>
					<option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
					{_.map(studies, function(record) {
						return <option key={record.id} value={record.id}>{record.sponsor.name} - {record.protocol} - {record.title}</option>;
					})}
				</select>
			</span>
		);
	},

	onUpdate: function() {
		_.defer(this.refs.patientTable.handleUpdate);
	},

	closeDialog: function() {
		this.refs.patientTable.handleCloseDialog();
	},

	render: function() {
		var handleAuditTrail = this.handleAuditTrail;
		var enableOUS = this.state.enable_ous;
		var _this = this;

		var filSiteID = this.state.filteredSiteID;
		var filStudyID = this.state.filteredStudyID;


		var reqParams = {};
		if (filSiteID !== '') {
			reqParams = _.extend(reqParams, {siteID: filSiteID});
		}
		if (filStudyID !== '') {
			reqParams = _.extend(reqParams, {studyID: filStudyID});
		}

		const props = {...this.props};
		delete props.key;

		return (
			<div className="page">
				{this.state.dialog}
				<DataTable
					{...props}
					style={{paddingTop: 57}}
					dialogBodyStyle={{paddingTop: 30}}
					closePatientForm={this.closeDialog}
					passNewRecordToDialog={true}
					onUpdate={this.onUpdate}
					remotePaging={true}
					requestParams={reqParams}
					ref="patientTable"
					sites={this.state.sites}
					endpoint="/patients"
					createButtonLabel={Locale.getString('button.new-subject', 'New Subject')}
					form={PatientForm}
					dialogClassName="patient"
					controls={PatientControls}
					splitButtonPanel={true}
					closeAfterSaving={false}
					onFilters={this.renderFilters}
					editOnRowClick={true}
					editTitle={Locale.getString('title.subject-profile', 'Subject Profile')}
					identifier={'id'}
					showXOnSave={false}
					saveMinDelay={1250}
					onBeforeSave={function(dataTable, record) {
						$( "body").addClass('avoid-clicks');
						return true;
					}}
					onUpdate={function(dataTable, record) {
						$( "body").removeClass('avoid-clicks');
						return true;
					}}
					onLoaded={function(dataTable) {
						$( "body").removeClass('avoid-clicks');
					}}
					onCreateRecord={function() {
						return {
							card: {},
							_attempt_email_verification: 1,
							_attempt_mobile_verification: 1,
						};
					}}
					onDialogButtons={function(side, params) {
						if (side == 'left') {
							if (params.record.id > 0) {
								return (
									<span>
										<button type="button" onClick={handleAuditTrail.bind(null, params.record.id)}>{Locale.getString('button.view-audit-trial', 'View Audit Trial')}</button>
									</span>
								);
							}
						}
					}}
					fields={{
						_initials: {
							label: Locale.getString('title.initials', 'Initials'),
							width: '10%',
							value: function(val) {
								return <span>{val.toUpperCase()} {this._international && <i className="fa fa-globe" />}</span>;
							},
							sortWithValue: true,
						},
						dob: {
							label: Locale.getString('label.date-of-birth', 'Date of Birth'),
							width: '10%',
							value: function(val) {
								var mom = moment(val);
								return mom.isValid() ? mom.format(this.props.dateFormatClinical).toUpperCase() : 'N/A';
							}.bind(this),
							sortWithValue: false,
						},
						id: {
							label: Locale.getString('title.mrn', 'MRN'),
							width: '10%',
						},
						_patient_study_study_number: {
							label: Locale.getString('title.study-id', 'Study ID #'),
							width: '10%',
							value: function(val) {
								if (val) {
									if (val.indexOf('<><>') > -1) {
										var recordsArr = val.split('<><>');
										var len = recordsArr.length;
										if (len <= 2) {
											var mapBuilder = _.map(recordsArr, function(arrString, counter) {
												var arr = arrString.split('|');
												var sn = arr[0];
												var info = '';
												if (arr[1]) {
													info = arr[1].split('.').join(' - ');
												}
													return <span title={info}>{sn + (counter === len - 1 ? "": ", ")}</span>;
											});
											return mapBuilder;
										}
										else {
											var recordsArr = val.split('<><>');
											var recordsArr = _.uniq(recordsArr);
											var arr = recordsArr.splice(0, 2);
											var record = arr[0];
											var record2 = arr[1];
											var displayStudyNumbers = arr[0];
											var extraInfo = recordsArr;
											var tooltipArr = [];
											for (var i = 0; i < extraInfo.length; i++) {
												var tooltipData = extraInfo[i].split('|');
												tooltipArr.push(tooltipData[0]);
											}
											var tooltip = tooltipArr.join(', ');
											var len = recordsArr.length;
											var data = record.split('|');
											var info = data[1].split('.').join(' - ');
											var data2 = record2.split('|');
											return <span><span title={info}>{data[0] + ", "}</span><span title={data2[1].split('.').join(' - ')}>{data2[0]}</span><span title={tooltip}>{" +" + len + " more"}</span></span>;
										}
									}
									else {
										var arr = val.split('|');
										var sn = arr[0];
										var info = arr[1].split('.').join(' - ');
										return <span title={info}>{sn}</span>;
									}
									return val;
								}
								else {
									return '';
								}
							},
						},
						_site: {
							label: Locale.getString('title.site', 'Site'),
							width: '15%',
							value: function(val) {
								return this.site.name;
							},
						},
						_studies: {
							label: Locale.getString('title.studies', 'Studies'),
							width: '15%',
							value: function(val) {
								if (val) {
									var studies = val.split('<><>');
									studies = _.uniq(studies);

									var studiesCopy = _.clone(studies);
									if (studies.length <= 2) {
										var studiesStr = studies.join(', ');
										return studiesStr;
									}
									else {
										var len = studies.length;
										var studiesStr = studies[0] + ", " + studies[1];
										var refinedBuilder = [];
										for (var i = 2; i < studies.length; i++) {
											refinedBuilder.push(studies[i]);
										}
										var strBuilder = refinedBuilder.join(', ');
										return <div>{studiesStr + " "}<span title={strBuilder}>{"+" + (len - 2) + " more"}</span></div>;
									}
								}
								return '';
							},
						},
						_pending_requests: {
							label: Locale.getString('title.pending-requests', 'Pending-Requests'),
							align: 'center',
							width: '10%',
							value: function(val) {
								return val;
							}
						},
						_card: {
							label: enableOUS ? Locale.getString('title.payment-card-bank', 'Payment Card / Bank Acct.') : Locale.getString('title.payment-card', 'Payment Card'),
							value: function(val) {
								var intl = this.country !== null && this.country !== '' && this.country != 'US';
								if (this.site.payment_method == 'bank' && this.bank_account.account_num) {
									return	this.bank_account.account_num.replace(/[0-9]/g, 'x');
								}
								else if (this.site.payment_method == 'card' && this.card_id > 0) {
									return this.card.name;
								}
								return Locale.getString('label.not-assigned', 'Not Assigned');
							},
							width: '10%',
							sortable: false,
						},
					}}
				/>
			</div>
		);
	}

});
