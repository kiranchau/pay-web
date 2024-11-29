const {Locale} = RTBundle;

var UserView = React.createClass({

	getRouteInfo: function() {
		return {
			path: '/users',
			heading: Locale.getString('label.system-users', 'System Users'),
		};
	},

	getInitialState: function () {
		return {
			filteredSystemUserStatus: '1',
		};
	},
	componentDidMount: function() {
		if (this.props.system.id == 5) {
			var cache = this.props.cache;
			cache.adminNavToggle = true;
			this.props.setGlobalState({
				cache: cache,
			});
		}
	},

	handleFilter: function (e) {
		this.setState({
			filteredSystemUserStatus: e.target.value,
		});
	},
	handleFilters: function () {
		return (
			<select onChange={this.handleFilter} value={this.state.filteredSystemUserStatus} style={{ marginLeft: 8, width: 160 }}>
				<option value="1">{Locale.getString('option.active', 'Active')}</option>
				<option value="0">{Locale.getString('option.inactive', 'Inactive')}</option>
				<option value="2">All</option>
			</select>
		);
	},
	filterFunc: function () {
		var SystemUserStatus = this.state.filteredSystemUserStatus;
		return function (record) {
			if (SystemUserStatus === "2") {
				return record.account_status != SystemUserStatus ? true : false;
			} else {
				return record.account_status == SystemUserStatus ? true : false;
			}
		}.bind(this);
	},
	handleUserUpdate: function() {
		$.get(_.endpoint('/stat'), function(res) {
			this.props.setGlobalState({
				user: res.user,
			});
		}.bind(this));
	},

	render: function() {
		var dateFormat = this.props.system.id == 5 ? 'DD-MMM-YYYY hh:mm A' : 'MMM D, YYYY hh:mm A';
		var dateFunc;
		
		if (this.props.system.id == 5) {
			dateFunc = function(val) {
				return moment.utc(val).local().format(dateFormat).toUpperCase();
			};
		}
		else {
			dateFunc = function(val) {
				return moment.utc(val).local().format(dateFormat);
			};
		}

		return (
			<div className="page">
				<DataTable 
					{...this.props}
					endpoint="/users"
					controls={UserControls}
					form={UserForm}
					createButtonLabel={Locale.getString('button.add-user', 'Add User')}
					showXOnSave={false}
					bottom={'_auto'}
					isAdmin={this.props.user.is_admin == 1}
					onUpdate={this.handleUserUpdate}
					closeAfterSaving={this.props.system.id != 5}
					editTitle={Locale.getString('title.user-information', 'User Information')}
					createTitle={Locale.getString('title.user-information', 'User Information')}
					onFilters={this.handleFilters}
					filterFunc={this.filterFunc()}
					editOnRowClick={this.props.system.id == 5}
					fields={{
						firstname: {
							label: Locale.getString('label.first-name', 'First Name'),
						},
						lastname: {
							label: Locale.getString('label.last-name', 'Last Name'),
						},
						company: {
							label: Locale.getString('label.company', 'Company'),
						},
						emailaddress: {
							label: Locale.getString('title.email', 'Email'),
						},
						account_status: {
							label: 'Status',
							value: function(val) {
								if (val == "1") {
									return 'Active';
								}
								return 'Inactive';
							},
						},
						phonenumber: Locale.getString('label.phone', 'Phone'),
						fax: Locale.getString('title.fax', 'Fax'),
						date_updated: {
							label: Locale.getString('title.updated', 'Updated'),
							sortWithValue: false,
							value: dateFunc,
						},
						date_seen: {
							label: Locale.getString('title.logindate', 'Login Date'),
							sortWithValue: false,
							value: function(val){
								if(val == null){
									return "";
								}
								return moment.utc(val).local().format(dateFormat).toUpperCase();
							},
						},
					}}
				/>
			</div>
		);
	}

});
