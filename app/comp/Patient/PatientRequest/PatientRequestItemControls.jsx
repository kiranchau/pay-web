const {Locale} = RTBundle;

var PatientRequestItemControls = React.createClass({

	getDefaultProps: function() {
		return {
			deletePrompt: Locale.getString('message.delete-reimbursement-item', 'Are you sure you want to delete this reimbursement item?'),
			promptName: Locale.getString('label.reimbursement-request-item', 'Reimbursement Request Item'),
		};
	},

	render: function() {
		return (
			<td className="record-controls">
				{(this.props.patientRequest.status >= 2 || this.props.isReimbursementDisabled) && <a className="app-edit" title={Locale.getString('title.view-item', 'View Item')} onClick={this.props.onEdit.bind(null, {record:this.props.data, title: Locale.getString('title.view-reimbursement-item', 'View Reimbursement Item')})}><i className="fa fa-file-text-o"></i></a>}
				{this.props.patientRequest.status < 2 && !this.props.isReimbursementDisabled && <a className="app-edit" onClick={this.props.onEdit.bind(null, {record:this.props.data, title: this.props.promptName})}><i className="fa fa-pencil"></i></a>}
				{this.props.patientRequest.status < 2 && !this.props.isReimbursementDisabled && <a className="app-delete" onClick={this.props.onDelete.bind(null, {record:this.props.data, title: Locale.getString('title.delete-reimbursement-item', 'Delete Reimbursement Item'), message: this.props.deletePrompt})}><i className="fa fa-trash"></i></a>}
				
			</td>
		);
	}

});


