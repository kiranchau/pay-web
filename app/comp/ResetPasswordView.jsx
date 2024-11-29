const {Locale} = RTBundle;

var ResetPasswordView = React.createClass({

	getInitialState: function() {
		return {
			password: '',
			_password: '',
			message: '',
			errors: {},
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
			resetcode: this.props.cache.code,
			password: this.state.password,
			_password: this.state._password,
		};

		$.post(_.endpoint('/reset-password'), data, function(res) {
			if (!_.isUndefined(res.status) && res.status < 2) {
				this.setState({
					password: '',
					_password: '',
					message: res.message,
				});
				var cache = this.props.cache;
				delete cache.resetcode;
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

	render: function() {
		return (
			<div className="page alt-bg">
				{this.state.message === '' &&
				<form action="" method="post" className="content thin-form" onSubmit={this.handleSubmit}>
					<dl className="form">
						<dt>{Locale.getString('label.new-password', 'New Password')}</dt>
						<dd>
							<input name="password" type="password" value={this.state.password} onChange={this.handleChange} style={{width: 380}} placeholder="" autofocus />
							<p className="note">{Locale.getString('note.password-specifications-message', 'Passwords must be at least 10 characters containing at least one upper case characters, one digit, and one special character.')}</p>
							{this.state.errors.password &&
							<p className="error">{this.state.errors.password}</p>}
						</dd>

						<dt>{Locale.getString('label.confirm-new-password', 'Confirm New Password')}</dt>
						<dd>
							<input name="_password" type="password" value={this.state._password} onChange={this.handleChange} style={{width: 380}} />
							{this.state.errors._password &&
							<p className="error">{this.state.errors._password}</p>}
						</dd>

						<dt></dt>
						<dd><input type="submit" value={Locale.getString('title.save-new-password', 'Save New Password')} /></dd>
						<dt></dt>
						<dd>
							<a href="#!" onClick={this.props.navigate.bind(null, LoginView)}>&larr; {Locale.getString('link.cancel-return-signin', 'cancel and return Sign In')}</a>
						</dd>
					</dl>
				</form>}
			</div>
		);
	}

});
