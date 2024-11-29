const {Locale} = RTBundle;

var PanelStudyPaymentProgram = React.createClass({

    getDefaultProps: function() {
		return {
            panelProps          : {},
            manageVisits        : 0,
            visitStipends       : 0,
            manageReimbursements: 0,
            onVisitsClick       : _.noop
		};
    },

    actionButton: function() {
        const reimbursementButtonStyle = {
            color         : '#444',
            display       : 'inline-block',
            padding       : '4px 6px',
            background    : 'linear-gradient(to bottom, #f5f5f5, #eee)',
            border        : '1px solid #ddd',
            borderRadius  : 3,
            backgroundClip: 'padding-box',
            marginLeft    : 16,
            minWidth      : 30,
            textAlign     : 'center',
            cursor        : 'pointer',
            float         : 'right',
        }

        return (
            <span>{this.props.manageReimbursements == 1 &&
                <a style={reimbursementButtonStyle} title={Locale.getString('title.manage-study-visits', 'Manage Study Visits')} onClick={this.props.onVisitsClick}><i className="fa fa-calendar"></i></a>}
            </span>
        )
    },

	render: function() {

        let paymentTypeDisplay = Locale.getString('message.select-visit-study-option', 'Please select a Visit Management option for this study.');
        
        if (this.props.manageVisits == 1 || this.props.visitStipends == 1 ) {
            if (this.props.manageReimbursements == 1) {
                paymentTypeDisplay = Locale.getString('label.reimbursements-stipends', 'Reimbursements & Stipends');
            } else {
                paymentTypeDisplay = Locale.getString('label.stipend-visit', 'Stipend Visit');
            }
        } else if (this.props.manageReimbursements == 1) {
            paymentTypeDisplay = Locale.getString('label.reimbursements', 'Reimbursements');
        }

        return (
        <Panel 
            title       = {Locale.getString('title.payment-program-type', 'Payment Program Type')}
            panelStyle  = {{minHeight: 90}}
            titleStyle  = {{paddingTop: 6}}
            headerStyle = {{padding: '4px 0'}}
            action      = {this.actionButton()}
            {...this.props.panelProps}>
            <div style={{textAlign: 'center', paddingTop: 1}}>
                <span>{paymentTypeDisplay}</span>
                
            </div>
        </Panel>
        )
    },
});
