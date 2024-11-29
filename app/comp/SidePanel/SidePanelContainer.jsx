var SidePanelContainer = React.createClass({

	getDefaultProps: function() {
		return {
			modal: false,
			onClose: $.noop,
			closeFromOverlay: true,
		};
	},

	handleClose: function(e) {
		if (this.props.closeFromOverlay) {
			this.props.onClose();
		}
	},

	render: function() {
		return (
			<div>
				{this.props.modal && <div onClick={this.handleClose} className="modal-overlay" />}
				<div className="comp-sidepanel-list" onClick={this.handleClose} style={this.props.modal ? {} : {left: 'auto', width: this.props.width}}>
					{this.props.children}
				</div>
			</div>
		);
	},

});
