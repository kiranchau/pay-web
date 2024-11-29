const {Locale} = RTBundle;

var StudyVisitDataTable = React.createClass({
	getDefaultProps() {
		return {
            study: {},
            openSiteID: null,
			onClose: _.noop,

			user: {},
            system: {},

            urlParams: null,
            setGlobalState: _.noop
		};
    },

    getInitialState: function() {
        return {
            nextSortOrder: 1,
            studyVisitRecordCount: 0,
            sectionsState: {},
            saving: false,
        };
    },

    onSave() {
        if (this.refs.studySiteScheduleAssignment) {
            _.defer(this.refs.studySiteScheduleAssignment.handleSave);
        }

        this.setState({saving: true});
        setTimeout(() => {
            this.setState({saving: false});
        }, 1000);
    },

    componentDidMount: function() {
        const {urlParams, setGlobalState} = this.props;

        if (urlParams && urlParams.cmd == 'view-study-visits') {
            setGlobalState({
                urlParams: {},
                appLoading: false
            });
        }
    },

    onVisitsLoaded(table, records) {
        let {nextSortOrder, studyVisitRecordCount} = this.state;
        const last = _.last(records);
        if (last && !isNaN(parseInt(last.sort_order))) {
            nextSortOrder = parseInt(last.sort_order);
            nextSortOrder++;   
        }

        if (records) {
            studyVisitRecordCount = records.length;
        }

        this.setState({nextSortOrder, studyVisitRecordCount});
    },

    onSectionOpenChange(sectionName, isOpen) {

        let sectionsState = {...this.state.sectionsState};
        sectionsState[sectionName] = sectionsState[sectionName] || {};
        sectionsState[sectionName]['isOpen'] = isOpen;

        this.setState((state, props) => {
            return {sectionsState: {...state.sectionsState, ...sectionsState}};
        });

    },
    
	render() {
        const {study, user, system, onClose} = this.props;
        const {studyVisitRecordCount, sectionsState, saving} = this.state;

        let c = [];
        if ('study' in sectionsState) {
            c = [...c, sectionsState.study.isOpen];
            c = [...c, studyVisitRecordCount > 6];
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
        const dialogButtons = [
            (<button key='cancel' type="button" onClick={onClose}>{Locale.getString('button.cancel', 'Cancel')}</button>),
            saving && (<button key='Saveing' type="button" className="primary" onClick={_.noop} style={{backgroundColor: _.primaryBrandColor()}}><i className="fa fa-spin fa-spinner" /> {Locale.getString('button.saving', 'Saving')}...</button>),
            !saving && (<button key='Save' type="button" className="primary" onClick={this.onSave} style={{backgroundColor: _.primaryBrandColor()}}>{Locale.getString('button.save', 'Save')}</button>)
        ];

		return (
			<Dialog dialogClassName={_.every(c) ? 'width-50--md' : 'width-50-bottom-auto--md'} bottom={20} title={`${Locale.getString('title.study-schedule', 'Study Schedule')} -- ${study._sponsor_name} - ${study.protocol}`} onClose={onClose} buttons={dialogButtons}>

                <div style={{paddingBottom: 5}}>
                    <CollapsibleSection
                        sectionKey={`${study.id}StudyVisitDCCKey-1`}
                        defaultOpen={true}
                        onOpenChange={isOpen => {this.onSectionOpenChange('study', isOpen)}}
                        scrollIntoViewOnOpen={false}
                        headerBackgroundColor="#eee"
                        arrowBackgroundColor={_.primaryBrandColor()}
                        arrowColor="#444"
                        headerContainer={<strong>{Locale.getString('title.visit-schedule', 'Visit Schedule')}</strong>}   
                    >
                        <div style={{paddingTop: 10, paddingLeft: 15, paddingRight: 15}}>
                            <DataTable
                                endpoint={'/studies/visits/' + study.id}
                                createButtonLabel={Locale.getString('title.new-visit', 'New Visit')}
                                controls={StudyVisitControls}
                                singlePage={true}
                                tableMaxHeight={410}
                                actionClassName='col-md-3'
                                optionsClassName='col-md-9'
                                additionalClassName='col-xs-12 form margin-top-5'
                                width={600}
                                form={StudyVisitForm}
                                user={user}
                                system={system}
                                study={study}
                                editOnRowClick={true}
                                fields={visitFields}
                                onLoaded={this.onVisitsLoaded}
                                onCreateRecord={()=>{
                                    return {
                                        sort_order: this.state.nextSortOrder
                                    }
                                }}
                            />
                        </div>

                    </CollapsibleSection>
                </div>
                    

                <CollapsibleSection
                    sectionKey={`${study.id}StudySitesVisitDCCKey-1`}
                    defaultOpen={true}
                    onOpenChange={isOpen => {this.onSectionOpenChange('studySite', isOpen)}}
                    scrollIntoViewOnOpen={true}
                    headerBackgroundColor="#eee"
                    arrowBackgroundColor={_.primaryBrandColor()}
                    arrowColor="#444"
                    headerContainer={<strong>{Locale.getString('title.study-sites', 'Study Sites')}</strong>}   
                >
                    <div style={{paddingTop: 10, marginBottom: 10, paddingLeft: 15, paddingRight: 15}}>
                        <StudySiteScheduleAssignment 
                            ref={'studySiteScheduleAssignment'} 
                            study={study}
                            openSiteID={this.props.openSiteID}
                            setGlobalState={this.props.setGlobalState}
                            urlParams={this.props.urlParams}/>
                    </div>

                </CollapsibleSection>


				
			</Dialog>
		)
	}
});