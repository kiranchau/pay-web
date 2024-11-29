const {Locale} = RTBundle;
  
var StudyVisitControls = React.createClass({

	getDefaultProps: function() {
		return {
			deletePrompt: Locale.getString('message.delete-visit', 'Are you sure you want to delete this visit?'),
			promptName: Locale.getString('title.study-visit', 'Study Visit'),
		};
	},

    handleDelete: function(e) {
        e.preventDefault();
        var canDelete = parseInt(this.props.data._patient_count || 0) === 0;
        if (!canDelete) {
            e.stopPropagation();
            return;
        }
        this.props.onDelete({title: Locale.getString('title.delete-visit', 'Delete Study Visit'), record: this.props.data, message: this.props.deletePrompt}, e);
    },

	render: function() {
        var canDelete = parseInt(this.props.data._patient_count || 0) === 0;
		return (
			<td className="record-controls">
				<a title={Locale.getString('title.edit-visit', 'Edit Study Visit')}
					onClick={this.props.onEdit.bind(null, {title: Locale.getString('title.edit-visit', 'Edit Study Visit'), record: this.props.data})}><i className="fa fa-pencil"></i></a>

				<a title={Locale.getString('title.delete-visit', 'Delete Study Visit')}
                    style={{opacity: canDelete ? 1 : 0.5, cursor: canDelete ? 'pointer' : 'not-allowed'}}
					onClick={this.handleDelete}><i className="fa fa-trash"></i>
				</a>
			</td>
		);
	}

});
