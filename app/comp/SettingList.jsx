var SettingList = React.createClass({

	getDefaultProps: function() {
		return {
			fieldName: 'setting[]',
			defaultList: [],
			onUpdate: $.noop,
		};
	},

	getInitialState: function() {
		return {
			list: this.props.defaultList,
		};
	},

	handleSort: function(index, offset) {
		var list = this.state.list;
		var item = list[index];
		if (index == 0 || index > list.length - 1) {
			return;
		}

		list.splice(index, 1);
		list.splice(index + offset, 0, item);
		this.setState({
			list: list,
		});
		this.props.onUpdate(list);
	},

	handleCheck: function(index, e) {
		var list = this.state.list;
		list[index].checked = e.target.checked ? 1 : 0;
		this.setState({
			list: list,
		});
		this.props.onUpdate(list);
	},

	render: function() {
		var sortButtonStyle = {
			display: 'inline-block',
			padding: '4px 6px',
			backgroundColor: '#ddd',
			borderRadius: 5,
			margin: '0 2px',
		};

		return (
			<table className="" style={{width: '100%'}}>
				<tbody>
				{_.map(this.state.list, function(item, index) {
					return (
						<tr key={item.value}>
							<td>
								<label style={{display: 'block', padding: 5}}>
									<input name={this.props.fieldName} type="checkbox" value={item.value} onChange={this.handleCheck.bind(null, index)} checked={!_.isUndefined(item.checked) && item.checked == 1} />
									{item.label}
								</label>
							</td>
							<td style={{verticalAlign: 'middle'}}>
								<button type="button" onClick={this.handleSort.bind(null, index, -1)} style={sortButtonStyle}><i className="fa fa-angle-up"></i></button>
								<button type="button" onClick={this.handleSort.bind(null, index, +1)} style={sortButtonStyle}><i className="fa fa-angle-down"></i></button>
							</td>
						</tr>
					);
				}, this)}
				</tbody>
			</table>
		);
	}

});
