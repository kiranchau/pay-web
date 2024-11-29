const {Locale} = RTBundle;

var PatientControls = React.createClass({

	getDefaultProps: function() {
		return {
			deletePrompt: Locale.getString('message.delete-subject', 'Are you sure you want ot delete this subject?'),
			promptName: Locale.getString('label.patient', 'Patient'),
		};
	},

	render: function() {
		return (
			<td className="record-controls">
				<a className="app-edit" onClick={this.props.onEdit.bind(null, {record:this.props.data, title: Locale.getString('label.subject', 'Subject')})}><i className="fa fa-pencil"></i></a>
				{(this.props.user.options.delete_patients == 1 && ((this.props.data.card_id == 0 && this.props.data.bank_account_id == 0) || this.props.user.type === 'siteuser' && parseInt(this.props.data._pending_requests) === 0)) &&
				<a title={Locale.getString('title.delete-subject', 'Delete Subject')} onClick={this.props.onDelete.bind(null,{record:this.props.data, title: Locale.getString('title.delete-subject', 'Delete Subject'), message: Locale.getString('message.delete-subject', 'Are you sure you want to delete this subject?')})}><i className="fa fa-trash"></i></a>}
			</td>
		);
	}

});

