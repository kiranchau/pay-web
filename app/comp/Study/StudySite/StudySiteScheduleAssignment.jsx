
const {Locale} = RTBundle;

var StudySiteScheduleAssignment = React.createClass({

    getDefaultProps() {
        return {
            study: {},
            openSiteID: null,
            onLoaded: _.noop,
            onChange: _.noop,

            user: {},
            system: {},

            urlParams: null,
            setGlobalState: _.noop    
        };
    },

    getInitialState() {
        return {
            assignments: [],
            dialog: null,
            checkedAssingnedSiteIds   : [],
            checkedUnassingnedSiteIds : [],
            shouldSaveAssingnedSiteIds: [],
            nextSortOrder: 1,
            slectedAssignmentId: null
        };
    },

    componentDidUpdate(prevProps) {
      if (this.props.study.id !== prevProps.study.id) {
        this.hydrateAssignments(this.props.study.id);
      }
    },

    componentDidMount() {
        const {study, urlParams, setGlobalState} = this.props;

        this.hydrateAssignments(study.id)
        .then(() => {
            if (urlParams && urlParams.cmd == 'view-study-site-visits') {
                this.handleViewVisits(urlParams.assignment_id);
                setGlobalState({
                    urlParams: {},
                    appLoading: false
                });
            }

            if (this.props.openSiteID) {
                const assignment = _.find(this.state.assignments, {site_id: this.props.openSiteID});
                if (assignment) {
                    this.handleViewVisits(assignment.id);
                }
            }
        });
    },

    hydrateAssignments(studyID) {
        const {onLoaded} = this.props;

        if (!studyID) {
            return;
        }

        
        return new Promise((resolve, reject) => {
            $.get(_.endpoint(`/studies/${studyID}/sites/visits/assignments`), res => {
                if (!res) {
                    reject();
                }
                this.setState({
                    assignments: res.records,
                }, () => {
                    const assigned = this.assigned();
                    const unAssigned = this.unAssigned();

                    onLoaded.call(null, this, {assigned, unAssigned});

                    resolve();
                });
            });
        });
    },

    onChange() {
        const assigned = this.assigned();
        const unAssigned = this.unAssigned();

        this.props.onChange.call(null, this, {assigned, unAssigned});
    },

    handleSave() {
        const {study} = this.props;
        const {assignments} = this.state;

        let _assignments = assignments.filter(v => v.id || v.assigned);

        $.post(_.endpoint(`/studies/${study.id}/sites/visits/assignments`), {assignments: _assignments}, (res) => {
            const __assignments = assignments.map(v => {
                const c = _.find(res.records, {site_id: v.site_id}) || {};
                return {...v, ...c};
            });
            this.setState({assignments: __assignments, shouldSaveAssingnedSiteIds: []});
        });
    },

    assigned() {
        return _.filter(this.state.assignments, r => r.assigned == 1);
    },

    unAssigned() {
        return _.filter(this.state.assignments, r => {return !r.assigned || (r.assigned == 0)});
    },

    moveLeft() {
        const checkedUnassingnedSiteIds = [...this.state.checkedUnassingnedSiteIds];
        const change = this.updateAssignmentsWithSiteIds(checkedUnassingnedSiteIds, {assigned: 1});

        let shouldSaveAssingnedSiteIds = [...this.state.shouldSaveAssingnedSiteIds];
        _.each(checkedUnassingnedSiteIds, siteID => {
            if (!shouldSaveAssingnedSiteIds.includes(siteID)) {
                shouldSaveAssingnedSiteIds.push(siteID);
            }
        })
        
        this.setState({assignments: change, checkedUnassingnedSiteIds:[], shouldSaveAssingnedSiteIds}, this.onChange);
    },

    moveRight() {
        const checkedAssingnedSiteIds = [...this.state.checkedAssingnedSiteIds];
        const change = this.updateAssignmentsWithSiteIds(checkedAssingnedSiteIds, {assigned: 0});
        this.setState({assignments: change, checkedAssingnedSiteIds:[]}, this.onChange);
    },

    updateAssignmentsWithSiteIds(siteIds, values) {
        const d = this.state.assignments.filter(v => {
            return siteIds.includes(v.site_id);
        }).map(v => {
            return {...v, ...values};
        });
        return _.map(this.state.assignments, (v) => {
            const change = _.find(d, {site_id: v.site_id}) || {};
            return {...v, ...change};
        });
    },

    onVisitsLoaded(table, records) {

        const last = _.last(records);
        if (last && !isNaN(parseInt(last.sort_order))) {
            let nextSortOrder = parseInt(last.sort_order);
            nextSortOrder++;
            this.setState({nextSortOrder}, () => {
                
                if(this.state.slectedAssignmentId) {
                    this.handleViewVisits(this.state.slectedAssignmentId);
                }
            });
        }
    },

    handleViewVisits(id, e) {
        const {study, user, system} = this.props;
        const {assignments} = this.state;
        const assignment = _.find(assignments, {id});

        
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        
        if (!assignment) {
            return;
        }

        let visitFields = {
            name: {
                label: Locale.getString('title.visit-name', 'Visit Name'),
                width: '55%',
                sortWithValue: false,
                value(val) {
                    return <span>{val} {this.baseline == 1 ? <i className="fa fa-check" /> : null}</span>;
                },
            },
        };

        if (study.visit_stipends == 1) {
            _.extend(visitFields, {
                stipend: {
                    label: Locale.getString('title.stipend', 'Stipend'),
                    align: 'right',
                    width: '25%',
                },
            });
        }

        const onClose = () => {
            this.setState({dialog: null, slectedAssignmentId: null});
        }

        const dialogButtons = [
            (<button key='close' type="button"  onClick={onClose}>Close</button>)
        ];
        
        const dialog = (
        <Dialog dialogClassName={'width-50--md'} bottom={20} title={assignment._study_site__name} onClose={onClose} buttons={dialogButtons}>
            <div style={{fontSize: 14, paddingBottom: 10}}>{`${study._sponsor_name} - ${study.protocol}`}</div>
            <div style={{backgroundColor: "#eee", height: 45}}><div style={{paddingTop: 13, fontSize: 14, textTransform: "uppercase", paddingLeft: 7, color: '#2a2a2a', fontWeight: "bold"}}>{Locale.getString('title.visit-schedule', 'Visit Schedule')}</div></div>

            <div style={{paddingTop: 10, marginBottom: 10, paddingLeft: 15, paddingRight: 15}}>
                <DataTable
                    endpoint={`/studies/visits/${study.id}/sites/${assignment.site_id}`}
                    source={`/studies/visits/${study.id}/sites/${assignment.site_id}`}
                    deleteEndpoint={`/studies/visits/${study.id}/sites/${assignment.site_id}`}
                    createButtonLabel={Locale.getString('title.new-visit', 'New Visit')}
                    controls={StudyVisitControls}
                    singlePage={true}
                    tableMaxHeight={600}
                    actionClassName='col-md-3'
                    optionsClassName='col-md-9'
                    additionalClassName='col-xs-12 form margin-top-5'
                    width={600}
                    form={StudyVisitForm}
                    user={user}
                    system={system}
                    study={study}
                    siteID={assignment.site_id}
                    editOnRowClick={true}
                    fields={visitFields}
                    onLoaded={this.onVisitsLoaded}
                    onCreateRecord={() => {
                        return {
                            sort_order: this.state.nextSortOrder,
                            site_id   : assignment.site_id
                        }
                    }}
                />
            </div>
        </Dialog>)

        this.setState({dialog, slectedAssignmentId: id});
    },

    handleViewVisitsAsLink(id, e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        const assignment = _.find(this.state.assignments, {id});
        window.open(_.endpoint(`?cmd=view-study-site-visits&assignment_id=${id}&site_id=${assignment.site_id}&study_id=${assignment.study_id}`),'_blank');
    },

    assign(siteID) {
        let checkedAssingnedSiteIds = [...this.state.checkedAssingnedSiteIds];
        if (!checkedAssingnedSiteIds.includes(siteID)) {
            checkedAssingnedSiteIds.push(siteID);
        } else {
            checkedAssingnedSiteIds = _.filter(checkedAssingnedSiteIds, s => s != siteID);
        }

        this.setState({checkedAssingnedSiteIds});
    },

    unAssign(siteID) {
        let checkedUnassingnedSiteIds = [...this.state.checkedUnassingnedSiteIds];
        if (!checkedUnassingnedSiteIds.includes(siteID)) {
            checkedUnassingnedSiteIds.push(siteID);
        } else {
            checkedUnassingnedSiteIds = _.filter(checkedUnassingnedSiteIds, s => s != siteID);
        }

        this.setState({checkedUnassingnedSiteIds});
    },

    render() {
        const {dialog, checkedAssingnedSiteIds, checkedUnassingnedSiteIds, shouldSaveAssingnedSiteIds} = this.state;

        const headerStyle         = {fontWeight: "bold", paddingBottom: 8, paddingTop: 10, fontSize: 14};
        let   arrowStyleContainer = {display: 'flex', justifyContent: 'center', paddingTop: 10};
        let   arrowStyle          = {cursor: 'pointer', color: '#444', fontSize: '1.3em'};

        return (
        <div>
            <div>{dialog}</div>
            <div className='row'>
                <div className='col-sm-5'>
                    <div style={headerStyle}>{Locale.getString('label.assigned-visit-schedule', 'Assigned Visit Schedule')}</div>
                   
                    <div style={{border: '1px solid #eee', height: 114, overflowX: "auto"}} className='record-table'>
                        {this.assigned().map(v => {
                            const checkCalendar = !v.id || shouldSaveAssingnedSiteIds.includes(v.site_id);
                            const calendarStyle = checkCalendar ? {opacity: 0.5, cursor: 'not-allowed'} : {};
                            return [
                            <div key={v.site_id} value={v.site_id} style={{paddingLeft: 4}}>
                                <label style={{width: '100%', display: 'flex'}}>
                                    <input style={{flexGrow: 0, marginTop: 11}} type="checkbox" checked={checkedAssingnedSiteIds && checkedAssingnedSiteIds.includes(v.site_id)} onChange={this.assign.bind(null, v.site_id)}/> 
                                    <span> </span>
                                    <span style={{paddingTop: 8, paddingLeft: 5, display: 'inline-block', flexGrow: 1}}>{v._study_site__name}</span>
                                    <span 
                                        onClick={!checkCalendar ? this.handleViewVisits.bind(null, v.id) : _.noop} 
                                        style={{...{float: "right", paddingTop: 5, paddingRight: 5, cursor: 'pointer', flexGrow: 0}, ...calendarStyle}} 
                                        className='record-controls'
                                        title={checkCalendar ? Locale.getString('message.view-visit-schedule', 'Save the page to view visit schedule.') : ''}>
                                            <a className="app-edit"><i className="fa fa-calendar"></i></a>
                                    </span>
                                </label>
                            </div>,
                            <div className="clearfix"></div>]
                        })}
                    </div>
                    
                </div>
                <div className='col-sm-2'>

                    <div style={arrowStyleContainer}>
                        <a onClick={this.moveLeft} className="app-edit" style={{...arrowStyle, ...{paddingTop: 45}}} ><img height="20" src='/assets/images/left-arrow.png' /></a>
                    </div>
                    <div style={arrowStyleContainer}>
                        <a onClick={this.moveRight} className="app-edit" style={arrowStyle} ><img style={{transform: 'rotate(180deg)'}} height="20" src='/assets/images/left-arrow.png' /></a>
                    </div>

                </div>
                <div className='col-sm-5'>
                    <div style={headerStyle}>{Locale.getString('title.avaliable-sites', 'Avaliable Sites')}</div>

                    <div style={{border: '1px solid #eee', height: 114, overflowX: "auto"}}>
                        {this.unAssigned()
                        .filter(v => v._study_site__status == 0)
                        .map(v => 

                            <div key={v.site_id} style={{paddingLeft: 4}}>
                                <label style={{width: '100%', display: 'flex'}}>
                                    <input style={{flexGrow: 0, marginTop: 11}} type="checkbox" checked={checkedUnassingnedSiteIds && checkedUnassingnedSiteIds.includes(v.site_id)} onChange={this.unAssign.bind(null, v.site_id)}/>
                                    <span style={{paddingTop: 8, paddingLeft: 5, display: 'inline-block', flexGrow: 1}}>{v._study_site__name}</span>
                                </label>
                            </div>
                        )}
                    </div>
                    
                </div>
            </div>
        </div>
        )
    }
});