const {Locale} = RTBundle;

var StudySiteViewSummary = React.createClass({
    getDefaultProps: function() {
		return {	
            data: null,
            countries: null
		};
	},

	getInitialState: function() {
		return {
            filterSiteUsers: '',
            filteredMilestoneTypeID: '',
            filteredNoteTypeID: '',
            selectedStudyID: null,
            milestone_types: null,
            note_types: null,
            showSiteEditDialog: false,
			data: this.props.data,
			studies: [],
			languages: [],
            selectedStudyPaymentsCount: 0,
            filteredPendingPaymentsStudyStatus: '0',
            filteredPendingPaymentsStudyID: '',
            filteredNotesStudyID: '',
            filteredTasksStudyID: '',
            pendingPaymenStudies: []
		};
    },

    componentDidMount: function() {

        $.get(_.endpoint('/milestone-types'), (res) => {
			this.setState({
				milestone_types: res.records,
			});
        });

        $.get(_.endpoint('/note-types'), (res) => {
			this.setState({
				note_types: res.records,
			});
        });

        $.get(_.endpoint(`/studies?site_id=${this.props.data.id}`), (res) => {
			this.setState({
                studies: res.records,
            });
		});
		
		$.get(_.endpoint('/languages'), function(res) {
			this.setState({languages: res.records});
		}.bind(this));

        if(this.props.urlParams && this.props.urlParams.study_id) {
            this.setState({
                selectedStudyID: this.props.urlParams.study_id,
            });
        }
    },

    handleSiteUsersFilter: function(e) {
		this.setState({
			filterSiteUsers: e.target.value,
		});
    },

    filterSiteUsersFunc: function() {
        const filterSiteUsers = this.state.filterSiteUsers;
		return function(record) {
			return filterSiteUsers === '' || (parseInt(record.active) === parseInt(filterSiteUsers));
		}.bind(this);
	},

	siteUsersFilters: function() {
		var options = [
			{id: 1, label: Locale.getString('option.active-users', 'Active Users')},
			{id: 0, label: Locale.getString('label.inactive-users', 'Inactive Users')},
		];
		return (
			<span>
				<select value={this.state.filterSiteUsers} onChange={this.handleSiteUsersFilter} style={{width: 116}}>
					<option value="">{Locale.getString('option.all-users', 'All Users')}</option>
					{_.map(options, function(option) {
						return <option key={option.id} value={option.id}>{option.label}</option>;
					})}
				</select>
			</span>
		);
    },
    
    hydrateStudyPaymentCount(studyID) {
        $.get(_.endpoint(`/studies/${studyID}/payments/approved/count?site_id=${this.state.data.id}`), (res) => {
            this.setState({
                selectedStudyPaymentsCount: res.record
            });
        });
    },

    onChangeSelectedStudy: function(e) {
        const selectedStudyID = e.target.value || null;
		this.setState({
            selectedStudyID,
            selectedStudyPaymentsCount: 0,
        }, this.handleUpdate);
        
        selectedStudyID && this.hydrateStudyPaymentCount(selectedStudyID);
        
    },
    
    handleSiteEdit: function () {
        this.setState({
            showSiteEditDialog: true,
            siteEditsSaving: false,
            siteEditsSaved: false,
		});
    },
    
    handleCancelSiteEdit: function() {
        this.setState({
            showSiteEditDialog: false,
            siteEditsSaving: false,
            siteEditsSaved: false,
		});
    },

    handleSiteSave: function(siteEdit) {
        this.setState({
            siteEditsSaving: true,
        });
        
        $.post(_.endpoint("/sites"), siteEdit, (res) => {
			if (res.errors) {
				this.setState({siteFormErrors: res.errors});
			}
			else {
				this.setState({
					showSiteEditDialog: false,
					siteEditsSaving: false,
					siteEditsSaved: true,
					data: siteEdit
				});
	
				this.handleUpdate();
			}
        });
    },

    handleUpdate: function() {
        if (this.refs.siteUserTable) {
            _.defer(this.refs.siteUserTable.handleUpdate);
        }

        if (this.refs.studiesDataTable) {
            _.defer(this.refs.studiesDataTable.handleUpdate);
        }

        if (this.refs.tasksDataTable) {
            _.defer(this.refs.tasksDataTable.handleUpdate);
        }

        if (this.refs.notesDataTable) {
            _.defer(this.refs.notesDataTable.handleUpdate);
        }

        if(_.isFunction(this.props.onUpdate)){
            this.props.onUpdate();
        }
    },

    handleCloseStudyEdit: function() {
        this.setState({
            showSiteEditDialog: false,
            siteEditsSaving: false,
            siteEditsSaved: false,
		});
    },

    closeDialog: function() {
		this.setState({dialog: null});
	},

	handleSudyUpdate: function () {
		this.handleUpdate();
    },
    
    handleViewStudyClick: function(studyID) {
        window.open(_.endpoint(`?cmd=view-study-summary&study_id=${studyID}`),'_blank');
    },

    handleViewPaymentsClick: function(props) {
        window.open(_.endpoint(`?cmd=view-requests&status=2&study_id=${props.study_id}&site_id=${props.site_id}`),'_blank');
    },

    handlePendingPaymentsRowClick: function(props) {
        return {
            onClick: (e) => {
                e.preventDefault();
                window.open(_.endpoint(`?cmd=view-requests&status=1&study_id=${props.data.study_id}&site_id=${props.data.site_id}`),'_blank');
            }
        }
    },

    fetchTaskRowProps: function(record) {
        return {
            title: record.data && record.data.description
        }
    },
    
    handleVisitsClick: function() {
        const selectedStudy = _.find(this.state.studies, {id: this.state.selectedStudyID});
        const dialog = <StudyVisitDataTable study={selectedStudy} openSiteID={this.state.data.id} user={this.props.user} system={this.props.system} onClose={this.closeDialog}/>;
		this.setState({
			dialog
		});
    },

    filterPendingPaymentsFunc: function() {
        const id     = this.state.filteredPendingPaymentsStudyID;
        const status = this.state.filteredPendingPaymentsStudyStatus;

        return function(record) {

            let v = [];
            v.push(id == '' || record.study_id == id);
            v.push(record.study_status == status);

            return _.every(v);


        }.bind(this);
    },

    pendingPaymentOnLoaded: function(table, records) {
        const pendingPaymenStudies = this.state.studies.filter(study => _.find(records, {study_id: study.id}))
        this.setState({pendingPaymenStudies});
    },
    
    renderPendingPaymentsFilters: function() {
        const handleStatusFilter = (e) => {
            this.setState({
                filteredPendingPaymentsStudyStatus: e.target.value,
            });
        };

        const handleStudyFilter = (e) => {
            this.setState({
                filteredPendingPaymentsStudyID: e.target.value,
            });
        };

        return (
            <span>
                <select onChange={handleStatusFilter} value={this.state.filteredPendingPaymentsStudyStatus} style={{marginLeft: 8, width: 130}}>
                    <option value="0">{Locale.getString('title.active-studies', 'Active Studies')}</option>
                    <option value="2">{Locale.getString('option.completed-studies', 'Completed Studies')}</option>
                </select>

                <select onChange={handleStudyFilter} style={{marginLeft: 8, width: 130}} value={ this.state.filteredPendingPaymentsStudyID ? this.state.pendingPaymenStudies.find(s => { return s.id == this.state.filteredPendingPaymentsStudyID}).id : '' }>
                    <option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
                    {_.map(this.state.pendingPaymenStudies, function(study) {
                        let protocol = study.protocol.length > 20 ? (study.protocol.substr(0, 20) + '...') : study.protocol;
                        return <option key={study.id} value={study.id}>{study._sponsor_name + ' - ' + protocol}</option>;
                    })}
                </select>
            </span>
        );
    },

    renderStudyOption: function(props) {
        return (
            <select style={{marginLeft: 8, width: 130}} {...props}>
                <option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>
                {_.map(this.state.studies, function(study) {
                    let protocol = study.protocol.length > 20 ? (study.protocol.substr(0, 20) + '...') : study.protocol;
                    return <option key={study.id} value={study.id}>{study._sponsor_name + ' - ' + protocol}</option>;
                })}
            </select>
        );
    },

    renderTasks: function() {

        const handleFilter = e => {
            this.setState({
                filteredTasksStudyID: e.target.value,
            });
        };

        const filterFunc = () => {
            const id = this.state.filteredTasksStudyID;

            return function(record) {
                return id == '' || record.study_id == id;

            }.bind(this);
        };

        const filter = () => {
            return this.renderStudyOption(
                {
                    onChange: handleFilter, 
                    value: this.state.filteredTasksStudyID ? this.state.studies.find(s => { return s.id == this.state.filteredTasksStudyID}).id : ''
                }
            );
        };

        let query = `?site_id=${this.props.data.id}`;
        query += this.state.selectedStudyID ? `&study_id=${this.state.selectedStudyID}` : '';
        const dataTableProps = !this.state.selectedStudyID ? {onFilters: filter, filterFunc: filterFunc()} : {};

        let newRecord = {site_id: this.props.data.id};
        if (this.state.selectedStudyID) {newRecord.study_id = this.state.selectedStudyID}

        return (
            <Panel title={Locale.getString('title.tasks', 'Tasks')} panelStyle={{minHeight: 150}}>
                <DataTable
                    {...dataTableProps}
                    ref={'tasksDataTable'}
                    createButtonLabel={Locale.getString('button.new-task', 'New Task')}
                    endpoint={`/tasks${query}`}
                    deleteEndpoint='/tasks'
                    source='/tasks'
                    form={TaskForm}
                    width='450'
                    bottom='15'
                    editOnRowClick={true}
                    taskFormData={{study_id: this.state.selectedStudyID}}
                    onRowProps={this.fetchTaskRowProps}
                    controls={TaskControls}
                    closeAfterSaving={true}
                    singlePage={true}
                    tableMaxHeight={250}
                    actionClassName='col-md-3'
                    optionsClassName='col-md-9'
                    additionalClassName='col-xs-12 form margin-top-5'
                    onCreateRecord={() => {
                        return newRecord;
                    }}
                    fields={{
                        name: {
                            label: Locale.getString('label.name', 'Name'),
                            width: '30%',
                            value: function(val) {
                                return <div title={this.description} style={{ opacity: val ? 1 : 0 }}> {val || 'default'} </div>
                            }
                        },
                        date_added: {
                            label: Locale.getString('title.date-time', 'Date/Time'),
                            width: '30%',
                            value: function(val) {
                                var mom = moment.utc(val);
                                const value = mom.isValid() ? mom.local().format('MMM D, YYYY h:mm a') : ' ';
                                return <div title={this.description} style={{ opacity: value ? 1 : 0 }}> {value || 'default'} </div>
                            },
                            sortWithValue: false,
                        },
                        _assigned: {
                            label: Locale.getString('title.date-time', 'Date/Time'),
                            width: '25%',
                            value: function(val) {
                                return <div title={this.description} style={{ opacity: val ? 1 : 0 }}> {val || 'default'} </div>
                            }
                        },
                    }}
                />
            </Panel>
        )
    },

    renderNotes: function() {

        const handleFilter = e => {
            this.setState({
                filteredNotesStudyID: e.target.value,
            });
        };

        const filterFunc = () => {
            const id = this.state.filteredNotesStudyID;

            return function(record) {
                return id == '' || record.study_id == id;

            }.bind(this);
        };

        const filter = () => {
            return this.renderStudyOption(
                {
                    onChange: handleFilter, 
                    value: this.state.filteredNotesStudyID ? this.state.studies.find(s => { return s.id == this.state.filteredNotesStudyID}).id : ''
                }
            );
        };

        let query = `?site_id=${this.props.data.id}`;
        query += this.state.selectedStudyID ? `&study_id=${this.state.selectedStudyID}` : '';
        const dataTableProps = !this.state.selectedStudyID ? {onFilters: filter, filterFunc: filterFunc()} : {};

        let newRecord = {site_id: this.props.data.id};
        if (this.state.selectedStudyID) {newRecord.study_id = this.state.selectedStudyID}

        return (
            <Panel title={Locale.getString('title.progress-notes', 'Progress Notes')} panelStyle={{minHeight: 150}}>
                <DataTable
                    {...dataTableProps}
                    ref={'notesDataTable'}
                    createButtonLabel={Locale.getString('button.new-note', 'New Note')}
                    endpoint={`/notes${query}`}
                    deleteEndpoint='/notes'
                    form={NoteForm}
                    width='450'
                    editOnRowClick={true}
                    taskFormData={{study_id: this.state.selectedStudyID}}
                    controls={NoteControls}
                    closeAfterSaving={true}
                    singlePage={true}
                    tableMaxHeight={250}
                    actionClassName='col-md-3'
                    optionsClassName='col-md-9'
                    additionalClassName='col-xs-12 form margin-top-5'
                    onCreateRecord={() => {
                        return newRecord;
                    }}
                    fields={{
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
                            width: '25%',
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

    fetchSelectedStudyValue: function() {
        const study = this.state.selectedStudyID && this.state.studies.find(s => { return s.id == this.state.selectedStudyID});
        return study ? study.id : '';
    },
    
    render: function() {

        const style = {
            fontWeight: 'bold',
        };

        const rowStyle = {
            paddingBottom: 0
        }

        const {siteEditsSaving, siteEditsSaved, data} = this.state;

        let siteEditData = JSON.parse(JSON.stringify(data));

        let country_name = '';
        if (this.props.countries){
            const first = this.props.countries.filter(c => c.code == data.country).shift();
            if (first) {country_name = first.name};
        }

        const selectedStudy = _.find(this.state.studies, {id: this.state.selectedStudyID});
        const selectedStudyName = selectedStudy ? `${selectedStudy._sponsor_name} - ${selectedStudy.protocol}` : '';

        if (!selectedStudy && this.state.selectedStudyID) {
            return (
                <div></div>
            )
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
		};
		
		let language = _.filter(this.state.languages, lang => {
			return lang.code == data.lang;
		});
		language = language[0] ? language[0].name : '';

        const renderStudyToOption = study => {
            return <option key={study.id} value={study.id}>{study._sponsor_name + ' - ' + study.protocol}</option>;
        }

		return (

            <div className='base-font-size'>

                {this.state.dialog}

                {this.state.showSiteEditDialog && 
                <Dialog {...this.state} modal="true" title={Locale.getString('title.site-information', 'Site Information')} dialogClassName={'width-60--md'} onClose={this.handleCancelSiteEdit} 
                    buttons={
                    <div className="row">
					
                        <div className={'col-sm-' + (this.props.splitButtonPanel ? '6' : '12') + ' right'}>
                            <span>
                                {!siteEditsSaving &&
                                <button type="button" onClick={this.handleCancelSiteEdit.bind(null, {})}>{Locale.getString('button.cancel', 'Cancel')}</button>}

                                {siteEditsSaving &&
                                <button type="button" className="primary" onClick={_.noop} style={{backgroundColor: _.primaryBrandColor()}}><i className="fa fa-spin fa-spinner" /> {Locale.getString('button.saving', 'Saving')}...</button>}

                                {!siteEditsSaving &&
                                <button type="button" className="primary" onClick={this.handleSiteSave.bind(null, siteEditData)} style={{backgroundColor: _.primaryBrandColor()}}>{Locale.getString('button.save', 'Save')}</button>}

                                {siteEditsSaved &&
                                <button type="button" className="primary" onClick={this.handleCloseSiteEdit} style={{backgroundColor: _.primaryBrandColor()}}><i className="fa fa-times" /></button>}
                            </span>
                        </div>
                    </div>}
                >
                    <StudySiteForm
                        {...this.props}
						data={siteEditData}
						errors={this.state.siteFormErrors}
                    />
                </Dialog>
                }
                <div className='row'>
                    <div className="col-md-4">
                        <div className="base-font-size section-panel">
                            <div className="section-panel__header" style={{background: '#7f7f7f'}}><span style={{fontSize: _.baseHeaderFontSize()}} className="section-panel__title">{Locale.getString('title.site-information', 'Site Information')}</span> <a className="section-panel__edit" onClick={this.handleSiteEdit}><i className="fa fa-pencil"></i></a></div>
                            <div className="section-panel__data">
                                <div style={rowStyle}><span style={{...style, ...{fontSize: '1.1em'}}}>{data.name}</span></div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('label.address', 'Address')} 1: </span>{data.address}</div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('label.address', 'Address')} 2: </span>{data.address2}</div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('label.country', 'Country')}: </span>{country_name}</div>
								<div style={rowStyle}><span style={style}>{Locale.getString('label.language', 'Language')}: </span>{language}</div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('label.city', 'City')}: </span>{data.city}</div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('label.phone', 'Phone')}: </span>{data.phone}</div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('title.fax', 'Fax')}: </span>{data.fax}</div>
                                <div style={rowStyle}><span style={style}>{Locale.getString('title.email', 'Email')}: </span>{data.emailaddress}</div>
                            </div>
                        </div>


                        <div style={{marginTop: 30}}>
                            <PanelHorizontal title={Locale.getString('title.total-active-studies', 'Total Active Studies')}>
                               {this.state.studies ? _.filter(this.state.studies, (s) => { return s.status == 0}).length : 0}
                            </PanelHorizontal>                       
                        </div>

                        <div className="clearfix"></div>

                        <div style={{marginTop: 30}}>
                            <div className='form dialog' style={{padding: 0}}>
                                <div className='base-header-font-size' style={{paddingBottom: 5, fontWeight: 'bold'}}>{Locale.getString('title.study-selection', 'Study Selection')} :</div>
                                <dd style={{padding: 0}}>
                                    <select onChange={this.onChangeSelectedStudy} value={this.fetchSelectedStudyValue()}>
                                        <option value="">{Locale.getString('option.all-studies', 'All Studies')}</option>

                                        <optgroup label="Active">
                                            {this.state.studies &&
                                            this.state.studies
                                            .filter(s => s.status == '0')
                                            .map(renderStudyToOption)}
                                        </optgroup>

                                        <optgroup label="Completed">
                                            {this.state.studies &&
                                            this.state.studies
                                            .filter(s => s.status == '2')
                                            .map(renderStudyToOption)}
                                        </optgroup>
                                        
                                    </select>
                                </dd>   
                            </div>
                        </div>
                        

                        <div className="clearfix"></div>

                        <div style={{marginTop: 30}}>
                            <div className="section-panel">
                                <div className="section-panel__header" style={{background: '#7f7f7f'}}><span style={{fontSize: _.baseHeaderFontSize()}} className="section-panel__title">{Locale.getString('title.admins', 'Site Users')}</span></div>
                                <div className="section-panel__data">
                                    <DataTable
                                    ref="siteUserTable"
                                    endpoint={`/sites/users/${data.id}`}
                                    createButtonLabel={Locale.getString('button.new-user', 'New User')}
                                    site={this.state.data}
                                    user={this.props.user}
                                    system={this.props.system}
                                    controls={UserControls}
                                    additionalClassName=""
                                    form={UserForm}
                                    createTitle={Locale.getString('title.user-information', 'User Information')}
                                    editTitle={Locale.getString('title.user-information', 'User Information')}
                                    editOnRowClick={true}
                                    searchEnabled={false}
                                    singlePage={true}
                                    tableMaxHeight={250}
                                    // optionsClassName='col-md-12 form'
                                    // additionalClassName= 'col-md-12 form margin-top-5'
                                    actionStyle={{paddingLeft: 8, paddingRight: 8, minWidth: 96}}
                                    fields={{
                                        firstname: Locale.getString('label.first-name', 'First Name'),
                                        lastname: Locale.getString('label.last-name', 'Last Name'),
                                        _role: {
                                            label: Locale.getString('label.role', 'Role'),
                                            value: function(val) {
                                                var roles = _.siteUserRoles();
                                                if (!_.isUndefined(roles[val]))
                                                    return roles[val];
                                                return '';
                                            }
                                        }
                                    }}
                                    onFilters={this.siteUsersFilters}
                                    filterFunc={this.filterSiteUsersFunc()}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-md-8 marign-top--max-md">

                        {!this.state.selectedStudyID &&
                        this.state.studies &&
                        <div>
                           <Panel title={Locale.getString('title.total-pending-payments', 'Total Pending Payments')} panelStyle={{minHeight: 150}}>
                               <DataTable
                                   ref="pendingPaymentDataTable"
                                   endpoint={`/studies/pending-payments/summary?site_id=${this.props.data.id}`}
                                   searchEnabled={true}
                                   onFilters={this.renderPendingPaymentsFilters}
                                   filterFunc={this.filterPendingPaymentsFunc()}
                                   onRowProps={this.handlePendingPaymentsRowClick}
                                   onLoaded={this.pendingPaymentOnLoaded}
                                   showBrandColorOnHover={true}
                                   identifier='study_id'
                                   singlePage={true}
                                   tableMaxHeight={250}
                                   actionClassName=''
                                   optionsClassName='col-md-12'
                                   additionalClassName='col-md-12 form margin-top-5'
                                   fields={{
                                        _sponsor_name: {
                                           label: Locale.getString('title.sponsor', 'Sponsor'),
                                           width: '25%',
                                       },
                                       protocol: {
                                        label: Locale.getString('title.protocol', 'Protocol'),
                                           width: '25%',
                                           value: function(val) {
                                               return val.length > 20 ? (val.substr(0, 20) + '...') : val;
                                           },
                                           title: function(val) {
                                               return val;
                                           },
                                           sortWithValue: false,
                                       },                            
                                       cro_name: {
                                           label: 'CRO',
                                           width: '20%',
                                       },
                                       total_payment_total: {
                                           label: Locale.getString('title.total-payment', 'Total Payment'),
                                           width: '10%',
                                           sortValue: (r) => {
                                               return parseFloat(r);
                                           }
                                       },
                                       paid_payment_total: {
                                           label:  Locale.getString('title.paid-to-date', 'Paid to Date'),
                                           width: '10%',
                                           sortValue: (r) => {
                                               return parseFloat(r);
                                           }
                                       },
                                       pending_payment_total: {
                                           label:  Locale.getString('title.pending-payments', 'Pending Payments'),
                                           width: '10%',
                                           sortValue: (r) => {
                                               return parseFloat(r);
                                           }
                                       },
                                   }}
                               />
                           </Panel>
                        </div>
                        }

                        {this.state.selectedStudyID &&
                        <div className='base-header-font-size' style={{paddingBottom:15, fontWeight: 'bold'}}>
                            {selectedStudyName}
                            <a style={{color: '#7f7f7f', fontSize: 16, position: "relative", cursor: 'pointer', top: 2, marginLeft: 10}} onClick={this.handleViewStudyClick.bind(null, this.state.selectedStudyID)}><i className="fa fa-external-link" aria-hidden="true"></i></a>
                        </div>
                        }

                        {this.state.selectedStudyID &&
                        <div className='row'>
                            <div className="col-md-6">
                                <PanelStudyPaymentProgram 
                                    manageVisits={selectedStudy.manage_visits || selectedStudy._study_manage_visits}
                                    visitStipends={selectedStudy.visit_stipends || selectedStudy._study_visit_stipends}
                                    manageReimbursements={selectedStudy.manage_reimbursements || selectedStudy._study_manage_reimbursements}
                                    onVisitsClick={this.handleVisitsClick}
                                />

                                <Panel 
                                    title={Locale.getString('title.total-#-payments', 'Total # of Payments')}
                                    bodyStyle={{padding: 0}}
                                >
                                    <div style={{textAlign: 'center', padding: '16px 0', fontSize: '1.4em', fontWeight: 'bold'}}>{this.state.selectedStudyPaymentsCount}</div>
                                    <div style={{background: '#c3c3c3', color: 'white', padding: '5px 15px', paddingTop: 5, marginBottom: 15, fontSize: '1.3em', cursor: 'pointer'}}>
                                        <a onClick={this.handleViewPaymentsClick.bind(null, {study_id: this.state.selectedStudyID, site_id: this.state.data.id})} style={{color: 'white', textDecoration: 'none'}}>
                                            <div>
                                                <span>{Locale.getString('button.view-payments', 'View Payments')}</span>
                                                <span style={{float: 'right'}}><i className="fa fa-arrow-right"></i></span>
                                            </div>
                                        </a>
                                    </div>
                                </Panel>

                               <div style={{position: 'relative'}}>
                                   <div style={{textAlign: "center", width: '100%', height: '100%', position: "absolute", zIndex: 99}}>
                                       <p style={{textAlign: "center", marginTop: 55, fontSize: 19,fontWeight: 'bold'}}>Coming Soon!</p>  
                                   </div>
                                   <Panel 
                                       panelStyle={{opacity: 0.3}}
                                       title={Locale.getString('title.notifications', 'Notifications')}
                                       titleStyle={{paddingTop: 5}}
                                       headerStyle={{padding: '7px 0'}}
                                       bodyStyle={{padding: 0}}
                                       action={actionButton()}
                                   >
                                       <div style={{textAlign: 'center', padding: '16px 0', fontSize: '1.4em', fontWeight: 'bold'}}>4</div>
                                       <div style={{background: '#c3c3c3', color: 'white', padding: '5px 15px', paddingTop: 5, marginBottom: 15, fontSize: '1.3em', cursor: 'pointer'}}>
                                           <span>{Locale.getString('button.view-notifications', 'View Notifications')}</span>
                                           <span style={{float: 'right'}}><i className="fa fa-arrow-right"></i></span>
                                       </div>
                                   </Panel>
                               </div>
                            </div>

                            <div className="col-md-6">
                                <PanelStudyPaymentAmount studyID={selectedStudy.id} siteID={this.state.data.id} panelProps={{title: Locale.getString('title.subject-payments', 'Subject Payments'), bodyStyle: {padding: '57px 30px'}}}/>
                                <PanelStudyStipendLoads studyID={selectedStudy.id}/>
                            </div>
                        </div>
                        }

                        {this.renderTasks()}
                        {this.renderNotes()}

                    </div>
                    
                </div> 
            </div>
        )
    },
});
