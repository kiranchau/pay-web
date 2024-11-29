const {Locale} = RTBundle; 

var NoteForm = React.createClass({

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
        
		return {
			data: initialData,
            sites: [],
            studies: [],
            note_types: [],
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

        $.get(_.endpoint('/note-types'), function(res) {
			this.setState({
				note_types: res.records,
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

    render: function() {

        const {data} = this.state;
        
		return (
            <dl className="form dialog">

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
                        <option value="0">{Locale.getString('option.not-study-specific', 'Not Study Specific')}</option>
                        {
                            this.state.studies.map((study => {
                                return <option key={study.id} value={study.id}>{`${study._sponsor_name} - ${study.protocol}`}</option>
                            }))
                        }
                    </select>
                </dd>

                <dt>{Locale.getString('label.note-type', 'Note Type')}</dt>
                <dd>
                    <select name="type_id" value={data.type_id} onChange={this.handleChange}>
                        <option value="0">{Locale.getString('option.select-note-type', 'Select Note Type')}</option>
                        {
                            this.state.note_types.map((note_type => {
                                return <option key={note_type.id} value={note_type.id}>{note_type.name}</option>
                            }))
                        }
                    </select>
                </dd>

                <dt>{Locale.getString('label.note', 'Note')}</dt>
                <dd>
                    <textarea name="content" rows="3" value={data.content} onChange={this.handleChange}></textarea>
                </dd>
            </dl>
        )
    }
    
});