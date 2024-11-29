const {Locale} = RTBundle;

var ConfirmationDialog = React.createClass({

	getDefaultProps: function() {
		return {
			onCancel: $.noop,
			onConfirm: $.noop,
			noLabel: Locale.getString('button.cancel', 'Cancel'),
			yesLabel: Locale.getString('button.confirm', 'Confirm'),
			width: 400,
		};
	},

	render: function() {
		var buttons = <span>
			<button type="button" onClick={this.props.onCancel}>{this.props.noLabel}</button>
			<button type="button" className="primary" onClick={this.props.onConfirm} style={{background: _.primaryBrandColor()}}>{this.props.yesLabel}</button>
		</span>;

		var style= {
			bottom: 'auto',
			height: 'auto',
		};

		return (
			<Dialog {...this.props} buttons={buttons} onClose={this.props.onCancel} style={style}>
				{this.props.children}
			</Dialog>
		);
	}

});
