const {Locale} = RTBundle;

var StudySiteLocationForm = React.createClass({

	getDefaultProps: function() {
		return {
			errors: {},
			data: {},
		};
	},

	getInitialState: function() {
		return {
			data: this.props.data,
			countries: {},
			states: {},
			timezones: {},
		};
	},

	setField: function(key, val) {
		var data = this.state.data;
		data[key] = val;
		this.setState({
			data: data,
		});
	},

	componentDidMount: function() {
		$.get(_.endpoint('/settings?ver=2'), function(res) {
			this.setState({
				countries: res.countries,
				states: res.states,
				timezones: res.timezones,
			});
		}.bind(this));
	},

	handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handleChecked: function(e) {
		this.setField(e.target.name, e.target.checked ? 1 : 0);
	},

	render: function() {
		var defaultCountry = this.state.data.country;
		var showStateDropdown = defaultCountry && !_.isUndefined(this.state.states[defaultCountry]);

		var showProvince = true;
		var showPostalCode = true;
		if (this.state.data.country) {
			var country = _.find(this.state.countries, function(o) {
				return o.code == this.state.data.country;
			}, this);

			if (country && country.state_enabled == 0) {
				showProvince = false;
			}
			if (country && country.zipcode_enabled == 0) {
				showPostalCode = false;
			}
		}
		return (
			<div className="row">
				<div className="col-md-3" />
				<dl className="form dialog col-md-6">
					<dd>{Locale.getString('message.all-fields-required', 'All fields are required.')}</dd>
					<dt>{Locale.getString('label.location-name', 'Location Name')}</dt>
					<dd>
						<input name="name" type="text" value={this.state.data.name} onChange={this.handleChange} />
						<ErrorDisplay message={this.props.errors.name} />
					</dd>
					<dt>{Locale.getString('label.address-line', 'Address Line')} 1</dt>
					<dd>
						<input name="address" type="text" value={this.state.data.address} onChange={this.handleChange} />
						<ErrorDisplay message={this.props.errors.address} />
					</dd>
					<dt>{Locale.getString('label.address-line', 'Address Line')} 2</dt>
					<dd>
						<input name="address2" type="text" value={this.state.data.address2} onChange={this.handleChange} />
						<ErrorDisplay message={this.props.errors.address2} />
					</dd>
					<dt>{Locale.getString('label.city', 'City')}</dt>
					<dd>
						<input name="city" type="text" value={this.state.data.city} onChange={this.handleChange} />
						<ErrorDisplay message={this.props.errors.city} />
					</dd>

					<dt>{Locale.getString('label.country', 'Country')}</dt>
					<dd>
						<select name="country" value={this.state.data.country} onChange={this.handleChange}>
							<option value="">{Locale.getString('title.select-country', 'Select Country')}...</option>
							{_.map(this.state.countries, function(country) {
								return <option key={country.code} value={country.code}>{country.name}</option>;
							}, this)}
						</select>
						<ErrorDisplay message={this.props.errors.country} />
					</dd>

					{showProvince &&
					<div>
						<dt>{Locale.getString('label.state-region-province', 'State / Region / Province')}</dt>
						<dd>
							{showStateDropdown &&
							<select name="state" value={this.state.data.state} onChange={this.handleChange}>
								<option value="">{Locale.getString('option.select', 'Select')}...</option>
								{_.map(this.state.states[defaultCountry], function(name, abbr) {
									return <option key={abbr} value={abbr}>{name}</option>;
								})}
							</select>}

							{!showStateDropdown &&
							<input name="state" type="text" value={this.state.data.state} onChange={this.handleChange} />}
							<ErrorDisplay message={this.props.errors.state} />
						</dd>
					</div>}

					{showPostalCode &&
					<div>
						<dt>{Locale.getString('label.postal-code', 'Postal Code')}</dt>
						<dd>
							<input name="zipcode" type="text" value={this.state.data.zipcode} onChange={this.handleChange} />
							<ErrorDisplay message={this.props.errors.zipcode} />
						</dd>
					</div>}

				</dl>
			</div>
		);
	}
});

