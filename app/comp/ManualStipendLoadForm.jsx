const {Locale} = RTBundle;

var ManualStipendLoadForm = React.createClass({

	getDefaultProps: function() {
		return {
			onChange: _.noop,
			onClose: _.noop,
		};
	},

	getInitialState: function() {
		return {
			data: {},
			errors: {},
			processing: false,
		};
	},

	handleChange: function(e) {
		var data = this.state.data;
		data[e.target.name] = e.target.value;
		this.setState({
			data: data
		});
	},

	handleSave: function() {
		this.setState({
			processing: true,
		});
		$.post(_.endpoint('/patients/cards/load'), {patient_id: this.props.patient.id, amount: this.state.data.amount, note: this.state.data.note}, function(res) {
			this.setState({
				processing: false,
			});
			if (res.status < 2) {
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
		var buttons = (
			<span>
				<button type="button" onClick={this.state.processing ? _.noop : this.props.onClose}>{Locale.getString('button.cancel', 'Cancel')}</button>
				<button type="button" onClick={this.state.processing ? _.noop : this.handleSave} style={{color: '#fff', backgroundColor: _.primaryBrandColor()}}>{this.state.processing ? <span><i className="fa fa-spin fa-spinner" /> {Locale.getString('label.processing', 'Processing')}...</span> : 'Load Funds'}</button>
			</span>
		);

		return (
			<Dialog width={400} title={Locale.getString('title-manually-add-funds', 'Manually Add Funds')} onClose={this.props.onClose} buttons={buttons}>
				<div className="row">
					<dl className="form dialog col-md-12">
						<dt>{Locale.getString('label.amount', 'Amount')} <RequiredMarker /></dt>
						<dd>
							<input name="amount" type="text" placeholder="Min $10" value={this.state.data.amount} onChange={this.handleChange} />
							<ErrorDisplay message={this.state.errors.amount} />
						</dd>

						<dt>{Locale.getString('label.comment', 'Comment')} <RequiredMarker /></dt>
						<dd>
							<textarea name="note" rows="5" onChange={this.handleChange} placeholder={Locale.getString('message.indicate-reason-load-funds', '"Indicate the reason and any additional details for manually loading funds to this card."')} />
							<ErrorDisplay message={this.state.errors.note} />
						</dd>
					</dl>
				</div>
			</Dialog>
		);
	}

});

