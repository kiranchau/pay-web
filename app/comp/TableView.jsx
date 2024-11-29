const {Locale} = RTBundle;

var TableView = React.createClass({

	getRouteInfo: function() {
		return {
			path: '/tables',
			heading: Locale.getString('title.manage-tables', 'Manage Tables'),
		};
	},

	getInitialState: function() {
		return {
			table: null,
			currencies: {},
			pay_processor:{},
			settings:{},
		};
	},

	componentDidMount: function() {
		if (this.props.system.id == 5) {
			var cache = this.props.cache;
			cache.adminNavToggle = true;
			this.props.setGlobalState({
				cache: cache,
			});
		}

		$.get(_.endpoint('/currencies?active=1'), function(res) {
			this.setState({currencies: res.currencies,});
		}.bind(this));

		$.get(_.endpoint('/milestone-types'), function(res) {
			this.setState({milestone_types: res.records,});
		}.bind(this));

		$.get(_.endpoint('/languages'), function(res) {
			this.setState({languages: res.records});
		}.bind(this));

		$.get(_.endpoint('/api/v1/pay-processor'), function(res) {
			this.setState({pay_processor:res.records});
		}.bind(this));

		$.get(_.endpoint('/settings'), function(res) {
			this.setState({settings:res.feature_flag});
		}.bind(this));
	},

	handleTable: function(e) {
		var val = e.target.value;
		if (val === '') {
			this.setState({
				table: null,
			});
		}
		else {
			this.setState({
				table: val,
			});
		}
		$.get(_.endpoint('/settings'), function(res) {
			this.setState({settings:res.feature_flag});
		}.bind(this));
	},

	render: function() {

		const settings = this.state.settings;
		const languageOptions = [
			<option key='0' value="0">Select a language</option>,
			...(_.map(this.state.languages, function(c) {
				return <option key={c.code} value={c.code}>{c.name}</option>;
			}))
		]

		const currencyOptions = [
			<option key='0' value="0">Select a currency</option>,
			...(_.map(this.state.currencies, function(c) {
				return <option key={c.code} value={c.code}>{c.code + " - " + c.name + " (" + c.symbol + ")"}</option>;
			}))
		]

		const payProcessor = [
			<option key='0' value="0">Select a processor</option>,
			..._.map(this.state.pay_processor, function(c) {
					return <option key={c.id} value={c.id} name={c.name}>{c.name}</option>;
			})
		]

		var milestone_types = _.map(this.state.milestone_types, function(c) {
			return <option key={c.id} value={c.id} name={c.name}>{c.name}</option>;
		});
		return (
			<div className="page">
				<p className="form">
					<select onChange={this.handleTable}>
						<option value="">{Locale.getString('option.select-table', 'Select Table')}...</option>
						<option value="reimbursement_items">{Locale.getString('option.reimbursement-item-type', 'Reimbursement Item Type')}</option>
						<option value="sponsors">{Locale.getString('option.sponsors', 'Sponsors')}</option>
						<option value="currency">{Locale.getString('option.currencies', 'Currencies')}</option>
						<option value="country">{Locale.getString('option.countries', 'Countries')}</option>
						<option value="milestones">{Locale.getString('option.milestones', 'Milestones')}</option>
						<option value="milestone_types">{Locale.getString('option.milestone-types', 'Milestone Types')}</option>
						<option value="note_types">{Locale.getString('option.note-types', 'Note Types')}</option>
						<option value="researchers">{Locale.getString('option.contact-research-organizations', 'Contact Research Organizations')}</option>			
						<option value="travel_status">{Locale.getString('option.travel-status', 'Travel Status')}</option>
					</select>
				</p>

				{this.state.table == 'reimbursement_items' &&
				<div>
					<DataTable
						endpoint="/manage/reimbursement-item-types"
						inlineEditing={true}
						createButtonLabel={Locale.getString('button.new-item-type', 'New Item Type')}
						editOnRowClick={true}
						controls={GenericInlineControls}
						defaultSortKey="sortorder"
						fields={{
							name: {
								label: Locale.getString('label.name', 'Name'),
								width: '40%',
							},
							address_based: {
								label: Locale.getString('title.start-end-address', 'Start/End Address'),
								width: '15%',
								align: 'center',
								value: function(val) {
									if (val == 1)
										return 'Yes';
									return 'No';
								},
								editField: function() {
									return (
										<div style={{textAlign: 'center'}}>
											<input type="checkbox" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null, 'address_based')} value="1" checked={parseInt(this.state.data.address_based) == 1} />
										</div>
									);
								},
							},
							direct_mileage_entry: {
								label: Locale.getString('title.direct-mileage-entry', 'Direct Mileage Entry'),
								width: '15%',
								align: 'center',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function() {
									return (
										<div style={{textAlign: 'center'}}>
											<input type="checkbox" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null,'direct_mileage_entry')} value="1" checked={parseInt(this.state.data.direct_mileage_entry) == 1} />
									</div>
									);
								},
							},
							intl: {
								label: Locale.getString('title.ous-enabled', 'OUS Enabled'),
								width: '15%',
								align: 'center',
								value: function(val) {
									if (val == 1)
										return 'Yes';
									return 'No';
								},
								editField: function() {
									return (
										<div style={{textAlign: 'center'}}>
											<input type="checkbox" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null, 'intl')} value="1" checked={parseInt(this.state.data.intl) == 1} />
										</div>
									);
								},
							},

							sortorder: {
								label: Locale.getString('label.sort-order', 'Sort Order'),
								align: 'center',
								width: '15%',
							},

							uploads_required: {
								label: Locale.getString('title.upload-required', 'Upload Required'),
								align: 'center',
								width: '15%',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function() {
									return (
										<div style={{textAlign: 'center'}}>
											<input type="checkbox" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null, 'uploads_required')} value="1" checked={parseInt(this.state.data.uploads_required) == 1} />
										</div>
									);
								},
							},
						}}
					/>
				</div>}

				{this.state.table == 'sponsors' &&
				<div>
					<DataTable
						endpoint="/sponsors"
						inlineEditing={true}
						createButtonLabel={Locale.getString('button.add-sponsor', 'Add Sponsor')}
						editOnRowClick={true}
						controls={GenericInlineControls}
						defaultSortKey="name"
						fields={{
							name: {
								label: Locale.getString('label.name', 'Name'),
								width: '70%',
							},
						}}
					/>
				</div>}

				{this.state.table == 'currency' &&
				<div>
					<DataTable
						endpoint="/currencies"
						inlineEditing={true}
						editOnRowClick={true}
						controls={GenericInlineControls}
						defaultSortKey="name"
						fields={{
							name: {
								label: Locale.getString('label.name', 'Name'),
								width: '60%',
							},
							code: {
								label: Locale.getString('title.code', 'Code'),
								width: '20%',
							},
							active: {
								label: Locale.getString('option.active', 'Active'),
								width: '10%',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function() {
									return (
										<div style={{textAlign: 'center'}}>
											<input type="checkbox" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null,'active')} value="1" checked={parseInt(this.state.data.active) == 1} />
										</div>
									);
								},
							},
							symbol: {
								label: Locale.getString('title.symbol', 'Symbol'),
								width: '10%',
							},
						}}
					/>
				</div>}

				{this.state.table == 'country' &&
				<div>
					<DataTable
						endpoint="/countries"
						tableType="countries"
						identifier="code"
						inlineEditing={true}
						editOnRowClick={true}
						controls={GenericInlineControls}
						defaultSortKey="name"
						fields={settings == 1 ? {
							name: {
								label: Locale.getString('label.name', 'Name'),
								width: '15%',
							},
							code: {
								label: Locale.getString('title.code', 'Code'),
								width: '10%',
								editFieldProps: {readOnly: true}
							},
							active: {
								label: Locale.getString('option.active', 'Active'),
								width: '5%',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function() {
									return (
										<input type="checkbox" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null,'active')} value="1" checked={parseInt(this.state.data.active) == 1} />
									);
								},
							},
							dob_required: {
								label: 'DOB Required',
								width: '5%',
								value: function (val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function () {
									return (
										<input type="checkbox" style={{ verticalAlign: 'middle' }} onChange={this.handleChange.bind(null, 'dob_required')} value="1" checked={parseInt(this.state.data.dob_required) == 1} />
									);
								},
							},
							state_enabled: {
								label: Locale.getString('title.show-state', 'Show State'),
								width: '10%',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function() {
									return (
										<input type="checkbox" value="1" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null, 'state_enabled')} checked={parseInt(this.state.data.state_enabled) == 1} />
									);
								},
							},
							zipcode_enabled: {
								label: Locale.getString('title.show-postal-code', 'Show Postal Code'),
								width: '10%',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function() {
									return (
										<input type="checkbox" value="1" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null, 'zipcode_enabled')} checked={parseInt(this.state.data.zipcode_enabled) == 1} />
									);
								},
							},
							default_currency: {
								label: Locale.getString('label.default-currency', 'Default Currency'),
								editFieldType: 'select',
								editFieldChildren: currencyOptions,
								width: '20%',
								value: function(val) {
									if (!val) {
										return null;
									}							
									var name = '';
									currencyOptions.forEach(function(c){
										if (c.key == val) {
											name = c.props.value;
										}
									});
									if (name) {
										name = name + " - ";
									}
									return name + this._currency_name; 
								},
							},
							lang: {
								label: Locale.getString('title.preferred-language', 'Preferred Language'),
								editFieldType: 'select',
								editFieldChildren: languageOptions,
								width: '15%',
								value: val => {
									if (!val) {
										return null;
									}	
									
									const lang = _.filter(this.state.languages, language => {
										return language.code == val;
									})

									if (lang.length < 1) {
										return null;
									}
									
									return lang[0].name;
								},
							},
							processor: {
								label: "Processor",
								editFieldType: 'select',
								editFieldChildren: payProcessor,
								width: '25%',
								value: function(val) {							
									var name = '';
									payProcessor.forEach(function(c){
										if (c.key == val) {
											name = c.props.name;
										}
									});
									return name; 
								},
							},
						}:{
							name: {
								label: Locale.getString('label.name', 'Name'),
								width: '15%',
							},
							code: {
								label: Locale.getString('title.code', 'Code'),
								width: '15%',
								editFieldProps: {readOnly: true}
							},
							active: {
								label: Locale.getString('option.active', 'Active'),
								width: '10%',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function() {
									return (
										<input type="checkbox" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null,'active')} value="1" checked={parseInt(this.state.data.active) == 1} />
									);
								},
							},
							dob_required: {
								label: 'DOB Required',
								width: '5%',
								value: function (val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function () {
									return (
										<input type="checkbox" style={{ verticalAlign: 'middle' }} onChange={this.handleChange.bind(null, 'dob_required')} value="1" checked={parseInt(this.state.data.dob_required) == 1} />
									);
								},
							},
							state_enabled: {
								label: Locale.getString('title.show-state', 'Show State'),
								width: '10%',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function() {
									return (
										<input type="checkbox" value="1" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null, 'state_enabled')} checked={parseInt(this.state.data.state_enabled) == 1} />
									);
								},
							},
							zipcode_enabled: {
								label: Locale.getString('title.show-postal-code', 'Show Postal Code'),
								width: '10%',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
								editField: function() {
									return (
										<input type="checkbox" value="1" style={{verticalAlign: 'middle'}} onChange={this.handleChange.bind(null, 'zipcode_enabled')} checked={parseInt(this.state.data.zipcode_enabled) == 1} />
									);
								},
							},
							default_currency: {
								label: Locale.getString('label.default-currency', 'Default Currency'),
								editFieldType: 'select',
								editFieldChildren: currencyOptions,
								width: '20%',
								value: function(val) {
									if (!val) {
										return null;
									}							
									var name = '';
									currencyOptions.forEach(function(c){
										if (c.key == val) {
											name = c.props.value;
										}
									});
									if (name) {
										name = name + " - ";
									}
									return name + this._currency_name; 
								},
							},
							lang: {
								label: Locale.getString('title.preferred-language', 'Preferred Language'),
								editFieldType: 'select',
								editFieldChildren: languageOptions,
								width: '20%',
								value: val => {
									if (!val) {
										return null;
									}	
									
									const lang = _.filter(this.state.languages, language => {
										return language.code == val;
									})

									if (lang.length < 1) {
										return null;
									}
									
									return lang[0].name;
								},
							},
						}}
					/>
				</div>}

				{this.state.table == 'milestones' &&
				<div>
					<DataTable
						endpoint="/milestones"
						inlineEditing={true}
						createButtonLabel={Locale.getString('button.add-milestone', 'Add Milestone')}
						editOnRowClick={true}
						controls={GenericInlineControls}
						onCreateRecord={() => {return {milestone_type_id: 1}}}
						defaultSortKey="name"
						fields={{
							name: {
								label: Locale.getString('label.name', 'Name'),
								width: '70%',
							},
							milestone_type_id: {
								label: Locale.getString('button.milestone-type', 'Milestone Type'),
								editFieldType: 'select',
								editFieldChildren: milestone_types,
								width: '20%',
								value: function(val) {
									if (!val) {
										return null;
									}							
									var name = '';
									milestone_types.forEach(function(c){
										if (c.key == val) {
											name = c.props.name;
										}
									});
									return name; 
								},
							},
						}}
					/>
				</div>}

				{this.state.table == 'milestone_types' &&
				<div>
					<DataTable
						endpoint="/milestone-types"
						inlineEditing={true}
						createButtonLabel={Locale.getString('button.milestone-type', 'Milestone Type')}
						editOnRowClick={true}
						controls={GenericInlineControls}
						defaultSortKey="name"
						fields={{
							name: {
								label: Locale.getString('label.name', 'Name'),
								width: '70%',
							},
						}}
					/>
				</div>}

				{this.state.table == 'note_types' &&
				<div>
					<DataTable
						endpoint="/note-types"
						inlineEditing={true}
						createButtonLabel={Locale.getString('button.note-type', 'Note Type')}
						editOnRowClick={true}
						controls={GenericInlineControls}
						defaultSortKey="name"
						fields={{
							name: {
								label: Locale.getString('label.name', 'Name'),
								width: '70%',
							},
						}}
					/>
				</div>}

				{this.state.table == 'travel_status' &&
				<div>
					<DataTable
						endpoint="/travel_status_table"
						defaultSortKey="sort_order"
						fields={{
							status: {
								label: Locale.getString('label.name', 'Status Name'),
								width: '40%',
							},
							sort_order: {
								label: Locale.getString('label.sort-order', 'Sort Order'),
								align: 'center',
								width: '15%',
							},

							yes_no: {
								label: Locale.getString('title.yes-no', 'Default Yes/No'),
								width: '15%',
								align: 'center',
								value: function(val) {
									if (val == 1) {
										return 'Yes';
									}
									return 'No';
								},
							},
						}}
					/>
				</div>}

				{this.state.table == 'researchers' &&
				<div>
					<DataTable
						endpoint="/study-researchers"
						inlineEditing={true}
						createButtonLabel={Locale.getString('label.cro', 'CRO')}
						editOnRowClick={true}
						controls={GenericInlineControls}
						defaultSortKey="name"
						fields={{
							name: {
								label: Locale.getString('label.name', 'Name'),
								width: '70%',
							},
						}}
					/>
				</div>}
			</div>
		);
	}
});

