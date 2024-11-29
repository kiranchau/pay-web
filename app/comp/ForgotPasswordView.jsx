const {Locale} = RTBundle;

var ForgotPasswordView = React.createClass({

	getInitialState: function() {
		return {
			emailaddress: '',
			message: '',
			resetcode: '',
		};
	},

	handleChange: function(e) {
		var ns = {};
		ns[e.target.name] = e.target.value;
		this.setState(ns);
	},

	handleSubmit: function(e) {
		e.preventDefault();

		$.post(_.endpoint('/forgot-password'), { emailaddress: this.state.emailaddress }, function(res) {
			if (!_.isUndefined(res.status) && res.status < 2) {
				this.setState({
					emailaddress: '',
					message: res.message,
					error: '',
				});
			}
			else {
				this.setState({
					error: res.error,
					message: '',
				});
			}
		}.bind(this));
	},

	handleVerification: function(e) {
		e.preventDefault();

		$.post(_.endpoint('/verify-reset'), {resetcode: this.state.resetcode}, function(res) {
			if (!_.isUndefined(res.status) && res.status < 2) {
				var cache = this.props.cache;
				cache.resetcode = this.state.resetcode;
				this.props.navigate(ResetPasswordView, {
					cache: cache,
				});
			}
			else {
				this.setState({
					error: res.error,
				});
			}
		}.bind(this));
	},

    navigate: function(comp) {
        this.props.navigate(comp);
    },

	render: function() {
		return (
			<div className="page alt-bg">
				{this.state.message === '' &&
				<form action="" method="post" className="content thin-form" onSubmit={this.handleSubmit}>
					<dl className="form">
						<dt><label htmlFor="emailaddress">{Locale.getString('label.emailaddress', 'Email Address')}</label></dt>
						<dd>
							<input id="emailaddress" name="emailaddress" type="email" value={this.state.emailaddress} onChange={this.handleChange} maxLength="200" style={{width: 380}} placeholder="" autofocus />
							{this.state.error &&
							<p className="error">{this.state.error}</p>}
						</dd>

						<dt></dt>
						<dd><input type="submit" value={Locale.getString('link.initiate-password-reset', 'Initiate Password Reset')} /></dd>
						<dt></dt>
						<dd>
							<a href="#!" onClick={this.navigate.bind(null, LoginView)}>&larr; {Locale.getString('link.return-to-signin', 'Return to Sign In')}</a>
						</dd>
					</dl>
				</form>}

				{this.state.message.length > 0 &&
				<form action="" method="post" className="content thin-form" onSubmit={this.handleVerification}>
					<dl className="form">
						<dt></dt>
						<dd>
							<p>{this.state.message}</p>
						</dd>
						<dt></dt>
						<dd>
							<a href="#!" onClick={this.navigate.bind(null, LoginView)}>&larr; {Locale.getString('link.return-to-signin', 'Return to Sign In')}</a>
						</dd>
					</dl>
				</form>}
			</div>
		);
	}

});
