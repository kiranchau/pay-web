const {Locale} = RTBundle;

var StudyControls = React.createClass({

	closeDialog: function() {
		this.props.onShow({dialog: null});
	},

	renderVisitDialog: function() {
		return (<StudyVisitDataTable study={this.props.data} onClose={this.closeDialog} user={this.props.user} system={this.props.system}/>);
	},

	handleVisitButton:function(props, e) {
		e.preventDefault();
		e.stopPropagation();

		this.props.onShowVisits(props);
	},

	render: function() {

		const onVisitsClick = this.props.onShowVisits ? this.handleVisitButton.bind(null, this.props.data) : this.props.onShow.bind(null, {dialog: this.renderVisitDialog()});

		return (
			<td className="record-controls">
				<a className="app-edit" title={Locale.getString('title.view-study-summary', 'View Study Summary')} ><i className="fa fa-file-text-o"></i></a>
				<a className="app-edit" title={Locale.getString('title.manage-study-visits', 'Manage Study Visits')} onClick={onVisitsClick}><i className="fa fa-calendar"></i></a>
				<a className="app-edit" title={Locale.getString('title.edit-study-details', 'Edit Study')} onClick={this.props.onEdit.bind(null, {record:this.props.data, title: 'Study Information'})}><i className="fa fa-pencil"></i></a>
			</td>
		);
	}

});
