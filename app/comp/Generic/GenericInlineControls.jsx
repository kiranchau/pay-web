const {Locale} = RTBundle;

var GenericInlineControls = React.createClass({

	onSave: function(data) {
		if(this.props.tableType && this.props.tableType == 'countries' && data.active === "1"){
			if(data.name === "" || data.code === "" || (data.default_currency === "0" || data.default_currency === "" || data.default_currency === null) || (data.lang === "0" || data.lang === "" || data.lang === null)){
			alert(`Please make sure that you are setting the name, country code, currency, and preferred language before saving.`)
			}else{
				this.props.onSave({record: data});
			}
		} 
		else {
			this.props.onSave({record: data});
		}
	},

	render: function() {
		if (this.props.editMode) {
			return (
				<td className="record-controls" style={{verticalAlign: 'middle'}}>
					<a href="#!" onClick={this.onSave.bind(null, this.props.data)} title={Locale.getString('label.save-data', 'Save Data')}><i className="fa fa-save" /></a>
					<a href="#!" onClick={this.props.onCancel.bind(null, {record: this.props.data})} title={Locale.getString('label.cancel-editing', 'Cancel Editing')}><i className="fa fa-times" /></a>
				</td>
			);
		}

		return (
			<td className="record-controls">
				<a href="#!" onClick={this.props.onEdit.bind(null, {record: this.props.data })}><i className="fa fa-pencil" /></a>
				{false && <a href="#!" onClick={this.props.onDelete.bind(null, {message: Locale.getString('message.confirm-delete-item', 'Are you sure you want to delete this item?'), record: this.props.data })}><i className="fa fa-trash" /></a>}
			</td>
		);
	}

});

