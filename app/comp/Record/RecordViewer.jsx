const {Locale} = RTBundle;

var RecordViewer = React.createClass({

	getDefaultProps: function() {
		return {
			onTableUpdate: _.noop,
			onUpdate: _.noop,

			fromDashboard: false,
			saveMinDelay: 750
		};
	},

	getInitialState: function() {
		return {
			show: false,
			params: {},
			processing: false,
			data: {},
			closeAfterEditing: false,
			saved: false,
			formProps: {},
			dialogProps: {},
		};
	},

	open: function(params) {
		this.setState({
			show: true,
			title: params.title,
			endpoint: params.endpoint,
			source: params.source,
			closeAfterEditing: params.closeAfterEditing,
			formProps: params.formProps,
			dialogProps: params.dialogProps,
			errors: {},
		},
			this.loadData.bind(null, params.formComponent)
		);
	},

	loadData: function(comp) {
		$.get(_.endpoint(this.state.endpoint), function(res) {
			if (res.record) {
				var data = res.record;
			} else if (res.records) {
				var data = res.records;
			}
			
			this.setState({
				data: data,
				formComponent: comp
			});
		}.bind(this));
	},

	close: function() {
		this.setState({
			show: false,
			formComponent: null,
			params: {},
			data: {},
			saved: false,
			errors: {},
			formProps: {},
			dialogProps: {}

		});
		jQuery('body').css('overflow', 'auto');
	},

	save: function() {
		this.setState({
			processing: true,
		},
			this.handleSave
		);
	},

	setup: function() {
		if (_.isFunction(this.props.onTableUpdate)) {
			this.props.onTableUpdate();
		}
		if (_.isFunction(this.props.onUpdate)) {
			this.props.onUpdate();
		}
		if (this.state.closeAfterEditing == true) {
			this.close();
		}
		else {
			this.setState({
				saved: true
			});
		}
	},

	handleSave: function() {
		var endp = this.state.source || this.state.endpoint;

		if (endp.indexOf('?') !== -1) {
			endp = endp.substr(0, endp.indexOf('?'));
		}

		$(window).delay(this.props.saveMinDelay).queue((next) => {
			$.post(_.endpoint(endp), this.refs.formComponent.state.data, function(res) {
				if (res.status < 2) {
					this.setState({
						data: res.record,
						processing: false,
						errors: {},
					},
						this.setup
					);
				}
				else {
					this.setState({
						processing: false,
						errors: res.errors,
					});
				}
			}.bind(this));
			next();
		});
	},

	render: function() {
		let {show, saved, processing} = this.state;

		if (processing == false) {
			var buttonOptions = [
				<button key={1} type="button" onClick={this.close}>{Locale.getString('button.cancel', 'Cancel')}</button>,
				<button key={2} type="button" style={{backgroundColor: _.primaryBrandColor(), color: '#fff'}} onClick={this.save}>{Locale.getString('button.save', 'Save')}</button>,
			];
		}
		else {
			var buttonOptions = [
				<button key={4} type="button"><i className="fa fa-spinner fa-spin fw-f3 fx-fa" />{Locale.getString('button.saving', 'Saving')} ...</button>,
			];
		}

		var FormComponent = this.state.formComponent;
		if (!show) {
			return null;
		}
		return (
			<div style={show ? {visibility: 'visible'} : {display: 'none'}}>
				<Dialog {...this.props} {...this.state.dialogProps} onClose={this.close} title={this.state.title} buttons={buttonOptions}>
					{this.state.formComponent &&
					<FormComponent
						{...this.props}
						{...this.state.formProps}
						saved={saved}
						saving={processing}
						key={1}
						ref="formComponent"	
						fromDashboard={this.props.fromDashboard}
						onUpdate={this.props.onUpdate}
						onTableUpdate={this.props.onTableUpdate}
						user={this.props.user}
						data={this.state.data}
						errors={this.state.errors}
						navigate={this.props.navigate}
					/>}
				</Dialog>
			</div>
		);
	},
});
