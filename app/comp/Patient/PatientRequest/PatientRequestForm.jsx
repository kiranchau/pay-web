const {Locale} = RTBundle;

var PatientRequestForm = React.createClass({

	getDefaultProps: function() {
		return {
			data: {
				items: [],
				status: 1,
				_extra__has_payment_method: 0 //required
			},
			studyAssociations: null,
			currentStudy: {},
			siteID: 0, //patient mode
			_patient: {}, //patient mode
			patientMode: false,
			canSelectStudy: false,
			studyAssociations: [],
			countries: [],
			states: [],
			user: {},
			errors: {}
		};
	},

	getInitialState: function() {
		if (!this.props.data.id) {
			this.props.data.status = 1;
		}
		if (!_.isUndefined(this.props.currentStudy)) {
			this.props.data._study_id = this.props.currentStudy.id;
		}
		if (!this.props.canSelectStudy || this.props.studyAssociations.length == 1) {
			if (this.props.siteID > 0) {
				this.props.data.site_id = this.props.siteID;
			} 

			const active = _.filter(this.props.studyAssociations, function(patientStudy) {
				return patientStudy.status == 0 && patientStudy._study_manage_reimbursements == 1;
			});

			if (!this.props.data.study_id) {
				if (this.props.studyAssociations && active.length == 1) {
					this.props.data.study_id = _.first(active).study_id;	
				} else if (!this.props.data.id && !_.isEmpty(this.props._patient)) {
					this.props.data.study_id = this.props._patient.study.id;
				}
			}
			
		}
		return {
			data: this.props.data,
			savedStatus: this.props.data.status,
			reimbursementTypes: [],
			visits: [],
			patient: null,
			system_settings: {},
			amountAck: false,
			study: null
		};
	},

	componentDidMount: function() {
		this.loadReimbursementTypes();
		var patient = this.props.data.patient ? this.props.data.patient : this.props._patient;
		var patientID = patient ? patient.id : '';
		
		if (this.props.data.study_id) {
			$.get(_.endpoint(`/studies/visits/${this.props.data.study_id}/sites/${this.props.data.site_id}`), function(res) {
				this.setState({
					visits: res.records,
				});
			}.bind(this));
		} else if (patient) {
			$.get(_.endpoint(`/studies/visits/${patient.selected_study_id}/sites/${this.props.data.site_id}`), function(res) {
				this.setState({
					visits: res.records,
				});
			}.bind(this));
		}
		if (parseInt(patientID) > 0) {
			$.get(_.endpoint('/patients/' + patientID), function(res) {
				this.setState({
					patient: res.record,
				});
			}.bind(this));
		}

		$.get(_.endpoint('/settings?ver=2'), function(res) {
			var enableOus = parseInt(res.enable_ous) === 1 ? true : false;
			this.setState({
				countries: res.countries,
				states: res.states,
				enable_ous: enableOus,
			});
		}.bind(this));
		
		if (this.state.data.study_id) {
			$.get(_.endpoint('/studies?study_id=' + this.state.data.study_id), function(res) {
				this.setState({
					study: res.record,
				});
			}.bind(this));
		}
	},

	loadReimbursementTypes: function() {
		$.get(_.endpoint('/list/reimbursement-item-types'), function(res) {
			this.setState({
				reimbursementTypes: res.records,
			});
		}.bind(this))
	},

	handleRecordUpdate: function(record) {
		var data = this.state.data;
		var idx = _.findIndex(data.items, function(item) {
			return item.id == record.id;
		});
		if (idx > -1) {
			data.items[idx] = record;
		}
		else {
			data.items.push(record);
		}
		this.setState({
			data: data,
		});
	},

	handleChange: function(fieldName, e) {
		var data = this.state.data;
		data[fieldName] = e.target.value;
		this.setState({
			data: data,
		});
	},

	setField: function(key, val) {
		var data = this.state.data;
		data[key] = val;
		this.setState({
			data: data,
		});
	},

	handleStudyChange: function(e) {
		var patient_study_id = e.target.value;
		var associations = this.props.studyAssociations;
		var currentStudy = _.find(associations, function(assoc) {
			return assoc.id == patient_study_id;
		});
		if (e.target.value !== '') {
			this.setField('study_id', currentStudy.study_id);
			this.setField('site_id', currentStudy.site_id);
		}
		else {
			this.setField('study_id', '');
			this.setField('site_id', '');
		}

		setTimeout(() => {
			this.setState({study: currentStudy});
			if (currentStudy.study_id) {
				$.get(_.endpoint(`/studies/visits/${currentStudy.study_id}/sites/${currentStudy.site_id}`), function(res) {
					this.setState({
						visits: res.records,
					});
				}.bind(this));
			}
		}, 250);
	},

	handleDialogClose: function() {
		var data = this.state.data;
		data._amount_ack = 1;
		this.setState({
			data: data,
			amountAck: 1,
		});
	},

	renderStatusOption: function(status) {
		return <option key={status} value={status}>{_.patientRequestStatus(status).title}</option>
	},

	render: function() {
		var amount = _.reduce(this.state.data.items, function(amount, item) {
			return parseFloat(amount) + parseFloat(item.amount);
		}, 0);
		var stipendVisit = parseInt(this.state.data.patient_visit_id) > 0;

		if (stipendVisit) {
			amount = parseFloat(this.state.data.amount);
		}

		var dateTimeFormat = 'DD-MMM-YYYY hh:mm:ss A';
		var reimbursementTypes = {};
		_.each(this.state.reimbursementTypes, function(record) {
			reimbursementTypes[record.id] = record;
		});

		var patientProps = {};
		if (this.props._patient) {
			patientProps._patient = this.props._patient;
		}
		var symbol = "$";
		
		if (this.state.patient) {
			if(this.state.patient.country == 'US') {
				symbol = "$";
			} else {
				if (this.state.countries) {
					const c = this.state.countries.find((c) => c.code == this.state.patient.country);
					if (c) {
						symbol = c._symbol;
					} else {
						symbol = "$";
					}
				}	
			}
		} else if (this.props.data._symbol) {
			symbol = this.props.data._symbol;
		} else if ((this.state.patient && this.state.patient.bank_account) && this.state.patient.bank_account._currency_symbol) {
			symbol = this.state.patient.bank_account._currency_symbol;
		}

		var studyID = this.state.data.study_id;
		if (!studyID && this.props.currentStudy) {
			studyID = this.props.currentStudy.study_id;
		}
		var isSiteUser = this.props.user.type === 'siteuser';

		let parentProps = _.pick(this.props, [
			'appLoading',
			'appLogo',
			'appName',
			'baseEndpoint',
			'cache',
			'fromDashboard',
			'horizontalScroll',
			'initialLoading',
			'loginType',
			'navigate',
			'primaryBrandColor',
			'project',
			'routes',
			'projects',
			'secondaryBrandColor',
			'setGlobalState',
			'system',
			'systemCode',
			'user',
		]);		

		let isStatusDisabled = this.props.user.type == 'user' ? false : true;
		isStatusDisabled = this.state.savedStatus > 1.9;

		const isSaved = this.state.data.id ? true : false;

		let isReimbursementDisabled = this.props.user.type == 'user' ? false : true;

		if (this.props.user.type == 'siteuser' && this.props.user.options) {
			if (this.props.user.options.hasOwnProperty('review_reimbursement') && !(this.state.savedStatus !== '2.0' || this.state.savedStatus !== '5.0')) {
				isReimbursementDisabled = this.props.user.options.review_reimbursement == 1 ? false : true;
				isStatusDisabled = isReimbursementDisabled;
			} else if (this.state.savedStatus < 1.9){
				if (this.props.user.options.hasOwnProperty('subject_request_approval') && this.props.user.options.subject_request_approval == 1) {
					isStatusDisabled = false;
				}
			}
		}
			

		let statusOptions = [
			this.renderStatusOption('0.0'),
			this.renderStatusOption('1.0'),
			this.renderStatusOption('1.1')
		];

		if ((isStatusDisabled ||
			!isSiteUser ||
			isSiteUser &&
			_.find(this.props.user.site_user_study_associations, {study_id: this.props.data.study_id, site_id: this.props.data.site_id}) &&
			this.props.user.options &&
			(parseInt(this.props.user.options.stipend_approval) === 1 && stipendVisit) || (parseInt(this.props.user.options.subject_request_approval) === 1 && !stipendVisit))) {

			if (this.props.data._extra__has_payment_method == '1') {
				statusOptions = [...statusOptions, this.renderStatusOption('2.0')];
			}
			
			statusOptions = [
				...statusOptions,
				...[
					this.renderStatusOption('3.0'),
					this.renderStatusOption('4.0')
				]
			]
		}

		if (!isSiteUser && this.state.savedStatus == 5.0 && this.props.user.type == 'user' && (_.isFromCTMS(this.props.user.emailaddress) || _.isFromRedAxle(this.props.user.emailaddress))) {
			statusOptions = [this.renderStatusOption('2.0'), this.renderStatusOption('5.0')];
			isStatusDisabled = false;
		} else if (this.state.data.status == 5.0) {
			statusOptions = [...statusOptions, this.renderStatusOption('5.0')]
		}

		if (!stipendVisit && !isSiteUser && this.state.savedStatus == 6.0 && this.props.user.type == 'user' && (_.isFromCTMS(this.props.user.emailaddress) || _.isFromRedAxle(this.props.user.emailaddress))) {
			statusOptions = [this.renderStatusOption('2.0'), this.renderStatusOption('6.0')];
			isStatusDisabled = false;

		} else if (this.state.data.status == 6.0) {
			statusOptions = [...statusOptions, this.renderStatusOption('6.0')]
		
		}

		return (
			<div className='base-font-size'>
				<div className="row patient-request">

					{(!stipendVisit &&
					this.state.patient &&
					this.state.study &&
					((this.state.study.manage_visits == 1 || this.state.study._study_manage_visits == 1) || 
					(this.state.study.visit_stipends == 1 || this.state.study._study_visit_stipends == 1) || 
					(this.state.study.manage_reimbursements == 1 || this.state.study._study_manage_reimbursements == 1)) &&
					this.state.visits && this.state.visits.length > 0) &&
					<dl className="col-sm-4 form dialog">
						<dt>{Locale.getString('title.visit', 'Visit')}</dt>
						<dd>
							<select onChange={this.handleChange.bind(null, 'visit_id')} value={this.state.data.visit_id} disabled={isSaved && this.props.user.type == 'siteuser' && this.props.user.options && !this.props.user.options.hasOwnProperty('review_reimbursement')}>
								<option value="">{Locale.getString('option.select-visit', 'Select Visit')}</option>
								{_.map(this.state.visits, function(visit) {
									return <option key={visit.id} value={visit.id}>{visit.name}</option>;
								})}
							</select>
						</dd>
					</dl>}

					{/* Reimbursement Request Status */}
					<dl className="col-sm-4 form dialog">
						{!this.props.patientMode &&
						<dt>{Locale.getString('title.status', 'Status')}</dt>}
						{!this.props.patientMode &&
						<div>
							<dd>
								<select onChange={this.handleChange.bind(null, 'status')} value={this.state.data.status} disabled={isSaved && isStatusDisabled}>
									{statusOptions}
								</select>
								{this.state.savedStatus == 2.0 &&
								<p>{moment.utc(this.state.data.date_approved).local().format(dateTimeFormat).toUpperCase()}</p>}
								{this.state.savedStatus == 3.0 &&
								<p>{moment.utc(this.state.data.date_denied).local().format(dateTimeFormat).toUpperCase()}</p>}
								{this.state.savedStatus == 4.0 &&
								<p>{moment.utc(this.state.data.date_cancelled).local().format(dateTimeFormat).toUpperCase()}</p>}
							</dd>
						</div>}
						{this.props.patientMode && !this.props.canSelectStudy &&
						<div>
						<dt/>
						</div>
						}
						{this.props.canSelectStudy &&//patient mode
						<div>
							<dt>{Locale.getString('title.site-study', 'Site - Study')}</dt>
							<dd>
								<select name="_study_association" value={this.state.data._study_association} onChange={this.handleStudyChange} disabled={isSaved && this.props.user.type == 'siteuser' && this.props.user.options && !this.props.user.options.hasOwnProperty('review_reimbursement')}>
									<option value="">{Locale.getString('option.select', 'Select')}...</option>
								{this.props.studyAssociations
								.filter(s => s.status == 0 && s._study_manage_reimbursements == 1)
								.map( function(patientStudy) {
									return <option key={patientStudy.id} value={patientStudy.id}>{patientStudy._study_site_name + " - " + patientStudy._study_title}</option>;
								})}
								</select>
							</dd>
							<ErrorDisplay message={this.props.errors._study_association} />
							<input type="hidden" name="study_id" value={this.state.data.study_id} />
							<input type="hidden" name="site_id" value={this.state.data.site_id} />
						</div>}
					</dl>

					<div className="col-sm-4" />

					<div className="col-sm-4">
						<div className="row amount-row">
							<div className="col-xs-2" />
							<div className="col-xs-4 amount-label" style={{textAlign: 'right'}}>{Locale.getString('label.total', 'Total').toUpperCase()}</div>
							<div className="col-xs-6 amount-value">{symbol}{amount.toFixed(2)}</div>
						</div>
					</div>

					{this.props.errors.generic &&
					<div className="col-sm-12 error" style={{paddingBottom: 20, color: 'red'}}>
						{this.props.errors.generic}
					</div>}

					{this.props.errors.address &&
					<div className="col-sm-12 error" style={{paddingBottom: 20}}>
						{this.props.errors.address}
					</div>}
				</div>

				{stipendVisit &&
				<p>{Locale.getString('label.stipend-visit', 'Stipend Visit')}: {this.state.data.visit_name}</p>}

				{!stipendVisit &&
				<DataTable
					{...parentProps}
					{...patientProps}
					isReimbursementDisabled={isReimbursementDisabled}
					endpoint=""
					study_id={studyID}
					identifier="id"
					source={this.props.data.items}
					createButtonLabel={this.state.savedStatus < 2 ? Locale.getString('button.new-item', 'New Item') : ''}
					searchEnabled={false}
					patientRequest={this.state.data}
					form={PatientRequestItemForm}
					controls={PatientRequestItemControls}
					emptyMessage={Locale.getString('message.no-reimbursement', 'No reimbursement item present.')}
					onUpdate={this.handleRecordUpdate}
					onRowProps={_.noop}
					onCreateRecord={function() {
						return {
							address_start: {},
							address_end: {},
						};
					}}
					onValidateRecord={function(record) {
						var errors = {};
						if (record.type_id < 1) {
							errors.type_id = Locale.getString('error.item-type', 'Please select an item type.');
						}

						if (record._amount_required) {
							if (isNaN(parseFloat(record.amount)))
								errors.amount = Locale.getString('error.valid-amount', 'Please enter a valid amount.');
							else if (parseFloat(record.amount) <= 0)
								errors.amount = Locale.getString('error.amount', 'Please enter the amount for this item.');
						}

						if (_.isEmpty(record.notes)) {
							//errors.notes = 'Please include some additional info for this item.';
						}
						if (record._upload_required == 1) {
							if (_.isEmpty(record.files)) {
								errors.files = Locale.getString('error.item-file', 'Please attach the file for this item.');
							}
						}
						return errors;
					}}
					fields={{
						type_id: {
							label: Locale.getString('title.type', 'Type'),
							value: function(val) {
								try {
									return reimbursementTypes[val].name;
								}
								catch (e) {
									return 'N/A';
								}
							},
						},
						amount: {
							label: Locale.getString('title.amount', 'Amount'),
							sortValue: function(val) {
								return parseFloat(val);
							},
							value: function(val) {
								return symbol + val;
							},
							align: 'right',
						},

						files: {
							label: Locale.getString('label.attachements', 'Attachements'),
							style: {textAlign: 'center'},
							value: function(val) {
								if (_.isUndefined(val))
									return 0;
								return val.length;
							},
						},
						notes: {
						label: Locale.getString('label.notes', 'Notes'),
						value: function(val) {
							var type = reimbursementTypes[this.type_id];
							var getAddress = function(addr) {
								var sb = [];
								if (addr.address) {
									sb.push(addr.address);
								}
								if (addr.address2) {
									sb.push(' ' + addr.address2);
								}

								if (addr.address || addr.address2) {
									sb.push(', ');
								}

								if (addr.city) {
									sb.push(addr.city + ', ');
								}
								if (addr.state) {
									sb.push(addr.state + ' ');
								}
								if (addr.zipcode) {
									sb.push(addr.zipcode);
								}
								return sb.join('');
							};

							return (
								<div>
									{(type && type.address_based == 1 && parseFloat(type.cost_per_mile) > 0) &&
									<p>
										{getAddress(this.address_start)} to {getAddress(this.address_end)}
										{this.distance > 0 &&
											<span> ({this.distance} {this.distance == 1 ? 'mile' : 'miles'})</span>}
									</p>}
										{val &&
										<p>{val}</p>}
									</div>
								);
							},
						},
					}}
				/>
			}
			{(this.props.errors._over_threshold && this.state.amountAck === false) &&
			<div>
				<Dialog width={300} title={Locale.getString('title.stipend-amount-warning', 'Stipend Amount Warning')} onClose={this.handleDialogClose} buttons={<button type="button" onClick={this.handleDialogClose}>{Locale.getString('label.okay', 'Okay')}</button>}>{Locale.getString('error.threshold', 'The amount is greater than the sipend threshold.')}</Dialog>
			</div>}
		</div>
		);
	}

});
