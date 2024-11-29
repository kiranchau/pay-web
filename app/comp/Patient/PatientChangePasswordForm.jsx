const {Locale} = RTBundle;

var PatientChangePasswordForm = React.createClass({

	getDefaultProps: function() {
		return {
			errors: {},
			data: {},
		};
	},

	getInitialState: function() {
		return {
			data: this.props.data,
		};
	},

	handleChange: function(field, e) {
		var data = this.state.data;
		data[field] = e.target.value;
		this.setState({
			data: data
		});
	},

	render: function() {
		return (
			<div className="row">
				<dl className="col-md-12 form dialog">
					<dt>{Locale.getString('label.current-password', 'Current Password')}</dt>
					<dd>
						<input type="password" value={this.state.data.current_password} onChange={this.handleChange.bind(null, 'current_password')} />
						<ErrorDisplay message={this.props.errors.current_password} />
					</dd>
					
					<dt>{Locale.getString('label.new-password', 'New Password')}</dt>
					<dd>
						<input type="password" value={this.state.data.password} onChange={this.handleChange.bind(null, 'password')} />
						<ErrorDisplay message={this.props.errors.password} />
					</dd>

					<dt>{Locale.getString('label.confirm-new-password', 'Confirm New Password')}</dt>
					<dd>
						<input type="password" value={this.state.data._password} onChange={this.handleChange.bind(null, '_password')} />
						<ErrorDisplay message={this.props.errors._password} />
					</dd>
				</dl>
			</div>
		);
	}

});
