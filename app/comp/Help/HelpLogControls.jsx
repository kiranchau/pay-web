const {Locale} = RTBundle;

var HelpLogControls = React.createClass({

	getDefaultProps: function() {
		return {
			deletePrompt: Locale.getString('message.delete-log', 'Are you sure you want to delete this log?'),
			promptName: Locale.getString('title.log', 'Log'),
		};
	},

	render: function() {
		return (
			<td className="record-controls">
				<a className="app-edit" onClick={this.props.onEdit.bind(null, {record: this.props.data, title: Locale.getString('title.log', 'Log')})}><i className="fa fa-pencil"></i></a>
				<a className="app-delete" onClick={this.props.onDelete.bind(null, {record: this.props.data, title: Locale.getString('title.delete-log', 'Delete Log'), message: this.props.deletePrompt})}><i className="fa fa-trash"></i></a>
			</td>
		);
	}

});


