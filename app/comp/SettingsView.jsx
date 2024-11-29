const {Locale} = RTBundle;

var SettingsView = React.createClass({

	getRouteInfo: function() {
		return {
			path: '/settings',
			heading: Locale.getString('label.system-settings', 'System Settings'),
			collapsibleContainerKey: 'systemSettingCollapsibleContainerKey-'
		};
	},
	getDefaultProps: function() {
		return {
			errors: {},
			system: {config: {travel_preferences_requests_enabled: true}}
		};
	},
	getInitialState: function() {
		let sectionData = [];
		sectionData[0] = true;
		for(let i = 1; i < 2; i++) {
			sectionData[i] = false;
		}

		return {
			data: {
				low_balance_threshold: 0,
				low_card_threshold: 0,
				subject_travel_preferences: 0,
				payment_processor:0,
				prepaid_low_balance_threshold:0,
			},
			payProcessor:{},
			settings:{},
			sections: sectionData
		};
	},

	componentDidMount: function() {
		const key = `system_settings_sections`;
		let sectionData = JSON.parse(sessionStorage.getItem(key));
		if (!sectionData) {
			sectionData = this.state.sections;
			sessionStorage.setItem(key, JSON.stringify(sectionData));
		}
		this.setState({sections: sectionData});

		$.get(_.endpoint('/system-settings'), function(res) {
			this.setState({
				data: {...this.state.data, ...res.settings},
			});
		}.bind(this));
		
		$.get(_.endpoint('/api/v1/pay-processor'), function(res) {
			this.setState({payProcessor:res.records});
		}.bind(this));
	},

	handleChange: function(key, e) {
		var data = this.state.data;
		data[key] = e.target.value;
		this.setState({
			data: data,
		});
	},

	handleSubjectTravelPreferencesChange: function(key, e) {
		var data = this.state.data;
		data[key] = e.target.value == 1 ? 0 : 1;
		this.setState({
			data: data,
		});
	},

	handleSave: function() {
		$.post(_.endpoint('/system-settings'), {settings: this.state.data}, function(res) {
			if (res.status < 2) {
				alert(Locale.getString('message.settings-saved', 'Settings successfully saved.'));
			}
			else {
				alert(Locale.getString('message.stipend-error', 'Stipend Reimbursement Coverage must be greater than 0.'));
			}
		}.bind(this));
	},

	handleSectionClick: function(section, e) {

		const key = 'system_settings_sections';
		const data = JSON.parse(sessionStorage.getItem(key));

		if (!data[section] == true) {
			const element = document.getElementById(`${this.props.collapsibleContainerKey}${section}`);
			_.defer(()=> {element.scrollIntoView()});
		}
		
		data[section] = !data[section];
		sessionStorage.setItem(key, JSON.stringify(data));
		this.setState({sections: data});
	},

	render: function() {

		const mapSectionToArrowClass = (index, position = 'left') => {
			const sections = this.state.sections
			return 'fa ' + (sections[index] ? 'fa-angle-down' : `fa-angle-${position}`);
		}

		const mapSectionToOpenCloseClass = (index) => {
			const sections = this.state.sections
			return sections[index] ? 'show' : 'hidden';
		}

		return (
			<div className="page">
				
				<div style={{maxWidth: 650, margin: 'auto'}}>
				
					<SystemOptions />

					<CollapsibleSection
						sectionKey='systemSettingCollapsibleContainerKey-1'
						defaultOpen={true}
						scrollIntoViewOnOpen={false}
						headerContainer={<strong>{Locale.getString('title.threshold-warnings', 'Threshold Warnings')}</strong>}
					>
						<dl className="form" style={{border: '1px solid #d4d4d4', paddingTop: 10}}>
							{ this.state.data.feature_flag == 1 ? 
							<dt style={{width: '50%'}}>
								{Locale.getString('label.payment-processor', 'Payment Processor')}
							</dt> : "" }
							{ this.state.data.feature_flag == 1 ? 
							<dd style={{width: '50%'}}>
							&nbsp;&nbsp;&nbsp;
							<select style={{width: '52%'}} name="payment_processor" onChange={this.handleChange.bind(null, 'payment_processor')} value={this.state.data.payment_processor}>
							    <option key='0' value="0">{Locale.getString('option.select', 'Select')}...</option>
								{
									_.map(this.state.payProcessor, function(vendor) {
										return <option key={vendor.id} value={vendor.id} name={vendor.name}>{vendor.name}</option>;
									})
								}
							</select>
							</dd> : "" }
							<dt style={{width: '50%'}}>
								{Locale.getString('label.low-balance-threshold-warning', 'Low Balance Warning Threshold')}
							</dt>
							<dd style={{width: '50%'}}>
								$ <input type="text" onChange={this.handleChange.bind(null,this.state.data.feature_flag == 0 ? 'low_balance_threshold': this.state.data.payment_processor==="1"? 'low_balance_threshold':'prepaid_low_balance_threshold')} value={this.state.data.feature_flag == 0 ? this.state.data.low_balance_threshold : this.state.data.payment_processor==="1"? this.state.data.low_balance_threshold:this.state.data.prepaid_low_balance_threshold } />
							</dd>
							<dt style={{width: '50%'}}>
                            {Locale.getString('label.low-card-threshold-warning', 'Low Card Warning Threshold')}
							</dt>
							<dd style={{width: '50%'}}>
								&nbsp;&nbsp;&nbsp;<input type="text" onChange={this.handleChange.bind(null, this.state.data.feature_flag == 0 ? 'low_card_threshold': this.state.data.payment_processor==="1"? 'low_card_threshold':'prepaid_low_card_threshold')} value={this.state.data.feature_flag == 0 ? this.state.data.low_card_threshold : this.state.data.payment_processor==="1"? this.state.data.low_card_threshold:this.state.data.prepaid_low_card_threshold} />
							</dd>
							<dt style={{width: '50%'}}>
                            {Locale.getString('label.stipend-threshold-warning', 'Stipend Amount Warning Threshold')}
							</dt>
							<dd style={{width: '50%'}}>
								$ <input type="text" onChange={this.handleChange.bind(null, this.state.data.feature_flag == 0 ? 'stipend_reimbursement_coverage': this.state.data.payment_processor==="1"? 'stipend_reimbursement_coverage':'prepaid_stipend_reimbursement_coverage')} value={this.state.data.feature_flag == 0 ? this.state.data.stipend_reimbursement_coverage : this.state.data.payment_processor==="1"?this.state.data.stipend_reimbursement_coverage:this.state.data.prepaid_stipend_reimbursement_coverage} />
							</dd>
						</dl>
						<ErrorDisplay message={this.props.errors.stipend_reimbursement_coverage} />
					</CollapsibleSection>


					{this.props.system.config.travel_preferences_requests_enabled &&
					<CollapsibleSection
						sectionKey='systemSettingCollapsibleContainerKey-2'
						defaultOpen={false}
						scrollIntoViewOnOpen={false}
						headerContainer={<strong>{Locale.getString('title.subject-travel-preferences', 'Subject Travel Preferences / Requests')}</strong>}
						style={{marginTop: 5}}
					>
					<div style={{border: '1px solid #d4d4d4', padding: '10px 0'}}>
						<dl className="form" style={{width: '50%', margin: 'auto'}}>
							<div>
								<label style={{cursor: 'pointer'}}>
									<input type="radio" onChange={this.handleSubjectTravelPreferencesChange.bind(null, 'subject_travel_preferences')} value={this.state.data.subject_travel_preferences} checked={this.state.data.subject_travel_preferences == 0}/>
										&nbsp;{Locale.getString('option.enable', 'Enable')}
								</label>
							</div>
							<div style={{marginTop: 10}}>
								<label style={{cursor: 'pointer'}}>
									<input type="radio" onChange={this.handleSubjectTravelPreferencesChange.bind(null, 'subject_travel_preferences')} value={this.state.data.subject_travel_preferences} checked={this.state.data.subject_travel_preferences == 1}/>
										&nbsp;{Locale.getString('option.disable', 'Disable')}
								</label>
							</div>
						</dl>
					</div>
					</CollapsibleSection>
					}

					<div style={{paddingTop: 40}}>
						<div style={{float: "right", width: 150}}>
							<button onClick={this.handleSave} style={{backgroundColor: _.primaryBrandColor()}} type="button" className="btn btn-block btn-primary">{Locale.getString('button.save', 'Save')}</button>
						</div>
					</div>

				</div>
			</div>
		);
	}
});
