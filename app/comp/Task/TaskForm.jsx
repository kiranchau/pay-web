const {Locale} = RTBundle;

var TaskForm = React.createClass({

	getDefaultProps: function() {
		return {
			errors: {},
            taskFormData: {},
            studyID: null,
            data: {}
		};
    },
    
    getInitialState: function() {

        let initialData = Object.assign({}, this.props.taskFormData, this.props.data);

		if (!initialData.assigned_id) {
			initialData.assigned_id = {};
        } 

        if (initialData.assigned_id && Array.isArray(initialData.assigned_id)) {
            let assigned_id = {};
            initialData.assigned_id.forEach(id => {
                assigned_id[id] = id;
            });
            initialData.assigned_id = assigned_id;
        }

        const useDueDate = initialData.date_due ? true : false;
        
		return {
			data: initialData,
            sites: [],
            studies: [],
			milestones: [],
            milestone_types: [],
            users: [],
            useDueDate
        };
        
    },

    componentDidMount: function() {

        Object.assign(this.props.data, this.state.data); //OUT property

        $.get(_.endpoint('/sites'), function(res) {
			this.setState({
				sites: res.records,
			});
        }.bind(this));
        
        $.get(_.endpoint('/studies'), function(res) {
			this.setState({
				studies: res.records,
			});
        }.bind(this));
        
        $.get(_.endpoint('/milestones'), function(res) {
			this.setState({
				milestones: res.records,
			});
        }.bind(this));
        
        $.get(_.endpoint('/milestone-types'), function(res) {
			this.setState({
				milestone_types: res.records,
			});
        }.bind(this));
        
        $.get(_.endpoint('/users'), function(res) {
			this.setState({
				users: res.records,
			});
		}.bind(this));
    },

    setField: function(key, val) {
		var data = Object.assign({}, this.state.data);
		data[key] = val;
		this.setState({
			data,
        }, () => { Object.assign(this.props.data, this.state.data);}); //OUT property

    },
    handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handleRadioChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handleChecked: function(e) {
		this.setField(e.target.name, e.target.checked ? 1 : 0);
    },
    
    handleDateChange: function(key, val) {
        this.setField(key, val);
    },
    
    handleUseDueDate: function(e) {
        let data = Object.assign({}, this.state.data);
        if (!e.target.checked) {
            data.date_due = null;
        }
        this.setState({data, useDueDate: e.target.checked}, 
            () => { Object.assign(this.props.data, this.state.data);}); //OUT property

    },

    handleAssignedUsers: function(userID, e) {
        let data = Object.assign({}, this.state.data);

		if (e.target.checked) {
			data.assigned_id[userID] = userID;
		}
		else {
			delete data.assigned_id[userID];
		}

		this.setState({
			data,
        }, () => { Object.assign(this.props.data, this.state.data);}); //OUT property
        
    },

    render: function() {

        const datePickerProps = {
			changeYear: true,
			showPickerIcon: true,
			style: {
				maxWidth: 140,
			},
        };

        const {useDueDate, data} = this.state;
        
		return (
            <dl className="form dialog">
                <dt>{Locale.getString('label.name', 'Name')} <RequiredMarker /></dt>
                <dd>
                    <input name="name" type="text" value={data.name} onChange={this.handleChange}/>
                    <ErrorDisplay message={this.props.errors.name} />
                </dd>

                <dt>{Locale.getString('title.site', 'Site')}</dt>
                <dd>
                    <select name="site_id" value={data.site_id} onChange={this.handleChange}>
                        <option value="0">{Locale.getString('option.not-site-specific', 'Not Site Specific')}</option>
                        {
                            this.state.sites.map((site => {
                                return <option key={site.id} value={site.id}>{site.name}</option>
                            }))
                        }
                    </select>
                </dd>

                <dt>{Locale.getString('title.study', 'Study')}</dt>
                <dd>
                    <select name="study_id" value={data.study_id} onChange={this.handleChange}>
                        <option value="0">{Locale.getString('option.not-site-specific', 'Not Site Specific')}</option>
                        {
                            this.state.studies.map((study => {
                                return <option key={study.id} value={study.id}>{`${study._sponsor_name} - ${study.protocol}`}</option>
                            }))
                        }
                    </select>
                </dd>

                <dt>{Locale.getString('label.milestone-type', 'Milestone Type')}</dt>
                <dd>
                    <select name="type_id" value={data.type_id} onChange={this.handleChange}>
                        <option value="0">{Locale.getString('option.select-milestone-type', 'Select Milestone Type')}</option>
                        {
                            this.state.milestone_types.map((milestone_type => {
                                return <option key={milestone_type.id} value={milestone_type.id}>{milestone_type.name}</option>
                            }))
                        }
                    </select>
                </dd>

                <dt>{Locale.getString('label.milestone', 'Milestone')}</dt>
                <dd>
                    <select name="milestone_id" value={data.milestone_id} onChange={this.handleChange}>
                        <option value="0">{Locale.getString('option.select-milestone', 'Select Milestone')}</option>
                        {
                            this.state.milestones.map((milestone => {
                                return <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
                            }))
                        }
                    </select>
                </dd>

                <dt>{Locale.getString('title.description', 'Description')}</dt>
                <dd>
                    <textarea name="description" value={data.description} rows="5" onChange={this.handleChange}></textarea>
                </dd>

                <dt><label><input type="checkbox" value={useDueDate} checked={useDueDate} onChange={this.handleUseDueDate}></input><strong>{Locale.getString('label.add-due-date', 'Add Due Date')}</strong></label></dt>
                <dd>
                    {useDueDate &&
                    <ClinicalDatePicker {...datePickerProps} onChange={this.handleDateChange.bind(null, 'date_due')} value={data.date_due || ''}/>
                    }
                </dd>

                <dt>{Locale.getString('label.responsible-user', 'Responsible User')}</dt>
                <dd>
                    <select name="responsible_id" value={data.responsible_id} onChange={this.handleChange}>
                        <option value="0">{Locale.getString('option.select-user', 'Select User')}</option>
                        {
                            this.state.users.map((user => {
                                return <option key={user.id} value={user.id}>{`${user.lastname}, ${user.firstname}`}</option>
                            }))
                        }
                    </select>
                </dd>

                <dt>{Locale.getString('label.assigned-user', 'Assigned User')}(s)</dt>
                <dd>
                    <div style={{border: '1px solid #d4d4d4', padding: 10, borderRadius: 2, height: 160, overflowY: 'auto'}}>
                        {
                            this.state.users.map((user => {
                                return <div key={user.id}><label><input name="assigned_id" type="checkbox" checked={!_.isUndefined(data.assigned_id[user.id])} onChange={this.handleAssignedUsers.bind(null, user.id)}/>{`${user.lastname}, ${user.firstname}`}</label></div>
                            }))
                        }
                    </div>
                    <p><label><input name="_email_assigned" type="checkbox" value="1" onChange={this.handleChecked}/> {Locale.getString('label.email-notification', 'Send an email notification to assigned users.')}</label></p>
                </dd>

                <dt>{Locale.getString('label.notes', 'Notes')}</dt>
                <dd>
                    <textarea name="notes" rows="3" value={data.notes} onChange={this.handleChange}></textarea>
                </dd>

                <dt>{Locale.getString('label.completion-date', 'Completion Date')}</dt>
		        <dd>
                    <ClinicalDatePicker {...datePickerProps} onChange={this.handleDateChange.bind(null, 'date_completed')}  value={data.date_completed || ''}/>
		        </dd>
                

                <dt>{Locale.getString('label.completed-by', 'Completed By')}</dt>
                <dd>
                    <select name="completed_id" value={data.completed_id} onChange={this.handleChange}>
                        <option></option>
                    {
                        this.state.users.map((user => {
                            return <option key={user.id} value={user.id}>{`${user.lastname}, ${user.firstname}`}</option>
                        }))
                    }
                    </select>
                    <ErrorDisplay message={this.props.errors.completed_id} />
                </dd>

                <dt>{Locale.getString('label.monthly-recurrence', 'Monthly Recurrence')}</dt>
                <dd>
                    <label>
                        <input type="checkbox" name="monthly_recurring" value={data.monthly_recurring} checked={data.monthly_recurring == '1'? true : false } onChange={this.handleChecked}/>
                        {Locale.getString('label.auto-create-task', 'Automatically create this task every month')}
                    </label>
                </dd>
                

            </dl>
        )
    }
    
});