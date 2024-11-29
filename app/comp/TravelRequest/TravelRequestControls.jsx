const {Locale} = RTBundle;

var TravelRequestControls = React.createClass({

	closeDialog: function() {
		this.props.onShow({dialog: null});
	},

	render: function() {
		const {data} = this.props;
		let showDetail = data.id ? true : false;
		let showNewRequest = !data.id;
		if (this.props.user.type == 'patient') {
			showDetail = false;
			showNewRequest = false;

			if (!_.isUndefined(data.visit_start_date) && data.visit_start_date && data.visit_start_date !== "0000-00-00 00:00:00" && 
				!_.isUndefined(data.visit_end_date) && data.visit_end_date && data.visit_end_date !== "0000-00-00 00:00:00") {
				showDetail = data.patient_save == 1;
				showNewRequest = data.patient_save == 0;
			}
		} 

		let access = false;
		if(this.props.user.type == 'user')
		{
			if((_.isFromCTMS(this.props.user.emailaddress) || _.isFromclinedge(this.props.user.emailaddress)))
			{
				access = true;
			}
			else{
				access = false;
			}
		}
		else{
			access = false;
		}

		return (
			<td className="record-controls">

				{showNewRequest &&
					this.props.user.type == 'patient' &&
					<a onClick={(e) => this.props.onShowNewRequest(data)} style={{background: _.primaryBrandColor(), color: 'white', textDecoration: 'none', padding: '5px 10px'}}>
					{Locale.getString('title.view', 'View')}</a>
				}
				{showNewRequest &&
					this.props.user.type != 'patient' &&
					<a onClick={(e) => this.props.onShowNewRequest(data)} style={{background: _.primaryBrandColor(), color: 'white', textDecoration: 'none', padding: '5px 10px'}}>
					<i className="fa fa-plus"></i>  {Locale.getString('title.new-request', 'New Request')}</a>
				}

				{showDetail &&
					<span>
						{this.props.user.type != 'user' && <a onClick={(e) => this.props.onShowRequest(data)} className="app-edit" title={Locale.getString('title.view-travel-request', 'View Travel Request')} ><i className="fa fa-file-text-o"></i></a>}

						{access &&
							<span>
								<a onClick={(e) => this.props.onShowRequest(data)} className="app-edit" title={Locale.getString('title.edit-travel-request', 'Edit Travel Request')}><i className="fa fa-pencil"></i></a>
								<a onClick={(e) => this.props.onDeleteRequest(data)} className="app-edit" title={Locale.getString('title.delete-travel-request', 'Delete Travel Request')} ><i className="fa fa-trash"></i></a>
							</span>
						}

					</span>
					
				}
			</td>
		);
	}

});
