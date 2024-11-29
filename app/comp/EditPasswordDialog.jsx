const {Locale} = RTBundle;

var EditPasswordDialog = React.createClass({

	getDefaultProps: function() {
		return {
			onClose: _.noop,
		};
	},

	getInitialState: function() {
		return {
			data: {},
			errors: {},
			dialog: null,
			formSubmitted: false,
		};
	},

	handleClose: function() {
		this.props.onClose();
	},

	setField: function(key, val) {
		var data = this.state.data;
		data[key] = val;
		this.setState({
			data: data,
		});
	},

	handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handleSave: function(e) {
		var postData = {
			current_password: this.state.data.current_password,
			password: this.state.data.password,
			_password: this.state.data._password,
		};

		$.post(_.endpoint('/edit-password'), postData, function(res) {
			if(res.status < 2) {
				var buttons = [<button key="cancel" type="button" onClick={this.props.onClose}>{Locale.getString('label.okay', 'Okay')}</button>];

				this.setState({
					formSubmitted: true,
				});
			}
			else if(res.errors) {
				const errorKeys = Object.keys(res.errors);

				for (let errorKey of errorKeys) {
					let error = res.errors[errorKey];

					if (error == 'The current password entered was incorrect.') {
						res.errors[errorKey] = Locale.getString('error.current-password', 'The current password entered was incorrect.');
					}
					else if (error == 'Please enter a new password.') {
						res.errors[errorKey] = error = Locale.getString('error.new-password', 'Please enter a new password');
					}
				}
				this.setState({
					errors: res.errors,
				});
			}
		}.bind(this));
	},

	render: function() {
		var buttons = [
			<button key="cancel" type="button" onClick={this.props.onClose}>{Locale.getString('button.cancel', 'Cancel')}</button>,
			<button key="save" type="button" onClick={this.handleSave} style={{color: '#ddd'}} className="primary">{Locale.getString('button.save-password', 'Save Password')}</button>
		];

		var button = <button key="okay" type="button" onClick={this.props.onClose}>{Locale.getString('label.okay', 'Okay')}</button>;
		if (this.state.formSubmitted === true) {
			return <Dialog title={Locale.getString('title.password-updated', 'Password Updated')} width={400} style={{textAlign: 'left'}} onClose={this.props.onClose} buttons={button}><p>{Locale.getString('message.pass-saved', 'Your password has been successfully saved.')}</p></Dialog>;
		}

		return (
			<Dialog title={Locale.getString('link.change-password', 'Change Password')} style={{textAlign: 'left'}} onClose={this.props.onClose} buttons={buttons} width={400}>
				<div className="row form">
					<dl className="col-sm-12 form dialog">
						<dt>{Locale.getString('label.current-password', 'Current Password')}</dt>
						<dd>
							<input name="current_password" type="password" onChange={this.handleChange} value={this.state.data.current_password} maxLength={100} />
							<ErrorDisplay message={this.state.errors.current_password} />
						</dd>

						<dt>{Locale.getString('label.new-password', 'New Password')}</dt>
						<dd>
							<input name="password" type="password" onChange={this.handleChange} value={this.state.data.password} maxLength={100} />
							<ErrorDisplay message={this.state.errors.password} />
						</dd>

						<dt>{Locale.getString('label.retype-password', 'Re-type Password')}</dt>
						<dd>
							<input name="_password" type="password" onChange={this.handleChange} value={this.state.data._password} maxLength={100} />
							<ErrorDisplay message={this.state.errors._password} />
						</dd>
					</dl>
				</div>
			</Dialog>
		);
	},
});
