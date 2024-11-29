const {Locale} = RTBundle;

var PatientNav = React.createClass({

	getDefaultProps: function() {
		return {
			onClose: $.noop,
			user: {
				id: null
			},
			navigate: $.noop
		};
	},

	getInitialState: function() {
		return {
			adminSystemSettings: null,
			hasStudiesSubjectTravelPreferences: true,
			hasStudiesManageReimbursements: true,
			hasStudiesSubjectTravelRequest: true,
		};
	},

	componentDidMount: function() {
		$.get(_.endpoint('/system-settings'), function(res) {
			this.setState({
				adminSystemSettings: res.settings,
			});
		}.bind(this));

		new Promise(resolve => {
			$.get(_.endpoint('/system-settings'), res => {
				this.setState({
					adminSystemSettings: res.settings,
				}, () => {resolve()});
			});
		}).then(() => {
			if (!this.props.user.id) {
				return;
			}

			$.get(_.endpoint(`/patients/${this.props.user.id}/statuses/summary`), res => {
				let {hasStudiesSubjectTravelPreferences, hasStudiesManageReimbursements, hasStudiesSubjectTravelRequest} = this.state;
				const {adminSystemSettings} = this.state;
				if (res.record) {
					hasStudiesSubjectTravelPreferences = res.record._extra__has_studies_subject_travel_preferences == '1';
					hasStudiesManageReimbursements = res.record._extra__has_studies_manage_reimbursements == '1';
					hasStudiesSubjectTravelRequest = res.record._extra__has_studies_subject_travel_request == '1';
				}

				if (!hasStudiesManageReimbursements && 
					adminSystemSettings && 
					adminSystemSettings.subject_travel_preferences == 0 &&
					hasStudiesSubjectTravelPreferences && hasStudiesSubjectTravelRequest) {
					this.props.navigate(PatientTravelPreferenceView);
				} else if (
					!hasStudiesManageReimbursements && 
					(!hasStudiesSubjectTravelPreferences || !hasStudiesSubjectTravelRequest
					(adminSystemSettings && 
					adminSystemSettings.subject_travel_preferences == 1))) {
					this.props.navigate(PatientAccountView);
				}

				this.setState({
					hasStudiesSubjectTravelPreferences,
					hasStudiesManageReimbursements,
					hasStudiesSubjectTravelRequest,
				});
			});
		})
	},

	navigate: function(view, e) {
		e.preventDefault();
		this.props.navigate(view);
	},

	openModule: function(view, mod, e) {
		e.preventDefault();
		this.props.navigate(view, {module: mod});
	},

	handleSignOut: function(e) {
		e.preventDefault();

		$.post(_.endpoint('/signout'), function(res) {
			this.props.setGlobalState({
				user: {options: {}},
				navOpen: false,
				view: LoginView,
			});
		}.bind(this));
	},

	render: function() {
		const {adminSystemSettings, hasStudiesSubjectTravelPreferences, hasStudiesManageReimbursements} = this.state;
		return (
			<nav className="main-nav patient-nav">
				{hasStudiesManageReimbursements && 
				<a className="menu-item" onClick={this.navigate.bind(null, PatientDashboardView)} href="#!"><i className="fa fa-dashboard"></i> {Locale.getString('label.dashboard', 'Dashboard')} {<NavTick {...this.props} match="PatientDashboardView" />}</a>
				}
				{hasStudiesManageReimbursements &&
				<a className="menu-item" onClick={this.navigate.bind(null, PatientReimbursementView)} href="#!"><i className="fa fa-dollar"></i> {Locale.getString('label.reimbursements', 'Reimbursements')} {<NavTick {...this.props} match="PatientReimbursementView" />}</a>
				}
				{adminSystemSettings && 
				adminSystemSettings.subject_travel_preferences == 0 &&
				hasStudiesSubjectTravelPreferences &&
				<a className="menu-item" onClick={this.navigate.bind(null, PatientTravelPreferenceView)} href="#!"><i className="fa fa-star"></i> {Locale.getString('title.travel-preferences', 'Travel Preferences')} {<NavTick {...this.props} match="PatientTravelPreferenceView" />}</a>
				}
				{adminSystemSettings && 
				adminSystemSettings.subject_travel_preferences == 0 &&
				hasStudiesSubjectTravelPreferences &&
				<a className="menu-item" onClick={this.navigate.bind(null, PatientTravelRequestsView)} href="#!"><i className="fa fa-plane" /> {Locale.getString('title.travel-requests', 'Travel Requests')} {<NavTick {...this.props} match="PatientTravelRequestsView" />}</a>
				}
				<a className="menu-item" onClick={this.navigate.bind(null, PatientAccountView)} href="#!"><i className="fa fa-user"></i> {Locale.getString('label.myaccount', 'My Account')} {<NavTick {...this.props} match="PatientAccountView" />}</a>
				<a className="menu-item" onClick={this.navigate.bind(null, PatientPreferencesView)} href="#!"><i className="fa fa-gear"></i> {Locale.getString('label.myaddresses', 'My Addresses')} {<NavTick {...this.props} match="PatientPreferencesView" />}</a>

				{false && <a onClick={this.handleSignOut} className="menu-item" href="/signout"><i className="fa fa-sign-out"></i> {Locale.getString('button.signout', 'Sign Out')}</a>}
			</nav>
		);
	}

});
