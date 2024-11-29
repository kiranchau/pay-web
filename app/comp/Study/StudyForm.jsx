const {Locale} = RTBundle;

var StudyForm = React.createClass({

	getDefaultProps: function() {
		return {
			errors: {},
			data: {},
			system: {config: {travel_preferences_requests_enabled: true}}
		};
	},

	getInitialState: function() {
		var initialData = this.props.data;
		if (!initialData._sites) {
			initialData._sites = {};
		}
		if (!initialData._costs) {
			initialData._costs = {};
		}
		if (_.isUndefined(this.props.data.status)) {
			initialData.status = 0;
		}
		if (parseInt(initialData.visit_stipends) === 1 && parseInt(initialData.manage_reimbursements) === 1) {
			initialData._stipends_and_reimbursements = 1;
			initialData.visit_stipends = 0;
			initialData.manage_reimbursements = 0;
		}
		return {
			data: initialData,
			sites: [],
			sponsors: [],
			reimbursementItems: [],
			adminSystemSettings: {
				subject_travel_preferences: 0
			}
		};
	},

	setField: function(key, val) {
		var data = this.state.data;
		data[key] = val;
		this.setState({
			data: data,
		}, this.pushOutPropertyStateData);
	},

	componentDidMount: function() {
		$.get(_.endpoint('/sites?status=0'), function(res) {
			this.setState({
				sites: res.records,
			});
		}.bind(this));

		$.get(_.endpoint('/sponsors'), function(res) {
			this.setState({
				sponsors: res.records,
			});
		}.bind(this));

		$.get(_.endpoint('/studies/reimbursement-costs'), {id: this.props.data.id}, function(res) {
			var costs = {};
			_.each(res.records, function(item) {
				costs[item.id] = item.cost_per_mile;
			});
			var data = this.state.data;
			data._costs = costs;
			this.setState({
				reimbursementItems: res.records,
				data: data,
			}, this.pushOutPropertyStateData);
		}.bind(this));

		$.get(_.endpoint('/study-researchers'), function(res) {
			this.setState({
				researchers: res.records,
			});
		}.bind(this));

		$.get(_.endpoint('/system-settings'), function(res) {
			this.setState({
				adminSystemSettings: res.settings,
			});
		}.bind(this));
	},

	handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handleRadioChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handleChecked: function(e) {
		this.setField(e.target.name, e.target.checked ? 1 : 0);
	},

	handlePerMileCost: function(typeID, e) {
		var data = this.state.data;

		data._costs[typeID] = e.target.value;
		this.setState({
			data: data,
		}, this.pushOutPropertyStateData);
	},

	handleSiteCheckbox: function(siteID, e) {
		var data  = this.state.data;
		var sites = data._sites || {};
		if (e.target.checked) {
			sites[siteID] = 0;
		}
		else {
			delete sites[siteID];
		}
		data._sites = sites;

		this.setState({
			data: data,
		}, this.pushOutPropertyStateData);
	},

	paymentTypes: function() {
		return {
			_stipends_and_reimbursements: 0,
			manage_reimbursements: 0,
			visit_stipends: 0,
			manage_none: 0
		};
	},

	handleVisitManagement: function(e) {
		const field = e.target.name;

		const paymentTypes = this.paymentTypes();
		const data = {...this.state.data, ...paymentTypes, ...{[field]: 1}};

		if (field == 'manage_none') {
			data.subject_travel_preferences = 0;
		}

		this.setState({
			data,
		}, this.pushOutPropertyStateData);
	},

	clearVisits: function(e) {
		e.preventDefault();

		const paymentTypes = this.paymentTypes();
		const data = {...this.state.data, ...paymentTypes};

		this.setState({
			data,
		}, this.pushOutPropertyStateData);
	},

	pushOutPropertyStateData() {
		Object.assign(this.props.data, this.state.data);  //OUT property
	},

	render: function() {
		const {data} = this.state;

		return (
			<div className="base-font-size row form-study-info">
				<div className="col-md-6 form dialog">
					<div>
						<dt>{Locale.getString('title.sponsor', 'Sponsor')} <RequiredMarker /></dt>
						<dd>
							<select name="sponsor_id" value={data.sponsor_id} onChange={this.handleChange}>
								<option value="">{Locale.getString('option.select-sponsor', 'Select Sponsor')}...</option>
								{_.map(this.state.sponsors, function(site) {
									return <option key={site.id} value={site.id}>{site.name}</option>
								})}
							</select>
							<ErrorDisplay message={this.props.errors.sponsor_id} />
						</dd>

						<dt>{Locale.getString('title.protocol', 'Protocol')} <RequiredMarker /></dt>
						<dd>
							<input name="protocol" type="text" maxLength={30} value={data.protocol} onChange={this.handleChange} />
							<ErrorDisplay message={this.props.errors.protocol} />
						</dd>

						<dt>CRO</dt>
						<dd>
							<select name="cro_id" value={data.cro_id} onChange={this.handleChange}>
								<option value="">Select CRO...</option>
								{_.map(this.state.researchers, function(cro) {
									return <option key={cro.id} value={cro.id}>{cro.name}</option>
								})}
							</select>
						</dd>

						<dt>{Locale.getString('title.clinical-description', 'Clinical Description')} <RequiredMarker /></dt>
						<dd>
							<input name="title" type="text" value={data.title} onChange={this.handleChange} />
							<ErrorDisplay message={this.props.errors.title} />
						</dd>

						

						<dt>{Locale.getString('label.complete-protocol-title', 'Complete Protocol Title')}</dt>
						<dd>
							<textarea rows="6" name="description" value={data.description} onChange={this.handleChange} />
						</dd>

						<dt>{Locale.getString('title.payment-program-type', 'Payment Program Type')}</dt>
						<dd>
							<div>
								<label>
									<input name="manage_reimbursements" type="radio" value="1" checked={parseInt(data.manage_reimbursements) === 1} onChange={this.handleVisitManagement} />
									&nbsp; {Locale.getString('label.enable-reimbursements', 'Enable reimbursements for this study')}
								</label>
								<ErrorDisplay message={this.props.errors.manage_visits} />
							</div>
							<div>
								<label>
									<input name="visit_stipends" type="radio" value="1" checked={parseInt(data.visit_stipends) === 1} onChange={this.handleVisitManagement} />
									&nbsp; {Locale.getString('label.enable-stipend', 'Enable stipends for this study.')}
								</label>
								<ErrorDisplay message={this.props.errors.visit_stipends} />
							</div>
							<div>
								<label>
									<input name="_stipends_and_reimbursements" type="radio" value="1" checked={parseInt(data._stipends_and_reimbursements) === 1} onChange={this.handleVisitManagement} />
									&nbsp; {Locale.getString('label.both', 'Both')}
								</label>
							</div>

							<div>
								<label>
									<input name="manage_none" type="radio" value="1" checked={parseInt(data.manage_none) === 1} onChange={this.handleVisitManagement} />
									&nbsp; {Locale.getString('label.none', 'None')}
								</label>
							</div>

							{(data.manage_reimbursements == 1 || data.visit_stipends == 1 || data._stipends_and_reimbursements == 1 || data.manage_none == 1) &&
							<div style={{marginTop: 8}}><a href="#!" onClick={this.clearVisits}>{Locale.getString('button.clear-selection', 'Clear Selection')}</a></div>}
						</dd>
					</div>

					<div>
						<dt>{Locale.getString('label.per-mile-cost', 'Per-mile Costs for Reimbursement Items')}</dt>
						<table className="form-study-info__reimbursement-table form">
							<thead>
								<tr>
									<th>{Locale.getString('title.item-type', 'Item type')}</th>
									<th>{Locale.getString('title.cost-per-mile', 'Cost per mile')}</th>
								</tr>
							</thead>

							<tbody>
								{_.map(this.state.reimbursementItems, function(item) {
									return (
										<tr key={item.id}>
											<td>{item.name}</td>
											<td>
												<input type="text" placeholder="0.00" value={data._costs[item.id]} onChange={this.handlePerMileCost.bind(null, item.id)} />
											</td>
										</tr>
									);
								}, this)}
							</tbody>
						</table>
					</div>
				</div>

				<div className="col-md-6 form dialog marign-top-15--max-md">
					<dt>{Locale.getString('title.study-site-locations', 'Study Site Locations')}</dt>
					<div style={{ border: '1px solid #ddd', borderRadius: 4, padding: 5, height: 200, overflowY: 'auto' }}>
					{_.map(this.state.sites, function(site) {
							var patientsPresent = {};
							if (data._sites[site.id] == 1) {
								patientsPresent = "There is 1 patient assigned to this study at this time.";
							}
							else if (data._sites[site.id] > 1) {
								patientsPresent = "There are " + data._sites[site.id] + " patients assigned ....";
							}
							else {
								patientsPresent = null;
							}
						return <p key={site.id}><label><input type="checkbox" value="1" checked={!_.isUndefined(data._sites[site.id])}
							onChange={this.handleSiteCheckbox.bind(null, site.id)} disabled={data._sites[site.id] > 0}
						title={patientsPresent} /> {site.name}</label></p>
					}.bind(this))}
					</div>

					<div style={{paddingBottom: 10, paddingTop: 10}}>
						<dt>{Locale.getString('title.study-status', 'Study Status')} <RequiredMarker /></dt>
						<div>
							<label>
								<input name="status" type="radio" value="0" checked={parseInt(data.status) === 0} onChange={this.handleRadioChange} /><span style={{marginLeft: 15}}>{Locale.getString('title.active', 'Active')}</span>
							</label>
						</div>

						<div>
							<label>
								<input name="status" type="radio" value="2" checked={parseInt(data.status) === 2} onChange={this.handleRadioChange} /><span style={{marginLeft: 15}}>{Locale.getString('label.completed', 'Completed')}</span>
							</label>
						</div>
					</div>

					<div style={{paddingBottom: 10}}>
						<dt>{Locale.getString('title.study-id', 'Study ID')}</dt>
						<div>
							<label>
								<input name="subject_study_id_toggle" type="radio" value="0" checked={parseInt(data.subject_study_id_toggle) === 0} onChange={this.handleRadioChange} /><span style={{marginLeft: 15}}>{Locale.getString('option.enable', 'Enable')}</span>
							</label>
						</div>

						<div>
							<label>
								<input name="subject_study_id_toggle" type="radio" value="1" checked={parseInt(data.subject_study_id_toggle) === 1} onChange={this.handleRadioChange} /><span style={{marginLeft: 15}}>{Locale.getString('option.disable', 'Disable')}</span>
							</label>
						</div>
					</div>

					{this.props.system.config.travel_preferences_requests_enabled &&
					<div style={{paddingBottom: 10}}>
						<dt>{Locale.getString('title.subject-travel-preferences', 'Subject Travel Preferences / Requests')}</dt>
						{this.state.adminSystemSettings.subject_travel_preferences == 1 &&
						<i className="fa fa-info-circle" style={{fontSize: '1.2em', marginLeft: 8}} title='This feature must be enabled in the System Settings.'/>
						}
						
						<div>
							<label>
								<input disabled={this.state.adminSystemSettings.subject_travel_preferences == 1} name="subject_travel_preferences" type="radio" value="0" checked={parseInt(data.subject_travel_preferences) === 0} onChange={this.handleRadioChange} /><span style={{marginLeft: 15}}>{Locale.getString('option.enable', 'Enable')}</span>
							</label>
						</div>

						<div>
							<label>
								<input disabled={this.state.adminSystemSettings.subject_travel_preferences == 1} name="subject_travel_preferences" type="radio" value="1" checked={parseInt(data.subject_travel_preferences) === 1} onChange={this.handleRadioChange} /><span style={{marginLeft: 15}}>{Locale.getString('option.disable', 'Disable')}</span>
							</label>
						</div>
					</div>
					}

					{parseInt(data.status) != 2 && 
						<div style={{paddingBottom: 10}}>
							<dt>{Locale.getString('title.informed-consent-verification', 'Informed Consent Verification')}<RequiredMarker /></dt>
							<div>
								<label>
									<input 
										name="icf_verification" 
										type="radio" value="1" 
										checked={parseInt(data.icf_verification) === 1} 
										onChange={this.handleRadioChange} 
									/>
										<span style={{marginLeft: 15}}>{Locale.getString('option.enable', 'Enable')}</span>
								</label>
							</div>

							<div>
								<label>
									<input 
										name="icf_verification" 
										type="radio" 
										value="0" 
										checked={parseInt(data.icf_verification) === 0} 
										onChange={this.handleRadioChange} 
									/>
										<span style={{marginLeft: 15}}>{Locale.getString('option.disable', 'Disable')}</span>
								</label>
								<ErrorDisplay message={this.props.errors.icf_verification} />
							</div>
						</div>
					}
				</div>
			</div>
		);
	}
});


