const {Locale} = RTBundle;

var UserMenu = React.createClass({

	getInitialState: function() {
		return {
			open: false,
			dialog: null,
			languages: []
		};
	},

	componentDidMount: function() {
		$('body').on('pay.click', function(e) {
			this.closeMenu();
		}.bind(this));

		$.get(_.endpoint('/languages'), function(res) {
			this.setState({languages: res.records});
		}.bind(this));
	},

	componentWillUnmount: function() {
		$('body').off('pay.click');
	},

	toggleMenu: function(e) {
		e.preventDefault();
		this.setState({
			open: !this.state.open,
		});
	},

	closeMenu: function() {
		this.setState({
			open: false,
			dialog: null,
		});
	},

	handlePassword: function(e) {
		e.preventDefault();
		this.setState({
			open: false,
			dialog: <EditPasswordDialog {...this.props} onClose={this.closeDialog} onChange={this.setField} />,
		});
	},

	setField: function(key, val) {
		var data = this.state.data;
		data[key] = val;
		this.setState({
			data: data,
		});
	},

	handleProfile: function(e) {
		e.preventDefault();
		this.setState({
			open: false,
			dialog: <EditProfileDialog  {...this.props} onClose={this.closeDialog} onChange={this.setField} />
		});
	},

	handleLanguage: function(e) {
		e.preventDefault();
		this.setState({
			open: false,
			dialog: <LanguageChangeDialog  {...this.props} onClose={this.closeDialog} onChange={this.setField} />
		});
	},

	handleSignOut: function(e) {
		e.preventDefault();
		this.closeMenu();
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

	closeDialog: function() {
		this.setState({
			dialog: null,
		});
	},

	moveTo: function(e) {
		e.preventDefault();
		this.props.navigate(PatientAccountView);
	},

	handleMenuClick: function(e) {
		e.stopPropagation();
	},

	render: function() {
		var method = this.handleProfile;
		if (this.props.user.type == 'patient') {
			method = this.moveTo;
		}

		var currentLanguage = Locale.fetchLocale();

		// Selected language might be used again, but for now it is removed.
		var selectedLanguages = _.filter(this.state.languages, language => {
			return language.code == currentLanguage;
		})
		var selectedLanguage = selectedLanguages[0];

		const currentLang = Locale.fetchLocale();
		const currentEn = currentLang == 'en' || !currentLang;

		return (
			<div className="user-menu" onClick={this.handleMenuClick} style={{position: 'relative', display: 'inline-block', marginLeft: 20}}>
				{this.state.dialog}

				<a className="user-menu-icon" href="#!" onClick={this.toggleMenu}><i className="fa fa-gear" /></a>

				<div className="user-menu-popup" style={{display: this.state.open ? 'block' : 'none', position: 'absolute', zIndex: 50}}>
					<a href="#!" onClick={method}>{Locale.getString('button.edit-profile', 'Edit Profile')}</a>
					<a href="#!" onClick={this.handlePassword}>{Locale.getString('button.change-password', 'Change Password')}</a>
					<a href="#!" style={{textAlign: 'left', justifyContent: 'center'}} onClick={this.handleLanguage}>
						<span style={{display: 'inline-block', marginRight: 5}} >{`${Locale.getString('label.language', 'Language')}`}</span>
						<span style={{color: 'gray', fontSize: 8, display: 'inline-block', paddingTop: 2}}>{!currentEn ? ' (Language)': ''}</span>
					</a>
					<a href="#!" className="signout" onClick={this.handleSignOut}>{Locale.getString('button.signout', 'Sign Out')}</a>
				</div>
			</div>
		);
	},

});
