const {Locale} = RTBundle;

var PatientRequestControls = React.createClass({

	getDefaultProps: function() {
		return {
			deletePrompt: Locale.getString('message.delete-reimbursement-request', 'Are you sure you want to delete this reimbursement request?'),
			promptName: Locale.getString('label.reimbursement-request', 'Reimbursement Request'),
			onUpdate: _.noop,
		};
	},

	getInitialState: function() {
		return {
			dialog: null,
		};
	},

	handleClose: function() {
		this.props.onShow({dialog: null});
	},

	handleMessageDialog: function(req, e) {
		e.preventDefault();
		e.stopPropagation();

		this.props.onShow({
			dialog: <MessageDialog requestID={req.id} user={this.props.user} onUpdate={this.props.onUpdate} onCancel={this.handleClose} />,
		});
	},

	handleRecall: function(id, e) {
		e.stopPropagation();
		this.props.onShow({
			dialog:
				<ConfirmationDialog style={{color: '#eee'}} title={Locale.getString('title.confirm-recall', 'Confirm Recall')} onConfirm={this.acceptRecall.bind(null, id)} onCancel={this.handleClose}>
					<div>{Locale.getString('message.recall-reimbursement', 'Are you sure you want to recall this reimbursement?')}</div>
				</ConfirmationDialog>
		});
	},

	acceptVoid: function(id, e) {
		$.post(_.endpoint('/patients/requests/void?request_id=' + id), function(res) {
			if (res.status < 2) {
				this.handleClose();
				this.props.onUpdate();
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
				<ConfirmationDialog title="Confirm Void" onConfirm={this.acceptVoid.bind(null, id)} onCancel={this.handleClose}>
					{Locale.getString('message.void-reimbursement', 'Are you sure you want to void this reimbursement?')}
				</ConfirmationDialog>
		});
	},

	acceptRecall: function(id, e) {
		$.post(_.endpoint('/patients/requests/recall?request_id=' + id), function(res) {
			if (res.status < 2) {
				this.handleClose();
				this.props.onUpdate();
			}
			else {
				console.log(res.errors);
			}
		}.bind(this));
	},

	handlePaymentSubmission: function() {
		$.post(_.endpoint('/patients/requests/approve'), {request_id: this.props.data.id}, function(res) {
			if (res.status < 2) {
				this.props.onUpdate();
				this.handleClose();
			}
			else {
				this.props.onShow({
					dialog: this.renderPaymentDialog({
						error: res.error.generic
					})
				});
			}
		}.bind(this));
	},

	renderPaymentDialog: function(args) {
		args = args || {};

		return (
			<ConfirmationDialog title="Confirm Payment" onConfirm={this.handlePaymentSubmission} onCancel={this.handleDialogClose}>
				<div className="form">
					<p>Are you sure you want to make this payment?</p>
					<ErrorDisplay message={args.error} />
				</div>
			</ConfirmationDialog>
		);
	},

	handlePaymentReversalSubmission: function() {
		$.post(_.endpoint('/patients/request/pay/reverse'), {id: this.props.data.id}, function(res) {
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

	handleDialogClose: function() {
		this.props.onShow({
			dialog: null,
		});
	},

	render: function() {
		var patientInfo = ' - MRN ' + this.props._patient.id + ' - ' + this.props._patient.firstname + ' ' + this.props._patient.lastname;
		var queryButtonStyle = {};

		if (this.props.data._num_unresolved > 0) {
			queryButtonStyle.color = '#f00';
		}

		const canSiteUserProcessRequest = !_.isEmpty(this.props.user.options) && this.props.user.options.admin_area &&
			_.find(this.props.user.site_user_study_associations, {study_id: this.props.data.study_id, site_id: this.props.data.site_id}) &&
			parseInt(this.props.user.options.stipend_approval) === 1;
			
		return (
			<td className="record-controls">
				{this.state.dialog}

				{this.props._patient._international &&
				<a onClick={this.handleMessageDialog.bind(null, this.props.data)} style={queryButtonStyle} title={Locale.getString('message.submit-reimb-query', 'Submit query related to this reimbursement')}><i className="fa fa-comments-o" /></a>}
				{this.props.data.status < 2 &&
				<a className="app-edit" onClick={this.props.onEdit.bind(null, {record:this.props.data, title: Locale.getString('label.reimbursement-request', 'Reimbursement Request') + patientInfo})}><i className="fa fa-pencil"></i></a>}
				{this.props.data.status < 1 &&
				<a className="app-delete" onClick={this.props.onDelete.bind(null, {record:this.props.data, title:Locale.getString('title.delete-reimbursement-item', 'Delete Reimbursement Item'), message: this.props.deletePrompt})}><i className="fa fa-trash"></i></a>}
				{this.props.data.status >= 2 &&
				<a className="app-edit" onClick={this.props.onEdit.bind(null, {record:this.props.data, title: Locale.getString('label.reimbursement-request', 'Reimbursement Request') + patientInfo})}><i className="fa fa-file-o"></i></a>}

				{(
					this.props.user.options.admin_area &&
					this.props.user.type == 'user' || 
					(this.props.user.type === 'siteuser' &&
					canSiteUserProcessRequest)
				) && this.props.data.status == 2 &&
				<a href="#!" onClick={this.handleRecall.bind(this, this.props.data.id)} style={{marginLeft: 7}}><i className="fa fa-undo" />
				</a>}

				{this.props.data.status >= 2  && this.props.user.support == 1 && 
					<a title="Restore transaction to pending." onClick={this.props.onShow.bind(null, {dialog: this.renderPaymenReversaltDialog()})} style={{ background: '#b30600' }}>                                        
						<i className="fa fa-undo icon" style={{color: "#fff"}}></i>                                
					</a>                        
				}

				{this.props.data.status == 5 && this.props.user.type == 'user' && (_.isFromCTMS(this.props.user.emailaddress) || _.isFromRedAxle(this.props.user.emailaddress)) &&
				<a href="#!" onClick={this.handleVoid.bind(null, this.props.data.id)} style={{marginLeft: 7}}><i className="fa fa-ban" />
				</a>}
			</td>
		);
	}

});
