const {Locale} = RTBundle;

var StudyVisitForm = React.createClass({

	getDefaultProps: function() {
		return {
			errors: {},
			data: {},
			study: {},

			currentStudyID: 0,
		};
	},

	getInitialState: function() {
		return {
			data: _.extend(this.props.data, {_costs: {}}),
		};
	},

	setField: function(key, val) {
		var data = this.state.data;
		data[key] = val;
		this.setState({
			data: data,
		});
	},

	componentDidMount: function() {
	},

	handleChange: function(e) {
		if (e.target.name == 'sort_order' && e.target.value.length < 2) {
			e.target.value = `0${e.target.value}`;
		}

		this.setField(e.target.name, e.target.value);
	},

	handleCheck : function(e) {
		this.setField(e.target.name, e.target.checked ? 1 : 0);
	},

	render: function() {
		const { data } = this.state;
		const sort_order = (data.sort_order && data.sort_order.toString().charAt(0) == 0) ? data.sort_order.toString().charAt(1) : data.sort_order;

		return (
			<div className="row">
				<div className="col-md-12">
					<dl className="form dialog">
						<dt>{Locale.getString('title.visit-name', 'Visit Name')}<RequiredMarker /></dt>
						<dd>
							<input name="name" type="text" value={this.state.data.name} onChange={this.handleChange} />
							<ErrorDisplay message={this.props.errors.name} />
						</dd>

						{this.props.study.visit_stipends == 1 &&
						<dt>{Locale.getString('title.stipend', 'Stipend')}<RequiredMarker /></dt>}

						{this.props.study.visit_stipends == 1 &&
						<dd>
							<input name="stipend" type="text" value={this.state.data.stipend} onChange={this.handleChange} />
							<ErrorDisplay message={this.props.errors.stipend} />
						</dd>}

						<dt>{Locale.getString('label.baseline', 'Baseline')}</dt>
						<dd>
							<input name="baseline" type="checkbox" value="1" checked={parseInt(this.state.data.baseline) === 1} onChange={this.handleChecked} />
							<ErrorDisplay message={this.props.errors.baseline} />
						</dd>

						<dt>{Locale.getString('label.sort-order', 'Sort Order')}</dt>
						<dd>
							<input name="sort_order" type="text" value={sort_order} onChange={this.handleChange} />
							<ErrorDisplay message={this.props.errors.sort_order} />
						</dd>
					</dl>
				</div>
			</div>
		);
	}
});