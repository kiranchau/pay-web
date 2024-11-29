const {Locale} = RTBundle;

var FundingView = React.createClass({

	getRouteInfo: function() {
		return {
			path: '/funding',
			heading: Locale.getString('title.pay-account-information', 'Pay Account Information'),
		};
	},

	getInitialState: function() {
		return {
			dialog: null,
			errors: {},
			data: {},
			enable_ous: false,
			dialogType: '',
			featureFlagOn:{},
			pay_processor:{},
		};
	},

	componentDidMount: function() {
		var cache = this.props.cache;
		cache.adminNavToggle = true;
		this.props.setGlobalState({
			cache: cache,
		});
		this.loadSettings();
		$.get(_.endpoint('/api/v1/pay-processor'), function(res) {
			this.setState({pay_processor:res.records});
		}.bind(this));	
	},

	loadSettings: function() {
		$.get(_.endpoint('/settings'), function(res) {
			this.setState({featureFlagOn:res.feature_flag});
			var data = this.state.data;
			var enable_ous = parseInt(res.enable_ous) === 1 ? true : false;
			if (!enable_ous) {
				data.program = 'ius';
			}
			this.setState({
				enable_ous: enable_ous,
				data: data,
			});
		}.bind(this));
	},

	handleChange: function(e) {
		var data = this.state.data;
		data[e.target.name] = e.target.value;
		this.setState({
			data: data,
		}, () => {
			if (this.state.dialog) {
				let dialog;
				if (this.state.dialogType == 'fund') {
					dialog = this.renderFundingDialog()
				} else if (this.state.dialogType == 'card') {
					dialog = this.renderCardDialog()
				} else if (this.state.dialogType == 'cardAssignment') {
					dialog = this.renderCardAssignment()
				}
				this.setState({
					dialog
				});
			}
		});
	},

	handleFundingRequest: function(e) {
		e.preventDefault();
		this.setState({
			dialog: this.renderFundingDialog(),
			dialogType: 'fund'
		});
	},

	handleManualCard: function(e) {
		e.preventDefault();
		this.setState({
			dialog: this.renderCardAssignment(),
			dialogType: 'cardAssignment'
		});
	},

	handleCardRequest: function(e) {
		e.preventDefault();
		this.setState({
			dialog: this.renderCardDialog(),
			dialogType: 'card'
		});
	},

	handleBalanceUpdate: function(e) {
		e.preventDefault();

		$.post(_.endpoint('/funding/balance-update'), function(res) {
			if (_.isUndefined(res.status) || res.status > 0) {
				this.setState({
					error: res.error,
				});
			}
		}.bind(this));
	},

	handleUpdate: function() {
		this.refs.pendingCards.handleUpdate();
		this.refs.pendingFunds.handleUpdate();
		this.refs.previousRequests.handleUpdate();
	},

	closeDialog: function() {

		this.setState({
			dialog: null,
			data: {program: this.state.data.program},
			dialogType: ''
		});
	},

	handleRequestApproval: function(type, id, e) {
		e.preventDefault();
		this.setState({
			dialog: this.renderActionDialog({
				type: type,
				id: id,
				title: Locale.getString('title.confirm-request-approval', 'Confirm Request Approval'),
				message: Locale.getString('message.confirm-request-approval', 'Are you sure you would like to approve this request?'),
				endpoint: '/funding/requests/approve/' + type + '/' + id,
			}),
		});
	},

	handleRequestDenial: function(type, id, e) {
		e.preventDefault();
		this.setState({
			dialog: this.renderActionDialog({
				type: type,
				id: id,
				title: Locale.getString('title.confirm-request-void', 'Confirm Request Void'),
				message: Locale.getString('message.confirm-request-approval', 'Are you sure you would like to void this request?'),
				endpoint: '/funding/requests/void/' + type + '/' + id,
				reason: true,
			}),
		});
	},

	renderActionDialog: function(params) {
		params = params || {};
		var reason = '';

		var updateReason = function(e) {
			reason = e.target.value;
		};

		var makeRequest = function() {
			$.post(_.endpoint(params.endpoint), {reason: reason}, function(res) {
				if (!_.isUndefined(res.status) && res.status < 2) {
					let data = {};
					if (!this.state.enable_ous) {
						data.program = 'ius';
					}
					this.setState({
						errors: {},
						data,
						dialog: (
							<Dialog width="400" title={res.title} buttons={<button type="button" onClick={this.closeDialog}>Okay</button>}>
								<p>{res.message}</p>
							</Dialog>
						),
					});
					this.handleUpdate();
				}
				else {
					this.setState({
						dialog: this.renderActionDialog(_.extend(params, {errors: res.errors})),
					});
				}
			}.bind(this));
		}.bind(this);

		var buttons = <div>
			<button type="button" onClick={this.closeDialog}>{Locale.getString('button.cancel', 'Cancel')}</button>
			<button type="button" onClick={makeRequest} style={{color: '#fff', background: _.primaryBrandColor()}}>{Locale.getString('button.confirm', 'Confirm')}</button>
		</div>;

		return (
			<Dialog title={params.title} onClose={this.closeDialog} width="400" buttons={buttons}>
				<p>{params.message}</p>
				<ErrorDisplay message={params.errors && params.errors.generic} />
				{params.reason &&
				<div className="form dialog" style={{marginTop: 20}}>
					<textarea onChange={updateReason} placeholder={Locale.getString('message.provide-details', 'Please provide details for why this request is being voided.')}/>
					<ErrorDisplay message={params.errors && params.errors.reason} />
				</div>}
			</Dialog>
		);
	},

	renderCardDialog: function(params) {
		params = params || {};
		var saveRequest = function() {
			var data = this.state.data;
			
			$.post(_.endpoint('/funding/requests/cards'), data, function(res) {
				let data = {};
				if (!this.state.enable_ous) {
					data.program = 'ius';
				}
				if (!_.isUndefined(res.status) && res.status < 2) {
					this.setState({
						errors: {},
						data,
						dialog: (
							<Dialog width="400" title={Locale.getString('title.card-request-created', 'Card Request Created')} buttons={<button type="button" onClick={this.closeDialog}>{Locale.getString('label.okay', 'Okay')}</button>}>
								<p>{Locale.getString('message.card-request-created', 'Your card request has been successfully created.')}</p>
							</Dialog>
						),
					});
					this.handleUpdate();
				}
				else {
					this.setState({
						dialog: this.renderCardDialog({errors: res.errors}),
					});
				}
			}.bind(this));
		}.bind(this);

		var buttons = <div>
			<button type="button" onClick={this.closeDialog}>{Locale.getString('button.cancel', 'Cancel')}</button>
			<button type="button" onClick={saveRequest} style={{color: '#fff', background: _.primaryBrandColor()}}>{Locale.getString('button.create', 'Create')}</button>
		</div>;

		return (
			<Dialog title={Locale.getString('title.new-card-request', 'New Card Request')} onClose={this.closeDialog} width="400" buttons={buttons}>
				<dl className="form dialog">
					<dt>{Locale.getString('title.num-cards', 'Number of Cards')}</dt>
					<dd>
						<input name="num" type="text" onChange={this.handleChange} value={this.state.data.num} placeholder={Locale.getString('label.minimum', 'Minimum') + ": 100"} />
						<ErrorDisplay message={params.errors && params.errors.num} />
					</dd>

					{this.state.enable_ous &&
					<div>
						<dt>IUS or OUS</dt>
						<dd>
							<select name="program" value={this.state.data.program} onChange={this.handleChange} >
								<option value="">{Locale.getString('option.select', 'Select')}...</option>
								<option value="ius">IUS</option>
								<option value="ous">OUS</option>
							</select>
							<ErrorDisplay message={params.errors && params.errors.program} />
						</dd>
					</div>}

					<dt>{Locale.getString('label.comments', 'Comments')}</dt>
					<dd>
						<textarea name="note" rows="4" onChange={this.handleChange} value={this.state.data.note} />
					</dd>
				</dl>
			</Dialog>
		);
	},

	renderCardAssignment: function(params) {
		params = params || {};

		var saveRequest = function() {
			if (this.state.saving) {
				return;
			}
			else {
				this.setState({ saving: true });
			}
			
			$.post(_.endpoint('/patients/cards/assign/manual'), this.state.data, function(res) {
				if (!_.isUndefined(res.status) && res.status < 2) {
					this.setState({
						errors: {},
						data: {},
						dialog: (
							<Dialog width="400" title={Locale.getString('title.card-assigned', 'Card Assigned')} buttons={<button type="button" onClick={this.closeDialog}>{Locale.getString('label.okay', 'Okay')}</button>}>
								<p>{Locale.getString('message.card-assigned', 'Your card has been successfully assigned.')}</p>
							</Dialog>
						),
						saving: false
					});
					this.handleUpdate();
				}
				else {
					this.setState({
						errors: res.errors,
						dialog: this.renderCardAssignment({errors: res.errors}),
						saving: false
					});
				}
			}.bind(this));
		}.bind(this);

		var buttons = (
			<div>
				<button type="button" onClick={this.closeDialog}>{Locale.getString('button.cancel', 'Cancel')}</button>
				<button type="button" onClick={saveRequest} style={{color: '#fff', background: _.primaryBrandColor()}}>{Locale.getString('button.assign', 'Assign')}</button>
			</div>
		);
		return (
			<Dialog title={Locale.getString('title.new-card-assignment', 'New Card Assignment')} onClose={this.closeDialog} width="400" buttons={buttons}>
				<dl className="form dialog" style={{ paddingLeft: 10 }}>
					<dt>{Locale.getString('label.mrn', 'MRN')}</dt>
					<dd>

						<input name="id" id='id' type="text" style={{width: '95%'}} onChange={this.handleChange} value={this.state.data.id} />
						<ErrorDisplay message={params.errors && params.errors.id} />
					</dd>

					<dt>{Locale.getString('label.new-control-number', 'New Control Number')}</dt>
					<dd>
						<input name="control_number" id='control_number' type="text" style={{width: '95%'}} onChange={this.handleChange} value={this.state.data.control_number} />
						<ErrorDisplay message={params.errors && params.errors.control_number} />
					</dd>

					<dt>{Locale.getString('label.last-4-digits', 'Last 4 Digits')}</dt>
					<dd>
						<input name="lastFour" id='lastFour' type="text" style={{width: '95%'}} onChange={this.handleChange} value={this.state.data.lastFour} />
						<ErrorDisplay message={params.errors && params.errors.lastFour} />
					</dd>

					<dt>{Locale.getString('label.card-token', 'Card Token')}</dt>
					<dd>
						<input name="token" id='token' type="text" style={{width: '95%'}} onChange={this.handleChange} value={this.state.data.token} />
						<ErrorDisplay message={params.errors && params.errors.token} />
					</dd>

					<dt>{Locale.getString('label.user-token', 'User Toekn')}</dt>
					<dd>

						<input name="user_token_card" id='user_token_card' type="text" style={{width: '95%'}} onChange={this.handleChange} value={this.state.data.user_token_card} />
						<ErrorDisplay message={params.errors && params.errors.user_token_card} />
					</dd>
				</dl>
			</Dialog>
		);
	},

	renderFundingDialog: function(params) {
		params = params || {};

		var saveRequest = function() {
			if (this.state.saving) {
				return;
			}
			else {
				this.setState({ saving: true });
			}
			
			$.post(_.endpoint('/funding/requests/funds'), this.state.data, function(res) {
				if (!_.isUndefined(res.status) && res.status < 2) {
					this.setState({
						errors: {},
						data: {},
						dialog: (
							<Dialog width="400" title={Locale.getString('title.funding-request-created', 'Funding Request Created')} buttons={<button type="button" onClick={this.closeDialog}>{Locale.getString('label.okay', 'Okay')}</button>}>
								<p>{Locale.getString('message.funding-created', 'Your funding request has been successfully created.')}</p>
							</Dialog>
						),
						saving: false
					});
					this.handleUpdate();
				}
				else {
					this.setState({
						errors: res.errors,
						dialog: this.renderFundingDialog({errors: res.errors}),
						saving: false
					});
				}
			}.bind(this));
		}.bind(this);

		var buttons = (
			<div>
				<button type="button" onClick={this.closeDialog}>{Locale.getString('button.cancel', 'Cancel')}</button>
				<button type="button" onClick={saveRequest} style={{color: '#fff', background: _.primaryBrandColor()}}>{Locale.getString('button.create', 'Create')}</button>
			</div>
		);
		return (
			<Dialog title={Locale.getString('title.new-funding-request', 'New Funding Request')} onClose={this.closeDialog} width="400" buttons={buttons}>
				<dl className="form dialog">
					{this.state.featureFlagOn == 1 ? 
						<div>
						<dt>{Locale.getString("label.payment-processor", 'Payment Processor')}</dt>
						<dd>
							<select name="processor" value={this.state.data.processor} onChange={this.handleChange} >
							<option value="">{Locale.getString('option.select', 'Select')}...</option>
								{_.map(this.state.pay_processor, function(pay) {
								return <option key={pay.id} value={pay.id} name={pay.name}>{pay.name}</option>;
								})}
							</select>
						</dd>
						</div> 
						: ""}
					<dt>{Locale.getString('label.funding-amount', 'Funding Amount')} $</dt>
					<dd>

						<label htmlFor='amount' style={{border: '1px solid #ccc', display: 'inline-block', padding: '6px 0', borderRight: 0, paddingLeft: 7}}>$</label>
						<input name="amount" id='amount' type="text" style={{width: '95%', paddingLeft: 2, borderLeft: 0}} onChange={this.handleChange} value={this.state.data.amount} />
						<ErrorDisplay message={params.errors && params.errors.amount} />
					</dd>

					<dt>{Locale.getString('label.funding-type', 'Funding Type')}</dt>
					<dd>
						<select name="transfer_type" value={this.state.data.transfer_type} onChange={this.handleChange} >
							<option value="">{Locale.getString('option.select', 'Select')}...</option>
							<option value="ACH">ACH</option>
							<option value="Wire">Wire</option>
							<option value="Other">Other</option>
						</select>
					</dd>

					{this.state.enable_ous &&
					<div>
						<dt>IUS or OUS</dt>
						<dd>
							<select name="program" value={this.state.data.program} onChange={this.handleChange} >
								<option value="">{Locale.getString('option.select', 'Select')}...</option>
								<option value="ius">IUS</option>
								<option value="ous">OUS</option>
							</select>
							<ErrorDisplay message={params.errors && params.errors.program} />
						</dd>
					</div>}

					<dt>{Locale.getString('label.comments', 'Comments')}</dt>
					<dd>
						<textarea name="note" rows="4" onChange={this.handleChange} value={this.state.data.note} />
						<ErrorDisplay message={params.errors && params.errors.note} />
					</dd>
				</dl>
			</Dialog>
		);
	},

	render: function() {
		const payProcessor = [
			..._.map(this.state.pay_processor, function(pay) {
					return <label key={pay.id} value={pay.id} name={pay.name}>{pay.name}</label>;
			})
		]
		var _this = this;
		var canManage = parseInt(this.props.user.options.funding_approval) == 1;

		return (
			<div className="page">
				{this.state.dialog}
				<div className="row" style={{padding: '30px 0'}}>
					<div className="col-sm-3">
						<a href="#!" onClick={this.handleFundingRequest} className="button-action">{Locale.getString('button.create-funding-request', 'Create New Funding Request')}</a>
					</div>
					<div className="col-sm-3">
						<a href="#!" onClick={this.handleCardRequest} className="button-action">{Locale.getString('button.request-additional-cards', 'Request Additional Cards')}</a>
					</div>

					{canManage && 
					<div className="col-sm-3">
						<a href="#!" onClick={this.handleBalanceUpdate} className="button-action">{Locale.getString('button.rebalance-hyperwallet', 'Rebalance Hyperwallet')}</a>
					</div>
					}

					{canManage && 
					<div className="col-sm-3">
						<a href="#!" onClick={this.handleManualCard} className="button-action">{Locale.getString('button.manual-card-assignment', 'Manual Card Assignment/Replacement')}</a>
					</div>
					}			
				</div>
				<div className="row">
					<div className="col-sm-12">
						<h5><strong>{Locale.getString('title.pending-funding-requests', 'Pending Funding Requests')}</strong></h5>
						<div style={{padding:5, border: '1px solid #ccc', margin: '5px 0 25px'}}>
							<DataTable
								ref="pendingFunds"
								endpoint="/funding/requests/funds?pending=1"
								searchEnabled={false}
								fields= {
									this.state.featureFlagOn == 1 ? 
									{
									code: {
										label: 'ID',
										width: '10%',
									},
									program: {
										label: 'IUS/OUS',
										width: '10%',
										value: function(val) {
											if (val) {
												return val.toUpperCase();
											}
											return null;
										},
									},
									date_added: {
										label: Locale.getString('title.created', 'Created'),
										width: '15%',
										value: function(val) {
											return moment.utc(val).local().format('DD-MMM-YYYY hh:mm:ss A').toUpperCase();
										},
										sortWithValue: false,
									},
									user_id: {
										label: Locale.getString('title.requested-by', 'Requested By'),
										width: '15%',
										value: function(val) {
											if (this.user) {
												return this.user.firstname + ' ' + this.user.lastname;
											}
											return '--';
										},
									},
									processor: {label: Locale.getString('label.payment-processor', 'Payment Processor'),
			                            width: '15%',
									    value: function(val) {							
											var name = '';
											payProcessor.forEach(function(pay){
											
											if (pay.key == val) {
												name = pay.props.name;
											}
											});
										return name; 
										},
									},
									 
									amount: {
										label: Locale.getString('title.amount', 'Amount'),
										width: '10%',
										value: function(val) {
											return '$' + parseFloat(val).toFixed(2);
										},
									},
									note: {
										width: '20%',
										label: Locale.getString('title.comments', 'Comments'),
										value: function(val) {
											val = val || '';
											var len = val.toString().length;
											if (len > 75) {
												return <span title={val}>{val.substr(72) + '...'}</span>;
											}
											return val;
										}
									},
									_: {
										label: null,
										width: '10%',
										sortable: false,
										value: function() {
											if (!canManage) {
												return null;
											}
											return (
												<div className="record-controls">
													<a href="#!" onClick={_this.handleRequestApproval.bind(null, 'funds', this.id)}><i className="fa fa-check" /> {Locale.getString('button.approve', 'Approve')}</a>
													<a href="#!" onClick={_this.handleRequestDenial.bind(null, 'funds', this.id)}><i className="fa fa-ban" /> {Locale.getString('option.void', 'Void')}</a>
												</div>
											);
										}
									}
								    }
								    : 
								        {
									    code: {
										    label: 'ID',
										width: '10%',
									    },
									    program: {
										    label: 'IUS/OUS',
										    width: '10%',
										    value: function(val) {
											if (val) {
												return val.toUpperCase();
											}
											return null;
										},
									},
									    date_added: {
										    label: Locale.getString('title.created', 'Created'),
										    width: '15%',
										    value: function(val) {
											return moment.utc(val).local().format('DD-MMM-YYYY hh:mm:ss A').toUpperCase();
										},
										    sortWithValue: false,
									},
									    user_id: {
										    label: Locale.getString('title.requested-by', 'Requested By'),
										    width: '15%',
										    value: function(val) {
											if (this.user) {
												return this.user.firstname + ' ' + this.user.lastname;
											}
											return '--';
										},
									},
									    amount: {
										    label: Locale.getString('title.amount', 'Amount'),
										    width: '10%',
										    value: function(val) {
											return '$' + parseFloat(val).toFixed(2);
										},
									},
									    note: {
										    width: '20%',
										    label: Locale.getString('title.comments', 'Comments'),
										    value: function(val) {
											val = val || '';
											var len = val.toString().length;
											if (len > 75) {
												return <span title={val}>{val.substr(72) + '...'}</span>;
											}
											return val;
										}
									},
									_: {
										label: null,
										    width: '10%',
										    sortable: false,
										    value: function() {
											if (!canManage) {
												return null;
											}
											return (
												<div className="record-controls">
													<a href="#!" onClick={_this.handleRequestApproval.bind(null, 'funds', this.id)}><i className="fa fa-check" /> {Locale.getString('button.approve', 'Approve')}</a>
													<a href="#!" onClick={_this.handleRequestDenial.bind(null, 'funds', this.id)}><i className="fa fa-ban" /> {Locale.getString('option.void', 'Void')}</a>
												</div>
											);
										}
									}
								}}
							/>
						</div>
						<h5><strong>{Locale.getString('title.pending-card-requests', 'Pending Card Requests')}</strong></h5>
						<div style={{padding:5, border: '1px solid #ccc', margin: '5px 0 25px'}}>
							<DataTable
								ref="pendingCards"
								endpoint="/funding/requests/cards?pending=1"
								searchEnabled={false}
								fields={{
									id: {
										label: 'ID',
										width: '15%',
										value: function(val) {
											return 'RTPC' + _.padLeft(val, 6, '0');
										}
									},
									date_added: {
										label: Locale.getString('title.created', 'Created'),
										width: '25%',
										value: function(val) {
											return moment.utc(val).local().format('DD-MMM-YYYY hh:mm:ss A').toUpperCase();
										},
										sortWithValue: false,
									},
									user_id: {
										label: Locale.getString('title.requested-by', 'Requested By'),
										width: '25%',
										value: function(val) {
											if (this.user) {
												return this.user.firstname + ' ' + this.user.lastname;
											}
											return '--';
										},
									},
									num: {
										label: Locale.getString('title.num-cards', 'Number of Cards'),
										value: function(val) {
											return val;
										},
									},
									note: {
										width: '30%',
										label: Locale.getString('label.comments', 'Comments'),
										value: function(val) {
											val = val || '';
											var len = val.toString().length;
											if (len > 75) {
												return <span title={val}>{val.substr(72) + '...'}</span>;
											}
											return val;
										}
									},
									_: {
										label: null,
										width: '15%',
										sortable: false,
										value: function() {
											if (!canManage) {
												return null;
											}
											return (
												<div className="record-controls">
													<a href="#!" onClick={_this.handleRequestApproval.bind(null, 'cards', this.id)}><i className="fa fa-check" /> {Locale.getString('button.approve', 'Approve')}</a>
													<a href="#!" onClick={_this.handleRequestDenial.bind(null, 'cards', this.id)}><i className="fa fa-ban" /> {Locale.getString('label.void', 'Void')}</a>
												</div>
											);
										}
									}
								}}
							/>
						</div>

						<h5><strong>{Locale.getString('title.previous-requests', 'Previous Requests')}</strong></h5>
						<div style={{padding:5, border: '1px solid #ccc', margin: '5px 0 25px'}}>
							<DataTable
								ref="previousRequests"
								endpoint="/funding/requests"
								searchEnabled={true}
								fields={
									this.state.featureFlagOn == 1 ? 
									{
									_type: {
										label: Locale.getString('title.type', 'Type'),
										width: '5%',
										value: function(val) {
											return _.capitalize(val);
										}
									},
									code: {
										label: 'ID',
										width: '10%',
									},
									program: {
										label: 'IUS/OUS',
										width: '10%',
										value: function(val) {
											if (val) {
												return val.toUpperCase();
											}
											return val;
										}
									},
									date_added: {
										label: Locale.getString('title.initiated', 'Initiated'),
										width: '15%',
										value: function(val) {
											return moment.utc(val).local().format('DD-MMM-YYYY hh:mm:ss A').toUpperCase();
										},
										sortWithValue: false,
									},
									user_id: {
										label: Locale.getString('title.requested-by', 'Requested By'),
										width: '10%',
										value: function(val) {
											if (this.user) {
												return this.user.firstname + ' ' + this.user.lastname;
											}
											return '--';
										},
									},
									processor: {label: Locale.getString('label.payment-processor', 'Payment Processor'),
			                            width: '15%',

									    value: function(val) {							
									    var name = '';
									    payProcessor.forEach(function(pay){
									
										if (pay.key == val) {
											name = pay.props.name;
										}
									});
									return name; 
							            },
									},
									_description: {
										label: Locale.getString('title.description', 'Description'),
										width: '30%',
										value: function(val) {
											return val;
										},
									},
									note: {
										width: '10%',
										label: Locale.getString('title.comments', 'Comments'),
										value: function(val) {
											val = val || '';
											var len = val.toString().length;
											if (len > 75) {
												return <span title={val}>{val.substr(72) + '...'}</span>;
											}
											return val;
										}
									},
									_: {
										label: '',
										width: '10%',
										value: function() {
											if (this.date_approved) {
												return <span style={{color: '#090'}}>{Locale.getString('option.approved', 'Approved')}</span>;
											}
											else if (this.date_voided) {
												return <span style={{color: '#900'}}>{Locale.getString('label.void', 'Void')}</span>;
											}
										},
									}
								}
								
								:	{
									_type: {
										label: Locale.getString('title.type', 'Type'),
										width: '5%',
										value: function(val) {
											return _.capitalize(val);
										}
									},
									code: {
										label: 'ID',
										width: '10%',
									},
									program: {
										label: 'IUS/OUS',
										width: '10%',
										value: function(val) {
											if (val) {
												return val.toUpperCase();
											}
											return val;
										}
									},
									date_added: {
										label: Locale.getString('title.initiated', 'Initiated'),
										width: '15%',
										value: function(val) {
											return moment.utc(val).local().format('DD-MMM-YYYY hh:mm:ss A').toUpperCase();
										},
										sortWithValue: false,
									},
									user_id: {
										label: Locale.getString('title.requested-by', 'Requested By'),
										width: '10%',
										value: function(val) {
											if (this.user) {
												return this.user.firstname + ' ' + this.user.lastname;
											}
											return '--';
										},
									},
									_description: {
										label: Locale.getString('title.description', 'Description'),
										width: '30%',
										value: function(val) {
											return val;
										},
									},
									note: {
										width: '10%',
										label: Locale.getString('title.comments', 'Comments'),
										value: function(val) {
											val = val || '';
											var len = val.toString().length;
											if (len > 75) {
												return <span title={val}>{val.substr(72) + '...'}</span>;
											}
											return val;
										}
									},
									_: {
										label: '',
										width: '10%',
										value: function() {
											if (this.date_approved) {
												return <span style={{color: '#090'}}>{Locale.getString('option.approved', 'Approved')}</span>;
											}
											else if (this.date_voided) {
												return <span style={{color: '#900'}}>{Locale.getString('label.void', 'Void')}</span>;
											}
										},
									}
								}}
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

});
