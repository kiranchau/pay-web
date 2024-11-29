const {Locale} = RTBundle;

var YesNoToggle = React.createClass({

	getDefaultProps: function() {
		return {
			defaultCheckedValue: 0,
			fieldName: '',
			yesValue: 1,
			noValue: 2,
			yesText: Locale.getString('option.yes', 'Yes'),
			noText: Locale.getString('option.no', 'No'),
			onChange: $.noop,
			checkable: true,
		};
	},

	getInitialState: function() {
		return {
			checkedValue: this.props.defaultCheckedValue,
		}
	},

	handleChange: function(val) {
		var checked = true;
		if (this.props.checkable && val == this.state.checkedValue) {
			checked = !this.state.checked;
			val = 0; //this.props.defaultCheckedValue;
		}
		this.setState({
			checked: checked,
			checkedValue: val,
		});
		if (this.state.checkedValue != val) {
			this.props.onChange(val);
		}
	},

	render: function() {
		return (
			<div className="comp-yesno-toggle">
				<div className={'ans' + (this.state.checkedValue == this.props.yesValue ? ' active' : '')} onClick={this.handleChange.bind(null, this.props.yesValue)}>
					{this.props.yesText}
				</div>
				<div className={'ans' + (this.state.checkedValue == this.props.noValue ? ' active' : '')} onClick={this.handleChange.bind(null, this.props.noValue)}>
					{this.props.noText}
				</div>
				<input type="hidden" name={this.props.fieldName} value={this.state.checkedValue} />
			</div>
		);
	}

});
