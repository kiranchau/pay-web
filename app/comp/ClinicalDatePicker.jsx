var ClinicalDatePicker = React.createClass({

	getDefaultProps: function() {
		return {
			dateFormatISO: 'YYYY-MM-DD',
			minDate: null,
			maxDate: null,
			value: '',
			onChange: _.noop,
			changeYear: false,
			changeMonth: true,
			showPickerIcon: false,
			yearRange: 'c-10:c+10',
			showDate: true,
			showTime: false,
			minIncrements: false,
			disabled: false,
			style: {},
			iconStyle: {}
		};
	},

	getInitialState: function() {
		var mom = moment(this.props.value);		
		const time = this.props.value ? this.props.value.substr(11) : '00:00:00';

		return {
			focused: false,
			shadowValue: mom.isValid() ? mom.format('DD-MMM-YYYY').toUpperCase() : '',
			shadowTime: time
		};
	},

	componentDidMount: function() {
		var settings = {
			dateFormat: 'dd-M-yy',
			changeYear: this.props.changeYear,
			changeMonth: this.props.changeMonth,
			yearRange: this.props.yearRange,
			constrainInput: true,
			onSelect: function(date) {
				var mom = moment(date, 'DD-MMM-YYYY');
				const {showTime} = this.props;
				const {shadowTime} = this.state;
				this.setState({
					shadowValue: date,
				});
				if (mom.isValid() && mom.format(this.props.dateFormatISO) != this.props.value) {
					if (showTime) {
						this.props.onChange(mom.format(this.props.dateFormatISO) + ' ' + shadowTime);
					} else {
						this.props.onChange(mom.format(this.props.dateFormatISO));
					}
				}
			}.bind(this)
		};

		if (!_.isNull(this.props.minDate))
			settings.minDate = this.props.minDate;
		if (!_.isNull(this.props.maxDate))
			settings.maxDate = moment(this.props.maxDate).format('DD-MMM-YYYY');

		jQuery(this.refs.input).datepicker(settings);
	},

	componentWillUnmount: function() {
		jQuery(this.refs.input).datepicker('destroy');
	},

	componentWillReceiveProps: function(props) {
		if (!_.isUndefined(props.value)) {
			const time = props.value ? props.value.substr(11) : '00:00:00';
			var mom = moment(props.value);
			this.setState({
				shadowValue: mom.isValid() ? mom.format('DD-MMM-YYYY').toUpperCase() : '',
				shadowTime: time
			});
		}
	},

	handleChange: function(e) {
		if (this.state.focused) {
			e.preventDefault();
			var val = e.target.value;
			var len = val.length;
			var pat = ['\\d', '\\d', '-', '[a-z]', '[a-z]', '[a-z]', '-', '\\d', '\\d', '\\d', '\\d'];
			var reg = new RegExp('^' + pat.slice(0, len).join('') + '$', 'i');

			if (val.length > this.state.shadowValue.length) {
				if (!reg.test(val)) {
					val = this.state.shadowValue;
				}
				else if (pat[len] == '-') {
					val += '-';
				}
			}
			
			this.setState({
				shadowValue: val,
			});
		}
	},

	handleFocus: function() {
		this.setState({
			focused: true,
		});
	},

	handleBlur: function() {
		const {value, showTime} = this.props;
		const {shadowTime} = this.state;
		var mom = moment(this.state.shadowValue, 'DD-MMM-YYYY');
		var shadowDate = mom.isValid() ? mom.format('YYYY-MM-DD') : value;

		this.setState({
			focused: false,
		});

		if (shadowDate != value) {
			if (mom.isValid() && this.state.shadowValue != value) {
				if (showTime) {
					this.props.onChange(mom.format(this.props.dateFormatISO) + ' ' + shadowTime);
				} else { 
					this.props.onChange(mom.format(this.props.dateFormatISO));
				}
			}
		}
	},

	handleChangeHour: function(e) {
        const {shadowTime} = this.state;
		let newValue = e.target.value + shadowTime.substr(2);

		var mom = moment(this.state.shadowValue, 'DD-MMM-YYYY');
		this.props.onChange((mom.isValid() ? mom.format(this.props.dateFormatISO) : '0000-00-00') + ' ' + newValue);
		this.setState({shadowTime: newValue})
    },

    handleChangeMinute: function(e) {
        const {shadowTime} = this.state;
		let newValue = shadowTime.substr(0, 3) + e.target.value + shadowTime.substr(5);

		var mom = moment(this.state.shadowValue, 'DD-MMM-YYYY');
		this.props.onChange((mom.isValid() ? mom.format(this.props.dateFormatISO) : '0000-00-00') + ' ' + newValue);
		
		this.setState({shadowTime: newValue})
	},
	
	renderSelectOption: value => {

        if (typeof value === 'number') {
            value = value < 10 ? '0' + value : '' + value;
        }

        return (
            <option
                key={value}
                value={value}
            >
                {value}
            </option>
        );
    },

	render: function() {
		var containerStyle = this.props.style;
		if (this.props.showPickerIcon) {
			containerStyle = _.extend(containerStyle, {
				display: 'inline-block',
				position: 'relative',
			});
		}

		let {showTime} = this.props;
		let validHours = showTime && _.range(0, 24);
		let validMinutes = showTime && _.range(0, 60);
		if(showTime && this.props.minIncrements !== false) {
			validMinutes = _.map(_.chunk(_.range(0, 60), this.props.minIncrements), _.first);
		}
		
		let iconStyle = {
			...{
			padding: 5, 
			position: 'absolute',
			right: 0,
			top: 0,
			fontSize: 18,
			}, 
			...this.props.iconStyle
		};
		if (showTime) {
			iconStyle = {
				...iconStyle, 
				...{
					position: 'relative',
					right: 27,
					top: 2
				}
			}
		}

		let inputStyle = { textTransform: 'uppercase', maxWidth: '100%' };
		if (showTime) {
			inputStyle = {
				...inputStyle, 
				...{
					width: 'unset'
				}
			}
		}

		const {shadowTime} = this.state;
		const hour = shadowTime.substr(0, 2);
		const min = shadowTime.substr(3, 2);

		let timeStyle = {position: "relative", right: 20};
		if (!this.props.showDate) {
			timeStyle = {};
		}

		return (
			<span style={containerStyle}>
				{this.props.showDate &&
				<input 
					disabled={this.props.disabled}
					ref="input" 
					autoComplete='new-password' 
					name={this.props.name} 
					type="text" 
					pattern="[0-9]{2}-[A-Za-z]{3}-[0-9]{4}" 
					value={this.state.shadowValue} 
					style={inputStyle} 
					placeholder="DD-MMM-YYYY" 
					onFocus={this.handleFocus} 
					onBlur={this.handleBlur} 
					onChange={this.handleChange} 
				/>
				}
				{this.props.showDate && 
				this.props.showPickerIcon &&
				<button style={iconStyle} disabled={this.props.disabled} onClick={function() { jQuery(this.refs.input).datepicker('show'); }.bind(this)}><i className="fa fa-calendar" /></button>}


				<span style={timeStyle}>
					{/* Hours */}
					{showTime &&
					<select
					disabled={this.props.disabled}
					style={{width: 'unset'}}
						onChange={this.handleChangeHour}
						value={hour}
					>
						{_.map(validHours, this.renderSelectOption)}
					</select>}

                	{showTime && <span style={{padding: '0 5px'}}>:</span>}

					{/* Minutes */}
					{showTime &&
					<select
						disabled={this.props.disabled}
						style={{width: 'unset'}}
						onChange={this.handleChangeMinute}
						value={min}
					>
						{_.map(validMinutes, this.renderSelectOption)}
					</select>}
				</span>
                
			</span>
		);
	}

});
