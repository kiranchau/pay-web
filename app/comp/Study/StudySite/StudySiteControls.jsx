const {Locale} = RTBundle;

var StudySiteControls = React.createClass({

	getDefaultProps: function() {
		return {
			data: {},
		};
	},

	getInitialState: function() {
		return {
			filter: {},
		};
	},

	setField: function(key, value) {
		var filter = this.state.filter;
		filter[key] = value;
		this.setState({
			filter:	filter
		}, this.refs.siteuserTable.handleUpdate);
	},

	handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	closeDialog: function() {
		this.props.onShow({dialog: null});
	},

	getFilterFunc: function() {
		return function(record) {
			var pass = true;
			if (this.state.filter.active !== '' && this.state.filter.active !== undefined) {
				pass = parseInt(record.active) === parseInt(this.state.filter.active);
			}
			return pass;
		}.bind(this);
	},

	renderFilters: function() {
		var options = [
			{id: 1, label: Locale.getString('option.active-users', 'Active Users')},
			{id: 0, label: Locale.getString('label.inactive-users', 'Inactive Users')},
		];
		return (
			<span style={{'float': 'right', marginRight: 15}}>
				<select name="active" value={this.state.filter.active} onChange={this.handleChange}>
					<option value="">{Locale.getString('option.all-users', 'All Users')}</option>
					{_.map(options, function(option) {
						return <option key={option.id} value={option.id}>{option.label}</option>;
					})}
				</select>
			</span>
		);
	},

	renderUserDialog: function() {
		return (
			<Dialog {...this.props} title={Locale.getString('title.study-site-users', 'Study Site Users')} onClose={this.closeDialog} buttons={<button type="button" onClick={this.closeDialog}>{Locale.getString('button.close', 'Close')}</button>}>
				<DataTable
					endpoint={'/sites/users/' + this.props.data.id}
					createButtonLabel={Locale.getString('button.new-user', 'New User')}
					ref="siteuserTable"
					key={this.state.filter.active}
					controls={UserControls}
					additionalClassName=""
					optionsClassName="col-offset-2"
					form={UserForm}
					bottom={'_auto'}
					editTitle={Locale.getString('title.user-information', 'User Information')}
					createTitle={Locale.getString('title.user-information', 'User Information')}
					site={this.props.data}
					user={this.props.user}
					system={this.props.system}
					editOnRowClick={true}
					fields={{
						firstname: Locale.getString('label.first-name', 'First Name'),
						lastname: Locale.getString('label.last-name', 'Last Name'),
						_role: {
							label: Locale.getString('label.role', 'Role'),
							value: function(val) {
								var roles = _.siteUserRoles();
								if (!_.isUndefined(roles[val]))
									return roles[val];
								return '';
							}
						},
						emailaddress: Locale.getString('label.email-address', 'Email Address'),
						company: Locale.getString('label.company', 'Company'),
						phonenumber: Locale.getString('label.phone', 'Phone'),
						fax: Locale.getString('title.fax', 'Fax'),
					}}
					onFilters={this.renderFilters}
					filterFunc={this.getFilterFunc()}
				/>
			</Dialog>
		);
	},

	renderDialog: function() {
		return (
			<Dialog {...this.props} title={Locale.getString('title.nearby-locations', 'Nearby Locations')} onClose={this.closeDialog} buttons={<button type="button" onClick={this.closeDialog}>{Locale.getString('button.close', 'Close')}</button>}>
				<DataTable
					endpoint={'/sites/locations/' + this.props.data.id}
					createButtonLabel={Locale.getString('button.new-location', 'New Location')}
					form={StudySiteLocationForm}
                    controls={StudySiteLocationControls}
					editOnRowClick={true}
					fields={{
						name: Locale.getString('label.name', 'Name'),
						address: Locale.getString('label.address', 'Address'),
						city: Locale.getString('label.city', 'City'),
						state: Locale.getString('title.state', 'State'),
						zipcode: Locale.getString('label.zip-postalcode', 'Zip / Postal Code'),
					}}
				/>
			</Dialog>
		);
	},

	render: function() {
				// console.log(this.state.filter);
		return (
			<td className="record-controls">
				<a className="app-edit" title={Locale.getString('label.manage-users', 'Manage users for this study.')} onClick={this.props.onShow.bind(null, {dialog: this.renderUserDialog()})}><i className="fa fa-users"></i></a>
				<a className="app-edit" title={Locale.getString('label.manage-locations', 'Manage nearby locations for this study site.')} onClick={this.props.onShow.bind(null, {dialog: this.renderDialog()})}><i className="fa fa-building-o"></i></a>
				<a className="app-edit" title={Locale.getString('label.edit-study-site', 'Edit this study site')} onClick={this.props.onEdit.bind(null, {record:this.props.data, title: 'Site Information'})}><i className="fa fa-pencil"></i></a>
			</td>
		);
	}

});


