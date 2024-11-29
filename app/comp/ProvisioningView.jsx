const {Locale} = RTBundle;

var ProvisioningView = React.createClass({

	getInitialState: function() {
		return {
			password: '',
			_password: '',
			message: '',
			errors: {},
			status: 5,
		};
	},

	handleChange: function(e) {
		var ns = {};
		ns[e.target.name] = e.target.value;
		this.setState(ns);
	},

	handleSubmit: function(e) {
		e.preventDefault();

		var data = {
			reset_code: this.props.cache.code,
			password: this.state.password,
			_password: this.state._password,
		};

		$.post(_.endpoint('/accounts/provision/password'), data, function(res) {
			if (!_.isUndefined(res.status) && res.status < 2) {
				this.setState({
					password: '',
					_password: '',
					message: res.message,
					status: res.status,
				});

				var cache = this.props.cache;
				delete cache.code;
				this.props.navigate(LoginView, {
					cache: cache,
				});
			}
			else {
				this.setState({
					errors: res.errors,
					message: '',
				});
			}
		}.bind(this));
	},

	componentDidMount: function() {
		$.post(_.endpoint('/accounts/provision'), {code: this.props.cache.code}, function(res) {
			this.setState({
				message: res.message,
				errors: res.errors,
				status: res.status,
			});
		}.bind(this));
	},

	render: function() {
		return (
			<div className="page alt-bg">
				{this.state.message === '' &&
				<form action="" method="post" className="content thin-form" onSubmit={this.handleSubmit}>
					<dl className="form">
						<dt>{Locale.getString('label.new-password', 'New Password')}</dt>
						<dd>
							<input name="password" type="password" value={this.state.password} onChange={this.handleChange} style={{width: '100%'}} placeholder="" autofocus />
							{this.state.errors.password &&
							<p className="error">{this.state.errors.password}</p>}
							<p className="note">{Locale.getString('note.password-specifications-message', 'Passwords must be at least 10 characters containing at least one upper case characters, one digit, and one special character.')}</p>
						</dd>

						<dt>{Locale.getString('label.confirm-new-password', 'Confirm New Password')}</dt>
						<dd>
							<input name="_password" type="password" value={this.state._password} onChange={this.handleChange} style={{width: '100%'}} />
							{this.state.errors._password &&
							<p className="error">{this.state.errors._password}</p>}
						</dd>

						<dt></dt>
						<dd><input type="submit" value="Save New Password" /></dd>
						<dt></dt>
						{false && <dd>
							<a href="#!" onClick={this.props.navigate.bind(null, LoginView)}>&larr; {Locale.getString('link.cancel-return-signin', 'cancel and return Sign In')}</a>
						</dd>}
					</dl>
				</form>}

				{this.state.status === 0 && this.state.message &&
				<div style={{padding: 10, background: '#080', color: '#fff', borderRadius: 3}}>{this.state.message}
					<a href="#!" onClick={this.handleLoginLink}>{Locale.getString('link.proceed-signin', 'Please proceed to Sign In here')} &rarr;</a>
				</div>}

				{this.state.message && this.state.status !== 0 &&
				<p>{this.state.message}</p>}
			</div>
		);
	}

});

