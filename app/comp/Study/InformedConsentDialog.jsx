const {Locale} = RTBundle;

var InformedConsentDialog = React.createClass({

	getDefaultProps: function() {
		return {
			onClose: _.noop,
		};
	},

	getInitialState: function() {
		return {
			data: {
                consent: false
            },
			errors: {},
			dialog: null,
			formSubmitted: false,
		};
	},

    handleChecked: function() {
        let data = this.state.data;
        data.consent = !data.consent;
        
        this.setState({ data });
    },

    handleSave: function() {
        if (!this.state.data.consent) {
            return this.setState({ errors: { consent: 'Informed consent has not been verified.' } })
        }

        this.props.handleSave();
    },

	render: function() {
		var buttons = [
			<button key="cancel" type="button" onClick={this.props.onClose}>{Locale.getString('button.cancel', 'Cancel')}</button>,
			<button 
                key="save" 
                type="button" 
                onClick={this.handleSave} 
                className="primary"
            >
                {Locale.getString('button.save', 'Save')}
            </button>
		];

		return (
			<Dialog 
				title={Locale.getString('title.informed-consent', 'Informed Consent Verification Required')} 
				style={{textAlign: 'center'}} 
				onClose={this.props.onClose} buttons={buttons} 
				width={500}
			>
				<div className="row form">
					<dl className="col-sm-12 form dialog">
						<span style={{ fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>{Locale.getString('label.informed-consent-message', 'By checking the box, I confirm the patient has given consent for their information to be provided to ' + this.props.domainName + ' for the purpose of travel, reimbursements, and/or stipends.')}</span>
						<dd>
						<div style={{ width: '100%', paddingTop: 20 }}>
							<input  name="icf_verification" type="checkbox" checked={this.state.data.consent == true} onChange={this.handleChecked} />
							<ErrorDisplay message={this.state.errors.consent} />
						</div>
						</dd>
					</dl>
				</div>
			</Dialog>
		);
	},
});
