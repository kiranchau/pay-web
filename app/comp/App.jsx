const {Locale, Recharts} = RTBundle;

var App = React.createClass({

	getDefaultProps: function() {
		return {
			system: {},
			appLogo: '',
			appName: 'Loading...',
			baseEndpoint: '',
			primaryBrandColor: '#2292a4',
			secondaryBrandColor: '',
			blurMode: false,
			remote: false,
			loginType: 'default',
			enableNavigation: false,
		};
	},

	_ping: null,
	_countdown: null,

	getInitialState: function() {
		_.mixin({
			endpoint: function(str) {
				return this.props.baseEndpoint + str;
			}.bind(this),
		});

		_.mixin({
			siteUserRoles: function() {
				return {
					1: 'Research Coordinator',
					2: 'Provider',
					3: 'Site Manager',
				};
			}.bind(this)
		});

		_.mixin({
			patientRequestStatuses: () => {
				return [
					{title: Locale.getString('label.reimbursement-status-draft', 'Not Submitted - Draft'), color: '#777', status: 0},
					{title: Locale.getString('label.reimbursement-status-submitted', 'Submitted - Pending'), color: '#D68F03', status: 1},
					{title: Locale.getString('option.site-reviewed', 'Site Reviewed'), color: '#ffd45c', status: '1.1'},
					{title: Locale.getString('label.reimbursement-status-approved', 'Approved'), color: '#20A526', status: 2},
					{title: Locale.getString('label.reimbursement-status-denied', 'Denied'), color: '#C71C1C', status: 3},
					{title: Locale.getString('label.reimbursement-status-cancelled', 'Cancelled'), color: '#000', status: 4},
					{title: Locale.getString('label.reimbursement-status-recalled', 'Recalled'), color: '#468499', status: 5},
					{title: Locale.getString('label.reimbursement-status-voided', 'Voided'), color: '#808080', status: 6},
					{title: Locale.getString('option.unknown', 'Unknown'), color: '#052c3d', status: -1},					
				];
			}
		});

		_.mixin({
			patientTravelStatuses: () => {
				return [
					{title: Locale.getString('label.reimbursement-status-submitted', 'Submitted - Pending'), color: '#D68F03', status: 1},
					{title: Locale.getString('label.reimbursement-status-approved', 'Approved'), color: '#20A526', status: 2},
					{ title: Locale.getString('label.reimbursement-status-received', 'Received'), color: '#C71C1C', status: 6 },
					{ title: Locale.getString('label.reimbursement-status-booked', 'Booked'), color: '#C71C1C', status: 5 },
					{title: Locale.getString('label.reimbursement-status-denied', 'Denied'), color: '#C71C1C', status: 3},
					{title: Locale.getString('label.reimbursement-status-cancelled', 'Cancelled'), color: '#000', status: 4},
				];
			}
		});

		_.mixin({
			patientRequestStatus: status => {
				if (status == null || status === '') {return {title: '', color: ''}}
				const val = parseFloat(status) || 0;
				return _.find(_.patientRequestStatuses(), (s) => {return s.status == val}) || _.find(_.patientRequestStatuses(), {status: -1});
			}
		});

		_.mixin({
			baseFontSize: () => {return 12},
			baseHeaderFontSize: () => {return 13}
		});

		_.mixin({
			isFromCTMS: email => {
				const reg = RegExp('([a-zA-Z0-9]+)([\.{1}])?([a-zA-Z0-9]+)\@realtime-ctms([\.])com','g');
				return reg.test(email);
			},
			isFromRedAxle: email => {
				const reg = RegExp('([a-zA-Z0-9]+)([\.{1}])?([a-zA-Z0-9]+)\@redaxle([\.])com','g');
				return reg.test(email);
			},
			isFromclinedge: email => {
				const reg = RegExp('([a-zA-Z0-9]+)([\.{1}])?([a-zA-Z0-9]+)\@clin-edge([\.])com','g');
				return reg.test(email);
			},
		});

		return {
			initialLoading: true,
			appLoading: false,
			shouldShowAppLoading: false,

			user: {
				options: {},
			},
			people: [],
			projects: [],
			project: {},
			system: {
				options: {},
				config: {}
			},

			companies: [],
			cache: {},

			systemCode: '',
			viewState: {},
			navOpen: false,
			view: LoginView,
			dialog: null,

			prevView: null,
			preState: null,
			pay_processor:{},
			features_flag:{},
			processor:1,
		};
	},

	saveRecentView: function(state) {
		if (_.isFunction(state.view)) {
			var viewElem = React.createElement(state.view, {}, '');
			var viewName = viewElem.type.displayName;

			var state = $.extend({}, this.state, state);
			state = _.pick(state, ['project','module', 'cache']);
			state.viewName = viewName;
			localStorage.setItem('lastView', JSON.stringify(state));
			localStorage.setItem('processor',this.state.processor);
		}
	},

	setGlobalState: function(ns, callback) {
		var basePath = this.routes.basePath;

		let cache = this.state.cache;
		let _ns = {...ns};
		if (_ns.cache) {
			_ns.cache = {...cache, ..._ns.cache};
		}

		this.setState(_ns, function() {
			if (_.isFunction(callback)) {
				callback();
			}

			if (_.isFunction(ns.view)) {
				this.saveRecentView(ns);
				var view = ns.view;
				if (_.isFunction(view.prototype.getRouteInfo)) {
					var info = view.prototype.getRouteInfo.call(null);
					if (this.props.enableNavigation) {
						history.pushState({view: ns.view.displayName}, null, basePath + '#' + info.path);
					}
				}
			}
		}.bind(this));
	},

	navigateToPrevView: function () {

		const navigate = () => {
			if (this.state.prevView) {
				let data = {shouldShowAppLoading: false, appLoading: this.state.shouldShowAppLoading};
				this.setState(data, () => {
					setTimeout(() => {
						this.navigate(this.state.prevView, this.state.prevState, () => {this.setState({prevView: null, prevState: null})});
					}, 500);
				})
			}
		}

		if (this.state.prevState && this.state.prevState.urlParams.cmd == 'view-patient-travel-request') {
			navigate();
		}

		if (this.state.user.type != 'patient') {
			navigate();
		}
		
	},

	navigate: function(view, state, callback) {
		var ns = {
			view: view,
			navOpen: false,
		};

		if (state && state.constructor && state.constructor.name == 'SyntheticMouseEvent') {
			state.preventDefault();
		}
		else if (_.isObject(state)) {
			ns = $.extend(ns, state);
		}

		this.setGlobalState(ns, callback);
	},

	routes: {},

	setupRouting: function() {
		var routes = this.routes;
		routes.basePath = location.pathname;

		$.each(window, function(key, val) {
			if (_.isFunction(val) && _.isObject(val.prototype) && _.isFunction(val.prototype.getRouteInfo)) {
				routes[val.displayName] = val.prototype.getRouteInfo.call(null);
			}
		});

		if (this.props.enableNavigation) {
			$(window).on('popstate', function(e) {
				if (!e.originalEvent.state || _.isUndefined(e.originalEvent.state.view) || !_.isFunction(window[e.originalEvent.state.view])) {
					return;
				}

				var view = e.originalEvent.state.view;
				if (_.isString(view) && !_.isUndefined(window[view])) {
					this.setState({
						view: window[view],
					});
				}
			}.bind(this));
		}
	},

	componentDidUpdate: function() {
		if (this.state.user.id > 0 && this._ping === null) {
			var pingDelay = 20;
			if (this.state.user.id == 34)
				pingDelay = 5;
			this._ping = setInterval(this.ping, pingDelay * 1000);
			$.get(_.endpoint('/settings'), function(res) {
				this.setState({features_flag: res.feature_flag},()=>{});
			}.bind(this));
			$.get(_.endpoint('/api/v1/pay-processor'), function(res) {
				this.setState({pay_processor:res.records},()=>{});
			}.bind(this)) 
		}
		else if (!this.state.user.id && this._ping !== null) {
			clearInterval(this._ping);
			this._ping = null;
		}
	},

	componentWillUnmount: function() {
		if (this._ping !== null) {
			clearInterval(this._ping);
			this._ping = null;
		}
	},

	componentDidMount: function() {
		localStorage.setItem('processor',this.state.processor);
		var params = _.jsonFromUrl();

		_.mixin({
			primaryBrandColor: function() {
				return _.color(this.props.primaryBrandColor);
			}.bind(this)
		});

		this.setupRouting();

		if (this.props.remote) {
			var sessid = localStorage.getItem('sessid');
			if (sessid) {
				$.ajaxSetup({
					data: {
						_sessid: sessid,
					}
				});
			}
			$.ajaxPrefilter(function(options, orig, jq) {
				if (!options.beforeSend) {
					options.beforeSend = function (xhr) { 
						xhr.setRequestHeader('SESSID', sessid);
					}
				}
			});
		}
		
		$.get(_.endpoint('/system-config'), res => {
			const config = {...this.state.system.config, ...res.config};
			this.setState({
				system: {...this.state.system, ...{config}},
			});
		});

		$.get(_.endpoint('/settings?ver=2'), res => {
			var enableOUS = parseInt(res.enable_ous) === 1 ? true : false;
			this.setState({
				countries: res.countries,
				enable_ous: enableOUS,
				timezones: res.timezones,
				states: res.states,
			});
		});

		$.get(_.endpoint('/settings'), function(res) {
			this.setState({features_flag: res.feature_flag},()=>{
				$.get(_.endpoint('/api/v1/pay-processor'), function(res) {
					this.setState({pay_processor:res.records},()=>{});
				}.bind(this)) 
			});
		}.bind(this));
		const lang = Locale.fetchLocale();

		$.get(_.endpoint('/stat'), {lang}, function(res) {
			this.setState({
				user  : res.user,
				system: {...this.state.system, ...res.system},
				initialLoading: false,
				systemCode    : res.systemCode,
			});

			const views = [
				'view-patient', 
				'view-site-summary', 
				'view-study-summary', 
				'view-study-visits', 
				'view-requests', 
				'view-patient-travel-request',
				'view-study-site-visits'
			];

			if (params.cmd && views.includes(params.cmd)) {
				if (res.user && _.isUndefined(res.user.id)) {
					this.setState({shouldShowAppLoading: true});
				} else {
					this.setState({appLoading: true});
				}
			}

			if (res.user && res.user.id > 0 && this.state.view === LoginView) {
				this.updateLocale(res.user.lang);
				this.setGlobalState({
					view: DashboardView,
				});
			}

			if (this.props.remote) {
				localStorage.setItem('sessid', res.sessid);
				$.ajaxSetup({
					data: {
						_sessid: res.sessid,
					}
				});
			}

			$.ajaxSetup({
				dataType: 'json',
			});

			if (params.cmd) {
				if (params.cmd == 'verify-email') {
					this.navigate(EmailConfirmationView);
				}
				else if (params.cmd == 'reset-password') {
					history.replaceState({}, null, location.pathname);
					var cache = this.state.cache;
					cache.code = params.code;
					cache.provision = params.provision;
					this.setState({
						cache: cache,
					});
					if (params.provision == 1)
						this.navigate(ProvisioningView);
					else
						this.navigate(ResetPasswordView);
				}
				history.replaceState({}, null, location.pathname);
			}
			else if (res.status < 2 && res.user.id) {
				var lastView = localStorage.getItem('lastView');
				try {
					lastView = JSON.parse(lastView)

					if (_.isFunction(window[lastView.viewName])) {
						var state = lastView;
						state.view = window[lastView.viewName];
						delete state.viewName;
						this.setState(state);
					}
					else {
						this.navigate(DashboardView);
					}
				}
				catch (e) {
					console.log('Main component failed');
					console.log(e);
					this.navigate(DashboardView);
				}
			}

			const navigateTo = (view, state) => {
			
				if (res.user && _.isUndefined(res.user.id)) {
					this.setState({prevView: view, prevState: state});
				} else if (res.user && res.user.id > 0){
					if (view && state) {
						this.navigate(view, state);
					}
				}
			}

			//give system time to load
			setTimeout(() => {
				
				if (params.cmd == 'view-patient-travel-request') {
					$.get(_.endpoint('/system-settings'), (_res) => {
						if (_res.settings.subject_travel_preferences == 0) {
							navigateTo(PatientTravelRequestsView, {urlParams: params})
							
						}
					});
				}

				if (this.state.user.type == 'patient') {
					return;
				}

				let view = null;
				let state = null;

				if (params.cmd == 'view-patient') {
					view = PatientView;
					state = {urlParams: params, context: {patientID: params.patient_id}};
					

				}  else if (params.cmd == 'view-site-summary') {
					view = StudySiteView;
					state = {urlParams: params, context: {siteID: params.site_id}};

				} else if (params.cmd == 'view-study-summary' || params.cmd == 'view-study-visits') {
					view = StudyView;
					state = {urlParams: params, context: {studyID: params.study_id}};
					
				}  else if (params.cmd == 'view-requests') {
					view = PatientRequestView;
					state = {urlParams: params};
					
				} else if (params.cmd == 'view-requests-site-reviewed') {
					view = PatientRequestView;
					state = {urlParams: params};

				} else if (params.cmd == 'view-study-visits') {
					view = StudyView;
					state = {urlParams: params, context: {studyID: params.study_id}};

				} else if (params.cmd == 'view-study-site-visits') {
					view = StudyView;
					state = {urlParams: params};

				}

				navigateTo(view, state);
	
			}, 500);


        }.bind(this));
        
        window.localStorage.getItem('locale', (val) => {
            if (val) {
                Locale.setLocale(val);
            }
        })
	},

	updateLocale: function(locale) {
		Locale.setLocale(locale);
	},

	handleNav: function(e) {
		e.preventDefault();
		this.setState({
			navOpen: !this.state.navOpen,
		});
	},

	handleCloseNav: function(e) {
		this.setState({
			navOpen: false,
		});
	},

	handleSignOut: function() {
		$.post(_.endpoint('/signout'), function(res) {
			this.setGlobalState({
				user: {
					options: {},
				},
				navOpen: false,
				view: LoginView,
				dialog: null,
			});
			history.replaceState({}, null, this.routes.basePath + '#/');
		}.bind(this));

		if (this._ping !== null) {
			clearInterval(this._ping);
			this._ping = null;
		}
		if (this._countdown !== null) {
			clearInterval(this._countdown);
			this._countdown = null;
		}
	},

	handleStay: function() {
		const lang = Locale.fetchLocale()

		$.get(_.endpoint('/stat'), {lang}, function(res) {
			if (this._countdown !== null) {
				clearInterval(this._countdown);
				this._countdown = null;
			}
			this.setState({
				dialog: null,
			});
		}.bind(this));
	},

	renderAutoSignout: function(rem) {
		var buttons = (
			<span>
				<button type="button" onClick={this.handleSignOut}>{Locale.getString('button.leave-now', 'Leave Now')}</button>
				<button type="button" onClick={this.handleStay}>{Locale.getString('button.stay-signed-in', 'Stay Signed In')}</button>
			</span>
		);

		var showTime = function(val) {
			val = parseInt(val);
			var m = parseInt(val / 60);
			var s = _.padLeft(val % 60, 2, '0');
			if(m >= 0 && s >= 0)
			{
				return [m, s].join(':');
			}
			else
			{
				return ['0', '00'].join(':');
			}
		};

		return (
			<Dialog width="444" title={`${Locale.getString('message.your-session-has-been-idle-and-you-are-about-to-be-signed-out', 'Your session has been idle and you are about to be signed out')}.`} buttons={buttons}>
				<div>
					<p>{Locale.getString('message.auto-logout', 'You will automatically signed out in')}...</p>
					<div style={{background: '#f5f5f5', padding: 8, fontSize: 54, lineHeight: 1.4, marginTop: 10}}>
						{showTime(rem)}
					</div>
				</div>
			</Dialog>
		);
	},

	countdown: function(rem) {
		var timeLeft = rem--;
		this._countdown = setInterval(function() {
			if (timeLeft > 0) {
				this.setState({
					dialog: this.renderAutoSignout(timeLeft),
				});
				timeLeft--;
			}
			else {
				this.handleSignOut();
			}
		}.bind(this), 1000);
	},

	ping: function() {
		if (!this.state.user.id) {
			return;
		}

		$.post(_.endpoint('/ping'), function(res) {
			if (res.status == 3) {
				this.handleSignOut();
			}
			else if (res.status == 2) {
				if (this._countdown === null) {
					this.setState({
						dialog: this.renderAutoSignout(res.remaining),
					});
					this.countdown(res.remaining);
				}
			}
		}.bind(this));
	},

	handleAppClick: function(e) {
		$('body').trigger('pay.click');
	},
	handlePayProcessorChange: function(e) {
		var tmp_processor = e.target.value;
		localStorage.setItem('processor',tmp_processor);
		this.setGlobalState({
			view: DashboardView,
		});
	},

	render: function() {
		var props = $.extend({}, this.props, this.state, {
			setGlobalState: this.setGlobalState,
			navigateToPrevView: this.navigateToPrevView,
			navigate: this.navigate,
			removePanel: this.removePanel,
			routes: this.routes,
		});

		var heading = '';
		var processor_parms = '';
		if (this.state.view && _.isFunction(this.state.view.prototype.getRouteInfo)) {
			heading = this.state.view.prototype.getRouteInfo.call(null).heading;
			processor_parms = this.state.settings == 0 
			? this.state.view.prototype.getRouteInfo.call(null).this.state.processor 
			: this.state.view.prototype.getRouteInfo.call(null).tmp_processor;
		}

		const headerStyle = this.state.appLoading ? { opacity: 0 } : { opacity: this.state.initialLoading ? 0.3 : 1 };
		
		return (
			<div onClick={this.handleAppClick} className={'main' + (' app-' + this.state.systemCode) + (this.state.user.id > 0 ? ' app-signed-in' : '')}>
				{this.state.dialog}
				{this.state.navOpen && <div onClick={this.handleCloseNav} className="modal-overlay" />}
				{this.state.appLoading && <div className="startup-loader" style={{position: "absolute", left: 0, width: '100%', zIndex: 1000}}><i className="fa fa-spinner fa-pulse"></i></div>}
				<header className={'header' + (this.state.navOpen ? ' nav-open' : '')} style={headerStyle}>
					<div className="row" style={{display:"flex", alignItems:"center" }} >
						<div className="col-xs-3">
							{this.props.appLogo &&
							<a className="logo" href=""><img alt={this.props.appName} src={this.props.appLogo} /></a>}
							{!this.props.appLogo &&
							<h1 className="logo-text">{this.props.appName}</h1>}
							{this.state.buttonBar &&
							React.createElement(this.state.buttonBar, {}, '')}
							{this.state.user && this.state.user.type == 'siteuser' && this.state.user.site && this.state.user.site.country != 'US' &&
							<span style={{marginLeft: 15, fontWeight: 'bold', fontSize: 20}}>OUS</span>}
						</div>

						<div className="col-sm-3">
							{this.state.system.id == 5 && heading && 
							<h3 style={{fontSize: 18, fontWeight: 'bold', margin: 0, lineHeight: 1, textAlign:"center"}}>{heading}</h3>}
						</div>
                        {this.state.features_flag == 1 &&
						<div className="col-sm-3 " >
							{this.state.system.id == 5 && heading == Locale.getString('label.dashboard', 'Dashboard') && 
							<select name="processor" onChange={(e)=>this.handlePayProcessorChange(e)} style={{padding:"5px", borderRadius:"2px", border:"1px solid #ccc"}}>
								{_.map(this.state.pay_processor, function(pay) {
								return <option key={pay.id} value={pay.id} name={pay.name}>{pay.name}</option>;
								})}
							</select>}
						</div>}

						{this.state.user.id > 0 &&
						<div className="col-sm-3 " style={{ textAlign: "right"}}>
							{Locale.getString('label.hi', 'Hi')} {this.state.user.firstname}
							<UserMenu {...props} />
						</div>}
					</div>

					{this.state.user.id > 0 &&
					<a className="nav-button" href="#!" onClick={this.handleNav} style={{backgroundColor: _.primaryBrandColor()}}><i className="fa fa-navicon"></i></a>}

					<Nav {...props} onClose={this.handleCloseNav} />
				</header>

				<div style={{opacity: this.state.appLoading ? 0 : 1 }}>
					{this.state.initialLoading ? <div className="startup-loader"><i className="fa fa-spinner fa-pulse"></i></div> : React.createElement(this.state.view, props, '')}
				</div>

				{this.state.view === LoginView  && 
					<div style={{ position: 'absolute', left: 20, bottom: 20 }}>
						<a href="https://www.realtime-ctms.com/privacy-policy" target="_blank">{Locale.getString('label.privacy-policy', 'Privacy Policy')}</a>
					</div>
				}
			</div>
		);
	},

	statics: {

		setTitle: function(title) {
			$('head title').text(title);
		},

	}

});
