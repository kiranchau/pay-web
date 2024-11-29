var Dialog = React.createClass({
	
	getDefaultProps: function() {
		return {
			style : {},
			width : 0,
			bottom: 'auto',
			height: 'auto',
			modal : true,
			zIndex: 500,

			titleClassName: '',
			titleStyle    : {},

			dialogAction         : null,
			dialogActionClassName: '',

			dialogClassName: '',
			dialogBodyStyle: {},

			onBeforeClose: $.noop,
			onClose      : $.noop,

			title  : '',
			buttons: [],

			showTitleBar: true,
			showCloseButton: true,
		};
	},

	componentDidMount: function() {
		jQuery('body').css('overflow', 'hidden');
	},

	componentWillUnmount: function() {
		jQuery('body').css('overflow', 'auto');
	},

	getInitialState: function() {
		return {
		}
	},

	handleClose: function() {
		if (this.props.onBeforeClose(this) === false)
			return;

		this.props.onClose();
	},

	handleScroll: function(e) {
		//e.preventDefault();
		e.stopPropagation();
	},

	render: function() {
		var overlayStyle = {
			zIndex: this.props.zIndex,
			background: this.props.modal ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
		};

		var style = _.extend({}, this.props.style, {
			// maxWidth: this.props.width,
		});

		if (this.props.width > 0) {
			var width = this.props.width;
			var windowWidth = jQuery(window).width();
			if (width > windowWidth - 30) {
				width = windowWidth - 30;
			}
			style.left = '50%';
			style.marginLeft = -1 * width / 2;
			style.width = width;
			style.bottom = this.props.bottom > 0 ? this.props.bottom : 'auto';
		}
		
		if (this.props.bottom == '_auto') {
			style.bottom = 'auto';
		}


		if (_.isEmpty(this.props.buttons)) {
			style.paddingBottom = 0;
		}

		const titleClassName = this.props.titleClassName || this.props.dialogAction ? "col-xs-9" : "col-xs-12";

		const dialogActionClassName = this.props.dialogActionClassName || "col-xs-3 right";

		return (
			<div className="comp-dialog-overlay" style={overlayStyle}>
				<div className={"comp-dialog " + this.props.dialogClassName} style={style}>
					{(this.props.showTitleBar || !_.isEmpty(this.props.title)) &&
					<div className="title-bar">
						<div className={titleClassName}>
							<div className='title' style={this.props.titleStyle}>{this.props.title}</div>
						</div>
						{this.props.dialogAction && 
						<div className={dialogActionClassName}>
							{this.props.dialogAction}
						</div>}

						{this.props.showCloseButton &&
						<button className="close-button" onClick={this.handleClose}>&times;</button>}
					</div>}

					<div className="body" onMouseWheel={this.handleScroll} onScroll={this.handleScroll} style={this.props.dialogBodyStyle}>
						{this.props.children}
					</div>

					{!_.isEmpty(this.props.buttons) > 0 &&
					<div className="body-shadow" />}

					{!_.isEmpty(this.props.buttons) > 0 &&
					<div className="button-panel">
						{this.props.buttons}
					</div>}
				</div>
			</div>
		);
	}


});
