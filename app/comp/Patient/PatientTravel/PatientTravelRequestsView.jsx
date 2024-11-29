const {Locale} = RTBundle;

var PatientTravelRequestsView = React.createClass({

	getDefaultProps: function() {
		return {
			urlParams: null
		};
	},

	getInitialState: function() {
		return {
			data: {},
			urlParams: this.props.urlParams,
			studyAssociations: null
		};
	},

	componentDidMount: function() {

		$.get(_.endpoint('/patients/info'), function(res) {
			this.setState({
				data: res.record,
			}, this.fetchStudies);
		}.bind(this));

		this.props.setGlobalState({
			urlParams: {},
			appLoading: false
		});

	},
	
	fetchStudies: function() {
		$.get(_.endpoint('/patients/studies?patient_id=' + this.props.user.id), function(res) {
			this.setState({
				studyAssociations: res.records,
			});
		}.bind(this));
	},
    
    handleSave: function() {
        if (this.refs.travelRequestDialog) {
            _.defer(this.refs.travelRequestDialog.handleSave);
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
                <Dialog title={Locale.getString('title.travel-request-saved', 'Travel Request Saved')} width={400} onClose={this.handleCloseDialog} buttons={<button type="button" onClick={this.handleCloseDialog}>{Locale.getString('label.okay', 'Okay')}</button>}>
                    <p>{Locale.getString('message.travel-preferences-saved', 'Your travel preference has been succssfully saved.')}</p>
                </Dialog>
            )
        });
    },

	render: function() {
		
		const endpoint = this.state.data ? `/patients/${this.props.user.id}/travelrequests` : '';
		const patientData = JSON.parse(JSON.stringify(this.state.data));
		const style = {border: "unset"};
		const user = this.props.user;
		const studyAssociations = JSON.parse(JSON.stringify(this.state.studyAssociations));
		const urlParams = {...this.state.urlParams};
		const dialogProps = {formProps:{patientData}, patientData, studyAssociations, endpoint, style, user, urlParams};
		
		return (
			<div className="page">
                {this.state.dialog}
				<div className="row">
                    {this.props.user.id && this.state.studyAssociations && <TravelRequestDialog ref='travelRequestDialog' onSave={this.onSave} {...dialogProps} />}
				</div>
			</div>
		)
		
		
	}

});

