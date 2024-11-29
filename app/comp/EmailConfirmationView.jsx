const {Locale} = RTBundle;

var EmailConfirmationView = React.createClass({

	getInitialState: function() {
		return {
			pending: true,
			status: 2,
			message: '',
		};
	},

	componentDidMount: function() {
		var params = _.jsonFromUrl();
		$.post(_.endpoint('/accounts/email/confirm'), params, function(res) {
			this.setState({
				status: res.status,
				message: res.message,
				pending: false,
			});
		}.bind(this));
	},

	render: function() {
		return (
			<div className="page">
				<div className="content thin-form">
					{this.state.pending &&
					<div>
						<i className="fa fa-spin fa-spinner" style={{fontSize: 140}} />
						<p style={{paddingTop: 30}}>{Locale.getString('label.verifying-email', 'Verifying email address')}...</p>
					</div>}

					{!this.state.pending && this.state.status == 2 &&
					<div>{this.state.message}</div>}

					{!this.state.pending && this.state.status < 2 &&
					<div>
						<div style={{paddingBottom: 40, textAlign: 'center'}}><i className="fa fa-check" style={{fontSize: 140, color: '#090'}} /></div>
						{this.state.message}
					</div>}
				</div>
			</div>
		);
	}

});
