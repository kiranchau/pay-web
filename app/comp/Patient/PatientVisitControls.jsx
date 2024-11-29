const {Locale} = RTBundle;

var PatientVisitControls = React.createClass({

	getInitialState: function() {
		return {
			dialog: null,
			errors: {},
			visitDate: this.props.data.date || '',

			currentStudyID: 0,

			setGlobalState: _.noop,
		};
	},

	setField: function(key, val) {
		var data = this.state.data;
		data[key] = val;
		this.setState({
			data: data,
		});
	},

	handleDialogClose: function() {
		this.setState({
			dialog: null,
		});
	},

	handlePaymentReversalSubmission: function() {
		$.post(_.endpoint('/patients/visits/pay/reverse'), {patient_visit_id: this.props.data.patient_visit_id}, function(res) {
			if (res.status < 2) {
				this.props.onUpdate();
				this.handleDialogClose();
			}
			else {
				this.props.onShow({
					dialog: this.renderPaymenReversaltDialog({
						error: res.error
					})
				});
			}
		}.bind(this));
	},

	renderPaymenReversaltDialog: function(args) {
		args = args || {};
		
		return (
			<ConfirmationDialog title="Reset Item" onConfirm={this.handlePaymentReversalSubmission} onCancel={this.handleDialogClose}>
				<div className="form">
					<p style={{color: '#a00'}}>Are you sure you want to reset this item? This operation is <strong>permanent</strong>. Please ensure that that the correct item is being reset.</p>
					<ErrorDisplay message={args.error} />
				</div>
			</ConfirmationDialog>
		);
	},

	handleVisitSubmission: function() {
		var data = {
			patient_id: this.props.data.patient_id,
			_site_id: this.props.data.site_id,
			_study_id: this.props.currentStudyID,
			visit_id: this.props.data.id,
			date: this.state.visitDate,
		};

		this.props.onShow({
			dialog: this.renderVisitCompletionDialog({
				processing: true,
			})
		});

		$.post(_.endpoint('/patients/visits/complete?exclude_statuses=6'), data, function(res) {
			this.props.onShow({
				dialog: this.renderVisitCompletionDialog({
					processing: false,
				})
			});

			if (res.status < 2) {
				this.setState({
					dialog: null,
				});
				this.handleDialogClose();
				this.props.onUpdate();
			}
			else {
				this.props.onShow({
					dialog: this.renderVisitCompletionDialog({
						error: res.error.generic || res.error
					}),
				});
			}
		}.bind(this));
	},

	handleVisitDateChange: function(date) {
		this.setState({
			visitDate: date,
		});
	},

	handlePaymentSubmission: function() {
		let body = {patient_visit_id: this.props.data.patient_visit_id};
		if (this.props.data.status == 5) { //Recalled
			body._repay = true;
			body._request_id = this.props.data.request_id;
		}

		$.post(_.endpoint('/patients/visits/pay'), body, function(res) {
			if (res.status < 2) {
				this.props.onUpdate();
				this.handleDialogClose();
			}
			else {
				this.props.onShow({
					dialog: this.renderPaymentDialog({
						error: res.error.generic || res.error
					})
				});
			}
		}.bind(this));
	},

	handleDialogClose: function() {
		this.props.onShow({
			dialog: null,
		});
	},

	handleMessageDialog: function(req, e) {
		e.preventDefault();
		e.stopPropagation();
		this.props.onShow({
			dialog: <MessageDialog requestID={req.id} user={this.props.user} onUpdate={this.props.onUpdate} onCancel={this.handleDialogClose} />,
		});
	},

	handleRecall: function(id, e) {
		e.stopPropagation();
		this.props.onShow({
			dialog:
				<ConfirmationDialog style={{color: '#eee'}} title={Locale.getString('title.confirm-recall', 'Confirm Recall')} onConfirm={this.acceptRecall.bind(null, id)} onCancel={this.handleDialogClose}>
					<div>{Locale.getString('message.confirm-recall-stipend', 'Are you sure you want to recall this stipend?')}</div>
				</ConfirmationDialog>
		});
	},

	acceptRecall: function(id, e) {
		$.post(_.endpoint('/patients/visits/recall?request_id=' + id), function(res) {
			if (res.status < 2) {
				this.handleDialogClose();
				this.props.onUpdate();

				this.props.setGlobalState({cache: {dashboardDataStale: true}});
			}
			else {
				console.log(res.errors);
			}
		}.bind(this));
	},

	handleVoid: function(id, e) {
		e.stopPropagation();
		this.props.onShow({
			dialog:
				<ConfirmationDialog title={Locale.getString('title.confirm-void', 'Confirm Void')} onConfirm={this.acceptVoid.bind(null, id)} onCancel={this.handleDialogClose}>
				{Locale.getString('message.confirm-void-stipend', 'Are you sure you want to void this stipend?')}
				</ConfirmationDialog>
		});
	},

	acceptVoid: function(id, e) {
		$.post(_.endpoint('/patients/visits/void?request_id=' + id), function(res) {
			if (res.status < 2) {
				this.handleDialogClose();
				this.props.onUpdate();
			}
			else {
				console.log(res.errors);
			}
		}.bind(this));
	},


	renderVisitCompletionDialog: function(args) {
		var buttons = [];
		args = args || {};

		if (args.processing) {
			buttons = <button type="button"><i className="fa fa-spin fa-spinner" /> {Locale.getString('message.please-wait-moment', 'Please wait one moment.')}...</button>;
		}
		else {
			buttons = [
				<button key="cancel" type="button" onClick={this.handleDialogClose}>{Locale.getString('button.cancel', 'Cancel')}</button>,
				<button key="submit" type="button" onClick={this.handleVisitSubmission} >{Locale.getString('button.submit-visit', 'Submit Visit')}</button>
			];
		}

		return (
			<Dialog {...this.props} width={400} title={Locale.getString('title.visit-completion', 'Visit Completion')} onClose={this.handleDialogClose} buttons={buttons}>
				<div className="row">
					<dl className="form dialog col-md-12">
						<dt>{Locale.getString('label.date-completed', 'Date Completed')} <RequiredMarker /></dt>
						<dd>
							<ClinicalDatePicker
								dateFormatClinical={this.props.dateFormatClinical}
								value={this.state.visitDate && moment(this.state.visitDate).isValid() ? moment(this.state.visitDate).format('YYYY-MM-DD') : ''}
								maxDate={moment().format('YYYY-MM-DD')}
								showPickerIcon={true}
								style={{width: '100%'}}
								yearRange="c-1:c+0"
								onChange={this.handleVisitDateChange}
							/>
							<ErrorDisplay message={args.error} />
						</dd>
					</dl>
				</div>
			</Dialog>
		);
	},

	// renderVisitApprovedDialog: function(args) {
	// 	var buttons = [];
	// 	args = args || {};

	// 	if (args.processing) {
	// 		buttons = <button type="button"><i className="fa fa-spin fa-spinner" /> Please wait one moment...</button>;
	// 	}
	// 	else {
	// 		buttons = [
	// 			<button key="cancel" type="button" onClick={this.handleDialogClose}>Cancel</button>,
	// 			<button key="submit" type="button" onClick={this.handleVisitSubmission} >Approve Visit</button>
	// 		];
	// 	}

	// 	return (

	// 		<ConfirmationDialog title="Confirm Approval" onConfirm={this.handleApprovalConfirmation.bind(null, id)} onCancel={this.handleDialogClose}>
	// 				Are you sure you want to approve this stipends?
	// 			</ConfirmationDialog>

	// 		<Dialog {...this.props} width={400} title="Confirm Approval" onClose={this.handleDialogClose} buttons={buttons}>
	// 			Are you sure you want to approve this stipend?
	// 		</Dialog>
	// 	);
	// },

	renderPaymentDialog: function(args) {
		args = args || {};

		return (
			<ConfirmationDialog title={Locale.getString('title.confirm-payment', 'Confirm Payment')} onConfirm={this.handlePaymentSubmission} onCancel={this.handleDialogClose}>
				<div className="form">
					<p>{Locale.getString('message.confirm-make-payment', 'Are you sure you want to make this payment?')}</p>
					<ErrorDisplay message={args.error} />
				</div>
			</ConfirmationDialog>
		);
	},

	render: function() {
		const isSiteUser = this.props.user.type === 'siteuser';
		const patientIsActive = this.props._patient && this.props._patient._patient_study_status == 2;
		const canPayStipend = this.props.user && this.props.user.options.stipend_approval == 1 || this.props.user.type == 'user';
		
		return (
			<td className="record-controls">
				{this.props.data.date == null && !patientIsActive &&
				<a title={Locale.getString('message.complete-visit', 'Mark this visit as complete')} onClick={this.props.onShow.bind(null, {dialog: this.renderVisitCompletionDialog()})}><i className="fa fa-check icon"></i></a>}

				{this.props.data.date && this.props.data.status >= 1 && this.props.user.support == 1 &&
					<a title="Restore transaction to pending." onClick={this.props.onShow.bind(null, {dialog: this.renderPaymenReversaltDialog()})} style={{ background: '#b30600' }}>
						<i className="fa fa-undo icon" style={{color: "#fff"}}></i>
					</a>
				}

				{
					(
						this.props.user.type == 'user' || 
						(!_.isEmpty(this.props.user.options) &&
						parseInt(this.props.user.options.stipend_approval) === 1) &&
						!patientIsActive
					) && 
					(this.props.data.date && this.props.data.status > 0 && this.props.data.status < 2) && canPayStipend &&
					<a title={Locale.getString('title.pay-stipend', 'Pay stipend for this visit')} onClick={this.props.onShow.bind(null, {dialog: this.renderPaymentDialog()})}><i className="fa fa-dollar icon"></i></a>
				}

				{this.props.data.status == 2 && this.props.user.options.admin_area &&
				<a href="#!" onClick={this.handleRecall.bind(this, this.props.data.request_id)} title="Recall this visit" style={{marginLeft: 7}}><i className="fa fa-undo" />
				</a>}

				{this.props.data.status == 5 && this.props.user.type == 'user' && (_.isFromCTMS(this.props.user.emailaddress) || _.isFromRedAxle(this.props.user.emailaddress)) &&
				<a href="#!" onClick={this.handleVoid.bind(null, this.props.data.request_id)} title="Void this visit" style={{marginLeft: 7}}><i className="fa fa-ban" />
				</a>}
			</td>
		);
	},
});
