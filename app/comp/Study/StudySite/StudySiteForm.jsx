const {Locale} = RTBundle;

var StudySiteForm = React.createClass({

	getDefaultProps: function() {
		return {
			errors: {},
			data: {},
			countries: [],
			timezones: [],
			languages: [],
			enable_ous: false,
		};
	},

	getInitialState: function() {
		var data = this.props.data;
		if (!data._sites) {
			data._sites = {};
		}
		if(!this.props.enable_ous) {
			data.payment_method = 'card';
			data.default_currency = 144;
		}
		return {
			data: data,
			countries: this.props.countries,
			states: this.props.states,
			timezones: this.props.timezones,
			currencies: {},
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
		$.get(_.endpoint('/currencies'), {active: 1}, function(res) {
			this.setState({
				currencies: res.currencies,
			});
		}.bind(this));

		$.get(_.endpoint('/languages'), function(res) {
			if (res.records) {
				const data = this.state.data;

				let countryLang = _.filter(this.state.countries, country => {
					return country.code == this.state.data.country;
				})
				countryLang = countryLang[0] ? countryLang[0].lang : null;
				data.lang = countryLang || null;
	
				this.setState({
					languages: res.records,
					data
				});
			}
		}.bind(this));
	},

	handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handleCountryChange: function(e) {
		const key = e.target.name;
		const val = e.target.value;
		var data = this.state.data;
		data[key] = val;

		let countryLang = _.filter(this.state.countries, country => {
			return country.code == val;
		})
		countryLang = countryLang[0] ? countryLang[0].lang : null;
		data.lang = countryLang;

		this.setState({
			data: data,
		}, () => {this.setup.bind(null, key, val); if(this.state.currentPrefView == 'travel'){this.handleShowTravel();}});
	},

	handleChecked: function(e) {
		this.setField(e.target.name, e.target.checked ? 1 : 0);
	},

	render: function() {
		var enableOUS = this.props.enable_ous;
		var defaultCountry = this.state.data.country;
		var showStateDropdown = defaultCountry && !_.isUndefined(this.state.states[defaultCountry]);

		return (
			<div className="row study-site-form">
				<dl className="form dialog col-md-6">
					<dt>{Locale.getString('title.site-name', 'Site Name')} <RequiredMarker /></dt>
					<dd>
						<input name="name" type="text" value={this.state.data.name} onChange={this.handleChange} />
						<ErrorDisplay message={this.props.errors.name} />
					</dd>

					<dt>{Locale.getString('label.country', 'Country')} <RequiredMarker/></dt>
					<dd>
						<select name="country" value={this.state.data.country} onChange={this.handleCountryChange}>
							<option value="">{Locale.getString('title.select-country', 'Select Country')}...</option>
							{_.map(this.state.countries, function(country) {
								return <option key={country.code} value={country.code}>{country.name}</option>;
							})}
						</select>
						<ErrorDisplay message={this.props.errors.country} />
					</dd>

					<dt>{Locale.getString('label.language', 'Language')}</dt>
					<dd>
						<select name="lang" value={this.state.data.lang} onChange={this.handleChange}>
							<option value="">{Locale.getString('option.select-language', 'Select Language')}...</option>
							{_.map(this.state.languages, function(language) {
								return <option key={language.code} value={language.code}>{language.name}</option>;
							}, this)}
						</select>
					</dd>

					<dt>{Locale.getString('label.address-line', 'Address Line')} 1</dt>
					<dd>
						<input name="address" type="text" value={this.state.data.address} onChange={this.handleChange} />
					</dd>
					<dt>{Locale.getString('label.address-line', 'Address Line')} 2</dt>
					<dd>
						<input name="address2" type="text" value={this.state.data.address2} onChange={this.handleChange} />
					</dd>
					<dt>{Locale.getString('label.city', 'City')}</dt>
					<dd>
						<input name="city" type="text" value={this.state.data.city} onChange={this.handleChange} />
					</dd>

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
					</dd>
					<dt>{Locale.getString('label.postal-code', 'Postal Code')}</dt>
					<dd>
						<input name="zipcode" type="text" value={this.state.data.zipcode} onChange={this.handleChange} />
					</dd>
				</dl>

				<dl className="form dialog col-md-6">
					<dt>{Locale.getString('label.email-address', 'Email Address')}</dt>
					<dd>
						<input name="emailaddress" type="text" value={this.state.data.emailaddress} onChange={this.handleChange} />
						<ErrorDisplay message={this.props.errors.emailaddress} />
					</dd>
					<dt>{Locale.getString('label.phone', 'Phone')}</dt>
					<dd>
						<input name="phone" type="text" value={this.state.data.phone} onChange={this.handleChange} />
					</dd>
					<dt>{Locale.getString('title.fax', 'Fax')}</dt>
					<dd>
						<input name="fax" type="text" value={this.state.data.fax} onChange={this.handleChange} />
					</dd>
					<dt>{Locale.getString('label.timezone', 'Timezone')}</dt>
					<dd>
						<select name="timezone" value={this.state.data.timezone} onChange={this.handleChange}>
							<option value="">{Locale.getString('option.select-timezone', 'Select Timezone')}...</option>
							{_.map(this.state.timezones, function(tz) {
								return <option key={tz} value={tz}>{tz}</option>;
							})}
						</select>
					</dd>

					{enableOUS &&
					<div>
						<dt>{Locale.getString('label.default-currency', 'Default Currency')} <RequiredMarker /></dt>
						<dd>
							<select name="default_currency" value={this.state.data.default_currency} onChange={this.handleChange}>
								<option value="">{Locale.getString('label.currency', 'Currency')}</option>
								{_.map(this.state.currencies, function(currency) {
								return <option key={currency.id} value={currency.id}>{currency.code} - {currency.name}</option>;
							})}
							</select>
							<ErrorDisplay message={this.props.errors.default_currency} />
						</dd>

						<dt>{Locale.getString('label.site-payment-method', 'Site Payment Method')}</dt>
						<dd>
							<select name="payment_method" onChange={this.handleChange} value={this.state.data.payment_method}>
								<option value="">{Locale.getString('option.select-method', 'Select Method')}</option>
								<option value="bank">{Locale.getString('option.direct-deposit', 'Direct Deposit')}</option>
								<option value="card">{Locale.getString('option.pay-card', 'PAY Card')}</option>
							</select>
						</dd>
					</div>}

					<dt>{Locale.getString('label.site-status', 'Site Status')}</dt>
					<dd>
						<select name="status" onChange={this.handleChange} value={this.state.data.status}>
							<option value="0">{Locale.getString('option.active', 'Active')}</option>
							<option value="1">{Locale.getString('option.inactive', 'inactive')}</option>
						</select>
					</dd>

				</dl>
			</div>
		);
	}
});

