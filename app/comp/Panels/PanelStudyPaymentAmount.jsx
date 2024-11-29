const {Locale} = RTBundle;

var PanelStudyPaymentAmount = React.createClass({

    getDefaultProps: function() {
		return {	
            studyID: null,
            siteID: null,
            panelProps: {},	
		};
    },
    
    getInitialState: function() {
		return {
            totalPaymentTotal: 0,
            paidPaymentTotal: 0,
            pendingPaymentTotal: 0,
		};
    },

    componentDidMount: function() {
        this.hydrate();
    },

    componentDidUpdate(prevProps) {
        if ((this.props.studyID != prevProps.studyID) || (this.props.siteID != prevProps.siteID)) {
            this.hydrate();
        }
    },

    hydrate: function() {
        const query = this.props.siteID ? `?site_id=${this.props.siteID}` : '';
        $.get(_.endpoint(`/studies/${this.props.studyID}/pending-payments/summary${query}`), (res) => {
			this.setState({
				totalPaymentTotal: res.total_payment_total,
                paidPaymentTotal: res.paid_payment_total,
                pendingPaymentTotal: res.pending_payment_total,
			});
        });
    },
	
	render: function() {

        return (
        <Panel title={Locale.getString('title.total-pending-payments', 'Total Pending Payments')} bodyStyle={{padding: '48px 30px'}} {...this.props.panelProps}>
            <div className='row' style={{padding: '10px 0'}}>
                <div className="col-sm-7">
                {Locale.getString('label.payment-to-date', 'Payments to Date')}
                </div>
                <div className="col-sm-5">
                ${_.numberFormat(this.state.paidPaymentTotal, 2)}
                </div>
            </div>
            <div className='row' style={{padding: '10px 0'}}>
                <div className="col-sm-7">
                {Locale.getString('label.payment-requests', 'Pending Payment Requests')}
                </div>
                <div className="col-sm-5">
                ${_.numberFormat(this.state.pendingPaymentTotal, 2)}
                </div>
            </div>  
        </Panel>
        )
    },
});
