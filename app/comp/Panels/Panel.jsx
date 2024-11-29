var Panel = React.createClass({

    getDefaultProps: function() {
		return {	
            panelStyle: {},
            
            headerStyle: {},

            title: '',
            titleClassName: '',
            titleStyle: {},

            action: null,
            actionClassName: '',

            bodyStyle: {}
		};
    },
	
	render: function() {

        const panelStyle = {...{overflow: 'hidden', border: "1px solid #c3c3c3", borderRadius: 15, marginBottom: 15, minHeight: 120, background: 'white'}, ...this.props.panelStyle};
        const headerStyle = {...{background: '#7f7f7f', padding: '7px 0', borderBottom: '3px solid #9fc03c'}, ...this.props.headerStyle};

        const titleClassName = this.props.titleClassName || this.props.action ? "col-xs-9" : "col-xs-12";
        const titleStyle = {...{color: 'white', fontWeight: 'bold'}, ...this.props.titleStyle};

		const actionClassName = this.props.actionClassName || "col-xs-3 right";
		
        const bodyStyle = {...{padding: '15px'}, ...this.props.bodyStyle};
                
        return (
        <div style={panelStyle}>
            <div style={headerStyle}>
                <div className={titleClassName}>
                    <div className='base-header-font-size' style={titleStyle}>{this.props.title}</div>
                </div>

                {this.props.action && 
                <div className={actionClassName}>
                    {this.props.action}
                </div>}
                <div className="clearfix"></div>
            </div>
            
            
            <div className='base-font-size' style={bodyStyle}>
				{this.props.children}
            </div>
        </div>)
    },
});
