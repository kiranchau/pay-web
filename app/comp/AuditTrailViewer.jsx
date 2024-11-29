const {Locale} = RTBundle;

var AuditTrailViewer = React.createClass({

	getDefaultProps: function() {
		return {
			source: '',
		};
	},

	componentDidMount: function() {
		this.handleUpdate();
	},

	handleUpdate: function() {
	},

	render: function() {
		return (
			<DataTable
				controls={null}
				createButtonLabel=""
				endpoint={this.props.source}
				sortable={false}
				fields={{
					account_id: {
						label: Locale.getString('title.changed-by', 'Changed By'),
						value: function() {
							return this.account.firstname + ' ' + this.account.lastname;
						}
					},

					op: {
						label: Locale.getString('title.operation', 'Operation'),
						value: function(val) {
							if (val == 'U' || this.field == 'icf_user_id')
								return 'Update';
							if (val == 'I')
								return 'Insert';
						}
					},

					date_added: {
						label: Locale.getString('label.date', 'Date'),
						value: function(val) {
							return moment.utc(val).local().format('DD-MMM-YYYY hh:mm:ss A').toUpperCase();
						}
					},

					ipaddress: {
						label: Locale.getString('title.ip-address', 'IP Address'),
					},

					field: {
						label: Locale.getString('title.field', 'Field'),
						value: function(val) {
							if (this.field == 'icf_user_id') {
								return 'ICF_status';
							}

							return val;
						}
					},

					oldvalue: {
						label: Locale.getString('title.from', 'From'),
						value: function(val) {
							if (this.field == 'icf_user_id') {
								return 0;
							}

							return val;
						}
					},

					newvalue: {
						label: Locale.getString('title.to', 'To'),
						value: function(val) {
							if (this.field == 'icf_user_id') {
								return 'ICF Verified';
							}

							return val;
						}
					},
				}}
			/>
		);
	},

});
