var SystemOptions = React.createClass({

    render: function() {
        const style = {...{marginBottom: 16}, ...this.props.style};
        return (
            <div className='form base-font-size' style={style}>
                <select style={{marginLeft: 8, width: 130, float: "right"}}>
                    <option value="">GlobalPAY</option>
                </select>
            </div>
        )
    },
});