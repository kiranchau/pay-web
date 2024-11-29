var ErrorDisplay = React.createClass({

	getDefaultProps: function() {
		return {
			className: '',
			style: {},
			message: '',
		};
	},

	render: function() {
		var classNames = ['error'];
		if (this.props.className)
			className.push(this.props.className);

		if (_.isEmpty(this.props.message)) {
			return <span className="hidden" />;
		}

		return <div className={classNames.join(' ')} style={this.props.style}>{this.props.message}</div>;
	}

});
