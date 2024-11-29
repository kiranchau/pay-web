var SidePanel = React.createClass({

	getDefaultProps: function() {
		return {
			title: '',
			buttons: [],
			width: 400,
			onBeforeClose: _.noop,
			onClose: _.noop,
			onRemoved: _.noop,
			modal: true,
			closeFromOverlay: true,
		};
	},

	getInitialState: function() {
		return {
		};
	},

	handleOverlayClose: function(e) {
		e.stopPropagation();
		if (this.props.closeFromOverlay) {
			this.handleClose(e);
		}
	},

	handleClose: function() {
		var shouldClose = this.props.onBeforeClose();
		if (shouldClose !== false) {
			this.props.onClose();
		}
	},

	handleBlock: function(e) {
		e.stopPropagation();
	},

	render: function() {
		var style = {
			maxWidth: '100%',
			width: this.props.modal ? this.props.width : '100%',
		};
		
		return (
			<div className="comp-sidepanel-list" onClick={this.handleOverlayClose} style={this.props.modal ? {} : {left: 'auto', width: this.props.width}}>
				<div className="comp-sidepanel" style={style} onClick={function(e) { e.stopPropagation(); }}>
					<div className="navbar">
						<div className="box-10 close-box">
							<button type="button" onClick={this.handleClose}>&times;</button>
						</div>
						<div className="box-90 nav-title">
							{this.props.title}
						</div>
					</div>

					<div className="body" onWheelCapture={this.handleBlock} onScrollCapture={this.handleBlock}>
						{this.props.children}
					</div>

					{this.props.buttons &&
					<div className="tabbar">
					{this.props.buttons}
					</div>}
				</div>
			</div>
		);
	}

});
