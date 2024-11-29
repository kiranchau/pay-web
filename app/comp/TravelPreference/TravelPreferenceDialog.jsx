var TravelPreferenceDialog = React.createClass({
    getDefaultProps: function() {
		return {
            style: {},
            formProps: {},
            endpoint: '',
            data: {},
            onSave: _.noop 
		};
	},

	getInitialState: function() {
		return {
            saving: false,
            saved: false,
            formErrors: {},
            formData: {},
            _formData: {}
		};
    },

    componentDidMount: function() {

        $.get(_.endpoint(this.props.endpoint), function(res) {
            if (res.record) {
                this.setState({
                    formData: res.record,
                    _formData: {...res.record}
                });
            }
			
        }.bind(this));
    },

    handleSave: function() {
        this.setState({
            saving: true,
        }); 
        $.post(_.endpoint(this.props.endpoint), this.state.formData, function(res) {

            const state = {saving: false};

            if (!_.isUndefined(res.status) && res.status < 2) {
                Object.assign(state, {
                    saved: true,
                    formData: res.record,
                    _formData: {...res.record},
                    formErrors: {}
                });

                this.props.onSave();
            } else {
                if (res.errors) {
                    Object.assign(state, { saved: false, formErrors: res.errors });
                }
            }

            this.setState(state);

        }.bind(this));
    },
    
    render: function() {

        const formProps = Object.assign({data: this.state.formData}, this.props.formProps);
        
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


        return (

            <div className="comp-dialog-overlay" style={{position: "static", background: 'transparent'}}>
				<div className="comp-dialog" style={style}>

					<div className="body" style={{overflow: 'initial'}}>
                            <TravelPreferenceForm
                            {...formProps}
                            errors={this.state.formErrors}
                        />
					</div>
				</div>
			</div>
        )
    }
});