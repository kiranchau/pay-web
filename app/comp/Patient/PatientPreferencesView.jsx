const {Locale} = RTBundle;

var PatientPreferencesView = React.createClass({

	getInitialState: function() {
		return {
			countries: {},
			states: {},
			timezones: [],
		};
	},

	render: function() {
		return (
			<div className="page">
				<DataTable
					{...this.props}
					{...this.state}
					endpoint="/patients/addresses"
					createButtonLabel={Locale.getString('button.new-address', 'New Address')}
					controls={PatientAddressControls}
					form={PatientAddressForm}
					fields={{
						name: {
							label: Locale.getString('label.name', 'Name'),
						},
						address: {
							label: Locale.getString('label.address', 'Address'),
						},
						address2: {
							label: Locale.getString('label.address-line', 'Address Line') + '2',
						},
						city: {
							label: Locale.getString('label.city', 'City'),
						},
						state: Locale.getString('title.state', 'State'),
						zipcode: Locale.getString('label.postal-code', 'Postal Code'),
						country: Locale.getString('label.country', 'Country'),
					}}
				/>
			</div>
		);
	}

});

