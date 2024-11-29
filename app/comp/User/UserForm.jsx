const {Locale} = RTBundle;

var UserForm = React.createClass({

	getDefaultProps: function() {
		return {
			errors: {},
			data: {},
		};
	},

	getInitialState: function() {
		var data = _.extend(this.props.data, this.props.data); // intentionally mutate object
		if (_.isUndefined(this.props.data.options)) {
			data.options = {};
		}

		var data = this.props.data;
		if (this.props.site && this.props.site.id && _.isUndefined(data._studies)) {
			data._studies = {};
		}
		if (this.props.site && this.props.site.lang && !data.lang) {
			data.lang = this.props.site.lang;
		}
		return {
			data: data,
			setPassword: false,
			passwordSent: false,
			studies: [],
			languages: [],
			filteredSystemUserStatus:'',
		};
	},

	getNotifications: function() {
		var siteUser = this.props.site && this.props.site.id > 0;
		if (this.props.system.id) {
			var notifs = {
				patient_email_verification: Locale.getString('label.subject-email-verify', 'Subject Email Verification'),
				patient_setup_alert: Locale.getString('label.subject-account-setup', 'Subject Account Setup'),
				patient_card_assigned: Locale.getString('label.subject-card-assigned', 'Subject Card Assigned'),
				
			};

			if (!siteUser) {
				notifs = _.extend(notifs, {
					patient_travel_request_alert: Locale.getString('label.subject-travel-request', 'Subject Travel Request'),
					reimbursement_reviewed_alert: Locale.getString('label.reimbursement-reviewed-alert', 'Reimbursement Reviewed Alert'),
					fund_request_alert: Locale.getString('label.funding-requests', 'Funding Requests'),
					card_request_alert: Locale.getString('label.card-requests', 'Card Requests'),
					low_balance_alert: Locale.getString('label.low-balance-warning', 'Low Balance Warning'),
					low_card_alert: Locale.getString('label.low-card-warning', 'Low Card Warning'),
					helplog_alert: Locale.getString('label.help-log-requests', 'Help Log Requests'),
					recall_alert: Locale.getString('label.recall-alert', 'Recall Alert'),
				});
			}

			return notifs;
		}

		return {};
	},

	getPrivileges: function(isSiteuser) {
		if (!isSiteuser) {
			return {
				site_management: Locale.getString('label.site-management', 'Site Management'),
				study_management: Locale.getString('label.study-management', 'Study Management'),
				subject_management: Locale.getString('label.subject-management', 'Subject Management'),
				subject_card_assignment: Locale.getString('label.assign-cards', 'Assign Cards'),
				subject_request_approval: Locale.getString('label.approve-deny-reimb', 'Approve/Deny Reimbursements'),
				admin_area: Locale.getString('label.admin-area', 'Admin Area'),
				user_management: ' -- ' + Locale.getString('label.user-management', 'User Management'),
				table_management: ' -- ' + Locale.getString('label.table-management', 'Table Management'),
				funding_management: ' -- ' + Locale.getString('label.account-funding-management', 'Account Funding Management'),
				system_settings: ' -- ' + Locale.getString('label.system-settings', 'System Settings'),
				funding_approval: parseInt(this.props.user.is_admin) === 1 ? ' -- ' +  Locale.getString('label.card-funding-request', 'Card/Funding Request Approval/Voiding'): false,
				reports: Locale.getString('title.reports', 'Reports'),
				delete_patients: Locale.getString('label.allowed-deleted-subjects', 'Allowed to Delete Subjects'),
				query_management: Locale.getString('label.query-management', 'Query Management'),
			};
		}
		else {
			return {
				assign_card: Locale.getString('label.assign-cards', 'Assign Cards'),
				stipend_approval: Locale.getString('label.approve-stipends', 'Approve Stipends'),
				review_reimbursement: Locale.getString('label.review-reimbursements', 'Review Reimbursements'),
				subject_request_approval: Locale.getString('label.approve-deny-reimb', 'Approve/Deny Reimbursements'),
				delete_patients: Locale.getString('label.delete-subjects', 'Delete Subjects'),
			};
		}
	},

	componentDidMount: function() {
		this.state.data.account_status === ""
		? this.setState({filteredSystemUserStatus:"1"})
		: this.setState({filteredSystemUserStatus:this.state.data.account_status})
		this.setField('account_status',"1");
		if (this.props.site && this.props.site.id > 0) {
			$.get(_.endpoint('/studies'), {site_id: this.props.site.id}, function(res) {
				this.setState({
					studies: res.records,
				});
			}.bind(this));
		}

		$.get(_.endpoint('/languages'), function(res) {
			this.setState({
				languages: res.records,
			});
		}.bind(this));
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

	handleChecked: function(e) {
		this.setField(e.target.name, e.target.checked ? 1 : 0);
	},

	handlePrivilege: function(e) {
		var data = this.state.data;
		data.options[e.target.name] = e.target.checked ? 1 : 0;

			if (e.target.name == 'admin_area' && !e.target.checked) {
				data.options = _.extend(data.options, {
					user_management: 0,
					table_management: 0,
					funding_management: 0,
					funding_approval: 0,
					system_settings: 0,
				});
			}
			else if (['user_management', 'table_management', 'system_settings', 'funding_management', 'funding_approval'].indexOf(e.target.name) > -1 && e.target.checked) {
				data.options = _.extend(data.options, {
					admin_area: 1,
				});
			}


		this.setState({
			data: data,
		});
	},

	togglePassword: function(e) {
		e.preventDefault();
		this.setField('password', '');
		this.setState({
			setPassword: !this.state.setPassword,
		});
	},

	handleRandomPassword: function(e) {
		e.preventDefault();	
		$.post(_.endpoint('/accounts/send-temporary-password'), {id: this.state.data.id}, function(res) {
			this.setState({
				passwordSent: true,
			});
		}.bind(this));
	},

	handleFilter: function(e) {
		this.setField(e.target.name, e.target.value);
		this.setState({
			filteredSystemUserStatus: e.target.value,
		});
	},

	handleStudyCheckbox: function(studyID, e) {
		var data = this.state.data;
		if (e.target.checked) {
			data._studies[studyID] = 1;
		}
		else {
			delete data._studies[studyID];
		}
		this.setState({
			data: data,
		});
	},

	renderNotifications: function() {
		return (
			<span>
				<dt>{Locale.getString('title.notifications', 'Notifications')}</dt>
				<dd>
					{_.map(this.getNotifications(), function(label, key) {
						return <p key={key}>
							<label>
								<input name={key} checked={parseInt(this.state.data.options[key]) == 1} type="checkbox" value="1" onChange={this.handlePrivilege} />
								{' '}
								{label}
							</label>
						</p>;
					}, this)}
				</dd>
			</span>
		);
	},

	render: function() {
		var siteUser = this.props.site && this.props.site.id > 0;
		var roles = _.siteUserRoles();

		return (
			<div className='base-font-size'>
				<div className="row">
					<dl className={"form dialog user-info-form " + (siteUser ? 'col-md-5' : 'col-md-6')}>
						{!siteUser &&
						<div>
                        <dt>{Locale.getString('label.company', 'Company')}</dt>
							<dd>
								<input name="company" type="text" value={this.state.data.company} onChange={this.handleChange} />
							</dd>
						</div>
						}
						<dt>{Locale.getString('label.first-name', 'First Name')} <RequiredMarker /></dt>
						<dd>
							<input name="firstname" type="text" value={this.state.data.firstname} onChange={this.handleChange} />
							<ErrorDisplay message={this.props.errors.firstname} />
						</dd>
						<dt>{Locale.getString('label.last-name', 'Last Name')}</dt>
						<dd>
							<input name="lastname" type="text" value={this.state.data.lastname} onChange={this.handleChange} />
						</dd>
						<dt>{Locale.getString('label.phone', 'Phone')}</dt>
						<dd>
							<input name="phonenumber" type="text" value={this.state.data.phonenumber} onChange={this.handleChange} />
						</dd>
						<dt>{Locale.getString('title.fax', 'Fax')}</dt>
						<dd>
							<input name="fax" type="text" value={this.state.data.fax} onChange={this.handleChange} />
						</dd>
					
						<dt>{Locale.getString('title.email', 'Email')} <RequiredMarker /></dt>
						<dd>
							<input name="emailaddress" type="text" value={this.state.data.emailaddress} onChange={this.handleChange} />
							<ErrorDisplay message={this.props.errors.emailaddress} />
						</dd>
						<div style={{ display: "flex", alignItems: 'center', justifyContent: 'space-between' }}>
							<div style={{ width: "50%" }}>
						<dt>{Locale.getString('label.language', 'Language')}</dt>
						<dd>
							<select name="lang" value={this.state.data.lang} onChange={this.handleChange}>
								<option value="">{Locale.getString('option.select-language', 'Select Language')}...</option>
								{_.map(this.state.languages, function(language) {
									return <option key={language.code} value={language.code}>{language.name}</option>;
								}, this)}
							</select>
						</dd>
						</div>
							<div style={{ width: '50%', paddingLeft:'10px', }}>
								<dt>USER STATUS</dt>
								<dd>
									<select onChange={this.handleFilter} name='account_status' value={this.state.filteredSystemUserStatus}>
										<option value="1">{Locale.getString('option.active', 'Active')}</option>
										<option value="0">{Locale.getString('option.inactive', 'Inactive')}</option>
									</select>
								</dd>
							</div>
						</div>

						<dt>{Locale.getString('label.password', 'Password')}</dt>
						<dd>
							{!this.state.setPassword &&
							<div>
								<p><a href="#!" onClick={this.togglePassword}>{Locale.getString('link.set-password', 'Set Password')}</a></p>
								{!this.state.passwordSent && this.state.data.id > 0 &&
								<p><a href="#!" onClick={this.handleRandomPassword}>{this.state.data.date_provisioned ? Locale.getString('link.initiate-password-reset', 'Initiate Password Reset') : Locale.getString('link.send-welcome-email', 'Send Login Welcome Email')}</a></p>}
								{this.state.passwordSent && moment(this.state.data.date_provisioned).isValid() === true &&
								<p>{Locale.getString('message.password-reset-instructions', 'Password reset instructions have been emailed to this user.')}</p>}
								{this.state.passwordSent && moment(this.state.data.date_provisioned).isValid() === false &&
								<p>{Locale.getString('message.initiate-account-setup', 'Initial account setup information has been emailed to this user.')}</p>}
							</div>}

							{this.state.setPassword &&
							<div>
								<input name="password" type="password" value={this.state.data.password} onChange={this.handleChange} />
								<ErrorDisplay message={this.props.errors.password} />
								<a href="#!" onClick={this.togglePassword}>{Locale.getString('button.cancel', 'Cancel')}</a>
							</div>}
						</dd>
					</dl>

					<span>

					{siteUser &&
					<dl className="form dialog col-md-4 user-info-form right-border--md">

						<div style={{height: 63}}>
							<label style={{marginTop: 18}}>
							<input name="active" type="checkbox" style={{position: 'relative', top: 2}} value="1" checked={parseInt(this.state.data.active) === 1} onChange={this.handleChecked} /> <dt style={{display: 'inline-block'}}>{Locale.getString('label.system-user', 'System User')}</dt>
							</label>
						</div>
						
						<dt>{Locale.getString('label.company', 'Company')}</dt>
						<dd>
							<input name="company" type="text" value={this.state.data.company} onChange={this.handleChange} />
						</dd>

						{siteUser &&
						<dt>{Locale.getString('label.role', 'Role')}</dt>}

						{siteUser &&
						<dd>
							<select name="_role" value={this.state.data._role} onChange={this.handleChange}>
								<option value="">{Locale.getString('option.select-role', 'Select Role')}...</option>
								{_.map(roles, function(label, val) {
									return <option value={val} key={val}>{label}</option>;
								})}
							</select>
						</dd>}
						
						<dt>{Locale.getString('label.study-access', 'Study Access')}</dt>  
						<div style={{ border: '1px solid #ddd', borderRadius: 4, padding: 5, height: 200, overflowY: 'auto' }}>
						{_.map(this.state.studies, function(study) {
							return <p key={study.id}><label><input type="checkbox" value="1" checked={this.state.data._studies[study.id] == 1}
								onChange={this.handleStudyCheckbox.bind(null, study.id)} /> {study.sponsor.name} - {study.protocol} - {study.title}</label></p>
						}, this)}
						</div>
					</dl>}

					<dl className={"form dialog col-md-3 user-info-form" + (!siteUser ? 'left-border--md right-border--md' : '')}>
						<dt>{Locale.getString('label.privileges', 'Privileges')}</dt>
						<dd>
							{_.map(this.getPrivileges(siteUser), function(label, key) {
								if (label === false) {
									return null;
								}
								return <p key={key}>
									<label>
										<input name={key} checked={parseInt(this.state.data.options[key]) == 1} type="checkbox" value="1" onChange={this.handlePrivilege} />
										{' '}
										{label}
									</label>
								</p>;
							}, this)}
						</dd>

						{siteUser && <div style={{height: 1, background: '#d4d4d4', marginBottom: 25}}></div>}

						{this.props.system.id == 5 && siteUser && this.renderNotifications()}
					</dl>
					{this.props.system.id == 5 && !siteUser &&
					<dl className='form dialog col-md-3 user-info-form'>
						{this.renderNotifications()}
					</dl>}
					</span>
				</div>

			</div>
		);
	}
});
