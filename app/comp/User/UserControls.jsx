const {Locale} = RTBundle;

var UserControls = React.createClass({

	getDefaultProps: function() {
		return {
			deletePrompt: Locale.getString('message.delete-user', 'Are you sure you want to delete this user?'),
			promptName: Locale.getString('title.user', 'User'),
		};
	},

	render: function() {
		return (
			<td className="record-controls">
				<a className="app-edit" onClick={this.props.onEdit.bind(null, {title: Locale.getString('title.user-information', 'User Information') + (this.props.user.is_admin == 1 ? ' - ' + this.props.data.id : ''), record: this.props.data})}><i className="fa fa-pencil"></i></a>
				{false && <a className="app-delete" onClick={this.props.onDelete.bind(null, {title: Locale.getString('label.delete-user', 'Delete User') + '?', record: this.props.data, message: this.props.deletePrompt})}><i className="fa fa-trash"></i></a>}
			</td>
		);
	}

});


