const {Locale} = RTBundle;

var HelpLog = React.createClass({

	getInitialState: function() {
		return {
			filterFunc: _.identity,
			filteredStatus: '',
			filteredPriority: '',
		};
	},

	filterHelpLogs: function(records) {
		var priority = this.state.filteredPriority;
		var status = this.state.filteredStatus;

		return _.filter(records, function(rec) {
			var pass = true;
			if (pass && status != '' && rec.status != status) {
				pass = false;
			}
			if (pass && priority !== '' && rec.priority != priority) {
				pass = false;
			}
			return pass;
		});
	},

	handleFilterChange: function(e) {
		var val = e.target.value;
		var state = this.state;
		var fieldName = e.target.name;
		state[fieldName] = val;
		this.setState(state);
	},

	handleFilters: function() {
		return (
			<span>
				<select name="filteredStatus" onChange={this.handleFilterChange} style={{marginLeft: 8, width: 100}}>
					<option value="">{Locale.getString('label.item', 'Item')}</option>
					<option value={1}>{Locale.getString('option.open', 'Open')}</option>
					<option value={2}>{Locale.getString('option.info', 'Info')}</option>
					<option value={4}>{Locale.getString('option.open', 'Open')}</option>
				</select>

				<select name="filteredPriority" onChange={this.handleFilterChange} style={{marginLeft: 8, width: 100}} >
					<option value="">{Locale.getString('option.priority', 'Priority')}</option>
					<option value={1}>{Locale.getString('option.asap', 'ASAP')}</option>
					<option value={2}>1</option>
					<option value={3}>2</option>
					<option value={4}>3</option>
				</select>
			</span>
		);
	},

	render: function() {
		return null;

		return (
			<div className="page">
				<DataTable
					{...this.props}
					endpoint='/helplogs'
					controls={HelpLogControls}
					dialogClassName="help"
					form={HelpLogForm}
					createButtonLabel={Locale.getString('button.new-request', 'New Request')}
					width={600}
					editOnRowClick={true}
					filterFunc={this.filterHelpLogs}
					onFilters={this.handleFilters}
					fields={{
						priority: {
							label: Locale.getString('option.priority', 'Priority'),
							width: "10%",
							value: function(val) {
								if (val == 1) {
									return Locale.getString('option.asap', 'ASAP');
								}
								else if (val == 2) {
									return "1";
								}
								else if (val == 3) {
									return "2";
								}
								else if (val == 4) {
									return "3";
								}
							},
							sortValue: function(val) {
								return parseInt(val);
							},
						},

						subject: {
							label: Locale.getString('title.task-description', 'Task / Description'),
							width: "70%",
							value: function(val) {
								var message = this.message;
								return (
									<p><strong>{val}</strong><br/>{message}</p>
								);
							},
						},

						status: {
							label: Locale.getString('title.status', 'Status'),
							width: "10%",
							value: function(val) {
								if (val == 1) {
									return Locale.getString('option.open', 'Open');
								}
								else if (val == 2) {
									return Locale.getString('option.info', 'Info');
								}
								else if (val == 4) {
									return Locale.getString('option.done', 'Done');
								}
							},
							sortValue: function(val) {
								return parseInt(val);
							},
						},

						date_added: {
							label: Locale.getString('title.date-posted', 'Date Posted'),
						 width: "10%",
							value: function(val) {
								var m = moment.utc(val).local();
								return m.format('DD-MMM-YYYY HH:mm: A').toUpperCase();
							},
						},
					}}
				/>
			</div>
		);
	},

});
