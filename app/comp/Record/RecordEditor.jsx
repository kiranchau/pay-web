var RecordEditor = React.createClass({

	getDefaultProps: function() {
		return {
			onUpdate: function() {},
			onSelected: _.noop,
			onEdit: _.noop,
			onDelete: _.noop,
			batchSelection: false,
			data: {},
		};
	},

	getInitialState: function() {
		return {
			data: this.props.data,
		};
	},

	handleChange: function(key, e) {
		var data = this.state.data;
		if (e.target.type == 'checkbox' || e.target.type == 'radio')
			data[key] = e.target.checked ? e.target.value : '';
		else
			data[key] = e.target.value;

		this.setState({
			data: data,
		});
	},

	render: function() {
		var columns = _.map(this.props.fields, function(value, key) {
			var val = this.props.data[key] || '';
			var style = {};

			var editFieldType = 'input';
			var editFieldProps = {
				type: 'text',
				style: {},
				onChange: this.handleChange.bind(null, key),
			};
			var editFieldChildren = null;

			if (_.isObject(value)) {
				if (_.isFunction(value.value)) {
					//val = value.value.call(this.props.data, val);
				}

				if (_.isObject(value.style) && value.onlyStyleHeader !== true) {
					style = value.style;
				}

				if (_.isFunction(value.editFieldProps)) {
					editFieldProps = _.extend(editFieldProps, value.editFieldProps.call(this.props.data));
				}
				else if (_.isObject(value.editFieldProps)) {
					editFieldProps = _.extend(editFieldProps, value.editFieldProps);
				}

				if (!_.isUndefined(value.editFieldType)) {
					editFieldType = value.editFieldType;
				}

				if (!_.isUndefined(value.editFieldChildren)) {
					editFieldChildren = value.editFieldChildren;
				}
			}

			if (this.props.errors[key]) {
				editFieldProps.style.border = '1px solid rgba(255, 0, 0, 0.8)';
				editFieldProps.title = this.props.errors[key];
			}

			editFieldProps.value = val;
			if (_.isUndefined(editFieldProps.style.width)) {
				editFieldProps.style.width = '100%';
			}

			var editField = null;
			if (_.isObject(value) && value.editField)
				editField = value.editField.call(this);
			else
				editField = React.createElement(editFieldType, editFieldProps, editFieldChildren);

			return (
				<td key={key} style={style}>
					{editField}
				</td>
			);
		}, this);

		return (
			<tr className="record-tr-editing">
				{this.props.batchSelection &&
				<td></td>}

				{columns}

				{this.props.controls &&
				React.createElement(this.props.controls, this.props, '')}
			</tr>
		);
	}

});

