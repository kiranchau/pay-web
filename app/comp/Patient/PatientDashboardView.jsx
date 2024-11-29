const {Locale} = RTBundle;

var PatientDashboardView = React.createClass({

	getInitialState: function() {
		return {
			amountPending: 0,
			numPending: 0,
			cardBalance: 0,
			international: false,
			symbol: 0,
		};
	},

	componentDidMount: function() {
		$.get(_.endpoint('/patients/dashboard'), function(res) {
			this.setState({
				amountPending: res.amountPending,
				numPending: res.numPending,
				cardBalance: res.cardBalance,
				international: res.international,
				symbol: res.symbol,
			});
		}.bind(this));
	},

	render: function() {
		var symbol = this.state.symbol ? this.state.symbol : this.props.user._currency;
		if (symbol == null || symbol == false) {
			symbol = "";
		}
		var amount = parseFloat(this.state.amountPending || 0).toFixed(2);
		return (
			<div className="page">
				<div className="row dashboard-status-row">
					<div className="col-md-3">
						<span className="count-label">{Locale.getString('title.pending-reimbursements', 'Pending Reimbursements')}</span>
						<span className="count-value">{this.state.numPending}</span>
					</div>
					<div className="col-md-3">
						<span className="count-label">{Locale.getString('title.total-pending-amount', 'Total Amount Pending')}</span>
						<span className="count-value">{symbol + amount}</span>
					</div>
				</div>
			</div>
		);
	}
});
