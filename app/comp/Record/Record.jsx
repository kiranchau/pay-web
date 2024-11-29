var Record = React.createClass({

	getDefaultProps: function() {
		return {
			searchTransformers: {},
			valueTransformers: {},
			onUpdate: function() {},
			onSelected: _.noop,
			onEdit: _.noop,
			onDelete: _.noop,
			batchSelection: false,
			editMode: false,
		};
	},

	render: function() {
		if (this.props.editMode) {
			return <RecordEditor {...this.props} />;
		}

		var columns = $.map(this.props.fields, function(value, key) {
			var val = this.props.data[key];
			var style = {};
			let title = '';

			if (_.isObject(value)) {
				if (_.isFunction(value.value)) {
					val = value.value.call(this.props.data, val, this.props.data);
				}

				if (_.isObject(value.style) && value.onlyStyleHeader !== true)
					style = value.style;

				if (value.align) {
					style = _.extend(style, {
						textAlign: value.align,
					});
				}

				if (_.isFunction(value.title)) {
					title = value.title.call(this.props.data, this.props.data[key]);
				}
			}

			if (_.isFunction(this.props.valueTransformers[key]))
				val = this.props.valueTransformers[key].call(this.props.data, val);

			return <td key={key} style={style} title={title}>{val}</td>;
		}.bind(this));

		var rowProps = {};
		if (this.props.editOnRowClick) {
			rowProps.onClick = this.props.onEdit.bind(null, { record: this.props.data, title: this.props.editTitle});
		}
		if (_.isFunction(this.props.onRowProps)) {
			rowProps = _.extend(rowProps, this.props.onRowProps(this.props));
		}
		return (
			<tr {...rowProps}>
				{this.props.batchSelection &&
				<td><input type="checkbox" checked={this.props.checked} onChange={this.props.onSelected.bind(null, this.props.data.id)} /></td>}

				{columns}

				{this.props.controls &&
				React.createElement(this.props.controls, this.props, '')}
			</tr>
		);
	}

});
