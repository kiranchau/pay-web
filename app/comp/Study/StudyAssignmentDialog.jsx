const {Locale} = RTBundle;

var StudyAssignmentDialog = React.createClass({
	getDefaultProps: function() {
		return {
			onUpdate: _.noop,
			onCancel: _.noop,
			patientID: 0,
			savedAssociations: [],
			onStatusChange: _.noop,
			setCurrentSite: _.noop,
		};
	},

	getInitialState: function() {
		return {
			processing: false,
			sites: [],
			studies: [],
			data: {},
			assignedStudies: [],
			dialog: false,
			domainName:"",
		};
	},

	componentDidMount: function() {
		$.get(_.endpoint('/sites?status=0'), function(res) {
			this.setState({
				sites: res.records,
			});
		}.bind(this));

		$.get(_.endpoint('/patients/studies?patient_id=' + this.props.patientID), function(res) {
			this.setState({
				assignedStudies: res.records,
			});
		}.bind(this));
	},

	handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	setField: function(field, value) {
		var data = this.state.data;
		data[field] = value;
		this.setState({
			data: data,
		});
	},

	getButtons: function() {
		if (!this.state.processing) {
			var buttons = [
				<button onClick={this.props.onCancel} key={1}>{Locale.getString('button.close', 'Close')}</button>,
				<button onClick={this.assignStudy} key={2} style={{backgroundColor: _.primaryBrandColor(), color: '#fff'}}>{Locale.getString('button.assign-this-study', 'Assign this Study')}</button>
			];
		}
		else {
			var buttons = [
				<button style={{backgroundColor: _.primaryBrandColor(), color: '#fff'}}key={3}><i className="fa fa-spinner fa-spin fa-1x fa-fw" style={{marginRight: 5}} />{Locale.getString('button.saving', 'Saving')}...</button>
			];
		}
		return buttons;
	},

	handleSiteChange: function(e) {
		this.setField(e.target.name, e.target.value);
		if (e.target.value !== '') {
			$.get(_.endpoint('/studies?site_id=' + this.state.data.site_id), function(res) {
				this.setState({
					studies: res.records,
					domainName: res.domainName,
					errors: {},
				}, this.clearStudy);
			}.bind(this));
		}
		else {
			this.setState({
				studies: [],
			});
		}
	},

	clearStudy: function() {
		var data = this.state.data;
		data.study_id = '';
		data.status = '';
		this.setState({
			data: data,
		});
	},

	assignStudy: function(e) {
		e.stopPropagation();
		this.setState({
			processing: true,
		}, this.studyRequest);
	},

	stopProcessing: function() {
		this.setState({
			processing: false,
		});
	},

	studyRequest: function() {
		var studyUser = {
			patient_id: this.props.patientID,
			site_id: this.state.data.site_id,
			study_id: this.state.data.study_id,
			status: this.state.data.status,
			deleted: 0,
		};
	
		var savedAssociations = this.props.savedAssociations;
		for (var i = 0; i < savedAssociations.length; i++) {
			var savedAssociation = savedAssociations[i];
			if (savedAssociation.site_id == this.state.data.site_id && savedAssociation.study_id == this.state.data.study_id) {
				if (savedAssociation._patient_study_id && savedAssociation._patient_study_id > 0 && this.props.patientID == 0) {
					studyUser = _.extend(studyUser, {_patient_study_id: savedAssociation._patient_study_id});
				}
			}
		}

		const study = _.find(this.state.studies, { id: this.state.data.study_id });

		if (study.icf_verification > 0) {
			Object.assign(studyUser, { _icf_verified: 1 })
		}


		$.post(_.endpoint('/patients/studies'), studyUser, function(res) {
			if (res.status < 2) {
				savedAssociations.push(res.record);
				this.props.onChange(savedAssociations);
				this.props.onStatusChange(res.record._patient_study_id, res.record._patient_study_status, res.record.study_id, res.record.site_id, savedAssociations);
				this.props.setCurrentSite(studyUser.site_id);
				this.setup();
			}
			else {
				this.setState({
					errors: res.errors,
				},
					this.stopProcessing
				);
			}
		}.bind(this));
	},

	setup: function() {
		this.props.onUpdate();
		this.setState({
			processing: false,
		},
			this.props.onCancel
		);
	},

	handleChecked: function(e) {
		const study = _.find(this.state.studies, { id: e.target.value });

		if (study && study.icf_verification == 1) {
			return this.setState({ informedConsentData: { ...this.state.data, study_id: e.target.value } });
		}

		this.handleStudyChange(e.target.value);
	},

	handleStudyChange: function(study_id) {
		if (this.state.data.study_id) {
			var studies = _.map(this.state.studies, function(study) {
				if (study.id == this.state.data.study_id) {
					study._status = '';
				}
				return study;
			}, this);
			this.setState({
				studies: studies,
			},
				this.setField.bind(null, 'study_id', study_id)
			);
		}
		var data = this.state.data;
		data.study_id = study_id;

		this.setState({
			data: data,
		},
			this.applyDefaultChecked
		);
	},

	applyDefaultChecked: function() {
		var studies = _.map(this.state.studies, function(study) {
			if (study.id == this.state.data.study_id) {
				study._status = 0;
			}
			return study;
		}, this);
		this.setState({studies: studies,});
		this.setField('status', 0);
	},

	handleStatusChange: function(studyID, e) {
		var studies = _.map(this.state.studies, function(study) {
			if (study.id == studyID) {
				study._status = e.target.value;
			}
			return study;
		});

		this.setState({studies: studies},
			this.setField.bind(null, 'status', e.target.value)
		);
	},

	render: function() {
		var buttons = this.getButtons();
		var sites = this.state.sites;
		sites = _.sortBy(sites, function(site) {
			return site.name.toLowerCase();
		});
		var studies = this.state.studies;
		
		var assignedStudies = _.map(this.state.assignedStudies, function(patientStudy) {
			if(patientStudy.status === "2"){
				return ;
			}else{
				return parseInt(patientStudy.study_id);
			}
		});
		studies = _.filter(studies, function(study) {
			return assignedStudies.indexOf(parseInt(study.id)) == -1;
		});

		studies = _.filter(studies, function(study) {
			return parseInt(study.status) === 0;
		});

		studies = _.sortBy(studies, function(study) {
			return study.title;
		});


		var currentSite = _.find(sites, function(site) {
			return parseInt(site.id) === parseInt(this.state.data.site_id);
		}, this);

		const shorter = function(val) {
			return val.length > 20 ? (val.substr(0, 20) + '...') : val;
		}

		return (
			<Dialog onClose={this.props.onCancel} bottom="20" buttons={buttons} width={800} title={Locale.getString('title.assign-a-study', 'Assign a Study')}>
				{this.state.informedConsentData && 
					<InformedConsentDialog 
						onClose={() => this.setState({ informedConsentData: false })}
						handleSave={() => {
							const study_id = this.state.informedConsentData.study_id;

							this.setState({
								informedConsentData: false,
							},
								() => this.handleStudyChange(study_id)
							);
						}}
						domainName={this.state.domainName}
					/>
				}
				<div className="row form dialog">
					<dl className="col-md-12">
						<p>{Locale.getString('message.assign-study', 'Please select a site and assign a related study.')}</p>

						<dt>{Locale.getString('title.site', 'Site')}</dt>
						<dd>
							<select name="site_id" onChange={this.handleSiteChange} value={this.state.data.site_id}>
								<option value="">{Locale.getString('option.select', 'Select')}...</option>
								{_.map(sites, function(site) {
									return <option key={site.id} value={site.id}>{site.name}</option>;
								})}
							</select>
						</dd>

						{currentSite &&
						<div>
							<dt><h6 style={{color: '#aaa'}}>{Locale.getString('title.assign-subject-study', 'Assign Subject to Study')}</h6></dt>
							<i><h6>{Locale.getString('title.avaliable-studies', 'Avaliable studies at')} {currentSite.name}</h6></i>
						</div>}

						{this.state.errors &&
						<ErrorDisplay message={this.state.errors.generic} />}

						{currentSite &&
						<div>
							<table className="record-table" style={{tableLayout: 'auto'}}>
								<thead>
									<tr>
										<th colSpan="4"></th>
										<th colSpan="2" style={{textAlign: 'center'}}>{Locale.getString('title.status', 'Status')}</th>
									</tr>
									<tr>
										<th></th>
										<th>{Locale.getString('title.sponsor', 'Sponsor')}</th>
										<th>{Locale.getString('title.protocol', 'Protocol')}</th>
										<th>{Locale.getString('title.title', 'Title')}</th>
										<th style={{textAlign: 'center'}}>{Locale.getString('option.active', 'Active')}</th>
										<th style={{textAlign: 'center'}}>{Locale.getString('label.completed', 'Completed')}</th>
									</tr>
								</thead>
								<tbody>
									{_.map(studies, function(study) {
										return (
											<tr key={study.id}>
												<td><input name="study_id" type="radio" value={study.id} checked={parseInt(this.state.data.study_id) === parseInt(study.id)} onChange={this.handleChecked} /></td>
												<td>{study._sponsor_name}</td>
												<td title={study.protocol}>{shorter(study.protocol)}</td>
												<td title={study.title}>{shorter(study.title)}</td>
												<td style={{textAlign: 'center'}}><input name="status" type="radio" value="0" checked={parseInt(study._status) === 0} onChange={this.handleStatusChange.bind(null, study.id)} disabled={this.state.data.study_id != study.id} /></td>
												<td style={{textAlign: 'center'}}><input name="status" type="radio" value="2" checked={parseInt(study._status) === 2} onChange={this.handleStatusChange.bind(null, study.id)} disabled={this.state.data.study_id != study.id} /></td>
											</tr>
										);
									}, this)}
								</tbody>
							</table>
						</div>}
					</dl>
				</div>
			</Dialog>
		);
	},
});