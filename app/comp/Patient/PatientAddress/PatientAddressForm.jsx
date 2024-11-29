const {Locale} = RTBundle;

var PatientAddressForm = React.createClass({

	getDefaultProps: function() {
		return {
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

	componentDidMount: function() {
		$.get(_.endpoint('/settings?ver=2'), function(res) {
			this.setState({
				countries: res.countries,
				states: res.states,
			});
		}.bind(this));
	},

	handleChange: function(field, e) {
		var data = this.state.data;
		data[field] = e.target.value;
		this.setState({
			data: data,
		});
	},

	render: function() {
		var showStateDropdown = !_.isUndefined(this.state.states[this.state.data.country]);

		return (
			<div className="row">
				<dl className="col-md-6 col-md-offset-3 form dialog">
					<dt>{Locale.getString('label.name', 'Name')}</dt>
					<dd>
						<input type="text" value={this.state.data.name} onChange={this.handleChange.bind(null, 'name')} />
					</dd>

					<dt>{Locale.getString('label.address-line', 'Address Line')} 1</dt>
					<dd>
						<input type="text" value={this.state.data.address} onChange={this.handleChange.bind(null, 'address')} />
						<ErrorDisplay message={this.props.errors.address} />
					</dd>

					<dt>{Locale.getString('label.address-line', 'Address Line')} 2</dt>
					<dd>
						<input type="text" value={this.state.data.address2} onChange={this.handleChange.bind(null, 'address2')} />
					</dd>

					<dt>{Locale.getString('label.city', 'City')} </dt>
					<dd>
						<input type="text" value={this.state.data.city} onChange={this.handleChange.bind(null, 'city')} />
						<ErrorDisplay message={this.props.errors.city} />
					</dd>

					<dt>{Locale.getString('label.country', 'Country')} </dt>
					<dd>
						<select value={this.state.data.country} onChange={this.handleChange.bind(null, 'country')}>
							<option value="">{Locale.getString('title.select-country', 'Select Country')} ...</option>
							{_.map(this.state.countries, function(country) {
								return <option key={country.code} value={country.code}>{country.name}</option>;
							}, this)}
						</select>
						<ErrorDisplay message={this.props.errors.country} />
					</dd>

					<dt>{Locale.getString('title.state', 'State')}</dt>
					<dd>
						{showStateDropdown &&
						<select value={this.state.data.state} onChange={this.handleChange.bind(null, 'state')}>
							<option value="">{Locale.getString('option.select', 'Select')}...</option>
							{_.map(this.state.states[this.state.data.country], function(name, abbr) {
								return <option key={abbr} value={abbr}>{name}</option>;
							})}
						</select>}

						{!showStateDropdown &&
						<input type="text" value={this.state.data.state} onChange={this.handleChange.bind(null, 'state')} />}
						<ErrorDisplay message={this.props.errors.state} />
					</dd>

					<dt>{Locale.getString('label.zip-postalcode', 'Zip / Postal Code')}</dt>
					<dd>
						<input type="text" value={this.state.data.zipcode} onChange={this.handleChange.bind(null, 'zipcode')} />
					</dd>
				</dl>
			</div>
		);
	}
});
