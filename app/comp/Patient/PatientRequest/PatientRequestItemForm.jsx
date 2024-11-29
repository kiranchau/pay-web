const {Locale} = RTBundle;

var PatientRequestItemForm = React.createClass({

	mixins: [SettingsMixin],

	getDefaultProps: function() {
		return {
			onChange: _.noop,
			data: {
				address_start: {},
				address_end: {},
				amount: 0,
				_distance: 0,
				files: {},
				file_hashes: [],
			},
			errors: {},
			study_id: 0,
		};
	},

	getInitialState: function() {
		return {
			data: this.props.data,
			locations: [],
			patient_locations: [],
			typeInfo: {},
			reimbursementTypes: [],

			countries: {},
			states: {},
			timezones: [],
			autoAmountError: '',
		};
	},

	componentDidMount: function() {
		this.loadSiteLocations();
		this.loadReimbursementTypes();
		this.loadSettings();
	},

	loadReimbursementTypes: function() {
		$.get(_.endpoint('/list/reimbursement-item-types'), {study_id: this.props._patient.selected_study_id}, function(res) {
			var types = res.records;
			if (this.props.user._international) {
				types = _.filter(types, function(type) {
					return type.intl == 1;
				});
			}
			this.setState({
				reimbursementTypes: types,
			});
			if (this.state.data.type_id > 0) {
				this.setItemType(this.state.data.type_id);
			}
		}.bind(this))
	},

	loadSiteLocations: function() {
		$.get(_.endpoint('/sites/locations/' + this.props.siteID), {patient_id: this.props._patient.id}, function(res) {
			this.setState({
				locations: res.records,
				patient_locations: res.patient_locations,
			});
		}.bind(this));
	},

	handleDateChange: function(field, val) {
		var data = this.state.data;
		data[field] = val;
		this.setState({
			data: data,
		});
	},

	setItemType: function(val) {
		var data = this.state.data;
		var type = _.find(this.state.reimbursementTypes, function(type) {
			return type.id == val;
		});

		if (type) {
			data.type_id = type.id;
			data._amount_required = parseInt(type.address_based) != 1 || parseFloat(type.cost_per_mile) <= 0;
			data._upload_required = parseInt(type.uploads_required) == 1 ? 1 : 0;
			this.setState({
				typeInfo: type,
				data: data,
			});
		}
		else {
			throw Locale.getString('error.reimb-not-found', 'Reimbursement Item Type could not be found in list.');
		}
	},

	handleChange: function(field, e) {
		var data = this.state.data;

		if (field == 'type_id') {
			if (e.target.value == '') {
				data.type_id = 0;
				this.setState({
					typeInfo: {},
					data: data,
				});
			}
			else {
				this.setItemType(e.target.value);
			}
			return;
		}

		if (e.target.type == 'checkbox') {
			if (e.target.value == '1') {
				data[field] = e.target.checked ? e.target.value : 0;
			}
		}
		else {
			data[field] = e.target.value;
		}
		this.setState({
			data: data,
		}, () => {
			if (field == 'roundtrip') {
				this.computeAddressAmount();
			}
		});
	},

	addressPopulated: function(addr) {
		return addr.address && (addr.city && addr.state || addr.zipcode);
	},

	computeAddressAmount: function() {
		var postData = {
			start: this.state.data.address_start,
			end: this.state.data.address_end,
			patient_id: this.props._patient.id,
			type_id: this.state.typeInfo.id,
			roundtrip: this.state.data.roundtrip,
			study_id: this.props.study_id,
		};

		$.post(_.endpoint('/patients/requests/compute-distance-amount'), postData, function(res) {
			var data = this.state.data;
			if (!_.isUndefined(res.status) && res.status < 2) {
				data.amount = res.amount;
				data.distance = res.distance;
			}
			else {
				data.amount = 0;
				data._distance = 0;
			}
			this.setState({
				data: data,
				autoAmountError: res.error ? res.error : '',
			});
		}.bind(this));
	},

	handleAddress: function(end, fieldName, e) {
		var data = this.state.data;
		data['address_' + end][fieldName] = e.target.value;
		this.setState({
			data: data
		});
	},

	handleAddressCalculation: function(e) {
		e.preventDefault();
		this.computeAddressAmount();
	},

	handleFile: function(files) {
		var data = this.state.data;
		var list = _.map(files, function(file) {
			return file.hash;
		});
		data.files = files;
		data.file_hashes = list;
		this.setState({
			data: data,
		});
		this.props.onValidateRecord(data);
	},

	handleSavedAddressChange: function(end, e) {
		var lid = e.target.value;
		var loc = _.find(this.state.locations, function(l) {
			return l.id == lid;
		});

		if (!loc) {
			loc = _.find(this.state.patient_locations, function(l) {
				return l.id == lid;
			});
		}
		
		var fields = ['address', 'address2', 'city', 'state', 'zipcode'];
		var data = this.state.data;
		$.each(fields, function(i, field) {
			data['address_' + end][field] = e.target.value == '' ? '' : loc[field];
		});

		if (this.addressPopulated(data.address_start) && this.addressPopulated(data.address_end)) {
			this.computeAddressAmount();
		}
		this.setState({
			data: data,
		});
	},

	renderAddress: function(end) {
		const isSaved = this.state.data.id ? true : false;

		// disabled={this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled}
		return (
			<dl className="col-sm-4 form dialog">
				<dt style={{lineHeight: '22px'}} className="heading">{end == 'start' ? Locale.getString('label.start-address', 'Start Address') : Locale.getString('label.end-address', 'End Address')}</dt>

				<dt>{Locale.getString('label.previously-used-address', 'Previously used or saved address')}</dt>
				<dd>
					<select name="patient_address_id" disabled={(this.state.data && this.state.data._prevent_edit) || isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} readOnly={this.state.data._prevent_edit} onChange={this.handleSavedAddressChange.bind(null, end)}>
						<option value="">{Locale.getString('option.select-saved-location', 'Select a Saved Location')}</option>
						<optgroup label={Locale.getString('option.site-addresses', 'Site Addresses')}>
						{_.map(this.state.locations, function(loc) {
							return <option key={loc.id} value={loc.id}>{loc.name} {loc.name ? '-' : ''} {loc.address} {loc.address2} {loc.city}, {loc.state} {loc.zipcode}</option>;
						})}
						</optgroup>
						<optgroup label={Locale.getString('option.my-addresses', 'My Addresses')}>
						{_.map(this.state.patient_locations, function(loc) {
							return <option key={loc.id} value={loc.id}>{loc.name} {loc.name ? '-' : ''} {loc.address} {loc.address2} {loc.city}, {loc.state} {loc.zipcode}</option>;
						})}
						</optgroup>
					</select>
				</dd>

				<dt>{Locale.getString('label.address-line', 'Address Line')} 1</dt>
				<dd>
					<input type="text" disabled={isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} value={this.state.data['address_' + end].address} readOnly={this.state.data._prevent_edit} onChange={this.handleAddress.bind(null, end, 'address')} />
				</dd>
				<dt>{Locale.getString('label.address-line', 'Address Line')} 2</dt>
				<dd>
					<input type="text" disabled={isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} value={this.state.data['address_' + end].address2} readOnly={this.state.data._prevent_edit} onChange={this.handleAddress.bind(null, end, 'address2')} />
				</dd>
				<dt>{Locale.getString('label.city', 'City')}</dt>
				<dd>
					<input type="text" disabled={isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} value={this.state.data['address_' + end].city} readOnly={this.state.data._prevent_edit} onChange={this.handleAddress.bind(null, end, 'city')} />
				</dd>
				<dt>{Locale.getString('title.state', 'State')}</dt>
				<dd>
					<select disabled={(this.state.data && this.state.data._prevent_edit) || isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} value={this.state.data['address_' + end].state} onChange={this.handleAddress.bind(null, end, 'state')}>
						<option value="">{Locale.getString('option.select', 'Select')}...</option>
						{_.map(this.state.states.US, function(name, abbr) {
							return <option key={abbr} value={abbr}>{name}</option>;
						})}
					</select>
				</dd>
				<dt>{Locale.getString('label.zip-postalcode', 'Zip / Postal Code')}</dt>
				<dd>
					<input type="text" disabled={isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} value={this.state.data['address_' + end].zipcode} readOnly={this.state.data._prevent_edit} onChange={this.handleAddress.bind(null, end, 'zipcode')} />
				</dd>
			</dl>
		);
	},

	render: function() {
		var addressBased = parseInt(this.state.typeInfo.address_based) == 1;
		var direct_mileage_entry = parseInt(this.state.typeInfo.direct_mileage_entry) == 1;
		var costPerMile = parseFloat(this.state.typeInfo.cost_per_mile);
		var autoCalculate = addressBased && costPerMile > 0;
		if (this.props._patient._international) {
			var reimbursementTypes = _.filter(this.state.reimbursementTypes, function(rt) {
				return rt.intl == 1;
			});
		}
		else {
			var reimbursementTypes = this.state.reimbursementTypes;
		}
		var required = {};
		if (this.state.data._upload_required == 1) {
			required = <RequiredMarker />;
		}
		if (this.state.data._upload_required == 0) {
			required = null;
		}

		const isSaved = this.state.data.id ? true : false;

		let isTypeDisable = this.state.data._prevent_edit;
		if (this.props.user.type == 'siteuser') {
			isTypeDisable = isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled;
		}

		let canDeleteAttachment = !this.state.data._prevent_edit;
		if (this.props.user.type == 'siteuser') {
			canDeleteAttachment = !(isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled)
		}

		return (
			<div>
				<div className="row form">
					<div className="col-sm-4">
						<select value={this.state.data.type_id} disabled={isTypeDisable} onChange={this.handleChange.bind(null, 'type_id')}>
							<option value="">{Locale.getString('label.select-reimbursement-type', 'Select Reimbursement Type')}</option>
							{_.map(reimbursementTypes, function(record) {
								return <option key={record.id} value={record.id}>{record.name}</option>;
							})}
						</select>
						<ErrorDisplay message={this.props.errors.type_id} />
					</div>
				</div>

				<div className="spacer-10" />

				{!_.isEmpty(this.state.typeInfo) &&
				<div className="row">
					<dl className="form dialog col-sm-4">
						<dt>{Locale.getString('title.amount', 'Amount')} <RequiredMarker /></dt>

						<dd>
							<input type="text" disabled={isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} value={(this.state.data.amount || '') + (autoCalculate && this.state.data._distance > 0 ? ' - ' + this.state.data._distance + ' mile(s)' : '')} readOnly={this.state.data._prevent_edit || autoCalculate} onChange={this.handleChange.bind(null, 'amount')} placeholder={autoCalculate ? Locale.getString('label.auto-calculated', 'Auto Calculated') : ''}/>
							<ErrorDisplay message={this.props.errors.amount} />
							{autoCalculate &&
							<div style={{color: '#090'}}>
								{Locale.getString('label.calculation-message', 'Please select or enter a start and end address to have the amount automatically calculated.')}
							</div>}
							{autoCalculate && this.addressPopulated(this.state.data.address_start) && this.addressPopulated(this.state.data.address_end) &&
							<div><a 
							href="#!" 
							onClick={(e) => {((this.state.data && this.state.data._prevent_edit) || isSaved && this.props.user.type == 'siteuser' && !this.props.isReimbursementDisabled) && this.handleAddressCalculation(e)}} 
							style={{cursor: ((this.state.data && this.state.data._prevent_edit) || isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled) ? 'not-allowed' : 'pointer' }}
							className="button button-action">
								{Locale.getString('label.calculate-reimb-amount', 'Calculate Reimbursement Amount')}
							</a></div>}
							<ErrorDisplay message={this.state.autoAmountError} />
						</dd>

						{(addressBased && direct_mileage_entry && this.props._patient._international) &&
						<span>
							<dt>{Locale.getString('label.km-traveled', 'Km Traveled (one way)')}</dt>
							<dd>
								<input type="text" value={this.state.data.distance} readOnly={this.state.data._prevent_edit} readOnly={this.state.data._prevent_edit} onChange={this.handleChange.bind(null, 'distance')} />
							</dd>
						</span>}

						{(addressBased && direct_mileage_entry && !this.props._patient._international) &&
						<span>
							<dt>{Locale.getString('label.miles-traveled', 'Miles Traveled (one way)')}</dt>
							<dd>
								<input type="text" disabled={isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} value={this.state.data.distance} readOnly={this.state.data._prevent_edit} onChange={this.handleChange.bind(null, 'distance')} />
							</dd>
						</span>}

						<dt>{Locale.getString('label.notes', 'Notes')}</dt>
						<dd>
							<textarea rows="4" disabled={isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} value={this.state.data.notes} readOnly={this.state.data._prevent_edit} onChange={this.handleChange.bind(null, 'notes')} />
							<ErrorDisplay message={this.props.errors.notes} />
						</dd>

						{addressBased &&
						<div>
							<dt>{Locale.getString('label.travel-date', 'Travel Date')}</dt>
							<dd>
								<ClinicalDatePicker showPickerIcon={true}
									value={this.state.data.date_travel}
									onChange={this.handleDateChange.bind(null, 'date_travel')}
									style={{width: '100%'}}
									placeholder={this.props.dateFormatClinical}
									disabled={(this.state.data && this.state.data._prevent_edit) || isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} />
							</dd>
							<dt>{Locale.getString('label.round-trip', 'Round Trip')}</dt>
							<dd>
								<label>
									<input type="checkbox" disabled={(this.state.data && this.state.data._prevent_edit) || isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled} value={1} checked={parseInt(this.state.data.roundtrip) === 1} onChange={this.handleChange.bind(null, 'roundtrip')} />
									{' '}
									{Locale.getString('label.this-is-round-trip', 'This is a round trip')}
								</label>
							</dd>
						</div>}

						<dt>{Locale.getString('label.attachements', 'Attachements')} {required}</dt>
						<dd className="item-files">
							<FileManager
								{...this.props}
								disabled={(this.state.data && this.state.data._prevent_edit) || isSaved && this.props.user.type == 'siteuser' && this.props.isReimbursementDisabled}
								onChange={this.handleFile}
								initialFiles={this.state.data.files}
								style={{width: '100%', display: 'block'}}
								canDelete={canDeleteAttachment}
								uploadUrl="/patients/requests/upload"
								downloadUrl="/patients/requests/download"
							/>
							<ErrorDisplay message={this.props.errors.files} />
						</dd>
					</dl>
					{addressBased &&
					this.renderAddress('start')}

					{addressBased &&
					this.renderAddress('end')}
				</div>}
			</div>
		);
	}

});
