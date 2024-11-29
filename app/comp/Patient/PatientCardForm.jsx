const {Locale} = RTBundle;

var PatientCardForm = React.createClass({

	getDefaultProps: function() {
		return {
			onChange: _.noop,
			onClose: _.noop,
			data: {},
			replacement: false,
		};
	},

	getInitialState: function() {
		return {
			data: _.extend(this.props.data, this.props.replacement ? {control_number: ''} : {}),
			errors: {},
		};
	},

	handleChange: function(e) {
		var data = this.state.data;
		data[e.target.name] = e.target.value;
		this.setState({
			data: data
		});
		this.props.onChange('card', data);
	},

	handleCardNumberSave: function() {
		this.setState({ processing: true })
		$.post(_.endpoint('/patients/cards/' + (this.props.replacement ? 'replace' : 'assign')), {patient_id: this.state.data.patient_id, control_number: this.state.data.control_number}, function(res) {
			this.setState({ processing: false })
			if (res.status < 2) {
				this.props.onChange('card', res.record);
				this.props.onChange('card_id', res.record.id);
				this.props.onClose();
			}
			else {
				this.setState({
					errors: res.errors,
				});
			}
		}.bind(this));
	},

	render: function() {
		const { processing } = this.state;
		let buttons;

		if (processing) {
			buttons = (
				<button key={4} type="button"><i className="fa fa-spinner fa-spin fw-f3 fx-fa" /> {Locale.getString('button.saving', 'Saving')} ...</button>
			);
		}
		else {
			buttons = (
				<span>
					<button type="button" onClick={this.props.onClose}>{Locale.getString('button.cancel', 'Cancel')}</button>
					<button type="button" onClick={this.handleCardNumberSave} style={{color: '#fff', backgroundColor: _.color(this.props.primaryBrandColor)}}>{Locale.getString('button.save', 'Save')}</button>
				</span>
			);
		}

		return (
			<Dialog width={400} title={(this.props.replacement ? Locale.getString('title.replace', 'Replace') : Locale.getString('title.assign', 'Assign')) + ' ' + Locale.getString('title.stipend-card', 'Stipend Card') } onClose={this.props.onClose} buttons={buttons}>
				<div className="row">
				<dl className="form dialog col-md-12">
					{this.state.data.id > 0 && this.state.data.name &&
					<dt>{Locale.getString('label.current-card', 'Current Card')}</dt>}

					{this.state.data.id > 0 && this.state.data.name &&
					<dd>
						{this.state.data.name}
					</dd>}

					<dt>{Locale.getString('label.inventory-control-number', 'Inventory Control Number')}</dt>
					<dd>
						<input name="control_number" type="text" placeholder="#####-########" value={this.state.data.control_number} onChange={this.handleChange} />
						<ErrorDisplay message={this.state.errors.control_number} />
					</dd>
				</dl>
				</div>
			</Dialog>
		);
	}

});
