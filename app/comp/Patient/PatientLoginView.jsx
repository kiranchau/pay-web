const {Locale} = RTBundle;

var PatientLoginView = React.createClass({

	getInitialState: function() {
		return {
			emailaddress: '',
			password: '',
			code: '',
			error: {},
		};
	},

	handleChange: function(e) {
		var ns = {};
		ns[e.target.name] = e.target.value;
		this.setState(ns);
	},

	handleLogin: function(e) {
		e.preventDefault();

		var data = {
			emailaddress: this.state.emailaddress,
			password: this.state.password,
			code: this.state.code
		};

		$.post(_.endpoint('/patients/signin'), data, function(res) {
			if (!_.isUndefined(res.status) && res.status < 2) {
				this.props.navigate(PatientDashboardView);
				this.props.setGlobalState({
					patient: res.patient,
				});
			}
			else {
				this.setState({
					error: res.error,
				});
			}
		}.bind(this));
	},

	render: function() {
		return (
			<div className="page alt-bg">
				<form action="" method="post" className="content thin-form" onSubmit={this.handleLogin}>
					<dl className="form">
						<dt><label htmlFor="emailaddress">{Locale.getString('label.email-address', 'Email Address')}</label></dt>
						<dd>
							<input id="emailaddress" name="emailaddress" type="email" value={this.state.emailaddress} onChange={this.handleChange} maxLength="100" placeholder="" autofocus />
							<ErrorDisplay message={this.state.errors.emailaddress} />
						</dd>
						<dt><label htmlFor="password">{Locale.getString('label.password', 'Password')}</label></dt>
						<dd>
							<input id="password" name="password" type="password" value={this.state.password} onChange={this.handleChange} />
							<ErrorDisplay message={this.state.errors.password} />
						</dd>

						<dt></dt>
						<dd><input type="submit" value="Sign In" /></dd>
						<dt></dt>
						<dd>
							<a href="#!" onClick={this.props.navigate.bind(null, ForgotPasswordView)}>{Locale.getString('message.forgot-password', 'I forgot my password.')}</a>
						</dd>
					</dl>
				</form>
			</div>
		);
	}

});

