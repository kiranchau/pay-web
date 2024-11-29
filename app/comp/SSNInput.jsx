var SSNInput = React.createClass({

	getDefaultProps: function() {
		return {
			name: '',
			onChange: _.noop,
			focused: false,
			value: '',
		};
	},

	getInitialState: function() {
		return {
			localValue: this.props.value,
		};
	},

	maskSSN: function(val) {
		val = this.formatSSN(val);

		if (val.length == 11) {
			val = val.replace(/^\d{3}-\d{2}/g, '***-**');
		}
		return val;
	},

	formatSSN: function(val) {
		val += '';
		val = val.replace(/[^\d*]/g, '');

		if (val.length == 9) {
			val = val.substr(0, 3) + '-' + val.substr(3, 2) + '-' + val.substr(5);
		}

		return val;
	},

	handleSSN: function(visible) {
		if (visible === true) {

			this.setState({
				localValue: this.formatSSN(this.state.localValue),
			});
			//this.props.onChange(this.props.name, this.formatSSN(this.props.value));
		}
		this.setState({
			focused: visible,
		});
	},

	handleChange: function(e) {
		var val = e.target.value;
		if (this.state.focused) {
			var len = val.length;
			var pat = ['\\d', '\\d', '\\d', '-', '\\d', '\\d', '-', '\\d', '\\d', '\\d', '\\d'];
			var reg = new RegExp('^' + pat.slice(0, len).join('') + '$', 'i');

			if (val.length > this.state.localValue.length) {
				if (!reg.test(val)) {
					val = this.state.localValue;
				}
				else if (pat[len] == '-') {
					val += '-';
				}
			}

			this.props.onChange(this.props.name, val);
		}
		this.setState({
			localValue: val,
		});
	},

	render: function() {
		return (
			<input
				name={this.props.name}
				type="text"
				onFocus={this.handleSSN.bind(null, true)}
				onBlur={this.handleSSN.bind(null, false)}
				placeholder="000-00-0000"
				value={this.state.focused ? this.state.localValue : this.maskSSN(this.state.localValue)}
				onChange={this.handleChange}
				autoComplete='new-password'
			/>
		);
	}

});
