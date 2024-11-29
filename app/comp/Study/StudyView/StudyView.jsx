const {Locale} = RTBundle;

var StudyView = React.createClass({

	getRouteInfo: function() {
		return {
			path: '/studies',
			heading: Locale.getString('title.studies', 'Studies'),
		};
	},

	getDefaultProps: function() {
		return {
			dateFormatClinical: 'DD-MMM-YYYY',
		};
	},

	getInitialState: function() {
		return {
			sites: [],
			filteredSiteID: this.props.initialSiteID || '',
			filteredStudyStatus: this.props.initialStudyStatus || '0',
			researchers: []
		};
	},

	componentDidMount: function() {
		$.get(_.endpoint('/sites'), function(res) {
			this.setState({
				sites: res.records,
			});
		}.bind(this));

		$.get(_.endpoint('/study-researchers'), function(res) {
			this.setState({
				researchers: res.records,
			});
        }.bind(this));
	},

	handleSiteFilter: function(e) {
		this.setState({
			filteredSiteID: e.target.value,
		}, this.handleStudyUpdate);
	},

	handleStatusFilter: function(e) {
		this.setState({
			filteredStudyStatus: e.target.value,
		}, this.handleStudyUpdate);
	},

	filterFunc: function() {
		const siteID = this.state.filteredSiteID;
		const studyStatus = this.state.filteredStudyStatus;

		return function(record) {
			
			let v = [];

			if (siteID !== '') {
				v.push(!_.isUndefined(record._sites[siteID]));
			} else {
				v.push(true);
			}

			v.push(record.status == studyStatus);

			return v.every((x) => {return x == true});


		}.bind(this);
	},

	handleFilters: function() {
		return (
			<span>
				<select onChange={this.handleSiteFilter} value={this.state.filteredSiteID} style={{marginLeft: 8, width: 130}}>
					<option value="">{Locale.getString('option.all-sites', 'All Sites')}</option>
					{_.map(this.state.sites, function(record) {
						return <option key={record.id} value={record.id}>{record.name}</option>;
					})}
				</select>

				<select onChange={this.handleStatusFilter} value={this.state.filteredStudyStatus} style={{marginLeft: 8, width: 130}}>
					<option value="0">{Locale.getString('title.active-studies', 'Active Studies')}</option>
					<option value="2">{Locale.getString('option.completed-studies', 'Completed Studies')}</option>
				</select>
			</span>
		);
	},

	closeDialog: function() {
		this.setState({dialog: null});
	},

	handleStudyUpdate: function () {
		if (this.refs.studyDataTable) {
			_.defer(this.refs.studyDataTable.handleUpdate);
		}
	},

	handleRowClick: function(props) {
		return {
			onClick: (e) => {
				e.preventDefault();
				this.handleOpenStudyViewSummary(props.data)();
			}
		}
	},

	handleOpenStudyViewSummary: function(props) {
		return () => {
			const dialog = 
			<Dialog 
				{...this.props}
				dialogAction={<SystemOptionsDialog />}
				modal="true" 
				title={Locale.getString('title.study-summary', 'Study Summary')}
				style={{background: '#d3e3cc', paddingTop: 57}}
				dialogBodyStyle={{paddingTop: 0}}
				onClose={this.closeDialog} 
				buttons={<button type="button" style={{background: 'white'}} onClick={this.closeDialog}>{Locale.getString('button.close', 'Close')}</button>}
			>
				<StudyViewSummary
					{...this.props}
					data={props}
					onUpdate={this.handleStudyUpdate}
				/>
			</Dialog>

			this.setState({dialog});
		}
	},
	
	renderVisitDialog: function(props) {
		const dialog = <StudyVisitDataTable 
							study={props} 
							onClose={this.closeDialog} 
							user={this.props.user} 
							system={this.props.system} 
							setGlobalState={this.props.setGlobalState}
							urlParams={this.props.urlParams}
						/>;

		this.setState({dialog});
	},

	render: function() {
		var _this = this;
		var reqParams = {};
		var filSiteID = this.state.filteredSiteID;
		var filStatus = this.state.filteredStudyStatus;

		if (filSiteID !== '') {
			reqParams = _.extend(reqParams, {site_id: filSiteID});
		}
		if (filStatus !== '') {
			reqParams = _.extend(reqParams, {status: filStatus});
		}

		return (
			<div className="page">

				{this.state.dialog}
				
				<DataTable
					{...this.props}
					ref='studyDataTable'
					requestParams={reqParams}
					refetchStudies={this.state.refetchStudies}
					endpoint="/studies"
					createButtonLabel={Locale.getString('button.new-study', 'New Study')}
					form={StudyForm}
					controls={StudyControls}
					closeAfterSaving={true}
					editOnRowClick={true}
					editTitle={Locale.getString('button.edit-study', 'Edit Study')}
					onRowProps={this.handleRowClick}
					remotePaging={true}
					onFilters={this.handleFilters}
					onLoaded={function(dataTable) {
						var context = _this.props.context;
						if (!_.isUndefined(context) && !_.isUndefined(context.studyID) && _this.props.urlParams.cmd == 'view-study-summary') {
							var record = _.find(dataTable.state.records, function(rec) {
								return rec.id == context.studyID;
							});
							if (record) {
				
								_this.handleOpenStudyViewSummary(record)();

								_this.props.setGlobalState({
									context: {},
									appLoading: false
								});
							}
						} else if (!_.isUndefined(context) && !_.isUndefined(context.studyID) && _this.props.urlParams.cmd == 'view-study-visits'){
							var record = _.find(dataTable.state.records, function(rec) {
								return rec.id == context.studyID;
							});
							if (record) {

								_this.renderVisitDialog(record);

								_this.props.setGlobalState({
									context: {},
									appLoading: false
								});
							}
						} else if (_this.props.urlParams && _this.props.urlParams.cmd == 'view-study-site-visits'){
							var record = _.find(dataTable.state.records, function(rec) {
								return rec.id == _this.props.urlParams.study_id;
							});
							if (record) {

								_this.renderVisitDialog(record);
							}
						}
					}}
					fields={{
						sponsor_id: {
							label: Locale.getString('title.sponsor', 'Sponsor'),
							width: '25%',
							value: function() {
								return this.sponsor.name;
							},
							sortWithValue: true,
						},
						protocol: {
							label: Locale.getString('title.protocol', 'Protocol'),
							width: '25%',
							value: function(val) {
								return val.length > 30 ? (val.substr(0, 30) + '...') : val;
							},
							title: function(val) {
								return val;
							},
							sortWithValue: false,
						},
						cro_id: {
							label: Locale.getString('label.cro', 'CRO'),
							width: '25%',
							value: (val) => {
								let name = '';
								this.state.researchers.forEach(e => {
									if (e.id == val) {
										name = e.name
									}
								});
								return name;
							}
						},
						title: {
							label: Locale.getString('title.clinical-description', 'Clinical Description'),
							width: '25%',
							value: function(val) {
								return val.length > 30 ? (val.substr(0, 30) + '...') : val;
							},
							title: function(val) {
								return val;
							},
							sortWithValue: false,
						},
					}}
				/>
				
			</div>
		);
	}

});


