var CollapsibleSection = React.createClass({
	
	getDefaultProps: function() {
		return {
            sectionKey: 'sectionKey',
            defaultOpen: false,
            headerContainer: null,
            scrollIntoViewOnOpen: false,

            style: null,

            headerBackgroundColor: "#c3c3c3",
            arrowBackgroundColor: "#7f7f7f",
            arrowColor: "#9fc03c",

            onOpenChange: _.noop

		};
    },
    
    getInitialState: function() {
        const key = this.props.sectionKey;
        let isOpen = JSON.parse(sessionStorage.getItem(key));
        if (sessionStorage.getItem(key) == null) {
            isOpen = sectionData = this.props.defaultOpen;
            sessionStorage.setItem(key, JSON.stringify(sectionData));
        }
		return {
			isOpen
		};
    },

    componentDidMount: function() {
        this.props.onOpenChange(this.state.isOpen);
    },

    handleSectionClick: function() {

		const key = this.props.sectionKey;
		let data = JSON.parse(sessionStorage.getItem(key));

		if (!data == true && this.props.scrollIntoViewOnOpen) {
			const element = document.getElementById(`${this.props.sectionKey}`);
			_.defer(()=> {element.scrollIntoView()});
		}
		
		data = !data;
		sessionStorage.setItem(key, JSON.stringify(data));
		this.setState({isOpen: data}, () => {this.props.onOpenChange(this.state.isOpen)});
	},
    
    mapSectionToArrowClass: function(position = 'left') {
        return 'fa ' + (this.state.isOpen ? 'fa-angle-down' : `fa-angle-${position}`);
    },

    mapSectionToOpenCloseClass: function() {
        return  this.state.isOpen ? 'show' : 'hidden';
    },

	render: function() {

        const {sectionKey, style, headerBackgroundColor, arrowBackgroundColor, arrowColor} = this.props;

       return(
        <div id={`${sectionKey}`} style={style}>
            <div className="collapsible" onClick={this.handleSectionClick} style={{backgroundColor: headerBackgroundColor, marginBottom: 0}}>
                <i className={this.mapSectionToArrowClass('right')} style={{backgroundColor: arrowBackgroundColor, color: arrowColor}}></i>
                    {this.props.headerContainer}
                <i className={this.mapSectionToArrowClass()} style={{float: 'right', backgroundColor: arrowBackgroundColor, color: arrowColor, marginRight: 0}}></i>
            </div>

            <div className={this.mapSectionToOpenCloseClass() + ' collapsible-content'}>
                {this.props.children}
            </div>
        </div>
       )
    },
});
