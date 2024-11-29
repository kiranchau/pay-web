const {Locale} = RTBundle;

var DashboardView = React.createClass({

	getRouteInfo: function() {
		return {
			path: '/',
			heading:  Locale.getString('label.dashboard', 'Dashboard'),
		};
	},

	getInitialState: function() {
		return {
			sections: [],
			wallet: {},
			ius_wallet: {},
			ous_wallet: {},
			enable_ous: false,
			patients: [],
			reimbursements: [],
			dashboardLoaded: false,
			site_active_count: 0,
			study_active_count: 0,
			subject_active_count: 0,
			main_status: []
		};
	},

	componentDidMount: function() {
		this.loadDashboard();
		this.loadSettings();
	},

	componentWillReceiveProps: function(nextProps) {
		if (nextProps.cache && nextProps.cache.dashboardDataStale) {
			this.props.setGlobalState({cache: {dashboardDataStale: false}});
			this.loadDashboard();
		}
		else{
			this.loadDashboard();
		}
	},

	loadSettings: function() {
		$.get(_.endpoint('/settings'), function(res) {
			this.setState({enable_ous: parseInt(res.enable_ous) === 1 ? true : false});
		}.bind(this));
	},

	loadDashboard: function() {
		var processor = localStorage.getItem("processor");
		const {user} = this.props;
		if (user.type == 'patient') {
			return;
		}

		$.get(_.endpoint('/account/viewed/patients'), function(res) {
			this.setState({
				patients: res.records,
			});
		}.bind(this));

		const dashboardRequest = $.get(_.endpoint('/dashboard/'+`${processor}`));
		const graphRequest = $.get(_.endpoint('/stats/active'));	

		Promise.all([dashboardRequest, graphRequest]).then(([databoardData, graphData]) => {

			const site_active_count = databoardData.site_active_count;
			const study_active_count = databoardData.study_active_count;
			const subject_active_count = databoardData.subject_active_count;

			graphData.records.reverse();
			graphData.records[0].Sites = site_active_count;
			graphData.records[0].Studies = study_active_count;
			graphData.records[0].Subjects = subject_active_count;
			graphData.records.reverse();
				
			this.setState({
				sections: [],
				wallet: databoardData.wallet,
				ius_wallet: databoardData.ius_wallet,
				ous_wallet: databoardData.ous_wallet,
				reimbursements: databoardData.reimbursements,
				site_active_count,
				study_active_count,
				subject_active_count,
				main_status: graphData.records,
				loaded: true,
			});			
		});
		
	},

	openRecord: function(params) {
		this.refs.recordViewer.open(params);
	},

	open: function(view, params, e) {
		e.preventDefault();
		this.openRecord(params);
	},

	openReimbursement: function(view, params, e) {
		e.preventDefault();

		$.get(_.endpoint(`/patients/${params.data.patient_id}`), function(res) {
			this.openRecord({...params, ...{formProps: {_patient: res.record}, title:  Locale.getString('label.reimbursement-request', 'Reimbursement Request') + ` - ${res.record.id} - ${res.record.firstname}  ${res.record.lastname}`}});

		}.bind(this));
	},

	renderPieChart:function (data, props, containerProps) {
		const {Legend, PieChart, Pie, Cell, ResponsiveContainer} = RTBundle.Recharts;
		return (
			<ResponsiveContainer width='100%' height={120} {...containerProps}>
				<PieChart>
					<Pie
					startAngle={360} endAngle={0}
					// isAnimationActive={false} 
					data={data} 
					dataKey={'value'} 
					paddingAngle={0}
					legendType={'square'}
					outerRadius={40}
					{...props}
					>
						{
							data.map((entry, i) => {
							return <Cell key={i} fill={entry.color}/>
							})
						}
					</Pie>
					
					<Legend iconSize={8}/>
				</PieChart>
			</ResponsiveContainer>
		)
	},

	renderOUSInfo: function() {
		const data = [
			{name: Locale.getString('label.balance', 'Balance'), value: parseInt(this.state.ous_wallet.balance), color: '#3494ba'}, 
			{name: Locale.getString('label.pending', 'Pending'), value: parseInt(this.state.ous_wallet.pendingFunds), color: '#58b6c0'},
		];

		const meta = {label: 'OUS'};

		return (
			<div className="col-sm-4">
				{this.renderAccountSummary(Object.assign(meta, {type: 'balance', balance: this.state.ous_wallet.balance}))}
				{this.renderAccountSummary(Object.assign(meta, {type: 'pending', balance: this.state.ous_wallet.pendingFunds}))}
				<div>
					<div style={{textAlign: 'center', fontWeight: 'bold', marginTop: 10}}>{Locale.getString('title.funds', 'Funds')}</div>
					{this.renderPieChart(data)}
				</div>
			</div>
		);
	},

	renderIUSInfo: function() {
		const meta = this.state.enable_ous ? {label: 'IUS'} : {};

		return (
			<div className="col-sm-4">
				{this.renderAccountSummary(Object.assign(meta, {type: 'balance', balance: this.state.ius_wallet.balance}))}
				{this.renderAccountSummary(Object.assign(meta, {type: 'pending', balance: this.state.ius_wallet.pendingFunds}))}
				{this.state.enable_ous &&
				<div style={{marginBottom: 5}}>
					{this.renderIUSPieChart()}
				</div>
				}
			</div>
		);
	},

	renderIUSPieChart(meta = {}, containerProps = {}) {
		const data = [
			{name: Locale.getString('label.balance', 'Balance'), value: parseInt(this.state.ius_wallet.balance), color: '#3494ba'}, 
			{name: Locale.getString('label.pending', 'Pending'), value: parseInt(this.state.ius_wallet.pendingFunds), color: '#58b6c0'},
		];

		return (
			<div>
				<div style={{textAlign: 'center', fontWeight: 'bold', marginTop: 10}}>{Locale.getString('title.funds', 'Funds')}</div>
				{this.renderPieChart(data, meta, containerProps)}
			</div>
		)
	},

	renderCardPieChart(meta = {}, containerProps = {}) {
		const data = [
			{name: Locale.getString('label.remaining', 'Remaining'), value: parseInt(this.state.ius_wallet.remaining), color: '#3494ba'}, 
			{name: Locale.getString('label.pending', 'Pending'), value: parseInt(this.state.wallet.pending_cards_num), color: '#58b6c0'},
		];

		return (
			<div>
				<div style={{textAlign: 'center', fontWeight: 'bold', marginTop: 10}}>{Locale.getString('label.cards', 'Cards')}</div>
				{this.renderPieChart(data, {...{innerRadius: "60%"}, ...meta}, containerProps)}
			</div>
		)
	},

	renderBasicSummary: function(meta) {
		let color = ''; 
		let title = '';
		let balanceColor = '';
		let sectionStyle = {};
		if (meta.type == 'pending' || meta.type == 'site') {
			color = '#58b6c0';
			title = meta.type == 'pending' ? Locale.getString('title.pending-cards', 'Pending Cards') : Locale.getString('title.active-sites', 'Active Sites');
			balanceColor = meta.type == 'pending' ? 'grey' : ''; 
		} else if (meta.type == 'balance' || meta.type == 'study') {
			color = '#3494ba';
			title = meta.type == 'balance' ? Locale.getString('title.remaining-cards', 'Remaining Cards') : Locale.getString('title.active-studies', 'Active Studies');
		} else if (meta.type == 'subject') {
			color = '#75bda7';
			title = Locale.getString('title.active-subjects', 'Active Subjects');
			sectionStyle = {marginBottom: 0};
		}

		return (
		<div className="dashboard-section summany centered" style={{...{padding: 0, overflow: 'hidden'}, ...sectionStyle}}>
			<div style={{textAlign: 'center', background: color, color: 'white', padding: '7px 0', fontWeight: 'bold'}}>{title}</div>
			<p className="dashboard-value" style={{marginTop: 14, color: balanceColor}}>{meta.balance}</p>
		</div>
		)
	},

	renderAccountSummary(meta) {

		let color = ''; 
		let title = '';
		let balanceColor = '';
		if (meta.type == 'pending') {
			color = '#58b6c0';
			title = Locale.getString('title.pending-funds', 'Pending Funds');
			balanceColor = 'grey';
		} else if (meta.type == 'balance') {
			color = '#3494ba';
			title = Locale.getString('title.program-balance', 'Program Balance');
		}

		let balanceMarginTop = -2;
		if (!this.state.enable_ous) {
			balanceMarginTop = 14;
		}

		return (
		<div className="dashboard-section summany centered" style={{padding: 0, overflow: 'hidden'}}>
			<div style={{textAlign: 'center', background: color, color: 'white', padding: '7px 0', fontWeight: 'bold'}}>{title}</div>
			{meta.label &&
			<p style={{fontSize: 14}}>{meta.label}</p>}
			<p className="dashboard-value" style={{marginTop: balanceMarginTop, color: balanceColor}}>${_.numberFormat(meta.balance, 2)}</p>
		</div>
		)
	},

	render: function() {
		const {user, system, navigate} = this.props;

		if (user.type == 'patient') {
			return <PatientDashboardView {...this.props} />;
		}

		var getInitials = function(pat) {
			var parts = [];

			_.each(['firstname', 'middle', 'lastname'], function(field) {
				var val = pat[field] || '';
				if (val.length > 0)
					parts.push(val.substr(0, 1));
				else
					parts.push('-');
			});

			return parts.join('');
		};

		const {ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} = RTBundle.Recharts;

		const patientDialogProps = {
			style: {paddingTop: 57},
			dialogBodyStyle: {paddingTop: 0},
			dialogAction: <SystemOptionsDialog />
		};

		return (
			<div className="page" style={{marginTop: -5}}>
				{system.id != 5 && <h4 style={{fontSize: 18, textTransform: 'uppercase', marginBottom: 25}}>{Locale.getString('label.dashboard', 'Dasboard')}</h4>}

				<RecordViewer ref="recordViewer" {...this.props} user={user} navigate={navigate} onUpdate={this.loadDashboard} fromDashboard={true}/>

				{system.id == 5 &&
				<div className="row" style={{opacity: this.state.loaded ? 1 : 0.2, transition: 'opacity 0.4s ease'}}>
					<div className="col-sm-3">
						<div className="dashboard-section">
							<h4 style={{fontWeight: 'bold', fontSize: _.baseHeaderFontSize()}}>{Locale.getString('title.recently-viewed-subjects', 'Recently Viewed Subjects')}</h4>
							<div style={{minHeight: 100, fontSize: _.baseFontSize()}}>
								{this.state.patients
								.slice(0, 5)
								.map(pat => {
									return <p key={pat.id}><a href="#!" onClick={this.open.bind(null, PatientView, {title: Locale.getString('title.subject-profile', 'Subject Profile'), closeAfterEditing: false, endpoint: 'patients?id=' + pat.id, formComponent: PatientForm, dialogProps: patientDialogProps})}>{pat.id} {pat._international ? '' : ' - ' + getInitials(pat)} - {moment.utc(pat.date_added).local().format('DD-MMM-YYYY hh:mm A').toUpperCase()}</a></p>
								})}
							</div>
							<p><a href="#!" className="dashboard-action-button" onClick={navigate.bind(null, PatientView, {})}>{Locale.getString('button.view-all', 'View All')}</a></p>
						</div>

						{user.type != 'siteuser' && 
						<div>
							<div className="dashboard-section">
								<h4 style={{fontWeight: 'bold', fontSize: _.baseHeaderFontSize()}}>{Locale.getString('title.newest-reimbursement-stipend-requests', 'Newest Reimbursement / Stipend Requests')}</h4>
								<div style={{minHeight: 100, fontSize: _.baseFontSize()}}>
									{this.state.reimbursements
									.slice(0, 5)							
									.map(pr => {
									return <p key={pr.id}><a href="#!" onClick={this.openReimbursement.bind(null, PatientRequestForm, {title: 'Subject Profile', data: pr, closeAfterEditing: false, endpoint: `/patients/requests/${pr.id}`, source: `/patients/requests/${pr.patient_id}/${pr.study_id}`, formComponent: PatientRequestForm})}>{pr._symbol}{_.numberFormat(pr.amount, 2)} {pr._international === true ? '' : ' - ' + getInitials(pr)} - {moment.utc(pr.date_added).local().format('DD-MMM-YYYY hh:mm A').toUpperCase()}</a></p>
									})}
								</div>
								{this.state.loaded &&
								<p><a href="#!" className="dashboard-action-button" onClick={navigate.bind(null, PatientRequestView, {})}>{Locale.getString('button.view-all', 'View All')}</a></p>}
							</div>
							{this.renderBasicSummary({type: 'study', balance: this.state.study_active_count})}
							{this.renderBasicSummary({type: 'site', balance: this.state.site_active_count})}
							{this.renderBasicSummary({type: 'subject', balance: this.state.subject_active_count})}
						</div>
						}
					</div>

					{user.type != 'siteuser' && 
					<div className="col-sm-9">

						<div className="row">
							
							{this.renderIUSInfo()}
							
							{this.state.enable_ous &&
							this.renderOUSInfo()}

							<div className="col-sm-4">

								{this.renderBasicSummary({type: 'balance', balance: this.state.ius_wallet.remaining})}
								{this.renderBasicSummary({type: 'pending', balance: this.state.wallet.pending_cards_num})}
								{this.state.enable_ous && 
								<div>
									{this.renderCardPieChart()}
								</div>
								}
						
							</div>

							{!this.state.enable_ous && 
							<div className="col-sm-4">
								<div className='row'>
									<div className="col-sm-6" >
										{this.renderIUSPieChart({outerRadius: "95%"}, {height: 130})}
									</div>
									<div className="col-sm-6" >
										{this.renderCardPieChart({outerRadius: "95%", innerRadius: '75%'}, {height: 130})}
									</div>

								</div>
								
							</div>
							}

						</div>

						<div className="row">
							<div className="col-sm-12">
								<div style={{border: '1px solid #e4dfdf'}}>
									<ResponsiveContainer width='100%' height={this.state.enable_ous ? 350 : 430}>
										<ComposedChart data={this.state.main_status.slice(4)} margin={{top: 20, right: 30, left: 20, bottom: 5}} barGap={0}>
											<CartesianGrid vertical={false}/>
											<XAxis dataKey="name" tickLine={false}/>
											<YAxis yAxisId="left" orientation='left' axisLine={false} tickLine={false}/>
											<YAxis yAxisId="right" orientation='right' axisLine={false} tickLine={false}/>
											<Tooltip/>
											<Legend />
											<Bar yAxisId="left" dataKey="Studies"  fill="#3494ba" barSize={30} />
											<Bar yAxisId="left" dataKey="Sites"  fill="#58b6c0" barSize={30}/>
											<Line yAxisId="right" dataKey="Subjects" stroke="#75bda7" strokeWidth={5} dot={false}/>
										</ComposedChart>
									</ResponsiveContainer>
								</div>
							</div>
						</div>
					</div>
					}
				</div>
						
				}
			</div>
		);
	}

});
