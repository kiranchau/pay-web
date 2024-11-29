const {Locale} = RTBundle;


var PatientTravelPreferenceView = React.createClass({

	getDefaultProps: function() {
		return {
		};
	},

	getInitialState: function() {
		return {
			data: {},
		};
	},

	componentDidMount: function() {

		$.get(_.endpoint('/patients/info'), function(res) {
			this.setState({
				data: res.record,
			});
		}.bind(this));

    },
    
    handleSave: function() {
        if (this.refs.travelPreferenceDialog) {
            _.defer(this.refs.travelPreferenceDialog.handleSave);
        }
    },

    handleCloseDialog: function() {
		this.setState({
			dialog: null,
		});
	},

    onSave: function() {
        this.setState({
            dialog: (
                <Dialog title={Locale.getString('title.travel-preferences-saved', 'Travel Preference Saved')} width={400} onClose={this.handleCloseDialog} buttons={<button type="button" onClick={this.handleCloseDialog}>{Locale.getString('label.okay', 'Okay')}</button>}>
                    <p>{Locale.getString('message.travel-preferences-saved', 'Your travel preference has been succssfully saved.')}</p>
                </Dialog>
            )
        });
    },

	render: function() {

        const endpoint = this.state.data.id ? `/patients/${this.state.data.id}/travelpreference` : '';
        const patientData = JSON.parse(JSON.stringify(this.state.data));
        const style = {border: "unset"};
		const dialogProps = {formProps:{patientData}, endpoint, style};
				
		return (
			<div className="page">
                {this.state.dialog}
				<div className="row">
                    {this.state.data.id && <TravelPreferenceDialog ref='travelPreferenceDialog' onSave={this.onSave} {...dialogProps} />}

					<dl className="col-md-12 form dialog">
						<button value="Save Travel Preference" onClick={this.handleSave} className="btn btn-primary btn-block" style={{backgroundColor: _.primaryBrandColor(), color: '#fff', padding: 15}}>{Locale.getString('button.save-travel-preference', 'Save Travel Preference')}</button>
					</dl>
				</div>
			</div>
		)
		
		
	}

});

