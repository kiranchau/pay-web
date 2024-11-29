const {Locale} = RTBundle;

var StudySiteView = React.createClass({

	getRouteInfo: function() {
		return {
			heading: Locale.getString('label.sites', 'Sites'),
			path: '/sites',
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
			countries: {},
			states: {},
			enable_ous: false,
			filteredSiteStatus: this.props.initialSiteStatus || '0',
			pendingDialog: null
		};
	},

	componentDidMount: function() {
		$.get(_.endpoint('/settings?ver=2'), function(res) {
			var enableOUS = parseInt(res.enable_ous) === 1 ? true : false;
			const {pendingDialog} = this.state;
 			this.setState({
				countries: res.countries,
				enable_ous: enableOUS,
				timezones: res.timezones,
				states: res.states,
				pendingDialog: null,
			}, () => {
				if (pendingDialog) {
					pendingDialog();
				}
			});
		}.bind(this));
	},

	handleFilter: function(e) {
		this.setState({
			filteredSiteStatus: e.target.value,
		});
	},

	filterFunc: function() {
		var SiteStatus = this.state.filteredSiteStatus;
		
		return function(record) {
			return record.status == SiteStatus ? true : false;
		}.bind(this);
	},

	handleFilters: function() {
		return (
			<select onChange={this.handleFilter} value={this.state.filteredSiteStatus} style={{marginLeft: 8, width: 160}}>
				<option value="0">{Locale.getString('option.active', 'Active')}</option>
				<option value="1">{Locale.getString('option.inactive', 'Inactive')}</option>
			</select>
		);
	},

	closeDialog: function() {
		this.setState({dialog: null});
	},

	handleSiteUpdate: function () {
		if (this.refs.siteDataTable) {
			_.defer(this.refs.siteDataTable.handleUpdate);
		}
	},

	handleRowClick: function(props) {
		return {
			onClick: (e) => {
				if (e) {
					e.preventDefault();
				}

				this.handleOpenStudySiteViewSummary(props.data)();
			}
		}
	},

	handleOpenStudySiteViewSummary: function(props) {
		return () => {
			const dialog = 
			<Dialog 
				{...this.props} 
				dialogAction={<SystemOptionsDialog />}
				style={{background: '#d3e3cc', paddingTop: 57}}
				dialogBodyStyle={{paddingTop: 0}}
				modal="true" 
				title={Locale.getString('title.site-summary', 'Site Summary')}
				onClose={this.closeDialog} 
				buttons={<button type="button" style={{background: 'white'}} onClick={this.closeDialog}>Close</button>}
			>
				<StudySiteViewSummary
					{...this.props}
					timezones={this.state.timezones}
					countries={this.state.countries}
					enable_ous={this.state.enable_ous}
					states={this.state.states}
					data={props}
					onUpdate={this.handleSiteUpdate}
				/>
			</Dialog>

			this.setState({dialog});
		}
	},

	render: function() {
		var countryList = this.state.countries;
		var enableOUS = this.state.enable_ous;
		var _this = this;
		return (
			<div className="page">
				{this.state.dialog}
				<DataTable
					{...this.props}
					ref='siteDataTable'
					endpoint="/sites"
					createButtonLabel={Locale.getString('button.new-study-site', 'New Study Site')}
					form={StudySiteForm}
					controls={StudySiteControls}
					enable_ous={enableOUS}
					dialogClassName={'width-60--md'}
					timezones={this.state.timezones}
					countries={this.state.countries}
					states={this.state.states}
					editOnRowClick={true}
					editTitle={Locale.getString('title.edit-study-site', 'Edit Study Site')}
					onRowProps={this.handleRowClick}
					onFilters={this.handleFilters}
					filterFunc={this.filterFunc()}
					onLoaded={function(dataTable) {
						var context = _this.props.context;
						if (!_.isUndefined(context) && !_.isUndefined(context.siteID) && _this.props.urlParams.cmd == 'view-site-summary') {
							var record = _.find(dataTable.state.records, function(rec) {
								return rec.id == context.siteID;
							});
							if (record) {
								if (Object.keys(_this.state.countries).length === 0) {
									_this.setState({pendingDialog: _this.handleOpenStudySiteViewSummary(record)});
								} else {
									_this.handleOpenStudySiteViewSummary(record)();
								}
								_this.props.setGlobalState({
									context: {},
									appLoading: false
								});
							}
						}
					}}
					fields={{
						_country_name: {
							label: Locale.getString('label.country', 'Country'),
							sortWithValue: true,
						},
						name: {
							label: Locale.getString('label.name', 'Name'),
						},
						phone: Locale.getString('label.phone', 'Phone'),
						fax: Locale.getString('title.fax', 'Fax'),
						address: Locale.getString('label.address', 'Address'),
						city: Locale.getString('label.city', 'City'),
						state: Locale.getString('label.state-region-province', 'State / Region / Province'),
						zipcode: Locale.getString('label.postal-code', 'Postal Code'),
						payment_method: {
							label: !enableOUS ? "" : Locale.getString('title.payment-method', 'Payment Method'),
							sortWithValue: false,
							align: 'center',
							sortable: false,
							value: function(val) {
							if (!enableOUS) {
								return;
							}
								if (val == 'bank') {
									return <i className="fa fa-bank" />;
								}
								if (val == 'card') {
									return <i className="fa fa-credit-card" />;
								}
							},
						},
						//timezone: 'Timezone',
					}}
				/>
			</div>
		);
	}

});

