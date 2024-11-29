const {Locale} = RTBundle;

var LoginView = React.createClass({

	getInitialState: function() {
		return {
			emailaddress: '',
			password: '',
			code: '',
			errors: {},
			errorNotification: false,
		};
	},

	handleChange: function(e) {
		var ns = {};
		ns[e.target.name] = e.target.value;
		this.setState(ns);
	},

	updateLocale: function(locale) {
		Locale.setLocale(locale);
	},

	handleLogin: function(e) {
		e.preventDefault();

		var data = {
			emailaddress: this.state.emailaddress,
			password: this.state.password,
			code: this.state.code
		};

		if (this.props.loginType == 'default')
			data._type = 'E';
		else
			data._type = 'C';

		$.post(_.endpoint('/signin'), data, function(res) {
			if (!_.isUndefined(res.status) && res.status < 2) {
				if (_.isUndefined(res.user._type)) {
					this.updateLocale(res.user.lang);
					this.props.setGlobalState({
						user: res.user,
					}, () => {this.props.navigate(DashboardView, null, this.props.navigateToPrevView)});
				}
				else if (res.user._type == 'patient') {
					this.props.setGlobalState({
						user: res.user,
					}, () => {this.props.navigate(PatientDashboardView, null, this.props.navigateToPrevView)});

					
				}
			}
			else if (res.errors && !res.errors.password && res.errors.password_expired) {
				alert(`Your password is expired. Please enter your e-mail address to begin a password reset.`);
				this.navigate(ForgotPasswordView);
			}
			else {
				this.setState({
					errors: res.errors,
					errorNotification: true,
				});

				setTimeout(function() {
					if (this.isMounted()) {
						this.setState({
							errorNotification: false,
						});
					}
				}.bind(this), 2000);
			}
		}.bind(this));
	},

    navigate: function(comp) {
        this.props.navigate(comp);
    },

	render: function() {
		return (
			<div className="page alt-bg">
				<form action="" method="post" className={'content thin-form' + (this.state.errorNotification ? ' shake-animation' : '')} onSubmit={this.handleLogin}>
					{this.props.loginType == 'default' &&
					<dl className="form">
						<dt><label htmlFor="emailaddress">{Locale.getString('label.email-address', 'Email Address')}</label></dt>
						<dd>
							<input id="emailaddress" name="emailaddress" type="email" value={this.state.emailaddress} onChange={this.handleChange} maxLength="100" placeholder="" autoFocus={true} />
							<ErrorDisplay message={this.state.errors.emailaddress} />
						</dd>
						<dt><label htmlFor="password">{Locale.getString('label.password', 'Password')}</label></dt>
						<dd>
							<input id="password" name="password" type="password" value={this.state.password} onChange={this.handleChange} />
							<ErrorDisplay message={this.state.errors.password} />
						</dd>

						<dt></dt>
						<dd><input type="submit" value={Locale.getString('button.signin', 'Sign In')} /></dd>
						<dt></dt>
						<dd>
							<a href="#!" onClick={this.navigate.bind(null, ForgotPasswordView)}>{Locale.getString('message.forgot-password', 'I forgot my password')}</a>
						</dd>
					</dl>}

					{this.props.loginType == 'code' &&
					<dl className="form">
						<dt><label htmlFor="accesscode">{Locale.getString('message.access-code', 'Access Code')}</label></dt>
						<dd>
							<input id="accesscode" name="code" type="password" value={this.state.code} onChange={this.handleChange} maxLength="100" placeholder="Your private access code" autoFocus />
							<ErrorDisplay message={this.state.errors.code} />
							<ErrorDisplay message={this.state.errors.generic} />
						</dd>

						<dt></dt>
						<dd><input type="submit" value="Enter" /></dd>
					</dl>}
					
				</form>
			</div>
		);
	}

});
