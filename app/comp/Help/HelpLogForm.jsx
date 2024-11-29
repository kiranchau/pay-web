const {Locale} = RTBundle;

var HelpLogForm = React.createClass({

	getInitialState: function() {
		var data = this.props.data;
		return {
			data: data,
		};
	},

	handleChange: function(e) {
		var data = this.state.data;
		data[e.target.name] = e.target.value;
		this.setState({
			data: data,
		});
	},

	render: function() {
		return(
			<div>
				<div className="row form">
					<dl className="col-sm-12 form dialog">
						<dt>{Locale.getString('label.subject', 'Subject')} <RequiredMarker /></dt>
						<dd>
							<input name="subject" type="text" onChange={this.handleChange} value={this.state.data.subject} maxLength={150}/>
							<ErrorDisplay message={this.props.errors.subject} />
						</dd>

						<dt>{Locale.getString('label.message', 'Message')} <RequiredMarker /></dt>
						<dd>
							<textarea id="message" name="message" type="text" onChange={this.handleChange} value={this.state.data.message} rows={5}/>
							<ErrorDisplay message={this.props.errors.message} />
						</dd>
						{this.props.user.type == "user" &&
						<span>
						<dt>{Locale.getString('title.status', 'Status')}</dt>
						<dd>
							<select name="status" value={this.state.data.status} onChange={this.handleChange} >
								<option value="">{Locale.getString('option.select-status', 'Select Status')}</option>
								<option value={1}>{Locale.getString('option.open', 'Open')}</option>
								<option value={2}>{Locale.getString('option.info', 'Info')}</option>
								<option value={4}>{Locale.getString('option.done', 'Done')}</option>
							</select>
						</dd>
						</span>}

						<dt>{Locale.getString('option.priority', 'Priority')}</dt>
							<select name="priority" value={this.state.data.priority} onChange={this.handleChange}>
								<option value="">{Locale.getString('option.select-priority', 'Select Priority')}</option>
								<option value={1}>{Locale.getString('option.asap', 'ASAP')}</option>
								<option value={2}>1</option>
								<option value={3}>2</option>
								<option value={4}>3</option>
							</select>
					</dl>
				</div>
		 </div>
		);
	},
});
