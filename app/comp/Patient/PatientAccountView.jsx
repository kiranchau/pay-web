const {Locale} = RTBundle;

var PatientAccountView = React.createClass({

	mixins: [SettingsMixin],

	getDefaultProps: function() {
		return {
			errors: {},
		};
	},

	getInitialState: function() {
		return {
			data: {},
			dialog: null,
			states: {},
			countries: {},
			timezones: {},
			saved: false,
			errors: {},
			showSSN: false,
		};
	},

	componentDidMount: function() {

		$.get(_.endpoint('/patients/info'), function(res) {
			this.setState({
				data: res.record,
			});
		}.bind(this));

		$.get(_.endpoint('/settings?ver=2'), function(res) {
			this.setState({
				countries: res.countries,
				states: res.states,
			});
		}.bind(this));
	},

	handleCloseDialog: function() {
		this.setState({
			dialog: null,
		});
	},

	handleSavePassword: function(passwordData) {
		var buttons = (
			<span>
				<button type="button" onClick={this.handleCloseDialog}>{Locale.getString('button.cancel', 'Cancel')}</button>
				<button type="button" onClick={this.handleSavePassword.bind(null, passwordData)} style={{color: '#fff', background: _.primaryBrandColor()}}>{Locale.getString('button.save', 'Save')}</button>
			</span>
		);
		$.post(_.endpoint('/accounts/password'), passwordData, function(res) {
			if (res.status === 0) {
				this.setState({
					dialog: (
						<Dialog title={Locale.getString('title.password-saved', 'Password Saved')} width={400} onClose={this.handleCloseDialog} buttons={<button type="button" onClick={this.handleCloseDialog}>{Locale.getString('label.okay', 'Okay')}</button>}>
							<p>{Locale.getString('message.pass-saved', 'Your password has been successfully saved.')}</p>
						</Dialog>
					)
				});
			}
			else {
				this.setState({
					dialog: (
						<Dialog title={Locale.getString('title.change-account-password', 'Change Account Password')} width={400} onClose={this.handleCloseDialog} buttons={buttons}>
							<PatientChangePasswordForm data={passwordData} errors={res.errors} />
						</Dialog>
					)
				});
			}
		}.bind(this));
	},

	handleChangePassword: function(e) {
		e.preventDefault();

		var passwordData = {};

		var buttons = (
			<span>
				<button type="button" onClick={this.handleCloseDialog}>Cancel</button>
				<button type="button" onClick={this.handleSavePassword.bind(null, passwordData)} style={{color: '#fff', background: _.primaryBrandColor()}}>{Locale.getString('button.save', 'Save')}</button>
			</span>
		);

		this.setState({
			dialog: (
				<Dialog title={Locale.getString('title.change-account-password', 'Change Account Password')} width={400} onClose={this.handleCloseDialog} buttons={buttons}>
					<PatientChangePasswordForm data={passwordData} />
				</Dialog>
			)
		});
	},

	handleSubmit: function(e) {
		e.preventDefault();

		$.post(_.endpoint('/patients/info'), this.state.data, function(res) {
			if (res.status < 2) {
				this.setState({
					dialog: (
						<Dialog title={Locale.getString('title.profile-saved', 'Profile Saved')} width={400} onClose={this.handleCloseDialog} buttons={<button type="button" onClick={this.handleCloseDialog}>{Locale.getString('label.okay', 'Label')}</button>}>
							<p>{Locale.getString('message.profile-saved', 'Your profile has been successfully saved.')}</p>
						</Dialog>
					),
					errors: {},
				});
			}
			else {
				this.setState({
					errors: res.errors,
				});
			}
		}.bind(this));
	},

	handleChange: function(field, e) {
		var data = this.state.data;
		data[field] = e.target.value;

		this.setState({
			data: data,
		});
	},

	toggleSSN: function(e) {
		var bool = this.state.showSSN;
		var bool = !bool;
		this.setState({
			showSSN: bool,
		});
	},

	render: function() {
		var showStateDropdown = !_.isUndefined(this.state.states[this.state.data.country]);
		var showSSN = false;
		if(this.state.data.study) {
			if(this.state.data.study.visit_stipends == 1) {
				showSSN = true;
			}
		}
		try {
		return (
			<div className="page">
				{this.state.dialog}
				<form onSubmit={this.handleSubmit} className="row">
					<dl className="col-md-6 form dialog">
						<dt>{Locale.getString('label.first-name', 'First Name')}</dt>
						<dd>
							<input type="text" readOnly={true} value={this.state.data.firstname} className="readonly" />
						</dd>
						<dt>{Locale.getString('label.last-name', 'Last Name')}</dt>
						<dd>
							<input type="text" readOnly={true} value={this.state.data.lastname} className="readonly" />
						</dd>
						<dt>{Locale.getString('label.address-line', 'Address Line')} 1</dt>
						<dd>
							<input type="text" value={this.state.data.address} onChange={this.handleChange.bind(null, 'address')} />
						</dd>
						<dt>{Locale.getString('label.address-line', 'Address Line')} 2</dt>
						<dd>
							<input type="text" value={this.state.data.address2} onChange={this.handleChange.bind(null, 'address2')} />
						</dd>
						<dt>{Locale.getString('label.city', 'City')}</dt>
						<dd>
							<input type="text" value={this.state.data.city} onChange={this.handleChange.bind(null, 'city')} />
						</dd>

						<dt>{Locale.getString('label.country', 'Country')}</dt>
						<dd>
							<select value={this.state.data.country} onChange={this.handleChange.bind(null, 'country')}>
								<option value="">{Locale.getString('title.select-country', 'Select Country')}...</option>
								{_.map(this.state.countries, function(country) {
									return <option key={country.code} value={country.code}>{country.name}</option>;
								}, this)}
							</select>
							<ErrorDisplay message={this.state.errors.country} />
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
							<ErrorDisplay message={this.state.errors.state} />
						</dd>

						<dt>{Locale.getString('label.zip-postalcode', 'Zip / Postal Code')}</dt>
						<dd>
							<input type="text" value={this.state.data.zipcode} onChange={this.handleChange.bind(null, 'zipcode')} />
						</dd>
					</dl>

					<dl className="col-md-6 form dialog">
						{showSSN &&
						<dt>{Locale.getString('label.ssn-national-identifier', 'SSN / National Identifier')}</dt>}
						{showSSN &&
						<dd>
							{this.state.showSSN == false &&
							<input type="password" value={this.state.data.ssn} onChange={this.handleChange.bind(null, 'ssn')} />}
							{this.state.showSSN == true &&
							<input type="text" value={this.state.data.ssn} onChange={this.handleChange.bind(null, 'ssn')} />}
						 <a href="#!" onClick={this.toggleSSN}>{Locale.getString('label.show-hide', 'Show/Hide')}</a>
						</dd>}
						<dt>{Locale.getString('label.email-address', 'Email Address')}</dt>
						<dd>
							<input type="text" value={this.state.data.emailaddress} onChange={this.handleChange.bind(null, 'emailaddress')} />
						</dd>
						<dt>{Locale.getString('label.mobile-phone', 'Mobile Phone')}</dt>
						<dd>
							<input type="text" value={this.state.data.phone_mobile} onChange={this.handleChange.bind(null, 'phone_mobile')} />
							{this.state.errors &&
							<ErrorDisplay message={this.state.errors.phone_mobile} />}
						</dd>
						<dd>{Locale.getString('message.change-mobile', 'Changing your mobile phone or email address will require verification.')}</dd>
						<dt>{Locale.getString('label.home-phone', 'Home Phone')}</dt>
						<dd>
							<input type="text" value={this.state.data.phone_home} onChange={this.handleChange.bind(null, 'phone_home')} />
						</dd>

						<dt>{Locale.getString('label.password', 'Password')}</dt>
						<dd>
							<a href="#!" onClick={this.handleChangePassword}>{Locale.getString('link.change-password', 'Change Password')}</a>
						</dd>
					</dl>

					<dl className="col-md-12 form dialog">
						<dd><input type="submit" value={Locale.getString('button.save-info', 'Save Info')} className="btn btn-primary btn-block" style={{backgroundColor: _.primaryBrandColor(), color: '#fff', padding: 15}} /></dd>
					</dl>
				</form>
			</div>
		);
		}
		catch (e) {
			console.log(e);
		}
	}

});

