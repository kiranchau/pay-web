var PanelHorizontal = React.createClass({
	
	render: function() {

        const headerContainerStyle = {...{padding: 0, borderTop: '1px solid #d4d4d4', borderBottom: '1px solid #d4d4d4'}, ...this.props.headerStyle};

        const titleStyle = {...{fontWeight: 'bold', textAlign: 'center', background: '#7f7f7f', borderRight: '3px solid #d4d4d4', color: 'white', padding: '10px 0'}, ...this.props.titleStyle};

        const bodyContainerStyle = {...{padding: 0, border: '1px solid #d4d4d4'}, ...this.props.bodyStyle};
		const bodyStyle = {...{textAlign: 'center', padding: '10px 0', color: 'grey', fontWeight: 'bold', background: 'white'}, ...this.props.bodyStyle};
        
        return (
        <div style={this.props.panelStyle}>
            <div className='col-sm-6' style={headerContainerStyle}>
                <div style={this.props.headerStyle}>
                    <div className='base-header-font-size' style={titleStyle}>
                        {this.props.title}
                    </div>
                </div>
            </div>
            <div className='col-sm-6' style={bodyContainerStyle} >
                <div className='base-font-size' style={bodyStyle}>
                    {this.props.children}
                </div>
            </div>
        </div>)
    },
});
