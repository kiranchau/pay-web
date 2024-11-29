const {Locale} = RTBundle;

var StudyVisitsDialog = React.createClass({

    getDefaultProps: function() {
		return {
            study: {},
            user: {},
            system: {},
            onClose: _.noop
		};
	},

    render: function() {

		var visitFields = {
			name: {
				label: Locale.getString('title.visit-name', 'Visit Name'),
				width: '55%',
				sortWithValue: false,
				value: function(val) {
					return <span>{val} {this.baseline == 1 ? <i className="fa fa-check" /> : null}</span>;
				},
			},
		};

		if (this.props.study.visit_stipends == 1) {
			_.extend(visitFields, {
				stipend: {
					label: Locale.getString('title.stipend', 'Stipend'),
					align: 'right',
					width: '25%',
				},
			});
		}

		return (
			<Dialog {...this.props} width={800} bottom={20} title={Locale.getString('title.manage-study-visits', 'Manage Study Visits')} onClose={this.props.onClose} buttons={<button type="button" onClick={this.props.onClose}>{Locale.getString('button.close', 'Close')}</button>}>
				<DataTable
					endpoint={'/studies/visits/' + this.props.study.id}
					createButtonLabel={Locale.getString('title.new-visit', 'New Visit')}
					controls={StudyVisitControls}
					width={600}
					form={StudyVisitForm}
					user={this.props.user}
					system={this.props.system}
					study={this.props.study}
					editOnRowClick={true}
					fields={visitFields}
				/>
			</Dialog>
		);
	}

});