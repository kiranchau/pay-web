const {Locale} = RTBundle;

var PatientForm = React.createClass({

	getDefaultProps: function(a) {
		return {
			card_id: 0,
			data: {
				card: {},
				_attempt_email_verification: 1,
				_attempt_mobile_verification: 1,
			},
			errors: {},
			countries: [],
			sites: [],
			urlParams: {},
			onUpdate: _.noop,
			onSave: _.noop,
			sites: [],
			deleteRequestEndpoint: '/travelrequests/',
			closePatientForm: _.noop,
			fromDashboard: false,
			system: {config: {travel_preferences_requests_enabled: true}}
		};
	},

	getInitialState: function() {
		var initialData = this.props.data;
		if (!initialData.id) {
			initialData._studyAssociations = [];
		}
		var sites = this.props.sites;
		if (!initialData.site) {
			if (initialData.selected_study_id > 0) {
				initialData.selected_study_id = '';
			}
		}
		return {
			data: initialData,
			viewSSN: false,
			emailVerified: this.props.data.email_verified == 1,
			initialEmail: this.props.data.emailaddress,
			initialPhone: this.props.data.phone_mobile,
			dialog: null,
			TravelPreferenceDialogProps: null,
			dialogErrors: {},
			tempPasswordSent: false,
			studies: [],
			countries: [],
			languages: [],
			states: [],
			sites: sites,
			assignedStudies: [],
			urlParams: this.props.urlParams,
			currentSite: {},
			currentView: 'reimbursements',
			currentPrefView: 'card',
			_duplicateAck: false,
			studyAssociations: [],
			enable_ous: false,
			adminSystemSettings: null,
			filteredReimbursementStatus: '',
			currentVisitDate: null,
			selected_study_id: null,
			selected_site_id:null,
			travelRequestFormProps : [],
			form_display:'block',
			isFeatureFlagOn: false,
		};
	},

	componentDidMount: function() {
		var data = this.state.data;

		if(this.state.data.selected_site_id === "" || this.state.data.selected_site_id === null){
			this.setField('selected_site_id',this.state.data.site.site_id);
		}
		this.onStudyFilterUpdate(); //loads filters
		this.loadCardBalance();
		$.get(_.endpoint('/settings?ver=2'), function(res) {
			var featureFlag = parseInt(res.feature_flag) === 1 ? true : false;
			var enableOus = parseInt(res.enable_ous) === 1 ? true : false;
			if (!enableOus) {
				data.country = 'US';
			}
			this.setState({
				countries: res.countries,
				states: res.states,
				enable_ous: enableOus,
				data: data,
				isFeatureFlagOn: featureFlag,
			});
			res.countries.map((Obj) => {
				if (Obj.code == this.state.data.country) {
					if (Obj.dob_required == 1) {
						this.setState({	dobRequired: Obj.dob_required });
					} else {
						this.setState({	dobRequired: Obj.dob_required });
					}
				}
			});
		}.bind(this));

		$.get(_.endpoint('/languages'), function(res) {
			this.setState({
				languages: res.records,
			});
		}.bind(this));

		this.loadSites();
		if (parseInt(this.state.data.id) > 0) {
			this.updateVisitStipends('selected_study_id', this.state.data.selected_study_id);
		}

		$.get(_.endpoint('/system-settings'), function(res) {
			this.setState({
				adminSystemSettings: res.settings,
			});
		}.bind(this));

		if (parseInt(this.state.data.id) > 0) {
			this.postViewPatients(this.state.data.id);
		}

		if(this.props.urlParams && this.props.urlParams.study_id && this.props.urlParams.site_id) {
			setTimeout(() => {
				const {study_id} = this.props.urlParams;
				const {site_id} = this.props.urlParams;
				this.state.data.selected_study_id = study_id;
				this.state.data.selected_site_id = site_id;
				this.setState({data}, () => {
					this.onChangeSelectedStudy({target: {value: site_id+" "+study_id}});
					this.props.setGlobalState({
						appLoading: false,
						urlParams: {}
					});
				})
			}, 2000);
		}
	},

	postViewPatients(id) {
		$.post(_.endpoint(`/account/viewed/patients`), {id});
	},

	componentWillReceiveProps(nextProps) {
		if (!nextProps.saving && nextProps.saved){
			//Did save form

			if (JSON.stringify(this.state.data) !== JSON.stringify(nextProps.data)){
				_.defer(() => {
					this.setState({data: nextProps.data}, () => {

						this.fetchStudies();
						if (this.refs.travelPreferenceDialog) {
							_.defer(this.handleSave);
						}

						if (this.refs.travelRequestDialog) {
							_.defer(this.handleSave);
						}
					});
				});
			}

			if (!this.state.data.id && nextProps.data.id) {
				this.postViewPatients(nextProps.data.id);
			}
		}
	},

	loadCardBalance: function() {
		if (this.state.data.selected_study_id > 0) {
			$.get(_.endpoint('/patients/card-balance'), {id: this.state.data.id, study_id: this.state.data.selected_study_id}, function(res) {
				if (res.status == '2') { // error, but more likey a study_site doesn't have a payment method
					return;
				}
				var data = this.state.data;
				try {
					data[res.type].balance = res.balance;
					this.setState({
							data: data,
					});
				}
				catch (e) {
					console.log(e);
				}
			}.bind(this));
		}
	},

	loadCurrentSite: function() {
		//for bank to card switching like study_number
		if (this.state.data.id > 0 && this.state.data.selected_study_id > 0) {
			$.get(_.endpoint('/patients/sites/id?patient_id=' + this.state.data.id + '&study_id=' + this.state.data.selected_study_id), function(res) {
				var siteID = res.site_id;
				if (siteID > 0) {
					var currentSite = _.find(this.state.sites, function(site) {
						return site.id == siteID;
					}, this);
					this.setState({
						currentSite: currentSite,
					});
				}
			}.bind(this));
		}
	},

	loadSites: function() {
		if (this.state.sites.length == 0) {
			$.get(_.endpoint('/sites'), function(res) {
				this.setState({
					sites: res.records,
				},
					this.loadCurrentSite
				);
			}.bind(this));
		}
		else {
			this.loadCurrentSite();
		}
	},

	handleDuplicateDialogClose: function() {
		this.setState({
			_duplicateAck: true,
		},
			this.onUpdate
		);
	},

	toggleSSN: function(e) {
		e.preventDefault();

		this.setState({
			viewSSN: !this.state.viewSSN,
		});
	},

	setField: function(key, val) {
		var data = this.state.data;
		data[key] = val;
		this.setState({
			data: data,
		}, () => {this.setup && this.setup.bind(null, key, val); if (this.state.currentPrefView == 'travel'){this.handleShowTravel();}});
	},

	setup: function(key, val) {
		var data = this.state.data;
		data[key] = val;
		var currentSite = {};
		if (key === 'selected_study_id' && key === 'selected_site_id') {
			if (val === '') {
				data.selected_study_id = '';
				data._patient_study_id = 0;
				data._patient_study_status = null;
			}
			else {
				if (this.state.data.id > 0) {
					$.get(_.endpoint('/patients/studies?patient_id=' + this.state.data.id), function(res) {
						var record = _.find(res.records, function(record) {
							return record.study_id == val;
						});
						if (record) {
							data._patient_study_id = record.id;
							data._patient_study_status = record.status;
							data._selected_patient_study_study_number = record.study_number;
							if (this.state.enable_ous) {
								data.country = this.getSiteCountry(record.site_id);
							}
							currentSite = _.find(this.state.sites, function(site) {
								return site.id == record.site_id;
							}, this);
						}
						this.setState({
							currentSite: currentSite,
						}, this.loadCardBalance);
					}.bind(this));
				}
				else {
					this.onStudyFilterUpdate();
				}
			}
		}
		else if (key === 'country') {
			data.ssn = '';
		}
		this.setState({
			data: data,
		}, this.updateVisitStipends.bind(null, key, val));
	},

	updateVisitStipends: function(key, val) {
		var data = this.state.data;
			if (key == 'selected_study_id') {
			$.get(_.endpoint('/studies/visit-stipends?studyID=' + this.state.data.selected_study_id), function(res) {
				data._study_visit_stipends = res.visit_stipends;
				this.setState({
					data: data,
				},
					this.onStudyVisitUpdate
				);
			}.bind(this));
		}
	},

	onStudyVisitUpdate: function() {
		if (!_.isUndefined(this.refs.studyVisit)) {
			this.refs.studyVisit.handleUpdate();
		}

		if (this.state.urlParams && this.state.urlParams.visit_id) {
			this.handleShowTravelRequest();
		}
	},

	handleChangeStudies: function(e) {
		let name = e.target.name.split(" ");
		let value = e.target.value.split(" ");
		this.setField(name[0], value[0]);
		this.setField(name[1], value[1]);
	},
	handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handleCountryChange: function(e) {
		const key = e.target.name;
		const val = e.target.value;
		var data = this.state.data;
		data[key] = val;

		const selectedCountry = _.filter(this.state.countries, country => {
			return country.code == val;
		})
		countryLang = selectedCountry[0] ? selectedCountry[0].lang : null;

		this.setState({	dobRequired: selectedCountry[0].dob_required }, () => { });
		data.lang = countryLang;
		data.language = countryLang;
		data._state_enabled = selectedCountry[0] && selectedCountry[0].state_enabled;
		this.setState({
			data: data,
		}, () => {this.setup && this.setup.bind(null, key, val); if (this.state.currentPrefView == 'travel'){this.handleShowTravel();}});
	},

	handleLanguageChange: function(e) {
		const key = e.target.name;
		const val = e.target.value;
		var data = this.state.data;
		data[key] = val;
		data.lang = val;
		this.setState({
			data: data,
		}, () => {this.setup && this.setup.bind(null, key, val); if (this.state.currentPrefView == 'travel'){this.handleShowTravel();}});
	},

	handleChecked: function(e) {
		this.setField(e.target.name, e.target.checked ? 1 : 0);
	},

	getSiteCountry: function(site_id) {
		if (parseInt(site_id) > 0 && this.state.sites.length > 0) {
			var site = _.find(this.state.sites, function(site) {
				return site.id == site_id;
			}, this);
			if (site && site.country) {
				return site.country;
			}
			else {
				return '';
			}
		}
		return '';
	},

	handleAssignCard: function(e) {
		e.preventDefault();
		this.setState({
			dialog: <PatientCardForm {...this.props} primaryBrandColor={_.primaryBrandColor()} data={this.state.data.card_id > 0 ? this.state.data.card : {patient_id: this.state.data.id}} onClose={this.handleDialogClose} onChange={this.setField} />,
		});
	},

	handleReplaceCard: function(e) {
		e.preventDefault();
		this.setState({
			dialog: <PatientCardForm {...this.props} primaryBrandColor={_.primaryBrandColor()} replacement={true} data={!_.isEmpty(this.state.data.card) ? this.state.data.card : {patient_id: this.state.data.id}} onClose={this.handleDialogClose} onChange={this.setField} />,
		});
	},

	handleBankAccount: function(currentStudy, e) {
		e.preventDefault();
		this.setState({
			dialog: <PatientBankAccountForm
				{...this.props}
				patientID={this.state.data.id}
				defaultCountry={this.state.data.country || this.getSiteCountry(currentStudy.site_id)}
				countries={this.state.countries}
				data={{patient_id: this.state.data.id}}
				onClose={this.handleDialogClose}
				onChange={this.setField}
				primaryBrandColor={_.primaryBrandColor()}
			/>,
		});
	},

	handleManualPayment: function(e) {
		e.preventDefault();
		this.setState({
			dialog: <ManualStipendLoadForm {...this.props} patient={this.state.data} onClose={this.handleDialogClose} onChange={this.setField} />,
		});
	},

	sendingMobileVerification: false,
	sendingEmailVerification: false,

	handleMobileVerification: function(e) {
		e.preventDefault();
		if (this.sendingMobileVerification) {
			return;
		}

		this.sendingMobileVerification = true;

		$.post(_.endpoint('/accounts/mobile/verify'), {id: this.state.data.id}, function(res) {
			var data = this.state.data;
			data.date_mobile_verification_attempt = res.date_mobile_verification_attempt;
			this.setState({
				data: data,
			});

			setTimeout(function() {
				this.sendingMobileVerification = false;
			}.bind(this), 2000);
		}.bind(this));
	},

	handleEmailVerification: function(e) {
		e.preventDefault();

		if (this.sendingEmailVerification) {
			return;
		}

		this.sendingEmailVerification = true;

		$.post(_.endpoint('/accounts/email/verify'), {id: this.state.data.id}, function(res) {
			var data = this.state.data;
			data.date_email_verification_attempt = res.date_email_verification_attempt;
			this.setState({
				data: data,
			});
			setTimeout(function() {
					this.sendingEmailVerification = false;
			}.bind(this), 2000);
		}.bind(this));
	},

	handleDialogClose: function() {
		this.setState({
			dialog: null,
		});
	},

	handleNewPassword: function(e) {
		e.preventDefault();

		$.post(_.endpoint('/accounts/send-temporary-password'), {id: this.state.data.id}, function(res) {
			this.setState({
				tempPasswordSent: true,
			});
		}.bind(this));
	},

	renderStatus: function(val) {

		const status = _.patientRequestStatus(val);
		var style = {
			display: 'block',
			color: '#fff',
			backgroundColor: status.color,
			fontSize: 12,
			padding: 5,
		};
		return <span style={style}>{status.title}</span>;
	},

	updateReimbursementTable: function() {
		this.refs.patientRequest.handleUpdate();
		this.props.onUpdate();
		this.onStudyFilterUpdate();
		this.loadCardBalance();
	},

	renderReimbursementDataTable: function(currentStudy) {

		var site = _.find(this.state.sites, {id: this.state.data._patient_study_site_id});

		let paymentMethod = !_.isEmpty(this.state.currentSite) ? this.state.currentSite.payment_method : '';
		if (paymentMethod === '') {
			paymentMethod = site ? site.payment_method : '';
		}
		
		let createRecord = {};
		if (paymentMethod == 'card' && !_.isEmpty(this.state.data.card) && this.state.data.card.id > 0) {
			createRecord._extra__has_payment_method = 1;
		} else if (paymentMethod == 'bank' && !_.isEmpty(this.state.data.bank_account) && this.state.data.bank_account.id > 0 ) {
			createRecord._extra__has_payment_method = 1;
		}

		const handleFilter = (e) => {
			this.setState({
				filteredReimbursementStatus: e.target.value,
			});
		}
	
		const filter = () => {
			return (
				<select onChange={handleFilter} value={parseFloat(this.state.filteredReimbursementStatus)} style={{marginLeft: 8, width: 160}}>
					<option value="">{Locale.getString('option.all-statuses', 'All Statuses')}</option>
					{_.map(_.patientRequestStatuses(), (v) => {
						return (<option value={v.status} key={v.status}>{v.title}</option>)
					})}
				</select>
			);
		}
	
		const filterFunc = () => {
			var status = this.state.filteredReimbursementStatus;
			
			return function(record) {
				return status === '' || parseFloat(record.status) == parseFloat(status);
			}.bind(this);
		}
	
		if (this.state.data && this.state.data.bank_account && this.state.data.bank_account._currency_symbol) {
			symbol = this.state.data.bank_account._currency_symbol;
		}
		fields = {
			date_request: {
				label: Locale.getString('title.date', 'Date'),
				value: function(val) {
					var dt = moment(val);
					if (dt.isValid()) {
						return dt.format('DD-MMM-YYYY').toUpperCase();
					}
					return '--';
				},
			},
		};

		if (this.props.data_study_manage_visits == 1) {
			_.extend(fields, {
				_visit_name: {
					label: Locale.getString('title.visit-name', 'Visit Name'),
				},
			});
		}

		_.extend(fields, {
			amount: {
				label: Locale.getString('title.amount', 'Amount'),
				sortValue: function(val) {
					return parseFloat(val);
				},
				value: function(val) {
					return (this._symbol ? this._symbol : '$') + val;
				},
				align: 'right',
			},
			status: {
				label: Locale.getString('title.status', 'Status'),
				value: (val) => {
					return this.renderStatus(val);
				},
			},
		});

		let props = _.pick(this.props, [
			'appLoading',
			'cache',
			'card_id',
			'companies',
			'countries',
			'data',
			'navOpen',
			'navigate',
			'navigateToPrevView',
			'people',
			'preState',
			'prevView',
			'primaryBrandColor',
			'project',
			'projects',
			'routes',
			'requestParams',
			'shouldShowAppLoading',
			'showBrandColorOnHover',
			'sites',
			'source',
			'system',
			'systemCode',
			'urlParams',
			'user',
			'requestParams'
		]);
	
		let newCreateRecord = {
			...createRecord,
			status: 0,
			items: [],
			site_id: this.state.data.selected_site_id,
			study_id: this.state.data.selected_study_id,
		};
		return (
			<DataTable
				{...props}
				editOnRowClick={true}
				ref="patientRequest"
				onUpdate={this.updateReimbursementTable}
				currentStudy={this.state.data.selected_study_id}
				requestParams={{exclude_reimbursement_statuses: 6, site_id: this.state.data.selected_site_id}}
				endpoint={'/patients/requests/' + this.state.data.id + '/' + this.state.data.selected_study_id}
				form={PatientRequestForm}
				createButtonLabel={parseInt(this.state.data._patient_study_status) == 0 ? Locale.getString('button.new-request', 'New Request') : ""}
				searchEnabled={false}
				controls={PatientRequestControls}
				onDialogButtons={_.noop}
				siteID={this.state.data.selected_site_id}
				_patient={this.state.data}
				closeAfterSaving={true}
				onFilters={filter}
                filterFunc={filterFunc()}
				editTitle={Locale.getString('label.reimbursement-request', 'Reimbursement Request') + this.props.data.id + ' - ' + this.props.data.firstname + ' ' + this.props.data.lastname}
				createTitle={Locale.getString('label.reimbursement-request', 'Reimbursement Request') + this.props.data.id + ' - ' + this.props.data.firstname + ' ' + this.props.data.lastname}
				onLoaded={_.noop}
				remotePaging={false}
				onCreateRecord={() => {
					return newCreateRecord;
				}}
				fields={fields}
			/>
		);
	},

	renderDepositNotifications: function() {
		var emailVerified = parseInt(this.state.data.email_verified) === 1;
		var disabled;

		if (!_.isEmpty(this.state.data.emailaddress) && emailVerified && this.state.data.emailaddress == this.state.initialEmail) {
			disabled = false;
		}
		else {
			disabled = true;
		}
		return (
			<span>
				<dt>{Locale.getString('label.deposit-notifications', 'Deposit Notifications')}</dt>
				<dd>
					<label>
						<input name="deposit_notifications" type="checkbox" value="1" disabled={!this.state.data.emailaddress} onChange={this.handleChecked} checked={parseInt(this.state.data.deposit_notifications) == 1} />
							&nbsp;{Locale.getString('label.enable-deposit', 'Enable Deposit')}
					</label>
				</dd>
			</span>
		);
	},

	mapStudyAssociations: function() {
		var studyAssociations = this.state.studyAssociations;
		studyAssociations = _.mapKeys(this.state.studyAssociations, function(patientStudy) {
			return patientStudy.study_id + patientStudy.site_id;
		});

		const currentStudy = _.find(studyAssociations, function(study) {
			return study.study_id == this.state.data.selected_study_id;
		}, this);

		let data = this.state.data;
		data._icf_date_added = currentStudy && currentStudy.icf_date_added;
		data._icf_username = currentStudy && currentStudy._icf_username;

		this.setState({
			studyAssociations: studyAssociations,
			data,
		}, this.loadCurrentSite);
	},

	fetchStudies: function() {
		let data = this.state.data;

		$.get(_.endpoint('/patients/studies?patient_id=' + this.state.data.id), (res) => {
			let count = 0;
			setTimeout(() => {
				res.records.map((obj)=>{
					if(obj.study_id === this.state.data.selected_study_id && obj.site_id === this.state.data.selected_site_id){
						data._patient_study_status = obj.status;
						data._selected_patient_study_number = obj.study_number;
						data._selected_patient_study_study_number = obj.study_number;
						data._study_id_enabled = obj._study_subject_study_id_toggle;
						count = 1;
					}
				})

				if(count == 0){
					const firstRecord = res.records[0];

					if (firstRecord) {
						data.selected_study_id = firstRecord.study_id;
						data.selected_site_id = firstRecord.site_id;
						data._patient_study_status = firstRecord.status;
						data._selected_patient_study_number = firstRecord.study_number;
						data._selected_patient_study_study_number = firstRecord.study_number;
						data._study_id_enabled = firstRecord._study_subject_study_id_toggle;
					}
				}

				this.setState({
					studyAssociations: res.records,
					data,
				}, this.mapStudyAssociations);
			}, 250);
		});
	},

	onStudyFilterUpdate: function() {
		let data = this.state.data;

		if (data.id && parseInt(data.id) > 0) {
			this.fetchStudies();
		}
		else {
			var studyKeys = _.map(data._studyAssociations, function(study) {
				return study._patient_study_id;
			});

			$.get(_.endpoint('/patients/studies?study_associations=' + studyKeys), function(res) {
				var currentStudy = _.find(res.records, function(record) {
					return record.study_id == data.selected_study_id;
				}, this);

				let views = {};
				if (currentStudy) {
					data._patient_study_status = currentStudy._patient_study_status;

					views = this.changeViewsData(currentStudy);
				}

				this.setState({
					studyAssociations: res.records,
					data,
					...views
				}, this.mapStudyAssociations);
			}.bind(this));
		}
	},

	onUpdate: function() {
		this.props.onUpdate();
		this.onStudyFilterUpdate();
	},

	handleStudyAssociationChange: function(studyAssociationArr) {
		this.setField('_studyAssociations', studyAssociationArr);
	},

	setNewStudyID: function(studyId, studies) {
		let data = this.state.data;
		const currentStudy = _.find(studies, function(study) {
			return study.study_id == studyId;
		}, this);
		data._selected_patient_study_study_number = currentStudy.study_number;
		data._patient_study_status = currentStudy.status;
		data._icf_date_added = currentStudy.icf_date_added;
		data._icf_username = currentStudy._icf_username;
		data._study_id_enabled = currentStudy._study_subject_study_id_toggle || currentStudy.subject_study_id_toggle;
		data.selected_study_id = studyId;
		data.selected_site_id = currentStudy.site_id;
		data._studyAssociations = studies;

		this.setState({
			data: data,
		});
	},

	handlePatientStudyStatusChangeOnForm: function(patientStudyID, patientStudyStatus, studyID, patientStudySiteID, studyAssociations) {
		this.setNewStudyID(studyID, studyAssociations);
		this.setField('_patient_study_id', patientStudyID);
		this.setField('_patient_study_status', patientStudyStatus);
		this.setField('_patient_study_site_id', patientStudySiteID);
		this.setField('_selected_patient_study_study_number', '');
	},

	openSiteStudyDialog: function(e) {
		e.stopPropagation();
		
		this.setState({
			dialog: <StudyAssignmentDialog onCancel={this.handleDialogClose} savedAssociations={this.state.data._studyAssociations} onChange={this.handleStudyAssociationChange} onStatusChange={this.handlePatientStudyStatusChangeOnForm} onUpdate={this.onUpdate} setCurrentSite={this.setCurrentSite} patientID={this.state.data.id} />
		});
	},

	setCurrentSite: function(siteID) {
		var currentSite = {};
		currentSite = _.find(this.state.sites, function(site) {
			this.state.data.selected_site_id = site.id;
			return siteID == site.id;
		}, this);
		this.setState({
			currentSite: currentSite,
		});
	},

	confirmNonDuplicate: function() {
		this.setState({
			_duplicateAck: true,
		},
			this.handleDuplicateDialogClose
		);
	},

	savePatient: function() {
		var data = this.state.data;
		data._duplicate_ack = true;
		$.post(_.endpoint('/patients'), data, function(res) {
			if (res.status < 2) {
				this.setState({
					data: res.record
				},
					this.confirmNonDuplicate
				);
			}
			else {
				this.setState({
					errors: res.errors,
				});
			}
		}.bind(this));
	},

	handleProceedWithDuplicate: function() {
		this.setState({
			_duplicateAck: true,
		},
			this.savePatient
		);
	},

	handlePatientStudyStatusChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handlePayCard: function () {
		this.setState({TravelPreferenceDialogProps: null, currentPrefView: 'card'});
	},

	handleShowTravel: function() {
		const endpoint = this.props.data ? `/patients/${this.props.data.id}/travelpreference` : '';
		const patientData = JSON.parse(JSON.stringify(this.state.data));
		this.setState({TravelPreferenceDialogProps: {formProps:{patientData}, endpoint}, currentPrefView: 'travel'});
	},

	handleShowTravelRequest: function() {
		const endpoint = this.props.data ? `/patients/${this.props.data.id}/travelrequests` : '';
		const user = this.props.user;
		const patientData = JSON.parse(JSON.stringify(this.state.data));
		const studyAssociations = JSON.parse(JSON.stringify(this.state.studyAssociations));
		const currentStudy = JSON.parse(JSON.stringify(this.state.studyAssociations[this.state.data.selected_study_id + this.state.data.selected_site_id]));
		const urlParams = {...this.state.urlParams};
		let selected_study_id = 0 ;
		let selected_site_id = 0 ;
		selected_study_id = this.state.selected_study_id ? this.state.selected_study_id : patientData.selected_study_id;
		selected_site_id = this.state.selected_site_id ? this.state.selected_site_id : patientData.selected_site_id;
		this.setState({TravelRequestDialogProps: {formProps:{patientData}, patientData, user, studyAssociations, endpoint, urlParams, currentStudy}, ref: 'travelRequestDialog', selected_site_id, selected_study_id,  urlParams: {}, currentPrefView: 'travel_request'});
	},

	promptDeleteStudy: function(e) {
		e.stopPropagation();
		var currentStudy = this.state.studyAssociations[this.state.data.selected_study_id + this.state.data.selected_site_id];
		this.setState({
			dialog:
				<ConfirmationDialog title="Remove Subject" onCancel={this.handleDialogClose} onConfirm={this.confirmDeleteStudy.bind(null, currentStudy)}>
					{Locale.getString('message.remove-subject-study', 'Are you sure you would like to remove this subject from the following study')}: {currentStudy._study_title}
				</ConfirmationDialog>,
		});
	},

	deleteStudy: function(currentStudy) {
		$['delete'](_.endpoint('/patients/studies/' + currentStudy.id), function(res) {
			var data = this.state.data;
			data.selected_study_id = 0;
			data.selected_site_id = 0;
			this.setState({
				data: data,
			});
		}.bind(this));
	},

	confirmDeleteStudy: function(currentStudy, e) {
		var studyAssociations = this.state.studyAssociations;
		delete studyAssociations[currentStudy.study_id + currentStudy.site_id];

		this.setState({
			studyAssociations: studyAssociations,
			dialog: null,
		}, this.deleteStudy.bind(null, currentStudy));

	},

	handleViewChange: function(view) {
		this.setState({
			currentView: view,
		});
	},

	canAddCards: function() {
		if (this.props.user.type === 'siteuser') {
			return parseInt(this.props.user.options.assign_card) === 1
		}
		else if (this.props.user.type === 'user') {
			return true;
		}
	},

	canApproveStipends: function() {
		if (this.props.user.type === 'siteuser') {
			return true;
		}
		else if (this.props.user.type === 'user') {
			return true;
		}
	},

	tabButtonStyle: function () {
		return {
			borderTop: '1px solid ' + _.primaryBrandColor(),
			borderLeft: '1px solid ' + _.primaryBrandColor(),
			borderRight: '1px solid ' + _.primaryBrandColor(),
			borderRadius: 9,
			fontSize: 13,
			color: 'rgb(68, 68, 68)',
			fontWeight: 500,
			lineHeight: '21.6px',
			fontFamily: 'Arial, Helvetica, sans-serif',
			borderBottomLeftRadius: 0,
			borderBottomRightRadius: 0,
			padding: 10,
			display: 'inline-block'
		}
	},

	tabButtonSelectedStyle: function () {
		return {
			backgroundColor: _.primaryBrandColor(),
			color: '#fff',
		}
	},

	changeViewsData(study) {
		let {currentPrefView, currentView} = this.state;
		const { adminSystemSettings } = this.state;

		let checkPayment = false;
		if (currentPrefView === 'travel' || currentPrefView === 'travel_request') {

			if (!(this.props.system.config.travel_preferences_requests_enabled &&
				adminSystemSettings &&
				parseInt(adminSystemSettings.subject_travel_preferences) == 0 &&
				study._study_subject_travel_preferences == 0)) {
				checkPayment = true;
			}
		} else if (currentPrefView == 'card' || currentPrefView == 'none') {
			if (study._study_manage_none == 1) {
				if (this.props.system.config.travel_preferences_requests_enabled &&
					adminSystemSettings &&
					parseInt(adminSystemSettings.subject_travel_preferences) == 0 &&
					study._study_subject_travel_preferences == 0) {
						currentPrefView = 'travel';
				} else { 
					checkPayment = true;
				}
			} else {
				checkPayment = true;
			}
		}

		if (checkPayment) {
			if (study._study_manage_none == 1) {
				currentPrefView = 'none';
			} else if ((study._study_visit_stipends == 0 && study._study_manage_reimbursements == 0 && study._study_manage_none == 0) || study._study_visit_stipends == 1 || study._study_manage_reimbursements == 1) {
				currentPrefView = 'card';

				if (this.state.currentView == 'stipends' && study._study_visit_stipends == 0) {
					currentView = 'reimbursements';
				} else if (this.state.currentView == 'reimbursements' && study._study_manage_reimbursements == 0 && study._study_site_schedule_assigned == 1) {
					currentView = 'stipends';
				}
			}
		}

		return {currentPrefView, currentView};
	},

	onChangeSelectedStudy: function(e) {
		let studies = this.state.studyAssociations;
		studies = _.sortBy(studies, function(study) {
			return study.title;
		});

		//hide or show if found after filtering because record is not saved
		const currentStudy = _.find(studies, function(study) {
			return study.study_id == e.target.value;
		}, this);

		let data = this.state.data;
		data._selected_patient_study_study_number = currentStudy.study_number;
		data._patient_study_status = currentStudy.status;
		data._icf_date_added = currentStudy.icf_date_added;
		data._icf_username = currentStudy._icf_username;
		data._study_id_enabled = currentStudy._study_subject_study_id_toggle;

		const views = this.changeViewsData(currentStudy);

		this.setState({data,...views}, () => {this.setCurrentSite(currentStudy.site_id)});
		if (this.state.currentPrefView == 'travel_request')
		{
			this.handleShowTravelRequest();
		}
	},

	updateVisitCompletionDate: function ({e, visit}) {
		e.stopPropagation();
		this.setState({ currentVisitDate: visit.date }, () => this.setState({ dialog: this.renderVisitCompletionDialog(visit) }))
	},

	renderVisitCompletionDialog: function(args) {
		var buttons = [];
		args = args || {};

		if (args.processing) {
			buttons = <button type="button"><i className="fa fa-spin fa-spinner" /> Please wait one moment...</button>;
		}
		else {
			buttons = [
				<button key="cancel" type="button" onClick={this.handleDialogClose}>Cancel</button>,
				<button key="submit" type="button" onClick={() => this.handleVisitSubmission({...args, date: this.state.currentVisitDate})} >Submit Visit</button>
			];
		}

		var handleVisitDateChange = (date) => {
			this.setState({
				currentVisitDate: date,
			});
		}

		return (
			<Dialog {...this.props} width={400} title="Visit Completion" onClose={this.handleDialogClose} buttons={buttons}>
				<div className="row">
					<dl className="form dialog col-md-12">
						<dt>Date Completed <RequiredMarker /></dt>
						<dd>
							<ClinicalDatePicker
								dateFormatClinical={this.props.dateFormatClinical}
								value={this.state.currentVisitDate && moment(this.state.currentVisitDate).isValid() ? moment(this.state.currentVisitDate).format('YYYY-MM-DD') : ''}
								maxDate={moment().format('YYYY-MM-DD')}
								showPickerIcon={true}
								style={{width: '100%'}}
								yearRange="c-1:c+0"
								onChange={handleVisitDateChange}
							/>
							<ErrorDisplay message={args.error} />
						</dd>
					</dl>
				</div>
			</Dialog>
		);
	},

	handleVisitSubmission: function (visit) {
		$.post(_.endpoint('/patients/visits/date'), visit, (res) => {
			if (res.status < 2) {
				this.setState({
					dialog: null,
				});
				this.handleDialogClose();
				this.refs.studyVisit.handleUpdate();
			}
			else {
				this.setState({
					dialog: this.renderVisitCompletionDialog({
						error: res.error,
					}),
				});
			}
		});
	},

	renderTabPreferenceButtons: function () {
		const coverStyle = this.tabButtonStyle();
		const selectedStyle = this.tabButtonSelectedStyle();

		let {currentPrefView, adminSystemSettings, studyAssociations, data} = this.state;
		let currentStudy = studyAssociations[data.selected_study_id + data.selected_site_id];

		let cardStyle = {...coverStyle};
		let travelRequestStyle = {...coverStyle, ...{marginLeft: 5}}
		let travelStyle = currentStudy && currentStudy._study_manage_none == 1 ? _.clone(coverStyle) : {...travelRequestStyle};

		if (currentPrefView === 'card') {
			cardStyle = {...cardStyle, ...selectedStyle};

		} else if (currentPrefView === 'travel') {
			travelStyle = {...travelStyle, ...selectedStyle};
		} else if (currentPrefView === 'travel_request') {
			travelRequestStyle = {...travelRequestStyle, ...selectedStyle};
		}

		let c = [];
		if (currentStudy) {
			c = [...c, currentStudy._study_manage_none == 1];
		}

		if (this.props.system.config.travel_preferences_requests_enabled && 
			adminSystemSettings && 
			adminSystemSettings.subject_travel_preferences == 0 && //enable
			currentStudy) {
				c = [...c, currentStudy._study_subject_travel_preferences == 1]; //disable
		}


		if (_.every(c)) {
			return <div />;
		}

		return (	
			<div style={{borderBottom: '5px solid #ddd'}}>
				{currentStudy && 
				currentStudy._study_manage_none == 0 && 
				<button onClick={this.handlePayCard} style={cardStyle}><i className="fa fa-credit-card" /> {Locale.getString('title.pay-stipend-card', 'PAY Stipend Card')}</button>
				}

				{this.props.system.config.travel_preferences_requests_enabled &&
				adminSystemSettings && 
				adminSystemSettings.subject_travel_preferences == 0 && 
				currentStudy &&
				currentStudy._study_subject_travel_preferences == 0 &&
				<button onClick={this.handleShowTravel} style={travelStyle}><i className="fa fa-star" /> {Locale.getString('title.travel-preferences', 'Travel Preferences')}</button>
				}

				{this.props.system.config.travel_preferences_requests_enabled &&
				adminSystemSettings && 
				adminSystemSettings.subject_travel_preferences == 0 && 
				currentStudy &&
				currentStudy._study_subject_travel_preferences == 0 &&
				<button onClick={this.handleShowTravelRequest} style={travelRequestStyle}><i className="fa fa-plane" /> {Locale.getString('title.travel-requests', 'Travel Requests')}</button>
				}
			</div>
		)
	},

	renderTabButtons: function(paymentMethod) {
		let {studyAssociations, data} = this.state;
		let currentStudy = studyAssociations[data.selected_study_id + data.selected_site_id];

		const coverStyle = this.tabButtonStyle();
		const selectedStyle = this.tabButtonSelectedStyle();

		if (this.state.currentView === 'reimbursements') {
			var coverStyle1 = _.clone(coverStyle);
			var coverStyle2 = _.clone(coverStyle);
			coverStyle1 = _.extend(coverStyle1, selectedStyle);
			delete coverStyle2.backgroundColor;
			delete coverStyle2.color;
		}
		else {
			var coverStyle2 = _.clone(coverStyle);
			var coverStyle1 = _.clone(coverStyle);
			delete coverStyle1.backgroundColor;
			delete coverStyle1.color;
			coverStyle2 = _.extend(coverStyle2, selectedStyle);
		}

		return (
			<span>
				{!!paymentMethod &&
				<div style={{borderBottom: '5px solid #ddd'}}>
					{!_.isEmpty(currentStudy) && parseInt(currentStudy._study_manage_reimbursements) === 1 && <button onClick={this.handleViewChange.bind(null, 'reimbursements')} style={_.extend(coverStyle1, {display: 'inline-block'})}>{Locale.getString('label.reimbursements', 'Reimbursements')}</button>}
					{!_.isEmpty(currentStudy) && parseInt(currentStudy._study_visit_stipends) === 1 && parseInt(currentStudy._study_site_schedule_assigned) === 1  && <button onClick={this.handleViewChange.bind(null, 'stipends')} style={_.extend(coverStyle2, {display: 'inline-block', marginLeft: 5})}>{Locale.getString('title.stipends', 'Stipends')}</button>}
				</div>}

				{!paymentMethod && <p>{Locale.getString('message.select-payment-method', 'Please select a payment method.')}</p>}
			</span>
		);
	},

	renderStudyMeta: function () {
		var studies = this.state.studyAssociations;
		var refinedAssignedStudies = this.state.studyAssociations;
		studies = _.sortBy(studies, function(study) {
			return study.title;
		});

		//hide or show if found after filtering because record is not saved
		var currentStudy = _.find(studies, function(study) {
			if(!study.site_id){
				return study.study_id == this.state.data.selected_study_id, study._study_site_id == this.state.data.selected_site_id;
			}else{
				return study.study_id == this.state.data.selected_study_id, study.site_id == this.state.data.selected_site_id;
			}
		}, this);
		var lastStudy = _.size(this.state.studyAssociations) == 1 ? true : false;

		let style = {marginBottom: 0};
		
		return (
			<dl className="form dialog" style={{...{paddingLeft: 0, paddingRight: 0}, ...style}}>

				<div className='row'>

					{(this.state.data.selected_study_id !== '' && this.state.data.selected_study_id !== undefined && this.state.data.selected_study_id > 0) &&
					<p className='col-xs-12 base-header-font-size' style={{fontWeight: 'bold', lineHeight: 1.2}}>{Locale.getString('title.study-activity', 'Study Activity')}</p>
					}
					{ (this.state.data.selected_study_id !== '' && 
					this.state.data.selected_study_id !== undefined && 
					this.state.data.selected_study_id > 0) &&
					currentStudy &&
					currentStudy._study_subject_study_id_toggle == 0 &&
					<div className="col-sm-3">
						<dt>{Locale.getString('title.study-id', 'Subject Study ID')}# <RequiredMarker /></dt>
						<input name="_selected_patient_study_study_number" type="text" onChange={this.handleChange} value={this.state.data._selected_patient_study_study_number} maxLength={30} autoComplete='new-password' />
						<ErrorDisplay message={this.props.errors._patient_study_study_number} />
					</div>}


					{(parseInt(this.state.data.id) > 0 || this.state.data._studyAssociations.length > 0) &&
					<div className='col-sm-9 study-name--top-padding-xs' style={{paddingLeft: 0, paddingRight: 0}}>
						<div className={currentStudy && (currentStudy._num_reimbursements == 0 || (currentStudy._num_reimbursements == currentStudy._num_void_reimbursements)) ? "col-xs-8" : "col-xs-9"}>
							<dt>{Locale.getString('title.study', 'Study')} <RequiredMarker /></dt>
							<dd>
								<span>
									<select name={"selected_site_id"+" "+"selected_study_id"} value={this.state.data.selected_site_id + " " +this.state.data.selected_study_id} onChange={(e) => {this.handleChangeStudies(e); this.onChangeSelectedStudy(e)}}>
										<option value="">{Locale.getString('option.select', 'Select')}...</option>
										{_.map(refinedAssignedStudies, function(study) {
											if(!study.site_id){
												var siteID = study._study_site_id;
											}else{
												var siteID = study.site_id;
											}
											var siteName = study._study_site_name + " - ";
											var status = parseInt(study.status) === 2 ? Locale.getString('label.completed', 'Completed') : Locale.getString('title.active', 'Active');
											var studyID = study.study_id;
											var studyTitle = study._study_title ? study._study_title + " - " : "";
											return <option key={study.id + "," + study.study_id} value={siteID+" "+studyID}>{siteName + study._sponsor_name + " - " + study._study_protocol + " - " + studyTitle + status}</option>;
										})}
									</select>
								</span>
							</dd>
							{this.state.data._icf_date_added &&
							<span style={{ paddingLeft: 5 }}>
								* ICF verified: {this.state.data._icf_username} {moment.utc(this.state.data._icf_date_added).local().format('DD-MMM-YYYY hh:mm A')}
							</span>
							}
						</div>
						{currentStudy && (currentStudy._num_reimbursements == 0 || (currentStudy._num_reimbursements == currentStudy._num_void_reimbursements)) &&
						<div className="col-xs-1">
							<dt></dt>
							<dd>
								<i onClick={lastStudy ? _.noop : this.promptDeleteStudy} style={lastStudy ? {fontSize: 18, color: '#707070', marginTop: 18, cursor: 'not-allowed'} : {fontSize: 18, color: '#a00', marginTop: 18, cursor: 'pointer'}} title={lastStudy ? Locale.getString('message.add-study-before-deleting', 'Sorry, please add a study before deleting this one.') : Locale.getString('label.remove-study', 'Remove this study?')} className="fa fa-times-circle-o" />
							</dd>
						</div>}

						{(this.state.data.selected_study_id !== '' && this.state.data.selected_study_id !== undefined && this.state.data.selected_study_id > 0) &&
						(this.state.data.selected_site_id !== '' && this.state.data.selected_site_id !== undefined && this.state.data.selected_site_id > 0)  &&
						<div className="col-xs-3" >
							<div style={{marginTop: 8}}>
								<label style={{cursor: 'pointer', display: 'block'}}>
									<input type="radio" name="_patient_study_status" value={0} checked={parseInt(this.state.data._patient_study_status) === 0} onChange={this.handlePatientStudyStatusChange} /> <span style={{paddingBottom: 3}}>{Locale.getString('title.active', 'Active')}</span>
								</label>
								<label style={{cursor: 'pointer', display: 'block'}}>
									<input type="radio" name="_patient_study_status" value={2} checked={parseInt(this.state.data._patient_study_status) === 2} onChange={this.handlePatientStudyStatusChange} /> <span style={{paddingBottom: 3}}>{Locale.getString('label.completed', 'Completed')}</span>
								</label>
							</div>
						</div>}
					</div>}
				</div>

				
			</dl>
		)
	},


	checkAdminCompany: function(company) {
		if (!company) { return false };

		const companyStandardized = company.toLowerCase();
		return companyStandardized.includes("realtime");
	},

	render: function() {
		var studies = this.state.studyAssociations;
		studies = _.sortBy(studies, function(study) {
			return study.title;
		});

		//hide or show if found after filtering because record is not saved
		var currentStudy = _.find(studies, function(study) {
			return study.study_id == this.state.data.selected_study_id;
		}, this);

		var emailVerified = parseInt(this.state.data.email_verified) === 1;
		var mobileVerified = parseInt(this.state.data.mobile_verified) === 1;
		var defaultCountry = this.state.data.country;
		var showStateDropdown = defaultCountry && !_.isUndefined(this.state.states[defaultCountry]);
		var renderStatus = this.renderStatus;
		var site = _.find(this.state.sites, function(site) {
			return site.id == this.state.data._patient_study_site_id;
		}, this);
		var sites = this.state.sites;
		sites = _.sortBy(sites, function(site) {
			return site.name;
		});

		var paymentMethod = !_.isEmpty(this.state.currentSite) ? this.state.currentSite.payment_method : '';
		if (paymentMethod === '') {
			paymentMethod = site ? site.payment_method : '';
		}
		var account_num = '';
		var routing_num = '';
		var bankAccount = this.state.data.bank_account;

		if (this.state.data.bank_account) {
			routing_num = this.state.data.bank_account.routing_num || '';

		}
		if (this.props.user.type == 'user' && !_.isEmpty(this.state.data.bank_account) && this.state.data.bank_account.id > 0) {
			account_num = bankAccount && bankAccount.account_num ? bankAccount.account_num.replace(/\d(?=\d{0})/g, "x") : '';
			routing_num = bankAccount && bankAccount.routing_num ? bankAccount.routing_num.replace(/\d(?=\d{0})/g, "x") : '';
		}
		else if (this.props.user.type == 'siteuser' && !_.isEmpty(this.state.data.bank_account) && this.state.data.bank_account.id > 0) {
			//account_num = this.state.data.bank_account.account_num.replace(/\d(?=\d{4})/g, "x");
			account_num = bankAccount && bankAccount.account_num ? bankAccount.account_num.replace(/\d(?=\d{0})/g, "x") : '';
		}

		const canBank = [];
		canBank.push((this.state.data.country > '' || defaultCountry > ''));
		canBank.push(this.state.data.address > '');
		canBank.push(this.state.data.city > '');

		var showProvince = true;
		var showPostalCode = true;
		if (this.state.data.country) {
			var country = _.find(this.state.countries, function(o) {
				return o.code == this.state.data.country;
			}, this);
			if (country && country.state_enabled == 0) {
				showProvince = false;
			} else {
				canBank.push(this.state.data.state > '');
			}
			if (country && country.zipcode_enabled == 0) {
				showPostalCode = false;
			} else if (country && country.code == 'SG') {
				canBank.push(this.state.data.zipcode > '');
			}
		}


		var canSaveBank = _.every(canBank);

		const locationAND = !([showProvince, showPostalCode].includes(false));

		if (this.props.fromDashboard === false) {
			var duplicateWarningButtons = [
				<button key={1} type="button" onClick={this.props.closePatientForm}>Cancel</button>,
				<button key={2} type="button" onClick={this.handleProceedWithDuplicate} style={{backgroundColor: _.primaryBrandColor(), color: '#fff'}}>Proceed</button>
			];
		}
		else {
			var duplicateWarningButtons = [
				<button key={3} type="button" onClick={this.handleProceedWithDuplicate} style={{backgroundColor: _.primaryBrandColor(), color: '#fff'}}>Proceed</button>
			];
		}

		const buttonAssignmentText = this.state.data.id ? Locale.getString('button.add-new-study', 'Add New Study') : Locale.getString('button.assign-to-study', 'Assign to Study');
		var isInternational = this.state.data._international ? this.state.data._international : false;
		if (this.state.studyAssociations.length > 1) {
			var associations = this.state.studyAssociations;
			var international = {
				ius: 0,
				ous: 0,
			};
			_.each(associations, function(studySite) {
				if (studySite._study_site_country == 'US') {
					international.ius += 1;
				}
				else {
					international.ous += 1;
				}
			}, this);
			if (international.ous >= 1 && international.ius >= 1) {
				isInternational = true;
			}
			else if (international.ous == 0 && international.ius == 0) {
				isInternational = false;
			}
			else if (international.ous == 0 && international.ius > 0) {
				isInternational = false;
			}
			else if (international.ius == 0 && international.ous > 0) {
				isInternational = true;
			}
		}
		else {
			if (this.state.data.country) {
				isInternational = this.state.data.country !== 'US' ? true : false;
			}
			else {
				if (site) {
					isInternational = site.country !== 'US' ? true : false;
				}
			}
		}

		const shouldShowStipendReqestForm = record => {
			return record && record.status == '5.0' && this.props.user.type == 'user' && (_.isFromCTMS(this.props.user.emailaddress) || _.isFromRedAxle(this.props.user.emailaddress)) && (this.props.user.company == "RealTime" || this.props.user.company == "ClinEdge" );
		};
		if (this.state.isFeatureFlagOn) {
			var zipcodeRequired = country && country.processor == '2';
		} else {
			var zipcodeRequired = country && country.code == 'SG';
		}
		return (

			<div className='base-font-size'>
				{/* <SystemOptions style={{marginBottom: 0, padding: '8px 0'}}/> */}

				<div className="row">
					{this.state.dialog}

					<dl className="form dialog col-md-4 subject-info">
						<dd className="row">
							{this.state.data.id &&
							<div className="col-xs-2" style={{textAlign: 'center'}}>
								{Locale.getString('title.mrn', 'MRN')}<br />
								{this.state.data.id}
							</div>}

							<div className="col-xs-4" style={{width: '50%', margin: '0 auto'}}>
								<div onClick={this.openSiteStudyDialog} style={{cursor: 'pointer', color: '#fff', backgroundColor: _.primaryBrandColor(), marginRight: 20, paddingTop: 8, paddingBottom: 8, minWidth: 160, textAlign: 'center', borderRadius: 3}}><i className="fa fa-plus" style={{marginRight: 5, verticalAlign: 'middle'}} />{buttonAssignmentText}</div>
									<ErrorDisplay message={this.props.errors.studyMarker} />
								<div>
									{this.props.errors.study_id && this.state.data._studyAssociations.length <= 0 &&
									<ErrorDisplay message={this.props.errors.study_id} />}
								</div>
							</div>

						</dd>

						<dt></dt>
						<dd>
							<div className="row">
								<div className="col-sm-5">
									<span className="label">{Locale.getString('label.first-name', 'First Name')} <RequiredMarker /></span>
									<input name="firstname" type="text" value={this.state.data.firstname} onChange={this.handleChange} className={this.props.errors.firstname ? 'has-error' : ''} autoComplete='new-password' />
									<ErrorDisplay message={this.props.errors.firstname} />
								</div>
								<div className="col-sm-3">
									<span className="label">{Locale.getString('label.middle-initial', 'Middle Initial')}</span>
									<input name="middle" type="text" value={this.state.data.middle} onChange={this.handleChange} autoComplete='new-password' />
								</div>
								<div className="col-sm-4">
									<span className="label">{Locale.getString('label.last-name', 'Last Name')} <RequiredMarker /></span>
									<input name="lastname" type="text" value={this.state.data.lastname} onChange={this.handleChange} className={this.props.errors.lastname ? 'has-error' : ''} autoComplete='new-password' />
									<ErrorDisplay message={this.props.errors.lastname} />
								</div>
							</div>
						</dd>

						<div className='row'>					
							<div className='col-md-5'>
								<dt>{Locale.getString('label.date-of-birth', 'Date of Birth')} {this.state.dobRequired == 1 ? (!this.state.data._validation_except || !this.state.data._validation_except.includes('dob')) && <RequiredMarker /> : ""}</dt>
								<dd>
									<ClinicalDatePicker 
										dateFormatClinical={this.props.dateFormatClinical}
										value={this.state.data.dob && moment(this.state.data.dob).isValid() ? moment(this.state.data.dob).format('YYYY-MM-DD') : ''}
										maxDate={moment().subtract(13, 'year').format('YYYY-MM-DD')}
										changeYear={true}
										showPickerIcon={true}
										style={{width: '100%'}}
										yearRange="1930:c+10"
										onChange={this.setField.bind(null, 'dob')} />
									{this.state.dobRequired == 1 ? <ErrorDisplay message={this.props.errors.dob} /> : ""}
								</dd>
							</div>
							<div className='col-md-7'>
								{!_.isEmpty(currentStudy) && parseInt(currentStudy._study_visit_stipends) === 1 &&
								<span>
									<dt>{this.state.data.country !== 'US' ? <span>{Locale.getString('label.ssn-national-identifier', 'SSN / National Identifier')}</span> : Locale.getString('label.ssn', 'SSN')}</dt>
								</span>}

								{!_.isEmpty(currentStudy) && parseInt(currentStudy._study_visit_stipends) === 1 &&
								<dd>
									{/*<SSNInput name="ssn" value={this.state.data.ssn} onChange={this.setField} />*/}
									{this.state.viewSSN && 
										<input name="ssn" maxLength={this.state.data.country === 'US' ? "9" : ""} type="text" value={this.state.data.ssn} style={{width: '80%'}} onChange={this.handleChange} autoComplete='new-password' />}
									{!this.state.viewSSN && 
										<input name="ssn" type="text" className='no-show-pasword' value={this.state.data.ssn} maxLength={this.state.data.country === 'US' ? "9" : ""} style={{width: '80%'}} onChange={this.handleChange} autoComplete='new-password' />}
									<ErrorDisplay message={this.props.errors.ssn} />
									<a onClick={this.toggleSSN} style={{marginLeft: 10}}><i className={'fa ' + (this.state.viewSSN ? 'fa-eye-slash' : 'fa-eye')} style={{fontSize: 16}}></i></a>
								</dd>}
							</div>
						</div>

						<div>
							{this.state.enable_ous &&
							<div>
								<dt>{Locale.getString('label.country', 'Country')} <RequiredMarker /></dt>
								<dd>
									<select name="country" value={this.state.data.country} onChange={this.handleCountryChange}>
										<option value="">{Locale.getString('title.select-country', 'Select Country')}...</option>
										{_.map(this.state.countries, function(country) {
											return <option key={country.code} value={country.code}>{country.name}</option>;
										}, this)}
									</select>
									<ErrorDisplay message={this.props.errors.country} />
								</dd>
							</div>}

							{this.state.enable_ous &&
							<div>
								<dt>{Locale.getString('label.language', 'Language')}</dt>
								<dd>
									<select name="language" value={this.state.data.language} onChange={this.handleLanguageChange}>
										<option value="">{Locale.getString('option.select-language', 'Select Language')}...</option>
										{_.map(this.state.languages, function(language) {
											return <option key={language.code} value={language.code}>{language.name}</option>;
										}, this)}
									</select>
								</dd>
							</div>}

							<dt>{Locale.getString('label.address-line', 'Address Line')} 1 <RequiredMarker /></dt>
							<dd>
								<input name="address" type="text" value={this.state.data.address} onChange={this.handleChange} maxLength="100" autoComplete='new-password' />
								<ErrorDisplay message={this.props.errors.address} />
							</dd>
							<dt>{Locale.getString('label.address-line', 'Address Line')} 2 </dt>
							<dd>
								<input name="address2" type="text" value={this.state.data.address2} onChange={this.handleChange} maxLength="50" autoComplete='new-password' />
								<ErrorDisplay message={this.props.errors.address2} />
							</dd>
							<dt>{Locale.getString('label.city', 'City')} <RequiredMarker /></dt>
							<dd>
								<input name="city" type="text" value={this.state.data.city} onChange={this.handleChange} maxLength="50" autoComplete='new-password' />
								<ErrorDisplay message={this.props.errors.city} />
							</dd>

							<div className='row'>
								{showProvince &&
								<div className={ locationAND ? 'col-xs-6' : showProvince ? 'col-xs-12' : ''}>
									<dt>{Locale.getString('label.state-region-province', 'State / Region / Province')} <RequiredMarker /></dt>
									<dd>
										{showStateDropdown &&
										<div>
											<select name="state" value={this.state.data.state} onChange={this.handleChange}>
												<option value="">{Locale.getString('option.select', 'Select')}...</option>
												{_.map(this.state.states[defaultCountry], function(name, abbr) {
													return <option key={abbr} value={abbr}>{name}</option>;
												})}
											</select>
											<ErrorDisplay message={this.props.errors.state} />
										</div>
										}

										{!showStateDropdown &&
										<div>
											<input name="state" type="text" value={this.state.data.state} onChange={this.handleChange} autoComplete='new-password' />
											<ErrorDisplay message={this.props.errors.state} />
										</div>}
									</dd>
								</div>}

								{showPostalCode &&
								<div className={ locationAND ? 'col-xs-6' : showPostalCode ? 'col-xs-12' : ''}>
									<dt>{Locale.getString('label.postal-code', 'Postal Code')} {zipcodeRequired && <RequiredMarker />}</dt>
									<dd>
										<input name="zipcode" type="text" value={this.state.data.zipcode} onChange={this.handleChange} autoComplete='new-password' />
										{zipcodeRequired && <ErrorDisplay message={this.props.errors.zipcode} />}
									</dd>
								</div>}
							</div>
						</div>

						<dt>{Locale.getString('label.email-address', 'Email Address')}</dt>
						<dd>
							<div className="row">
								<div className="col-xs-9">
									<input name="emailaddress" type="email" value={this.state.data.emailaddress} onChange={this.handleChange} autoComplete='new-password' />

									{((!_.isEmpty(this.state.data.emailaddress) && !this.state.data.date_email_verification_attempt || emailVerified && this.state.data.emailaddress != this.state.initialEmail)) &&
									<label>
										<input name="_attempt_email_verification" type="checkbox" value="1" onChange={this.handleChecked} checked={parseInt(this.state.data._attempt_email_verification) == 1} />
										{' '}
										{Locale.getString('message.attempt-verify-email', 'Attempt to verify e-mail after saving.')}
									</label>}
									{(!_.isEmpty(this.state.data.emailaddress) && parseInt(this.state.data.email_verified) == 0 && this.state.data.date_email_verification_attempt) &&
									<span><a href="#!" onClick={this.handleEmailVerification}>{Locale.getString('message.resend-verification-email', 'Re-send verification e-mail')}</a> <br />{Locale.getString('message.last-attempt-made', 'Last attempt made')}: {moment.utc(this.state.data.date_email_verification_attempt).local().format('DD-MMM-YYYY hh:mm A')}</span>}
								</div>
								<div className="col-xs-3">
									<i className="fa fa-check verification-icon" title={emailVerified ? Locale.getString('message.email-verified', 'This email has been verified') : Locale.getString('message.email-not-verified', 'This e-mail has not been verified.')} style={emailVerified ? {backgroundColor: '#0a0', color: '#fff'} : {}} />
								</div>

								{this.props.errors.emailaddress &&
								<div className="col-xs-12 error">{this.props.errors.emailaddress}</div>}
							</div>
						</dd>

						{this.renderDepositNotifications()}
						<ErrorDisplay message={this.props.errors.deposit_notifications} />
						<dt>{Locale.getString('label.mobile-phone', 'Mobile Phone')}</dt>
						<dd>
							<div className="row">
								<div className="col-xs-9">
									<input name="phone_mobile" type="tel" value={this.state.data.phone_mobile} onChange={this.handleChange} autoComplete='new-password' />

									{(!isInternational && (!_.isEmpty(this.state.data.phone_mobile) && !this.state.data.date_mobile_verification_attempt || mobileVerified && this.state.data.phone_mobile.replace(/[^\d]/g, '') != this.state.initialPhone.replace(/[^\d]/g, ''))) &&
									<label>
										<input name="_attempt_mobile_verification" type="checkbox" value="1" onChange={this.handleChecked} checked={parseInt(this.state.data._attempt_mobile_verification) == 1} />
										{' '}
										{Locale.getString('message.attempt-verify-phone', 'Attempt to verify mobile phone after saving.')}
									</label>}

									{(!isInternational && !_.isEmpty(this.state.data.phone_mobile) && !mobileVerified && this.state.data.date_mobile_verification_attempt) &&
									<span><a href="#!" onClick={this.handleMobileVerification}>{Locale.getString('message.resend-verification-text', 'Resend verification text.')}</a> <br />{Locale.getString('message.last-attempt-made', 'Last Attempt Made')}: {moment.utc(this.state.data.date_mobile_verification_attempt).local().format('DD-MMM-YYYY hh:mm A')}</span>}
								</div>
								{!isInternational &&
								<div className="col-xs-3">
									<i className="fa fa-check verification-icon" title={mobileVerified ? Locale.getString('message.number-verified', 'This number has been verified') : Locale.getString('message.number-not-verified', 'This number has not been verified.')} style={(mobileVerified && this.state.data.phone_mobile.replace(/[^\d]/g, '') == this.state.initialPhone.replace(/[^\d]/g, ''))? {backgroundColor: '#0a0', color: '#fff'} : {}} />
								</div>}

								{this.props.errors.phone_mobile &&
								<div className="col-xs-12 error">{this.props.errors.phone_mobile}</div>}
							</div>
						</dd>

						<dt>{Locale.getString('label.home-phone', 'Home Phone')}</dt>
						<dd>
							<div className="row">
								<div className="col-xs-9">
									<input name="phone_home" type="text" value={this.state.data.phone_home} onChange={this.handleChange} autoComplete='new-password' />
								</div>
								<div className="col-xs-3">
								</div>
							</div>
						</dd>
						<dt>{Locale.getString('label.password', 'Password')}</dt>
						<dd>
							{(emailVerified && !this.state.tempPasswordSent) &&
							<a href="#!" onClick={this.handleNewPassword} title="Password reset instructions and URL will be emailed to subject.">{Locale.getString('message.password-reset-url', 'Send Password Reset URL')}</a>}
							{(!emailVerified) &&
							<span>{Locale.getString('message.temp-password', 'Temporary passwords can be sent after subject is saved with a verified email address.')}</span>}
							{(this.state.tempPasswordSent) &&
							<span style={{color: '#080'}}><i className="fa fa-check" /> {Locale.getString('message.password-sent-url', 'Subject has been sent a secure URL that can be used to save a new password. This URL expires in 6 hours."')}</span>}
						</dd>
					</dl>
					
					<div className="col-md-8">
						{this.renderStudyMeta()}
						{this.state.data.id > 0 && <div style={{borderBottom: '5px solid #ddd', marginBottom: 25}}></div>}
					</div>

					{this.state.data.id > 0 &&
					<div className="col-md-8">
						{this.renderTabPreferenceButtons()}
						{this.state.currentPrefView == 'card' &&
						this.canAddCards() && paymentMethod == 'card' &&
						<div className="patient-buttons">
							<div className="row">
								<div className="col-md-12">
									<div className="row">
										<div className='col-md-4'><h4>{Locale.getString('title.pay-stipend-card', 'PAY Stipend Card')}</h4></div>

										<div className='col-md-4'>
										{!_.isEmpty(this.state.data.card) && this.state.data.card.id > 0 &&
											<div className="row">
												<div className="col-xs-12" style={{paddingTop: 5}}>
													{Locale.getString('label.balance', 'Balance')}: <strong>${parseFloat(this.state.data.card.balance).toFixed(2)}</strong><br />
													{Locale.getString('label.control-number', 'Control Number')}: <strong>{this.state.data.card.control_number}</strong><br />
													{Locale.getString('label.assigned', 'Assigned')}: <strong>{this.state.data.card.name}</strong>
												</div>
											</div>}
										</div>

										<div className='col-md-4'>
											<p>
												{this.state.data.id > 0 && !this.state.data.card.id &&
												<a className="button" href="#!" onClick={this.handleAssignCard}>{Locale.getString('button.assign-card', 'Assign Card')}</a>}

												{!_.isEmpty(this.state.data.card) && this.state.data.card.id > 0 &&
												<a className="button" href="#!" onClick={this.handleReplaceCard}>{Locale.getString('button.replace-card', 'Replace Card')}</a>}
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>}

						{this.state.data.id > 0 && 
							this.state.currentPrefView == 'travel' &&
						<div style={{position: 'relative', marginBottom: 30}}>
							<TravelPreferenceDialog ref='travelPreferenceDialog' {...this.state.TravelPreferenceDialogProps} />
						</div>
						}

						{this.state.data.id > 0 && 
							this.state.currentPrefView == 'travel_request' &&
						<div style={{position: 'relative', marginBottom: 30}}>
							{this.renderTravelRequestDialog()}
						</div>
						}

						{this.state.currentPrefView == 'card' && 
						<div>
							{paymentMethod == 'bank' &&
							<div className="patient-buttons">
								<div className="row">
									<div className="col-md-12">
										<h4 style={{textAlign: 'center'}}><i className="fa fa-bank" /> {Locale.getString('title.bank-account-information', 'Bank Account Information')}</h4>
										{!_.isEmpty(this.state.data.bank_account) && this.state.data.bank_account.id > 0 &&
										<div className="row">
											<div className="col-xs-12" style={{paddingTop: 5}}>
													{Locale.getString('label.account-number', 'Account Number')}: <strong>{account_num}</strong><br />
													{Locale.getString('label.routing-number', 'Routing Number')}: <strong>{routing_num}</strong><br />
													{Locale.getString('label.bank-name', 'Bank Name')}: <strong>{this.state.data.bank_account.bank_name}</strong><br />
													{Locale.getString('label.bank-currency', 'Bank Currency')}: <strong>{this.state.data.bank_account._currency_name} {this.state.data.bank_account.symbol}</strong>
											</div>
										</div>}
										{canSaveBank &&
										<p><a href="#!" className="button" onClick={this.handleBankAccount.bind(null, currentStudy)}> {Locale.getString('button.edit-bank-info', 'Edit Bank Info')}</a></p>}
										{!canSaveBank &&
										<p>{Locale.getString('message.save-address', 'Please save address fields to manage bank information.')}</p>}
									</div>
								</div>
							</div>}

							{paymentMethod == 'card' && parseInt(this.state.data.card.id) === 0 &&
							<span>
								{this.canAddCards() && <p>{Locale.getString('message.assign-stipend', 'Please assign stipend card to create reimbursement requests.')}</p>}
								{!this.canAddCards() && <p>{Locale.getString('message.request-admin-card', 'Please request from the administrators for permission to add cards.')}</p>}
							</span>}

					{paymentMethod == 'card' && parseInt(this.state.data.card.id) === 0 &&
					<span>
						{this.canAddCards() && <p>Please assign stipend card to create reimbursement requests.</p>}
						{!this.canAddCards() && <p>Please request from the administrators for permission to add cards.</p>}
					</span>}

					{this.state.data.study && !_.isEmpty(currentStudy) && this.renderTabButtons(paymentMethod)}

					{this.state.data.study &&
					!_.isEmpty(currentStudy) &&
					parseInt(currentStudy._study_site_schedule_assigned) === 1 &&
					(this.state.currentView === 'stipends' || parseInt(currentStudy._study_manage_reimbursements) === 0 && parseInt(currentStudy._study_visit_stipends) === 1) &&
					this.state.data.id && 
					(paymentMethod == 'card' && 
					this.state.data.card || paymentMethod == 'bank') && 
					currentStudy._study_visit_stipends == 1 && 
					this.state.data.selected_study_id !== '' &&
					<div key={`stipends-${this.state.data.selected_study_id + this.state.data.selected_site_id}`}>

						<DataTable
							setGlobalState={this.props.setGlobalState}
							endpoint={`/patients/visits/${this.props.data.id}/${this.state.data.selected_study_id}?site_id=${this.state.data.selected_site_id}&exclude_statuses=6`}
							source="/patients/requests"
							form={PatientRequestForm}
							ref="studyVisit"
							update={this.onStudyVisitUpdate}
							editOnRowClick={true}
							shouldEditRecord={shouldShowStipendReqestForm}
							currentStudyID={this.state.data.selected_study_id}
							controls={PatientVisitControls}
							editTitle="Reimbursement Request"
							onBeforeEdit={(params) => {
								return {
									...params,
									record: {
										...params.record,
										id: params.record.request_id,
										patient_id: params.record.patient_id,
										status: params.record.status,
										amount: params.record.amount,
										visit_name: params.record.name,
										visit_id: params.record.request_visit_id,
										study_id: this.state.data.selected_study_id,
										site_id: this.state.data.selected_site_id,
									}
								}
							}}
							searchEnabled={false}
							closeAfterSaving={true}
							user={this.props.user}
							onFilters={_.noop}
							_patient={this.state.data}
							system={this.props.system}
							additionalClassName="col-md-5 form"
							fields={{
								_num: {
									label: 'No.',
								},
								name: Locale.getString('title.visit-name', 'Visit Name'),
								stipend: {
									label: Locale.getString('title.stipend', 'Stipend'),
									align: 'right',
									sortValue: function(val) {
										return parseFloat(val);
									},
									value: function(val) {
										return this._symbol + val;
									},
								},
								date: {
									label: Locale.getString('label.completed', 'Completed'),
									value: (r, record) => {
										var sb = [];
										var date = moment(r);
										if (date.isValid()) {
											sb.push(date.format('DD/MMM/YYYY').toUpperCase());
										}
										return (
											<div>
												{sb.join(' ')}
												{date.isValid() &&
												this.checkAdminCompany(this.props.user.company) &&
													<a className="button record-controls" title="Update completion date." onClick={(e) => this.updateVisitCompletionDate({e, visit: record})} style={{border: "1px solid #ddd", backgroundColor:"#f5f5f5", paddingTop: 4, paddingBottom: 4, paddingRight: 6, paddingLeft: 6, marginLeft: 10}}>
														<i className="fa fa-pencil icon"></i>
													</a>
												}
											</div>
										)
									},
								},
								status: {
									label: Locale.getString('title.status', 'Status'),
									value: function(val) {
										return renderStatus(val);
									},
								},
							}}
						/>
					</div>}
				</div>}

						{(this.state.data.study && 
							this.state.currentPrefView === 'card' && 
							(this.state.currentView === 'reimbursements' && 
							!_.isEmpty(currentStudy) &&
							parseInt(currentStudy._study_manage_reimbursements) === 1 || parseInt(this.state.data.study.stipend_visits) === 0)) && 
							!_.isUndefined(currentStudy) && this.state.data.id > 0 &&
							currentStudy._study_manage_reimbursements == 1 && (paymentMethod == 'card' && this.state.data.card || paymentMethod == 'bank' && this.state.data.selected_study_id !== '') &&
						<div key={`reimbursements-${this.state.data.selected_study_id + this.state.data.selected_site_id}`}>


							<div style={{padding: 7, background: '#f7f7f7', marginBottom: 10}}>
								{this.renderReimbursementDataTable(currentStudy)}
							</div>
						</div>}

						{!this.state.data.id &&
						<dl className="form fill col-md-5">
							<p style={{marginTop: 0}}>{Locale.getString('message.after-saving-stipend', 'After saving subject stipend card assignment, reimbursement requests, and more will appear in this area.')}</p>
						</dl>}

						{this.props.errors._duplicate_detection && this.state._duplicateAck === false &&
						<div>
							<Dialog width={400} title={Locale.getString('title.duplicate-warning', 'Duplicate Warning')} onClose={this.handleDuplicateDialogClose} buttons={duplicateWarningButtons}>
								{this.props.errors._duplicate_detection}
								<div style={{height: 400, width: 'auto', overflowY: 'scroll'}}>
								{_.map(_.uniq(this.props.errors.duplicatePatients, function(patient) {return patient.id}), function(patient, key) {
									var emailaddress = patient.emailaddress ? " (" + patient.emailaddress + ")" : "";
									var homePhone = "Home: " + (patient.phone_home ? patient.phone_home : "");
									var cellPhone = "Cell: " + (patient.phone_mobile ? patient.phone_mobile : "");
									return (
										<div key={key}>
											<p style={{marginRight: 15}}>{patient.firstname + " " + patient.lastname + " , born " + moment(patient.dob).format('MMM D, YYYY') + emailaddress }</p>
											<p>{homePhone}</p>
											<p>{cellPhone}</p>
										</div>
									);
								}, this)}
								</div>
							</Dialog>
						</div>}
					</div>}
				</div>	
			</div>
		)},

		onChangeSelectedStudy: function(e) {
			if(e.target.value != ""){
				let val = e.target.value.split(" ");
				this.setState({selected_site_id: val[0], selected_study_id: val[1]},()=>{
				!this.state.data.id ? "" :this.fetchStudies();
				this.onStudyVisitUpdate();
				// this.updateReimbursementTable();
				});
			}
		},

		filterStudiesFunc: function() {

			let refinedAssignedStudies = this.state.studyAssociations;
			refinedAssignedStudy = _.find(refinedAssignedStudies, {study_id: this.state.selected_study_id, site_id: this.state.selected_site_id});

			return function(record) {
				return record._patient_study.study_id == this.state.selected_study_id && record._patient_study.site_id == this.state.selected_site_id && (parseInt(record._patient_study.site_id) == parseInt(refinedAssignedStudy.site_id) );
			}.bind(this);
		},

		studiesFilter: function() {
			let refinedAssignedStudies = this.state.studyAssociations;
			refinedAssignedStudies = _.filter(refinedAssignedStudies, (s) => {return s._study_subject_travel_preferences == 0})
			return (
				<span style={{float: 'left'}}>
					<span className='base-header-font-size' style={{fontWeight: 'bold', paddingRight: 10}}>{Locale.getString('label.study-filter', 'Study Filter')}:</span>
					<select value={this.state.selected_site_id+" "+this.state.selected_study_id} onChange={(e)=>{this.onChangeSelectedStudy(e)}}>
						{_.map(refinedAssignedStudies, function(study) {
							const siteName = study._study_site_name + " - ";
							const studyID = study.study_id;
							const siteID = study.site_id;
							const studyTitle = study._study_title ? study._study_title : "";
							const studyName = siteName + study._sponsor_name + " - " + study._study_protocol + " - " + studyTitle;
							return <option title={studyName} key={study.id + "," + study.study_id} value={siteID+" "+studyID}>{studyName.length > 40 ? (studyName.substr(0, 40) + '...'): studyName }</option>;
						})}
					</select>
				</span>
			);
		},

		handleTravelRequestRowProps: function(props) {
			const data = _.omit(props.data, ['site_id', 'original_visit']);
			data.site_id = props.data && props.data._patient_study ? props.data._patient_study.site_id : 0;

			return {
				className: 'travel-request-row',
				onClick: (e) => {
					e.preventDefault();
					if (this.props.user.type == 'patient') {
						if (!_.isUndefined(data.visit_start_date) && data.visit_start_date && data.visit_start_date !== "0000-00-00 00:00:00" &&
							!_.isUndefined(data.visit_end_date) && data.visit_end_date && data.visit_end_date !== "0000-00-00 00:00:00") {
								this.handleShowRequest(data)();
						}
					} else {
						this.handleShowRequest(data)();
					}
				}
			}
		},

		handleShowRequest: function(props) {
			return () => {
				let {studyAssociations} = this.state;
				if (typeof studyAssociations === 'object') {
					studyAssociations = Object.values(studyAssociations);
				}
				let isFormDisabled = this.state.TravelRequestDialogProps.user.type != 'user' && props.id ? true : false;
				if (this.state.TravelRequestDialogProps.user.type == 'patient') {
					isFormDisabled = !_.isUndefined(props.patient_save) && props.patient_save == 1;
				}
				const formDisableMessage = this.props.user.type == 'patient' ? `**${'If you need to cancel or reschedule your visit, please contact your site. If you need to amend or cancel your travel request, please contact ClinEdge'}**` : `**${'If changes are needed, please contact ClinEdge.'}**`;
				let form_display = "none";
				this.setState({currentView: 'request', form_display, travelRequestFormProps: {...this.state, ...this.props, isFormDisabled, formDisableMessage, studyAssociations, data: props}});
			}
		},

		handleSave: function() {
			if (this.state.currentView != 'request' && this.state.currentPrefView != 'travel') {
				return;
			}
			this.setState({
				saving: true,
			});
			if (this.refs.travelRequestDialog) {
				$.post(_.endpoint(this.state.TravelRequestDialogProps.endpoint), this.state.travelRequestFormProps.data, function(res) {
					const state = {saving: false};
					if (!_.isUndefined(res.status) && res.status < 2) {
						const isFormDisabled = this.props.user.type != 'user' && res.record ? true : false;

						let travelRequestFormProps = {
							...this.state.travelRequestFormProps,
							isFormDisabled,
							...{data: res.record}
						};
						Object.assign(state, {
							saved: true,
							travelRequestFormProps,
							formErrors: {}
						});

						this.props.onSave();
					} else {
						if (res.errors) {
							Object.assign(state, { saved: false, formErrors: res.errors });
						}
					}
					this.setState(state);
					this.setState({
						selected_site_id: this.state.selected_site_id,
						selected_study_id: this.state.selected_study_id
					});
					if (res.status == 0){
						this.handleBack();
						this.handleShowTravel();
						this.handleShowTravelRequest();
					}
				}.bind(this));
			} else if (this.refs.travelPreferenceDialog) {
				_.defer(this.refs.travelPreferenceDialog.handleSave);
			}
		},

		handleDeleteRequest: function(props) {
			return () => {
				this.setState({
					saving: true,
				});

				$['delete'](_.endpoint(this.props.deleteRequestEndpoint + props.id), function(res) {
					const state = {saving: false, dialog: null, form_display:'block'};
					if (this.refs.requestsTable) {
						_.defer(this.refs.requestsTable.handleUpdate);
					}
					if (!_.isUndefined(res.status) && res.status < 2) {
						const isFormDisabled = this.props.user.type != 'user' && res.record ? true : false;

						let data = {...props, ...res.record};

						let travelRequestFormProps = {
							...this.state.travelRequestFormProps,
							isFormDisabled,
							...{data: data}
						};

						Object.assign(state, {
							saved: true,
							travelRequestFormProps,
							formErrors: {},
							currentView: 'requests'
						});

					} else {
						if (res.errors) {
							Object.assign(state, { saved: false, formErrors: res.errors });
						}
					}
					this.setState(state);
				}.bind(this));
			}
		},

		handleBack: function() {
			this.setState({currentPrefView : 'travel_request', currentView: 'requests', form_display : 'block', formErrors: {}},
				() => {const element = document.getElementById('requests');
				_.defer(()=> {element.scrollIntoView()});
			});

		},

		handleDeleteRequestDialog: function() {
			this.setState({
				dialog: null,
			});
		},

		onDelete: function(props) {
			const buttons = [
				<button key='cancel' type="button" onClick={this.handleDeleteRequestDialog}>{Locale.getString('button.cancel', 'Cancel')}</button>,
				<button key='continue'type="button" className="primary" onClick={this.handleDeleteRequest(props)}>{Locale.getString('button.continue', 'Continue')}</button>
			]
			this.setState({
				dialog: (
					<Dialog title={Locale.getString('title.delete-request', 'Delete Request')+'?'} width={400} onClose={this.handleDeleteRequestDialog} buttons={buttons}>
						<p>{Locale.getString('message.delete-request', 'Are you sure you want to delete this request?')}</p>
					</Dialog>
				)
			});
		},

		renderTravelRequestDialog: function() {
			let style = {};
			let form_display =  this.state.form_display;
			if (this.props.width > 0) {
				var width = this.props.width;
				var windowWidth = jQuery(window).width();
				if (width > windowWidth - 30) {
					width = windowWidth - 30;
				}
				style.left = '50%';
				style.marginLeft = -1 * width / 2;
				style.width = width;
				style.bottom = this.props.bottom > 0 ? this.props.bottom : 'auto';
			}

			style.paddingBottom = 0;
			style.position = 'inherit';
			style.borderRadius = 0;
			style.border = '1px solid #d4d4d4';
			style.borderBottomLeftRadius = 7;
			style.borderBottomRightRadius = 7;
			style.boxShadow = 'unset';
			style.paddingTop = 0;

			style = _.extend({}, style, this.props.style);

			const renderFormDisableMessage = () => {
				if (this.props.user.type == 'patient' || this.props.user.type == 'siteuser'){
					if (this.state.travelRequestFormProps.data.status == 1){
						if (this.state.travelRequestFormProps.data.patient_save == 1 || this.state.travelRequestFormProps.data.site_user_save == 1){
							return (this.state.travelRequestFormProps.isFormDisabled &&
								<p style={{marginTop: 0, textAlign: 'center', color: '#ff0000'}}>{this.state.travelRequestFormProps.formDisableMessage}</p>)
						}
					}
					else {
						return (this.state.travelRequestFormProps.isFormDisabled &&
							<p style={{marginTop: 0, textAlign: 'center', color: '#ff0000'}}>{this.state.travelRequestFormProps.formDisableMessage}</p>)
					}
				}
			};

			const refinedAssignedStudies = _.filter(this.state.studyAssociations, (s) => {return s._study_subject_travel_preferences == 0})
			return (
				<div className="comp-dialog-overlay" style={{position: "static", background: 'transparent'}}>
					{this.state.dialog}
					<div className="comp-dialog" style={style}>
						<div className="body" style={{overflow: 'initial'}}>
							{this.state.currentPrefView == 'travel_request' &&
							<div id='requests' style={{display: form_display }} >
								<p style={{marginTop: 0, fontSize: 14, fontWeight: 'bold'}}>{Locale.getString('title.travel-requests', 'Travel Requests')}</p>
								{this.state.studyAssociations &&
								refinedAssignedStudies.length > 0 &&
								<DataTable
									endpoint={this.state.TravelRequestDialogProps.endpoint}
									onShowNewRequest={this.handleShowRequest}
									onShowRequest={this.handleShowRequest}
									onDeleteRequest={ props => this.onDelete(props) }
									ref='requestsTable'
									controls={TravelRequestControls}
									onRowProps={this.handleTravelRequestRowProps}
									searchEnabled={false}
									closeAfterSaving={true}
									user={this.state.TravelRequestDialogProps.user}
									identifier={'visit_id'}
									onFilters={this.studiesFilter}
									filterFunc={this.filterStudiesFunc()}
									optionsClassName='col-md-12'
									optionsWithPagingClassName='col-md-9'
									additionalClassName='col-md-3'
									onLoaded={(dataTable) => {
										var urlParams = this.state.urlParams;
										if (!_.isUndefined(urlParams) && !_.isUndefined(urlParams.visit_id)) {
											const record = _.find(dataTable.state.records, function(rec) {
												return rec.visit_id == urlParams.visit_id;
											});
											if (record && record.id == urlParams.id) {
												_.defer(()=>{this.setState({urlParams: {}}, () => {this.handleShowRequest(record)()})});
											} else if (record && urlParams) {
												this.setState({urlParams: {}});
												alert( Locale.getString('alert.request-deleted', 'This request was deleted.'));
											}
										}
									}}
									fields={{
										_visit_name: {
											label: Locale.getString('title.visit-name', 'Visit Name'),
											sortWithValue: false,
											value: function(val) {
												return <span>{val} {this._visit_baseline == 1 ? <i className="fa fa-check" /> : null}</span>;
											},
										},
										visit_start_date: {
											label: Locale.getString('title.visit-date-time', 'Visit Date/Time'),
											sortWithValue: false,
											value: function(val) {
												if (!val) {
													return null;
												}
												const momStart = moment(val);
												const momEnd = moment(this.visit_end_date);

												const renderStart = momStart.isValid() ? momStart.format('DD-MMM-YYYY, HH:mm').toUpperCase() : '';
												const renderEnd = momEnd.isValid() ? '- ' + momEnd.format('HH:mm').toUpperCase() : renderStart ? '- 00:00' : '';
												return `${renderStart} ${renderEnd}`;
											},
										},
										_request_types: {
											label: Locale.getString('title.type', 'Type'),
											value: function(val) {
												if (!val) {
													return null;
												}

												let replaced = val.replace("ground", Locale.getString('label.ground', 'ground'));
												replaced = val.replace("air", Locale.getString('label.air', 'air'));
												replaced = val.replace("hotel", Locale.getString('label.hotel', 'hotel'));

												return replaced;
											}
										},

										travel_status: {
											label: Locale.getString('title.status', 'Status'),
											sortWithValue: false,
											value: function(travel_status) {
												return <span>{travel_status}</span>;
											},
										}
									}}
								/>
								}
							</div>
							}
							{this.state.currentView == 'request' &&
							<div>
								<div className='row' style={{textAlign: 'center'}}>
									{renderFormDisableMessage()}
								</div>
								<div className='row'>
									<div className='col-xs-1'>
										<a onClick={this.handleBack} className="app-edit" style={{cursor: 'pointer', color: '#444', fontSize: '1.3em'}} title={Locale.getString('title.navigate-travel-requests', 'Navigate Travel Requests')} ><img height="20" alt={this.props.appName} src='/assets/images/left-arrow.png' /></a>
									</div>
									<div className={(this.state.travelRequestFormProps.data.id && this.props.user.type == 'user' ? 'col-xs-10' : 'col-xs-11')}>
										<p className='base-header-font-size' style={{marginTop: 0, textAlign: 'center'}}>{Locale.getString('label.travel-request', 'Travel Request')} - {this.state.travelRequestFormProps.data._visit_name}</p>
									</div>
									<div className='col-xs-1'>
										{this.props.user.type == 'user' && this.state.travelRequestFormProps.data.id && <a onClick={() => {this.onDelete(this.state.travelRequestFormProps.data)}} className="app-edit" style={{float: 'right', cursor: 'pointer', color: '#444', fontSize: '1.3em'}} title={Locale.getString('title.delete-travel-request', 'Delete Travel Request')} ><i className="fa fa-trash"></i></a>}
									</div>
								</div>
								<div style={{height: 1, background: '#d4d4d4'}}></div>
								<TravelRequestForm {...this.state.travelRequestFormProps} errors={this.state.formErrors}/>
								<div className='row'>
                                <div className='col-md-5 col-md-offset-4'>
                                    {renderFormDisableMessage()}
                                </div>

                                <div className='col-md-3'>
                                    {this.props.user.type == 'patient' && !this.state.travelRequestFormProps.isFormDisabled && <button type="button" style={{border: '1px solid rgba(0, 0, 0, 0.2)', padding: '10px 30px', color: 'white', marginLeft: 10, float: 'right', backgroundColor: _.primaryBrandColor()}} onClick={this.handleSave}>{Locale.getString('button.save', 'Save')}</button>}
                                </div>
                            </div>
								<div className="clearfix"></div>
							</div>
							}
						</div>
					</div>
				</div>
			)
		}
});
