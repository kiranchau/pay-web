const {Locale} = RTBundle;

var Nav = React.createClass({

	getDefaultProps: function() {
		return {
			onClose: $.noop,
		};
	},

	navigate: function(view, e) {
		e.preventDefault();
		this.props.navigate(view);
	},

	handleSignOut: function(e) {
		e.preventDefault();

		$.post(_.endpoint('/signout'), function(res) {
			this.props.setGlobalState({
				user: {
					options: {},
				},
				navOpen: false,
				view: LoginView,
			});
			history.replaceState({}, null, this.props.routes.basePath + '#/');
		}.bind(this));
	},

	toggleAdminSub: function(e) {
		e.preventDefault();
		var cache = this.props.cache;
		if (_.isUndefined(cache.adminNavToggle))
			cache.adminNavToggle = true;
		else
			cache.adminNavToggle = !cache.adminNavToggle;

		this.props.setGlobalState({
			cache: cache,
		});
	},

	render: function() {
		if (this.props.user.type == 'patient') {
			return <PatientNav {...this.props} />;
		}

		return (


			<nav className="main-nav" style={{paddingTop: 0}}>

				{this.props.appLogoSideNav &&
					<a className="logo" href="" style={{position: 'relative !important', paddingTop: 15, paddingBottom: 15}}><img style={{height: 'auto', width: '80%', maxWidth: '100%'}}alt={this.props.appName} src={this.props.appLogoSideNav} /></a>}	

				<a className="menu-closer" onClick={function(e) { e.preventDefault(); this.props.onClose(); }.bind(this)}><span className="icon">&times;</span></a>

				<a className="menu-item" onClick={this.navigate.bind(null, DashboardView)} href="/"><i className="fa fa-dashboard"></i> {Locale.getString('label.dashboard', 'Dashboard')} {this.props.system.id == 5 && <NavTick {...this.props} match="DashboardView" />}</a>

				{this.props.system.id == 5 && (this.props.user.type === 'siteuser' || this.props.user.options.subject_management == 1) &&
				<a className="menu-item" onClick={this.navigate.bind(null, PatientView)} href=""><i className="fa fa-medkit"></i> {Locale.getString('title.subjects', 'Subjects')} <NavTick {...this.props} match="PatientView" /></a>}

				{this.props.system.id == 5 && (this.props.user.type === 'siteuser' && parseInt(this.props.user.options.stipend_approval) === 1 || parseInt(this.props.user.options.subject_request_approval) == 1) &&
				<a className="menu-item" onClick={this.navigate.bind(null, PatientRequestView)} href=""><i className="fa fa-credit-card"></i>{Locale.getString('title.subject-payments', 'Subject Payments')}<NavTick {...this.props} match="PatientRequestView" /></a>}

				{this.props.system.id == 5 && (this.props.user.type === 'siteuser' && parseInt(this.props.user.options.stipend_approval) === 1 || parseInt(this.props.user.options.subject_request_approval) == 1) &&
				<a className="menu-item" onClick={this.navigate.bind(null, SubjectTravel)} href=""><i className="fa fa-plane"></i>{Locale.getString('title.subject-travel', 'Subject Travel')}<NavTick {...this.props} match="SubjectTravel" /></a>}
				{this.props.system.id == 5 && this.props.user.options.study_management == 1 &&
				<a className="menu-item" onClick={this.navigate.bind(null, StudyView)} href=""><i className="fa fa-heartbeat"></i> {Locale.getString('title.studies', 'Studies')} <NavTick {...this.props} match="StudyView" /></a>}

				{this.props.system.id == 5 && this.props.user.options.site_management == 1 &&
				<a className="menu-item" onClick={this.navigate.bind(null, StudySiteView)} href=""><i className="fa fa-globe"></i> {Locale.getString('label.sites', 'Sites')} <NavTick {...this.props} match="StudySiteView" /></a>}

				{this.props.system.id == 5 && (this.props.user.options.reports == 1) &&
				<a onClick={this.navigate.bind(null, ReportView)} className="menu-item" href="#!"><i className="fa fa-line-chart"></i> {Locale.getString('title.reports', 'Reports')} {this.props.system.id == 5 && <NavTick {...this.props} match="ReportView" />}</a>}

				{false &&
				<a onClick={this.navigate.bind(null, HelpLog)} className="menu-item" href="#!"><i className="fa fa-life-buoy"></i> {Locale.getString('title.help-log', 'Help Log')} <NavTick {...this.props} match="HelpLog" /></a>}

				{this.props.system.id == 5 && this.props.user.options.admin_area &&
				<a onClick={this.toggleAdminSub} className="menu-item" href="#!"><i className="fa fa-cog"></i> {Locale.getString('title.admin', 'Admin')} <i className={'fa fa-angle-' + (this.props.cache.adminNavToggle === true ? 'down' : 'right')} /></a>}


				{this.props.system.id == 5 && this.props.cache.adminNavToggle === true &&
				<div className="sub-menu">
					{(this.props.user.options.funding_management == 1) &&
					<a onClick={this.navigate.bind(null, FundingView)} className="menu-item" href="#!"><i className="fa fa-money"></i> {Locale.getString('title.pay-account-information', 'Pay Account Information')} <NavTick {...this.props} match="FundingView" /></a>}
					{(this.props.user.options.table_management == 1) &&
					<a onClick={this.navigate.bind(null, TableView)} className="menu-item" href="#!"><i className="fa fa-table"></i> {Locale.getString('title.manage-tables', 'Manage Tables')} <NavTick {...this.props} match="TableView" /></a>}
					{(this.props.user.options.system_settings == 1) &&
					<a onClick={this.navigate.bind(null, SettingsView)} className="menu-item" href="#!"><i className="fa fa-gear"></i> {Locale.getString('title.settings', 'Settings')} <NavTick {...this.props} match="SettingsView" /></a>}
					{(this.props.user.is_admin == 1 || this.props.system.options.user_management == 1 && this.props.user.options.user_management == 1) &&
					<a onClick={this.navigate.bind(null, UserView)} className="menu-item" href="/users"><i className="fa fa-user"></i> {Locale.getString('label.system-users', 'System Users')} {this.props.system.id == 5 && <NavTick {...this.props} match="UserView" />}</a>}
				</div>}

				{false && <a onClick={this.handleSignOut} className="menu-item" href="/signout"><i className="fa fa-sign-out"></i> {Locale.getString('button.signout', 'Sign Out')}</a>}

				<div className="logo"><img alt="RealTime-CTMS" src="assets/images/logo-realtime-mini.png" /></div>
			</nav>
		);
	}

});
