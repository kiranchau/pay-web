const {Locale} = RTBundle;

var TravelRequestDialog = React.createClass({
    getDefaultProps: function() {
		return {
            style: {},
            formProps: {},
            endpoint: '',
            deleteRequestEndpoint: '/travelrequests/',
            data: {},
            onSave: _.noop,
            patientData: {},
            studyAssociations: null,
            urlParams: {}
		};
	},

	getInitialState: function() {
		return {
            urlParams: this.props.urlParams,
            saving: false,
            saved: false,
            formErrors: {},
            formData: {},
            _formData: {},
            selected_study_id: this.props.patientData.selected_study_id,
            currentView: 'requests'

		};
    },

    componentDidMount: function() {

        const stateUpdate = records => {
            const state = {studyAssociations: records};

            const refinedAssignedStudies = _.filter(records, (s) => {return s._study_subject_travel_preferences == 0});
            if (refinedAssignedStudies.length == 1) {
                state.selected_study_id = refinedAssignedStudies.shift().study_id;
            }

            this.setState(state);
        }

        if (!this.props.studyAssociations || Object.keys(this.props.studyAssociations).length == 0) {
            $.get(_.endpoint('/patients/studies?patient_id=' + this.props.patientData.id), (res) => {
                stateUpdate(res.records);
            });
        } else {
            stateUpdate(this.props.studyAssociations);
        }

    },

    onChangeSelectedStudy: function(e) {
		this.setState({selected_study_id: e.target.value});
	},

    filterStudiesFunc: function() {
        const filterKey = this.state.selected_study_id;
        
        let refinedAssignedStudies = this.state.studyAssociations;
        refinedAssignedStudy = _.find(refinedAssignedStudies, {study_id: filterKey});

		return function(record) {
            return record._patient_study.study_id == filterKey && (parseInt(record._patient_study.site_id) == parseInt(refinedAssignedStudy.site_id) );
		}.bind(this);
	},

    studiesFilter: function() {

        let refinedAssignedStudies = this.state.studyAssociations;
        refinedAssignedStudies = _.filter(refinedAssignedStudies, (s) => {return s._study_subject_travel_preferences == 0})
		
        return (
			<span style={{float: 'left'}}>

                <span className='base-header-font-size' style={{fontWeight: 'bold', paddingRight: 10}}>{Locale.getString('label.study-filter', 'Study Filter')}:</span>
                <select value={this.state.selected_study_id} onChange={this.onChangeSelectedStudy}>
                    {_.map(refinedAssignedStudies, function(study) {
                        const siteName = study._study_site_name + " - ";
                        const studyID = study.study_id;
                        const studyTitle = study._study_title ? study._study_title : "";
                        const studyName = siteName + study._sponsor_name + " - " + study._study_protocol + " - " + studyTitle;
                        return <option title={studyName} key={study.id + "," + study.study_id} value={studyID}>{studyName.length > 40 ? (studyName.substr(0, 40) + '...'): studyName }</option>;
                    })}
                </select>
			</span>
		);
    },

    handleTravelRequestRowProps: function(props) {
       
        const data = _.omit(props.data, ['site_id', 'original_visit']);
        data.site_id = props.data && props.data._patient_study ? props.data._patient_study.site_id : 0;

        return {
            className: 'travel-request-row',
            onClick: (e) => {
                e.preventDefault();
                if (this.props.user.type == 'patient') {
                    if(!_.isUndefined(data.visit_start_date) && data.visit_start_date && data.visit_start_date !== "0000-00-00 00:00:00" && 
                        !_.isUndefined(data.visit_end_date) && data.visit_end_date && data.visit_end_date !== "0000-00-00 00:00:00") {
                            this.handleShowRequest(data)();
                    }
                } else {
                    this.handleShowRequest(data)();
                }
            }
        }
    },

    handleShowRequest: function(props) {
        return () => {
            let {studyAssociations} = this.state;
            if (typeof studyAssociations === 'object') {
                studyAssociations = Object.values(studyAssociations);
            }

            let isFormDisabled = this.props.user.type != 'user' && props.id ? true : false;
            if(this.props.user.type == 'patient') {
                isFormDisabled = !_.isUndefined(props.patient_save) && props.patient_save == 1;
            }

            const formDisableMessage = this.props.user.type == 'patient' ? `**${'If you need to cancel or reschedule your visit, please contact your site. If you need to amend or cancel your travel request, please contact ClinEdge'}**` : `**${'If changes are needed, please contact ClinEdge.'}**`;
            this.setState({currentView: 'request', travelRequestFormProps: {...this.props, isFormDisabled, formDisableMessage, studyAssociations, data: props}});
        }
    },

    handleDeleteRequest: function(props) {
        return () => {
            this.setState({
                saving: true,
            }); 

            $['delete'](_.endpoint(this.props.deleteRequestEndpoint + props.id), function(res) {
                const state = {saving: false, dialog: null};

                if (this.refs.requestsTable) {
                    _.defer(this.refs.requestsTable.handleUpdate);
                }

                if (!_.isUndefined(res.status) && res.status < 2) {
    
                    const isFormDisabled = this.props.user.type != 'user' && res.record ? true : false;
                    
                    let data = {...props, ...res.record};

                    let travelRequestFormProps = {
                        ...this.state.travelRequestFormProps,
                        isFormDisabled,
                        ...{data: data}
                    };
    
                    Object.assign(state, {
                        saved: true,
                        travelRequestFormProps,
                        formErrors: {},
                        currentView: 'requests'
                    });
    
                } else {
                    if (res.errors) {
                        Object.assign(state, { saved: false, formErrors: res.errors });
                    }
                }
    
                this.setState(state);
            }.bind(this));
        }

        
    },

    handleSave: function() {

        if (this.state.currentView != 'request') {
            return;
        }

        this.setState({
            saving: true,
        }); 
        $.post(_.endpoint(this.props.endpoint), this.state.travelRequestFormProps.data, function(res) {

            const state = {saving: false};

            if (!_.isUndefined(res.status) && res.status < 2) {

                const isFormDisabled = this.props.user.type != 'user' && res.record ? true : false;

                let travelRequestFormProps = {
                    ...this.state.travelRequestFormProps,
                    isFormDisabled,
                    ...{data: res.record}
                };

                Object.assign(state, {
                    saved: true,
                    travelRequestFormProps,
                    formErrors: {}
                });

                this.props.onSave();
            } else {
                if (res.errors) {
                    Object.assign(state, { saved: false, formErrors: res.errors });
                }
            }

            this.setState(state);
            if (res.status == 0 && this.props.user.type == 'patient'){
                this.handleBack();
            }
        }.bind(this));
    },

    handleBack: function() {            
        this.setState({currentView: 'requests', formErrors: {}}, 
            () => {const element = document.getElementById('requests');
            _.defer(()=> {element.scrollIntoView()});
        });
    },

    handleDeleteRequestDialog: function() {
		this.setState({
			dialog: null,
		});
	},

    onDelete: function(props) {
        const buttons = [
            <button key='cancel' type="button" onClick={this.handleDeleteRequestDialog}>{Locale.getString('button.cancel', 'Cancel')}</button>,
            <button key='continue'type="button" className="primary" onClick={this.handleDeleteRequest(props)}>{Locale.getString('button.continue', 'Continue')}</button>
        ]
        this.setState({
            dialog: (
                <Dialog title={Locale.getString('title.delete-request', 'Delete Request')+'?'} width={400} onClose={this.handleDeleteRequestDialog} buttons={buttons}>
                    <p>{Locale.getString('message.delete-request', 'Are you sure you want to delete this request?')}</p>
                </Dialog>
            )
        });
    },

    
    render: function() {
        
		let style = {};

		if (this.props.width > 0) {
			var width = this.props.width;
			var windowWidth = jQuery(window).width();
			if (width > windowWidth - 30) {
				width = windowWidth - 30;
			}
			style.left = '50%';
			style.marginLeft = -1 * width / 2;
			style.width = width;
			style.bottom = this.props.bottom > 0 ? this.props.bottom : 'auto';
		}

        style.paddingBottom = 0;
        style.position = 'inherit';
        style.borderRadius = 0;
        style.border = '1px solid #d4d4d4';
        style.borderBottomLeftRadius = 7;
        style.borderBottomRightRadius = 7;
        style.boxShadow = 'unset';
        style.paddingTop = 0;

        style = _.extend({}, style, this.props.style);

        const renderFormDisableMessage = () => {
            return (this.state.travelRequestFormProps.isFormDisabled &&
                <p style={{marginTop: 0, textAlign: 'center', color: '#ff0000'}}>{this.state.travelRequestFormProps.formDisableMessage}</p>)
        };

        const r = (props) => {
            return () => {this.onDelete(props)}
        }

        const refinedAssignedStudies = _.filter(this.state.studyAssociations, (s) => {return s._study_subject_travel_preferences == 0})

        return (

            <div className="comp-dialog-overlay" style={{position: "static", background: 'transparent'}}>
                {this.state.dialog}
				<div className="comp-dialog" style={style}>

					<div className="body" style={{overflow: 'initial'}}>

                        {this.state.currentView == 'requests' &&
                        <div id='requests'>
                            <p style={{marginTop: 0, fontSize: 14, fontWeight: 'bold'}}>{Locale.getString('title.travel-requests', 'Travel Requests')}</p>
                            {this.state.studyAssociations &&
                            refinedAssignedStudies.length > 0 &&
                            <DataTable
                                endpoint={this.props.endpoint}
                                onShowNewRequest={this.handleShowRequest}
                                onShowRequest={this.handleShowRequest}
                                onDeleteRequest={r}
                                ref='requestsTable'
                                controls={TravelRequestControls}
                                onRowProps={this.handleTravelRequestRowProps}
                                searchEnabled={false}
                                closeAfterSaving={true}
                                user={this.props.user}
                                identifier={'visit_id'}
                                onFilters={this.studiesFilter}
                                filterFunc={this.filterStudiesFunc()}
                                optionsClassName='col-md-12'
                                optionsWithPagingClassName='col-md-9'
                                additionalClassName='col-md-3'
                                onLoaded={(dataTable) => {
                                    var urlParams = this.state.urlParams;
                                    if (!_.isUndefined(urlParams) && !_.isUndefined(urlParams.visit_id)) {
                                        const record = _.find(dataTable.state.records, function(rec) {
                                            return rec.visit_id == urlParams.visit_id;
                                        });
                                        if (record && record.id == urlParams.id) {
                                            _.defer(()=>{this.setState({urlParams: {}}, () => {this.handleShowRequest(record)()})});
                                        } else if (record && urlParams) {
                                            this.setState({urlParams: {}});
                                            alert( Locale.getString('alert.request-deleted', 'This request was deleted.'));
                                        }
                                    }
                                }}
                                fields={{
                                    _visit_name: {
                                        label: Locale.getString('title.visit-name', 'Visit Name'),
                                        sortWithValue: false,
                                        value: function(val) {
                                            return <span>{val} {this._visit_baseline == 1 ? <i className="fa fa-check" /> : null}</span>;
                                        },
                                    },
                                    visit_start_date: {
                                        label: Locale.getString('title.visit-date-time', 'Visit Date/Time'),
                                        sortWithValue: false,
                                        value: function(val) {
                                            if (!val) {
                                                return null;
                                            }
                                            const momStart = moment(val);
                                            const momEnd = moment(this.visit_end_date);

                                            const renderStart = momStart.isValid() ? momStart.format('MM/D/YYYY, HH:mm').toUpperCase() : '';
                                            const renderEnd = momEnd.isValid() ? '- ' + momEnd.format('HH:mm').toUpperCase() : renderStart ? '- 00:00' : '';
                                            return `${renderStart} ${renderEnd}`;
                                        },
                                    },
                                    _request_types: {
										label: Locale.getString('title.type', 'Type'),
										value: function(val) {
                                            if (!val) {
                                                return null;
                                            }

                                            let replaced = val.replace("ground", Locale.getString('label.ground', 'ground'));
                                            replaced = val.replace("air", Locale.getString('label.air', 'air'));
                                            replaced = val.replace("hotel", Locale.getString('label.hotel', 'hotel'));

                                            return replaced;
                                        }
                                    },

                                    travel_status: {
                                        label: Locale.getString('title.status', 'Status'),
                                        sortWithValue: false,
                                        value: function(travel_status) {
                                            return <span>{travel_status}</span>;
                                        },
                                    }
                                }}
                            />
                            }
                        </div>
                        }
                        {this.state.currentView == 'request' &&
                        <div>

                            <div className='row' style={{textAlign: 'center'}}>
                                {renderFormDisableMessage()}
                            </div>
                            <div className='row'>

                                <div className='col-xs-1'>
                                    <a onClick={this.handleBack} className="app-edit" style={{cursor: 'pointer', color: '#444', fontSize: '1.3em'}} title={Locale.getString('title.navigate-travel-requests', 'Navigate Travel Requests')} ><img height="20" alt={this.props.appName} src='/assets/images/left-arrow.png' /></a>
                                </div>

                                <div className={(this.state.travelRequestFormProps.data.id && this.props.user.type == 'user' ? 'col-xs-10' : 'col-xs-11')}>
                                    <p className='base-header-font-size' style={{marginTop: 0, textAlign: 'center'}}>{Locale.getString('label.travel-request', 'Travel Request')} - {this.state.travelRequestFormProps.data._visit_name}</p>
                                </div>

                                <div className='col-xs-1'>
                                    {this.props.user.type == 'user' && this.state.travelRequestFormProps.data.id && <a onClick={() => {this.onDelete(this.state.travelRequestFormProps.data)}} className="app-edit" style={{float: 'right', cursor: 'pointer', color: '#444', fontSize: '1.3em'}} title={Locale.getString('title.delete-travel-request', 'Delete Travel Request')} ><i className="fa fa-trash"></i></a>}
                                </div>

                            </div>

                            <div style={{height: 1, background: '#d4d4d4'}}></div>

                            <TravelRequestForm {...this.state.travelRequestFormProps} errors={this.state.formErrors}/>

                            <div className='row'>
                                <div className='col-md-5 col-md-offset-4'>
                                    {renderFormDisableMessage()}
                                </div>

                                <div className='col-md-3'>
                                    {this.props.user.type == 'patient' && !this.state.travelRequestFormProps.isFormDisabled && <button type="button" style={{border: '1px solid rgba(0, 0, 0, 0.2)', padding: '10px 30px', color: 'white', marginLeft: 10, float: 'right', backgroundColor: _.primaryBrandColor()}} onClick={this.handleSave}>{Locale.getString('button.save', 'Save')}</button>}
                                </div>
                            </div>
                            
                            <div className="clearfix"></div>
                        </div>
                        }
                        
					</div>
				</div>  
			</div>
        )
    }
});
