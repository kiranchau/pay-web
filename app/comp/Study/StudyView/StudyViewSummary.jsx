const {Locale} = RTBundle;

var StudyViewSummary = React.createClass({
    getDefaultProps: function() {
		return {	
            data: null		
		};
	},

	getInitialState: function() {
		return {
            filteredSite: '0',
            filteredSujectsSiteStatus: '0',
            filteredSujectsStatus: '0',
            filteredSiteID: '',
            filteredTaskSiteID: '',
            filteredNoteSiteID: '',
            milestone_types: null,
            note_types: null,
            researchers: null,
            showStudyEditDialog: false,
            data: this.props.data,
            sites: [],
            activeSubjectsCount: 0,
            pendingPayments: [],
            totalPaymentTotal: 0,
            paidPaymentTotal: 0,
            pendingPaymentTotal: 0,
            pendingPaymenSites: [],
            pendingPaymentCount: 0,
            overdueTasks: []
		};
    },

    componentDidMount: function() {

        $.get(_.endpoint('/settings?ver=2'), function(res) {
			var enableOUS = parseInt(res.enable_ous) === 1 ? true : false;
			this.setState({
				countries: res.countries,
				enable_ous: enableOUS,
				timezones: res.timezones,
				states: res.states,
			});
		}.bind(this));

        $.get(_.endpoint('/milestone-types'), function(res) {
			this.setState({
				milestone_types: res.records,
			});
        }.bind(this));

        $.get(_.endpoint('/note-types'), function(res) {
			this.setState({
				note_types: res.records,
			});
        }.bind(this));

        $.get(_.endpoint('/study-researchers'), function(res) {
			this.setState({
				researchers: res.records,
			});
        }.bind(this));
        
        $.get(_.endpoint('/sponsors'), function(res) {
			this.setState({
				sponsors: res.records,
			});
        }.bind(this));
        
        $.get(_.endpoint('/sites'), function(res) {
			this.setState({
				sites: res.records,
			});
        }.bind(this));

        this.fetchActiveSubjectsCount();
        this.fetchPaymentTotals();
        this.updateOverdueTasks();

    },

    fetchActiveSubjectsCount() {
        $.get(_.endpoint(`/studies/${this.state.data.id}/active-subjects/count`), res => {
			this.setState({
				activeSubjectsCount: res.count,
			});
        });
    },

    fetchPaymentTotals() {
        $.get(_.endpoint(`/studies/${this.state.data.id}/pending-payments/summary`), res => {
			this.setState({
				totalPaymentTotal: res.total_payment_total,
                paidPaymentTotal: res.paid_payment_total,
                pendingPaymentTotal: res.pending_payment_total,
			});
        });
    },

    updateOverdueTasks() {
        $.get(_.endpoint(`/tasks?study_id=${this.state.data.id}&overdue=1`), function(res) {
			this.setState({
				overdueTasks: res.records,
			});
        }.bind(this));
    },

    handleSiteStatusFilter: function(e) {
		this.setState({
			filteredSite: e.target.value,
		});
    },

    siteStatusFilter: function() {
        return (
			<span>
				<select onChange={this.handleSiteStatusFilter} value={this.state.filteredSite} style={{marginLeft: 8}}>
					<option value="%">{Locale.getString('option.all', 'All')}</option>
                    <option value="0">{Locale.getString('title.active-studies', 'Active Studies')}</option>
                    <option value="1">{Locale.getString('option.inactive-studies', 'Inactive Studies')}</option>
				</select>
			</span>
		);
    },

    filterSiteStatusFunc: function() {
		const filterKey = this.state.filteredSite;

		return function(record) {
            if (filterKey == '%') {return true}; 
            return record._site_status == filterKey;
		}.bind(this);
	},
    
    handleStudyEdit: function () {
        this.setState({
            showStudyEditDialog: true,
            studyEditsSaving: false,
            studyEditsSaved: false,
		});
    },
    
    handleCancelStudyEdit: function() {
        this.setState({
            showStudyEditDialog: false,
            studyEditsSaving: false,
            studyEditsSaved: false,
		});
    },

    handleStudySave: function(studyEdit) {
        this.setState({
            studyEditsSaving: true,
        });
        
        $.post(_.endpoint("/studies"), studyEdit, () => {
           

            this.setState({
                showStudyEditDialog: false,
                studyEditsSaving: false,
                studyEditsSaved: true,
                data: studyEdit
            });

            this.handleUpdate();
        });
    },

    handleUpdate: function() {
        if (this.refs.sitesDataTable) {
            _.defer(this.refs.sitesDataTable.handleUpdate);
        }

        if (this.refs.tasksDataTable) {
            _.defer(this.refs.tasksDataTable.handleUpdate);
        }

        if (this.refs.tasksOverdueDataTable) {
            _.defer(this.refs.tasksOverdueDataTable.handleUpdate);
        }

        if (this.refs.notesDataTable) {
            _.defer(this.refs.notesDataTable.handleUpdate);
        }

        if (this.refs.studySubjectsDataTable) {
            _.defer(this.refs.studySubjectsDataTable.handleUpdate);
        }

        if (this.refs.pendingPaymentDataTable) {
            _.defer(this.refs.pendingPaymentDataTable.handleUpdate);
        }

        if(_.isFunction(this.props.onUpdate)){
            this.props.onUpdate();
        }

        this.fetchActiveSubjectsCount();
        this.fetchPaymentTotals();
        this.updateOverdueTasks();
    },

    handleCloseStudyEdit: function() {
        this.setState({
            showStudyEditDialog: false,
            studyEditsSaving: false,
            studyEditsSaved: false,
		});
    },

    handleSiteUpdate: function () {
		this.handleUpdate();
	},

    closeDialog: function() {
		this.setState({dialog: null});
    },

    openRecord: function(params) {
        this.refs.recordViewer.open(params);
    },

    handlePendingPaymentsUpdate: function() {
        this.handleUpdate();
    },

    handlePendingPaymentsRowClick: function(data) {
        
        return {
            onClick: (e) => {
                e.preventDefault();
                // window.open(_.endpoint(`?cmd=view-requests&status=1&study_id=${this.props.data.id}&site_id=${props.data.site_id}`),'_blank');
                let p = {title: Locale.getString('title.subject-profile', 'Subject Profile'), data: data.data, closeAfterEditing: false, endpoint: `/patients/requests/${data.data.id}`, source: `/patients/requests/${data.data.patient_id}/${data.data.study_id}`, formComponent: PatientRequestForm}
                $.get(_.endpoint(`/patients/${data.data.patient_id}`), function(res) {
                    this.openRecord({...p, ...{formProps: {_patient: res.record}, title: `${Locale.getString('label.reimbursement-request', 'Reimbursement Request')} - ${res.record.id} - ${res.record.firstname}  ${res.record.lastname}`}});
                }.bind(this));
            }
        }
    },
    
    handleSiteRowClick: function(props) {
		return {
			onClick: (e) => {
                e.preventDefault();
                window.open(_.endpoint(`?cmd=view-site-summary&site_id=${props.data.id}&study_id=${this.props.data.id}`),'_blank');
			}
		}
    },

    handlePaticipatingSubjectsRowClick: function(props) {
        return {
            onClick: (e) => {
                e.preventDefault();
                window.open(_.endpoint(`?cmd=view-patient&patient_id=${props.data.patient_id}&study_id=${this.props.data.id}&site_id=${props.data.site_id}`),'_blank');
            }
        }
    },

    handleSiteFilter: function(e) {
		this.setState({
			filteredSiteID: e.target.value,
		});
	},

	filterFunc: function() {
		const siteID = this.state.filteredSiteID;

		return function(record) {
			return siteID == '' || record.site_id == siteID;
			
		}.bind(this);
    },
    
    pendingPaymentOnLoaded: function(table, records) {
        const pendingPaymenSites = _.filter(this.state.sites, site => {
            return Object.keys(this.state.data._sites).includes(site.id);
        }).filter(site => _.find(records, {site_id: site.id}));
        this.setState({pendingPaymenSites, pendingPaymentCount: records.length});
    },

	renderSiteFilters: function() {

        const sites = this.state.pendingPaymenSites;
		return (
			<span>
				<select onChange={this.handleSiteFilter} value={this.state.filteredSiteID} style={{marginLeft: 8, width: 130}}>
					<option value="">{Locale.getString('option.all-sites', 'All Sites')}</option>

					{_.map(sites, function(record) {
						return <option key={record.id} value={record.id}>{record.name}</option>;
					})}
				</select>
			</span>
		);
    },

    filterSujectsFunc: function() {
		const siteStatus = this.state.filteredSujectsSiteStatus;
		const patientStudyStatus = this.state.filteredSujectsStatus;

		return function(record) {
			
			let v = [];

            if (siteStatus == '%') {v.push(true)}
            else {v.push(record.study_site_status == siteStatus)}

            if (patientStudyStatus == '%') {v.push(true)}
            else {v.push(record.patient_study_status == patientStudyStatus)}

			return _.every(v);


		}.bind(this);
    },

    handleVisitsClick: function() {
		this.setState({
			dialog: this.renderVisitDialog(),
		});
    },
    
    renderSubjectsFilters: function() {

        const handleSujectsSiteStatusFilter = e => {
            this.setState({
                filteredSujectsSiteStatus: e.target.value,
            });
        };

        const handleSujectsStatusFilter = e => {
            this.setState({
                filteredSujectsStatus: e.target.value,
            });
        };

		return (
			<span>
				<select onChange={handleSujectsSiteStatusFilter} value={this.state.filteredSujectsSiteStatus} style={{marginLeft: 8, width: 130}}>
                    <option value="%">{Locale.getString('option.all', 'All')}</option>
                    <option value="0">{Locale.getString('title.active-sites', 'Active Sites')}</option>
                    <option value="1">{Locale.getString('option.inactive-sites', 'Inactive Sites')}</option>
				</select>

				<select onChange={handleSujectsStatusFilter} value={this.state.filteredSujectsStatus} style={{marginLeft: 8, width: 130}}>
                    <option value="%">{Locale.getString('option.all', 'All')}</option>
                    <option value="0">{Locale.getString('title.active-subjects', 'Active Subjectes')}</option>
                    <option value="2">{Locale.getString('title.completed-subjects', 'Completed Subjects')}</option>
				</select>
			</span>
		);
    },
    
    renderVisitDialog: function() {
		return <StudyVisitsDialog study={this.props.data} user={this.props.user} system={this.props.system} onClose={this.closeDialog}/>
    },
    
    renderPanelStudyTasks: function() {

        const {data} = this.state;

        const handleFilter = e => {
            this.setState({
                filteredTaskSiteID: e.target.value,
            });
        };
    
        const filterFunc= () => {
            const siteID = this.state.filteredTaskSiteID;
    
            return function(record) {
                return siteID == '' || record.site_id == siteID;
                
            }.bind(this);
        };
    
        const filter = () => {
            const sites = _.filter(this.state.sites, site => {
                return Object.keys(this.state.data._sites).includes(site.id);
            });
            return (
                <span>
                    <select onChange={handleFilter} value={this.state.filteredTaskSiteID} style={{marginLeft: 8, width: 130}}>
                        <option value="">{Locale.getString('option.all-sites', 'All Sites')}</option>
                        {_.map(sites, function(record) {
                            return <option key={record.id} value={record.id}>{record.name}</option>;
                        })}
                    </select>
                </span>
            );
        };

        const thisRef = this;

        return (
            <Panel title={Locale.getString('title.tasks', 'Tasks')} panelStyle={{minHeight: 150}}>
                <DataTable
                    ref={'tasksDataTable'}
                    createButtonLabel={Locale.getString('button.new-task', 'New Task')}
                    endpoint={`/tasks?study_id=${data.id}`}
                    onUpdate={this.handleUpdate}
                    deleteEndpoint='/tasks'
                    source='/tasks'
                    form={TaskForm}
                    width='450'
                    bottom='15'
                    editOnRowClick={true}
                    taskFormData={{study_id: data.id}}
                    controls={TaskControls}
                    closeAfterSaving={true}
                    onFilters={filter}
                    filterFunc={filterFunc()}
                    singlePage={true}
                    tableMaxHeight={250}
                    actionClassName='col-md-3'
                    optionsClassName='col-md-9'
                    additionalClassName='col-xs-12 form margin-top-5'
                    fields={{
                        name: {
                            label: Locale.getString('label.name', 'name'),
                            width: '30%',
                            value: function(val) {
                                return <div title={this.description} style={{ opacity: val ? 1 : 0 }}> {val || 'default'} </div>
                            }
                        },
                        site_id: {
                            label: Locale.getString('title.site', 'Site'),
                            width: '20%',
                            value: function(val) {
                                const site = _.find(thisRef.state.sites, {id: val});
                                const value = !site || val == 0 ? 'Not Site Specific' : site.name; 
                                return <div title={this.description} style={{ opacity: value ? 1 : 0 }}> {value || 'default'} </div>
                            },
                            sortWithValue: false,
                        },
                        date_added: {
                            label: Locale.getString('title.date-time', 'Date/Time'),
                            width: '30%',
                            value: function(val) {
                                var mom = moment.utc(val);
                                const value =  mom.isValid() ? mom.local().format('MMM D, YYYY h:mm a') : '';
                                return <div title={this.description} style={{ opacity: value ? 1 : 0 }}> {value || 'default'} </div>
                            },
                            sortWithValue: false,
                        },
                        _assigned: {
                            label: Locale.getString('title.users', 'Users'),
                            width: '20%',
                            value: function(val) {
                                return <div title={this.description} style={{ opacity: val ? 1 : 0 }}> {val || 'default'} </div>
                            }
                        },
                    }}
                    />
            </Panel>
        )
    },

    renderPanelOverdueStudyTasks: function() {
        const {data} = this.state;

        const handleFilter = e => {
            this.setState({
                filteredTaskSiteID: e.target.value,
            });
        };
    
        const filterFunc= () => {
            const siteID = this.state.filteredTaskSiteID;
    
            return function(record) {
                return siteID == '' || record.site_id == siteID;
                
            }.bind(this);
        };
    
        const filter = () => {
            const sites = _.filter(this.state.sites, site => {
                return Object.keys(this.state.data._sites).includes(site.id);
            });
            return (
                <span>
                    <select onChange={handleFilter} value={this.state.filteredTaskSiteID} style={{marginLeft: 8, width: 130}}>
                        <option value="">{Locale.getString('option.all-sites', 'All Sites')}</option>
                        {_.map(sites, function(record) {
                            return <option key={record.id} value={record.id}>{record.name}</option>;
                        })}
                    </select>
                </span>
            );
        };

        getOverdueTaskPanelTitle = () => {
            return (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {Locale.getString('title.overdue-tasks', 'Overdue Tasks')}
                    {this.state.overdueTasks.length > 0 && 
                        <img alt="RealTime-CTMS" width="15" style={{ marginLeft: 10 }} src="assets/images/exclamation.png" />
                    }
                </div>
            )
        }

        return (
            <Panel title={getOverdueTaskPanelTitle()} panelStyle={{minHeight: 150}}>
                <DataTable
                    endpoint={`/tasks?study_id=${data.id}&overdue=1`}
                    ref={'tasksOverdueDataTable'}
                    source='/tasks'
                    form={TaskForm}
                    width='450'
                    bottom='15'
                    onUpdate={this.handleUpdate}
                    editOnRowClick={true}
                    taskFormData={{study_id: data.id}}
                    closeAfterSaving={true}
                    onFilters={filter}
                    filterFunc={filterFunc()}
                    singlePage={true}
                    tableMaxHeight={250}
                    optionsClassName='col-md-12'
                    additionalClassName='col-xs-0 form margin-top-5'
                    className='brand-color-hover'
                    searchEnabled={true}
                    fields={{
                        name: {
                            label: Locale.getString('label.name', 'name'),
                            width: '30%',
                            value: function(val) {
                                return <div title={this.description} style={{ opacity: val ? 1 : 0 }}> {val || 'default'} </div>
                            }
                        },
                        date_due: {
                            label: Locale.getString('title.due-date', 'Due Date'),
                            width: '30%',
                            value: function(val) {
                                var mom = moment.utc(val);
                                const value =  mom.isValid() ? mom.local().format('MMM D, YYYY h:mm a') : '';
                                return <div title={this.description} style={{ opacity: value ? 1 : 0 }}> {value || 'default'} </div>
                            },
                            sortWithValue: false,
                        },
                    }}
                />
            </Panel>
        )
    },

    renderPanelStudyNotes: function() {

        const {data} = this.state;

        const handleFilter = e => {
            this.setState({
                filteredNoteSiteID: e.target.value,
            });
        };
    
        const filterFunc= () => {
            const siteID = this.state.filteredNoteSiteID;
    
            return function(record) {
                return siteID == '' || record.site_id == siteID;
                
            }.bind(this);
        };
    
        const filter = () => {
            const sites = _.filter(this.state.sites, site => {
                return Object.keys(this.state.data._sites).includes(site.id);
            });
            return (
                <span>
                    <select onChange={handleFilter} value={this.state.filteredNoteSiteID} style={{marginLeft: 8, width: 130}}>
                        <option value="">All Sites</option>
                        {_.map(sites, function(record) {
                            return <option key={record.id} value={record.id}>{record.name}</option>;
                        })}
                    </select>
                </span>
            );
        };

        return (
            <Panel title={Locale.getString('title.progress-notes', 'Progress Notes')} panelStyle={{minHeight: 150}}>
                <DataTable
                    ref={'notesDataTable'}
                    createButtonLabel={Locale.getString('button.new-note', 'New Note')}
                    endpoint={`/notes?study_id=${data.id}`}
                    deleteEndpoint='/notes'
                    form={NoteForm}
                    width='450'
                    editOnRowClick={true}
                    taskFormData={{study_id: data.id}}
                    controls={NoteControls}
                    closeAfterSaving={true}
                    onFilters={filter}
                    filterFunc={filterFunc()}
                    singlePage={true}
                    tableMaxHeight={250}
                    actionClassName='col-md-3'
                    optionsClassName='col-md-9'
                    additionalClassName='col-xs-12 form margin-top-5'
                    fields={{
                        site_id: {
                            label: Locale.getString('title.site', 'Site'),
                            width: '20%',
                            value: (val) => {
                                const site = _.find(this.state.sites, {id: val});
                                return !site || val == 0 ? 'Not Site Specific' : site.name; 
                                
                            },
                            sortWithValue: false,
                        },
                        date_added: {
                            label: Locale.getString('title.date-time', 'Date/Time'),
                            width: '30%',
                            value: function(val) {
                                var mom = moment.utc(val);
                                return mom.isValid() ? mom.local().format('MMM D, YYYY h:mm a') : '';
                            },
                            sortWithValue: false,
                        },
                        _account_name: {
                            label: Locale.getString('title.user', 'User'),
                            width: '20%',
                        },
                        content: {
                            label: Locale.getString('label.note', 'Note'),
                            width: '30%',
                        },
                    }}
                />
            </Panel>
        )
    },

    render: function() {

        const style = {
            fontWeight: 'bold',
        };

        const rowStyle = {
            paddingBottom: 0
        }

        const {studyEditsSaving, studyEditsSaved, data} = this.state;

        let studyEditData = JSON.parse(JSON.stringify(data));

        let croName = '';
        if (this.state.researchers){
            const first = this.state.researchers.filter(cro => cro.id == data.cro_id).shift();
            if (first) {croName = first.name};
        }

        let sponsorName = '';
        if (this.state.sponsors){
            const first = this.state.sponsors.filter(s => s.id == data.sponsor_id).shift();
            if (first) {sponsorName = first.name};
        }

        const actionButton = function() {
            const style = {
                borderRadius: 15,
                float: 'right',
                color: 'black',
                background: 'yellow',
                paddingTop: 5,
                paddingBottom: 3,
                paddingLeft: 11,
                width: 26,
                cursor: 'pointer'
            };

            return (
                <a style={style} onClick={this.handleStudyEdit}><i className="fa fa-exclamation"></i></a>
            )
        }

		return (

            <div>

                {this.state.dialog}

                <RecordViewer ref="recordViewer" {...this.props} titleStyle={{fontSize: 17}} user={this.props.user} navigate={this.props.navigate} onUpdate={this.handlePendingPaymentsUpdate} fromDashboard={true}/>
                
                {this.state.showStudyEditDialog && 
                <Dialog {...this.state} modal="true" title={Locale.getString('title.study-information', 'Study Information')} onClose={this.handleCancelStudyEdit} 
                buttons={<div className="row">
					
					<div className={'col-sm-' + (this.props.splitButtonPanel ? '6' : '12') + ' right'}>
						<span>
							{!studyEditsSaving &&
							<button type="button" onClick={this.handleCancelStudyEdit.bind(null, {})}>Cancel</button>}

							{studyEditsSaving &&
							<button type="button" className="primary" onClick={_.noop} style={{backgroundColor: _.primaryBrandColor()}}><i className="fa fa-spin fa-spinner" /> {Locale.getString('button.saving', 'Saving')}...</button>}

							{!studyEditsSaving &&
							<button type="button" className="primary" onClick={this.handleStudySave.bind(null, studyEditData)} style={{backgroundColor: _.primaryBrandColor()}}>{Locale.getString('button.save', 'Save')}</button>}

							{studyEditsSaved &&
							<button type="button" className="primary" onClick={this.handleCloseStudyEdit} style={{backgroundColor: _.primaryBrandColor()}}><i className="fa fa-times" /></button>}
						</span>
					</div>
				</div>}>
                    <StudyForm
                        data={studyEditData}
                    />
                </Dialog>
                }
                <div className='row'>
                    <div className="col-md-4">
                        <div className="base-font-size section-panel">
                            <div className="section-panel__header" style={{background: '#7f7f7f'}}><span style={{fontSize: _.baseHeaderFontSize()}} className="section-panel__title">{Locale.getString('title.study-information', 'Study Information')}</span> <a className="section-panel__edit" onClick={this.handleStudyEdit}><i className="fa fa-pencil"></i></a></div>
                            <div className="section-panel__data">
                                <div style={rowStyle}><span style={style}>{Locale.getString('title.sponsor', 'Sponsor')}: </span>{sponsorName}</div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('title.protocol', 'Protocol')}: </span>{data.protocol}</div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('label.cro', 'CRO')}: </span>{croName}</div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('title.clinical-description', 'Clinical Description')}: </span>{data.title}</div>
                                <div>
                                    <div style={{...rowStyle, ...{paddingBottom: 10}}}>
                                        <span style={style}>{Locale.getString('label.complete-protocol-title', 'Complete Protocol Title')}: </span>
                                    </div>
                                    <div style={{padding: 10, border: '1px solid #d4d4d4'}}>
                                        {data.description}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="clearfix"></div>
                        <div style={{marginTop: 30}}>
                            <PanelHorizontal title={Locale.getString('title.study-status', 'Study Status')}>
                                {data.status == 0 ? Locale.getString('option.active', 'Active') : Locale.getString('option.completed', 'Completed')}
                            </PanelHorizontal>
                        </div>
                        <div className="clearfix"></div>

                        <div style={{marginTop: 30}}>
                            <PanelHorizontal title={Locale.getString('title.total-active-subjects', 'Total Active Subjects')}>
                                {this.state.activeSubjectsCount}
                            </PanelHorizontal>
                        </div>
                        <div className="clearfix"></div>

                        <div className="section-panel" style={{marginTop: 30}}>
                            <div className="section-panel__header" style={{background: '#7f7f7f'}}><span style={{fontSize: _.baseHeaderFontSize()}} className="section-panel__title">{Locale.getString('title.participating-sites', 'Participating Sites')}</span></div>
                            <div className="section-panel__data">
                            <DataTable
                                ref={'sitesDataTable'}
                                optionsClassName='col-md-12 form'
                                additionalClassName= 'col-md-12 form margin-top-5'
                                endpoint={`/studies/${data.id}/sites-summary`}
                                identifier={'name'}
                                localIdentifier={'name'}
                                editOnRowClick={true}
                                singlePage={true}
                                tableMaxHeight={250}
                                onRowProps={this.handleSiteRowClick}
                                showBrandColorOnHover={true}
                                onFilters={this.siteStatusFilter}
                                filterFunc={this.filterSiteStatusFunc()}
                                fields={{
                                    name: {
                                        label: Locale.getString('title.site-name', 'Site Name'),
                                        width: '40%',
                                    },
                                    _active_count: {
                                        label: Locale.getString('title.active-subjects', 'Active Subjects'),
                                        width: '5%',
                                    },
                                    _complete_count: {
                                        label: Locale.getString('title.completed-subjects', 'Completed Subjects'),
                                        width: '5%',
                                    },
                                }}
                            />
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-md-8 marign-top--max-md">
                        <div className='row'>
                            <div className="col-md-6">
                                <PanelStudyPaymentProgram 
                                    manageVisits={this.state.data.manage_visits || this.state.data._study_manage_visits || this.state.data._stipends_and_reimbursements == '1'}
                                    visitStipends={this.state.data.visit_stipends || this.state.data._study_visit_stipends || this.state.data._stipends_and_reimbursements == '1'}
                                    manageReimbursements={this.state.data.manage_reimbursements || this.state.data._study_manage_reimbursements || this.state.data._stipends_and_reimbursements == '1'}
                                    onVisitsClick={this.handleVisitsClick}
                                />

                                <div style={{position: 'relative'}}>
                                    {this.renderPanelOverdueStudyTasks()}
                                </div>
                                
                            </div>

                            <div className="col-md-6">
                                <PanelStudyPaymentAmount key={this.state.pendingPaymentCount} studyID={this.state.data.id} panelProps={{bodyStyle: {padding: '58px 30px'}}}/>
                            </div>
                        </div>
                        
                        
                        <Panel title={Locale.getString('title.pending-payments', 'Pending Payments')} panelStyle={{minHeight: 150}}>
                            {this.state.sites.length > 0 &&
                            <DataTable
                                ref="pendingPaymentDataTable"
                                endpoint={`/studies/${data.id}/pending-payments`}
                                searchEnabled={true}
                                onFilters={this.renderSiteFilters}
                                filterFunc={this.filterFunc()}
                                onRowProps={this.handlePendingPaymentsRowClick}
                                onLoaded={this.pendingPaymentOnLoaded}
                                showBrandColorOnHover={true}
                                singlePage={true}
                                tableMaxHeight={250}
                                actionClassName=''
                                optionsClassName='col-md-12'
                                additionalClassName='col-md-12 form margin-top-5'
                                fields={{
                                    study_site_name: {
                                        label: Locale.getString('title.site', 'Site'),
                                        width: '17%',
                                    },
                                    initials: {
                                        label: Locale.getString('title.initials', 'Initials'),
                                        width: '10%',
                                    },
                                    patient_id: {
                                        label: Locale.getString('title.mrn', 'MRN'),
                                        width: '13%',
                                    },
                                    study_number: {
                                        label: Locale.getString('title.study-number', 'Study Number'),
                                        width: '20%',
                                    },
                                    payment_total: {
                                        label: Locale.getString('title.paid-to-date', 'Paid to Date'),
                                        width: '20%',
                                    },
                                    pending_payment_total: {
                                        label: Locale.getString('title.pending-payments', 'Pending Payments'),
                                        width: '20%',
                                    },
                                }}
                            />
                            }
                        </Panel>
                        
                        <Panel title={Locale.getString('title.participating-subjects', 'Participating Subjects')} panelStyle={{minHeight: 150}}>
                            <DataTable
                                ref="studySubjectsDataTable"
                                endpoint={`/studies/${data.id}/subjects`}
                                searchEnabled={true}
                                onFilters={this.renderSubjectsFilters}
                                filterFunc={this.filterSujectsFunc()}
                                onRowProps={this.handlePaticipatingSubjectsRowClick}
                                showBrandColorOnHover={true}
                                singlePage={true}
                                tableMaxHeight={200}
                                actionClassName=''
                                optionsClassName='col-md-12'
                                additionalClassName='col-md-12 form margin-top-5'
                                fields={{
                                    study_site_name: {
                                        label: Locale.getString('title.site', 'Site'),
                                        width: '17%',
                                    },
                                    initials: {
                                        label: Locale.getString('title.initials', 'Initials'),
                                        width: '10%',
                                    },
                                    patient_id: {
                                        label: Locale.getString('title.mrn', 'MRN'),
                                        width: '13%',
                                    },
                                    study_number: {
                                        label: Locale.getString('title.study-number', 'Study Number'),
                                        width: '20%',
                                    },
                                }}
                            />
                        </Panel>

                        {this.renderPanelStudyTasks()}
                        {this.renderPanelStudyNotes()}
                        
                         <div className="clearfix"></div>
                    </div>
                </div>  
            </div>
        )
    },
});