const {Locale} = RTBundle;

var GenericControls = React.createClass({

	getDefaultProps: function() {
		return {
			deletePrompt: Locale.getString('message.confirm-delete-item', 'Are you sure you want to delete this item?'),
			promptName: Locale.getString('label.item', 'Item'),
		};
	},

	render: function() {
		return (
			<td className="record-controls">
				<a title= {Locale.getString('label.edit-this-item', 'Edit this item')}
					onClick={this.props.onEdit.bind(null, {title: Locale.getString('label.editing', 'Editing') + '...' + (this.props.user.is_admin == 1 ? ' - ' + this.props.data.id : ''), record: this.props.data})}><i className="fa fa-pencil"></i></a>
				<a title={Locale.getString('button.delete-this-item', 'Delete this item')} onClick={this.props.onDelete.bind(null, {title: Locale.getString('button.delete-entry', 'Delete entry?'), record: this.props.data, message: this.props.deletePrompt})}><i className="fa fa-trash"></i></a>
			</td>
		);
	}

});
