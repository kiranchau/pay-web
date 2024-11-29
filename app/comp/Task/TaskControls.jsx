const {Locale} = RTBundle;

var TaskControls = React.createClass({

	getDefaultProps: function() {
		return {
			deletePrompt: Locale.getString('message.delete-task', 'Are you sure you want to delete this task?'),
			promptName: Locale.getString('title.task', 'Task'),
		};
	},

	render: function() {
		return (
			<td className="record-controls">
				<a className="app-edit" onClick={this.props.onEdit.bind(null, {title: Locale.getString('title.edit-task', 'Edit Task?'), record: this.props.data})}><i className="fa fa-pencil"></i></a>
				<a className="app-delete" onClick={this.props.onDelete.bind(null, {title: Locale.getString('title.delete-task', 'Delete Task') + '?', record: this.props.data, message: this.props.deletePrompt})}><i className="fa fa-trash"></i></a>
			</td>
		);
	}

});

