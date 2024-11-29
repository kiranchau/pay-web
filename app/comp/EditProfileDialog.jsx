const {Locale} = RTBundle;

var EditProfileDialog = React.createClass({

	getDefaultProps: function() {
		return {
			onClose: _.noop,
		};
	},

	getInitialState: function() {
		var emailaddress = {};
		return {
			data: {},
			errors: {},
			dialog: null,
			timezones: {},
			formSubmitted: false,
			saved_emailaddress: '',
		}
	},

 componentDidMount: function() {
		$.get(_.endpoint('/settings'), function(res) {
			this.setState({
				timezones: res.timezones,
			});
		}.bind(this));

		$.get(_.endpoint('/users/' + this.props.user.id), function(res) {
			this.setState({
				data: res.record,
				saved_emailaddress: res.record.emailaddress,
			});
		}.bind(this));
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

	handleSave: function() {
		var postData = {
			emailaddress: this.state.data.emailaddress,
			phonenumber: this.state.data.phonenumber,
			fax: this.state.data.fax,
			company: this.state.data.company,
			timezone: this.state.data.timezone
		};
		$.post(_.endpoint('/edit-profile'), postData, function(res) {
			if (res.status < 2) {
				this.setState({
					formSubmitted: true,
				});
			}
			else {
				this.setState({
					errors: res.errors,
				});
			}
		}.bind(this));
	},

	render: function() {
		var buttons = [
			<button key="cancel" type="button" onClick={this.props.onClose}>{Locale.getString('button.cancel', 'Cancel')}</button>,
			<button key="save" type="button" onClick={this.handleSave} className="primary">{Locale.getString('button.save', 'Save')}</button>
		];
		var button = <button key="okay" type="button" onClick={this.props.onClose}>{Locale.getString('label.okay', 'Okay')}</button>;
		if (this.state.formSubmitted === true) {
			return (
				<Dialog title={Locale.getString('title.profile-saved', 'Profile Saved')} style={{textAlign: 'left'}} width={400} onClose={this.props.onClose} buttons={button}>
					<p>{Locale.getString('message.profile-saved', 'Your profile has been successfully saved.')}</p>
				</Dialog>
			);
		}

		return(
			<Dialog title={Locale.getString('button.edit-profile', 'Edit Profile')} style={{textAlign: 'left'}} onClose={this.props.onClose} buttons={buttons} width={800}>
				<div className="row form">
					<dl className="col-sm-5 form dialog">
						<dt>{Locale.getString('label.email-address', 'Email Address')}</dt>
						<dd>
							<input name="emailaddress" type="text" value={this.state.data.emailaddress} onChange={this.handleChange} />
							<ErrorDisplay message={this.state.errors.emailaddress} />
							{this.state.saved_emailaddress != this.state.data.emailaddress &&
							<p>{Locale.getString('message.confirmation-email-sent', 'A confirmation email will be sent to your new email address for verification purposes.')}</p>}
						</dd>
						<dt>{Locale.getString('label.phone-number', 'Phone Number')}</dt>
						<dd>
							<input name="phonenumber" type="text" value={this.state.data.phonenumber} onChange={this.handleChange} />
							<ErrorDisplay message={this.state.errors.phonenumber} />
						</dd>
						<dt>{Locale.getString('title.fax', 'Fax')}</dt>
						<dd>
							<input name="fax" type="text" value={this.state.data.fax} onChange={this.handleChange} />
						</dd>
					</dl>
					<dl className="col-sm-4 form dialog">
						<dt>{Locale.getString('label.company', 'Company')}</dt>
						<dd>
							<input name="company" type="text" value={this.state.data.company} onChange={this.handleChange} />
						</dd>
						<dt>{Locale.getString('label.timezone', 'Timezone')}</dt>
						<dd>
							<select name="timezone" value={this.state.data.timezone} onChange={this.handleChange} >
								<option value="">{Locale.getString('option.select-timezone', 'Select Timezone')}...</option>
								{_.map(this.state.timezones, function(timezone) {
									return <option key={timezone} value={timezone}>{timezone}</option>;
								})}
							</select>
						</dd>
					</dl>
				</div>
			</Dialog>
		);
	}

});
