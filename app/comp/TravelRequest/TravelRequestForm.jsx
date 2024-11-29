const {Locale} = RTBundle;

var TravelRequestForm = React.createClass({
    getDefaultProps: function() {
		return {
			data: {},
            errors: {},
            isFormDisabled: false
		};
	},

	getInitialState: function() {
        let data = this.props.data;
        if(!data._travel_types) {
            data._travel_types = []
        }

        const currentStudy = this.props.studyAssociations.find(s => {return s.study_id == data.study_id});
        const siteName = currentStudy._study_site_name + " - ";
        const studyTitle = currentStudy._study_title || "";
        const studyName = siteName + currentStudy._sponsor_name + " - " + currentStudy._study_protocol + " - " + studyTitle;

        data._study_name = studyName;
        data._site_name = currentStudy._study_site_name;
        data._study_name_short = currentStudy._sponsor_name + " - " + currentStudy._study_protocol + " - " + studyTitle;
    
		return {
            data: data,
            travel_Status : [],
            travel_Status_site : [],
		};
	},

    componentDidMount: function() {
        let data = {...this.state.data};
        $.get(_.endpoint('/travel-status'), function(res) {
			this.setState({
				travel_Status: res.records,
			});
		}.bind(this));
        if (this.props.user.type == 'siteuser')
        $.get(_.endpoint('/travel-status-site'), function(res) {
			this.setState({
				travel_Status_site: res.records,
			});
		}.bind(this));
    },

    componentWillReceiveProps(nextProps) {
		if(JSON.stringify(this.state.data) !== JSON.stringify(nextProps.data)){
			setTimeout(() => {
				this.setState({data: Object.assign({}, this.state.data, nextProps.data)}, () => { Object.assign(this.props.data, this.state.data);}); //OUT property);
			}, 50);
		}
    },
    
    setField: function(key, val) {
		let data = {...this.state.data};
		data[key] = val;
		this.setState({
			data,
		}, () => { Object.assign(this.props.data, this.state.data);}); //OUT property
    },

    setStartDate: function(key, val) {
        const startDate = val.substr(0, 10);
        const endTime = this.state.data.visit_end_date ? this.state.data.visit_end_date.substr(11) : '00:00:00';
        this.setField(key, val);
        setTimeout(() => {
            this.setField('visit_end_date', `${startDate} ${endTime}`);
        }, 1000);
    },
    
    setTravelTypeField: function(label, key, val) {
        this.setTravelTypeFieldWithCallback(label, key, val, null);
    },

    setTravelTypeFieldWithCallback: function(label, key, val, cb) {
        let data = {...this.state.data};
        
        let type = data._travel_types.find(type => type.label == label);
        if (!type) {
            type = {label};
        }

        type[key] = val;

        let types = data._travel_types.filter(type => type.label != label);
        types.push(type);
        data._travel_types = types;
        
		this.setState({
			data,
        }, () => { 
            Object.assign(this.props.data, this.state.data); 
            if(cb) {
                cb();
            }
        }); //OUT property
    },
    
    getTravelTypeState: function(label) {
        let data = {...this.state.data};
        
        return data._travel_types.find(type => type.label == label);
    },

    setTravelTypeCheckField: function(label, key, val) {

        const value = val.target.checked ? 1 : 0;
        if (value == 1 && label == 'air') {
            this.setTravelTypeFieldWithCallback('ground', 'departure_date', '', 
            () => {
                this.setTravelTypeFieldWithCallback('ground', 'return_date', '', 
            () => {
                this.setTravelTypeField(label, key, value);
            })});
            return;

        }
        this.setTravelTypeField(label, key, value);
    },
    
    handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
    },

    render: function() {    
        const currentStudy = this.props.studyAssociations.find(s => {return s.study_id == this.state.data.study_id});
        const siteName = currentStudy._study_site_name + " - ";
        const studyTitle = currentStudy._study_title || "";

        const labelStyle = {
            paddingTop: 10,
            paddingRight: 0,
            fontWeight: 'bold'
        };

        const timeHeaderStyle = {
            paddingTop: 10,
            fontStyle: 'italic',
            float: 'left', 
            width: 160,   
            
        };

        const typeHeaderStyle = {
            fontWeight: 'bold',
            cursor: 'pointer'
        };

        const formDialogStyle = {
            paddingLeft: 0,
            paddingRight: 0,
        };

        const {data} = this.state;
        let {isFormDisabled} = this.props;
        let isDisabledComment = false;
		if (this.props.user.type == 'siteuser'){
            if (data.status == 1){
                if (this.props.data.patient_save == 1 || this.props.data.site_user_save == 1){
                    isDisabledComment = true;
                    isFormDisabled = true;
                }
                else{
                    isDisabledComment = false;
                    isFormDisabled = false;
                }
			}
            else if(!data.id){
                isDisabledComment = false;
                isFormDisabled = false;
            }
			else{
				isDisabledComment = true;
                isFormDisabled = true;
			}
		}
        else if (this.props.user.type == 'patient'){
            if (data.status == 1){
                if (this.props.data.patient_save == 1 || this.props.data.site_user_save == 1){
                    isDisabledComment = true;
                }
                else{
                    isDisabledComment = false;
                }
			}
			else{
				isDisabledComment = true;
			}
        }
		else{
			isDisabledComment = false;
		}

        let dateAdded = moment.utc(data.date_added).local().format('DD-MMM-YYYY hh:mm A').toUpperCase();
        return(
            <div>
                <p><span style={{fontWeight: 'bold'}}>{Locale.getString('title.study', 'Study')}: </span>{siteName + currentStudy._sponsor_name + " - " + currentStudy._study_protocol + " - " + studyTitle}</p>
                {data.id &&
                    <div className="row">
                        <div className='col-md-3' style={labelStyle}>{Locale.getString('title.travel-status', 'Travel Status')}:
                            {this.props.user.type != 'patient' && <RequiredMarker />}
                        </div>
                        <div className=' form dialog col-md-9 padding-left-0--md padding-right-0--md flex-rows' style={{ display: "flex", gap: '20px' }}>
                            <div className='form dialog' style={{ padding: 0, right: '7rem', top: 0, marginRight: '5px' }}>
                                {this.props.user.type != 'patient' && this.props.user.type != 'siteuser' &&
                                    <select name="status" onChange={this.handleChange} value={data.status || 1}>
                                        <option value="" disabled={data.status == 2 ? true : false}>{data.status == 2 ? "Approved" : Locale.getString('option.travel_Status', 'Travel Status')}</option>
                                        {_.map(this.state.travel_Status, function (record) {
                                            if (record.id == 2) {
                                                return;
                                            } else {
                                                return <option key={record.id} value={record.id}>{record.status}</option>;
                                            }
                                        })}
                                    </select>
                                }
                            </div>
                            <div className="row">
                                {this.props.user.type == 'user' &&
                                    <div className="label-value" style={{ display: "flex", gap: '20px' }}>
                                        <div>
                                            <p style={{ fontWeight: 'bold', marginTop: "0", marginBottom: "0px", lineHeight: 1.2 }}>{Locale.getString('label.submitted_by', 'Last Updated By')}:</p>
                                            <dd>
                                                {data.submitted_by}
                                            </dd>
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 'bold', marginTop: "0", marginBottom: "0px", lineHeight: 1.2 }}>{Locale.getString('label.submitted_at', 'Submitted At')}:</p>
                                            <dd>
                                                {dateAdded}
                                            </dd>
                                        </div>
                                    </div>
                                }</div>
                        </div>
                    </div>
                }
                <div className='row'>
                    <div className='col-md-3' style={labelStyle}>{Locale.getString('title.visit-date-time', 'Visit Date/Time')}: 
                        {this.props.user.type != 'patient' && <RequiredMarker/>}
                    </div>
                    <div className=' form dialog col-md-9 padding-left-0--md padding-right-0--md'>
                        <span>
                            <dd style={{float: 'left'}}>
                                <ClinicalDatePicker 
                                    disabled={isFormDisabled || this.props.user && this.props.user.type == "patient"}
                                    showTime={true}
                                    minIncrements={15}
                                    dateFormatClinical='DD-MMM-YYYY'
                                    value={data.visit_start_date ? data.visit_start_date : ''}
                                    changeYear={true}
                                    showPickerIcon={true}
                                    style={{width: '100%'}}
                                    yearRange="c-10:c+10"
                                    onChange={this.setStartDate.bind(null, 'visit_start_date')}
                                />
                            </dd>
                        </span>

                        <span style={{float: 'left', padding: '6px 8px', position: 'relative', top: 3, left: -10}}> - </span>
                        
                        <span>
                            <dd style={{float: 'left', position: 'relative', top: 2}}>
                                <ClinicalDatePicker 
                                    disabled={isFormDisabled || this.props.user && this.props.user.type == "patient"}
                                    showDate={false}
                                    showTime={true}
                                    minIncrements={15}
                                    dateFormatClinical='DD-MMM-YYYY'
                                    value={data.visit_end_date ? data.visit_end_date : ''}
                                    changeYear={true}
                                    showPickerIcon={true}
                                    style={{width: '100%'}}
                                    yearRange="c-10:c+10"
                                    onChange={this.setField.bind(null, 'visit_end_date')}
                                />
                            </dd>
                        </span>

                        <div className="clearfix"></div>

                        {this.props.errors.visit_date &&
                        <p style={{color: 'red', position: 'relative', marginTop: 0, top: -10}}>{this.props.errors.visit_date}</p>}
                    </div>
                </div>
                <div className='row'>
                    <div className='col-md-3' style={labelStyle}>{Locale.getString('label.travel-dates', 'Travel Dates')}:
                    {this.props.user.type != 'patient' && <RequiredMarker/>}</div>
                    <div className='form dialog col-md-9 padding-left-0--md padding-right-0--md'>
                        <span>
                            <dd style={{float: 'left'}}>
                            <ClinicalDatePicker 
                                disabled={isFormDisabled || this.props.user && this.props.user.type == "patient"}
                                dateFormatClinical='DD-MMM-YYYY'
                                value={data.travel_start_date && moment(data.travel_start_date).isValid() ? data.travel_start_date : ''}
                                changeYear={true}
                                showPickerIcon={true}
                                style={{width: '100%'}}
                                yearRange="c-10:c+10"
                                onChange={this.setField.bind(null, 'travel_start_date')}
                                />
                            </dd>
                        </span>

                        <span style={{float: 'left', padding: '6px 8px'}}> - </span>
                        
                        <span>
                            <dd style={{float: 'left'}}>
                            <ClinicalDatePicker 
                                disabled={isFormDisabled || this.props.user && this.props.user.type == "patient"}
                                dateFormatClinical='DD-MMM-YYYY'
                                value={data.travel_end_date && moment(data.travel_end_date).isValid() ? data.travel_end_date : ''}
                                changeYear={true}
                                showPickerIcon={true}
                                style={{width: '100%'}}
                                yearRange="c-10:c+10"
                                onChange={this.setField.bind(null, 'travel_end_date')}
                            />
                            </dd>
                        </span>

                        <div className="clearfix"></div>

                        {this.props.errors.travel_date &&
                        <p style={{color: 'red', position: 'relative', marginTop: 0, top: -10}}>{this.props.errors.travel_date}</p>}
                    </div>
                </div>

                <div className='row' style={{paddingBottom: 10}}>
                    <div className='col-md-3' style={{fontWeight: 'bold', paddingRight: 0}}>{Locale.getString('label.type-of-travel', 'Type of Travel')}:
                    {this.props.user.type == 'patient' && <RequiredMarker/>}</div>
                    <div className=' form dialog col-md-9 padding-left-0--md padding-right-0--md'>
                        <div>
                            <label style={typeHeaderStyle}>
                            <input disabled={isFormDisabled} type="checkbox" value="1" onChange={this.setTravelTypeCheckField.bind(null, 'air', 'selected')} checked={this.getTravelTypeState('air') ? parseInt(this.getTravelTypeState('air').selected) == 1 : 0} />
                                    &nbsp;{Locale.getString('label.air', 'Air')}:
                            </label>
                        </div>
                        <div className="clearfix"></div>
                        <div>
                            <span style={timeHeaderStyle}>{Locale.getString('label.departure-date-time', 'Departure Date/Time')}: </span>
                            <dd style={{float: 'left'}}>
                            <ClinicalDatePicker 
                                disabled={isFormDisabled}
                                showTime={true}
                                minIncrements={15}
                                dateFormatClinical='DD-MMM-YYYY'
                                value={
                                    this.getTravelTypeState('air') && 
                                    this.getTravelTypeState('air').departure_date ? 
                                    this.getTravelTypeState('air').departure_date : ''}
                                changeYear={true}
                                showPickerIcon={true}
                                style={{width: '100%'}}
                                yearRange="c-10:c+10"
                                onChange={this.setTravelTypeField.bind(null, 'air', 'departure_date')}
                                />
                            </dd>
                        </div>
                        <div className="clearfix"></div>
                        <div>
                            <span style={timeHeaderStyle}>{Locale.getString('label.return-date-time', 'Return Date/Time')}: </span>
                            <dd style={{float: 'left'}}>
                            <ClinicalDatePicker
                                disabled={isFormDisabled}
                                showTime={true}
                                minIncrements={15}
                                dateFormatClinical='DD-MMM-YYYY'
                                value={
                                    this.getTravelTypeState('air') && 
                                    this.getTravelTypeState('air').return_date ?
                                    this.getTravelTypeState('air').return_date : ''}
                                changeYear={true}
                                showPickerIcon={true}
                                style={{width: '100%'}}
                                yearRange="c-10:c+10"
                                onChange={this.setTravelTypeField.bind(null, 'air', 'return_date')}
                                />
                            </dd>
                        </div>
                        <div className="clearfix"></div>
                        <div>
                            <label style={typeHeaderStyle}>
                                <input disabled={isFormDisabled} type="checkbox" value="1" onChange={this.setTravelTypeCheckField.bind(null, 'ground', 'selected')} checked={this.getTravelTypeState('ground') ? parseInt(this.getTravelTypeState('ground').selected) == 1 : 0} />
                                    &nbsp;{Locale.getString('label.ground', 'Ground')}:
                            </label>
                        </div>
                        <div className="clearfix"></div>
                        <div>
                            <span style={timeHeaderStyle}>{Locale.getString('label.departure-date-time', 'Departure Date/Time')}: </span>
                            <dd style={{float: 'left'}}>
                            <ClinicalDatePicker 
                                showTime={true}
                                minIncrements={15}
                                disabled={isFormDisabled}
                                dateFormatClinical='DD-MMM-YYYY'
                                value={
                                    this.getTravelTypeState('ground') && 
                                    this.getTravelTypeState('ground').departure_date ? 
                                    this.getTravelTypeState('ground').departure_date : ''}
                                changeYear={true}
                                showPickerIcon={true}
                                style={{width: '100%'}}
                                yearRange="c-10:c+10"
                                onChange={this.setTravelTypeField.bind(null, 'ground', 'departure_date')}
                                />
                            </dd>
                        </div>
                        <div className="clearfix"></div>
                        <div>
                            <span style={timeHeaderStyle}>{Locale.getString('label.return-date-time', 'Return Date/Time')}: </span>
                            <dd style={{float: 'left'}}>
                            <ClinicalDatePicker 
                                showTime={true}
                                minIncrements={15}
                                disabled={isFormDisabled}
                                dateFormatClinical='DD-MMM-YYYY'
                                value={
                                    this.getTravelTypeState('ground') && 
                                    this.getTravelTypeState('ground').return_date ?
                                    this.getTravelTypeState('ground').return_date : ''}
                                changeYear={true}
                                showPickerIcon={true}
                                style={{width: '100%'}}
                                yearRange="c-10:c+10"
                                onChange={this.setTravelTypeField.bind(null, 'ground', 'return_date')}
                                />
                            </dd>
                        </div>
                        <div className="clearfix"></div>
                        <div>
                            <label style={typeHeaderStyle}>
                            <input disabled={isFormDisabled} type="checkbox" value="1" onChange={this.setTravelTypeCheckField.bind(null, 'hotel', 'selected')} checked={this.getTravelTypeState('hotel') ? parseInt(this.getTravelTypeState('hotel').selected) == 1 : 0} />
                                    &nbsp;{Locale.getString('label.hotel', 'Hotel')}
                            </label>
                        </div>
                        <div className="clearfix"></div>

                        {this.props.errors.travel_types_selection &&
                        <p style={{color: 'red', marginTop: 0}}>{this.props.errors.travel_types_selection}</p>}
                    </div>
                </div>
                <div style={{height: 1, background: '#d4d4d4'}}></div>
                <div className='form dialog' style={{padding: 0}}>
                    <p style={{fontWeight: 'bold'}}>{Locale.getString('label.comments', 'Comments')}:</p>
                    <dd>
                        <textarea rows='3' disabled={isDisabledComment} name="comment" type="text" value={data.comment} onChange={this.handleChange}/>
                    </dd>
                </div>
                

            </div>
        )
    }
});