const {Locale} = RTBundle;

var PatientAddressControls = React.createClass({

	getDefaultProps: function() {
		return {
			deletePrompt: Locale.getString('message.delete-address', 'Are you sure you want to delete this address?'),
			promptName: Locale.getString('label.address', 'Address'),
		};
	},

	render: function() {
		return (
			<td className="record-controls">
				<a className="app-edit" onClick={this.props.onEdit.bind(null, {record: this.props.data, title: Locale.getString('label.address', 'Address')})}><i className="fa fa-pencil"></i></a>
				<a className="app-delete" onClick={this.props.onDelete.bind(null, {record: this.props.data, title: Locale.getString('label.delete-address', 'Delete Address'), message: this.props.deletePrompt})}><i className="fa fa-trash"></i></a>
			</td>
		);
	}

});


