var NavTick = React.createClass({

	getDefaultProps: function() {
		return {
			match: '',
		}
	},

	render: function() {
		var view = '';
		try {
			var ob = localStorage.getItem('lastView');
			ob = JSON.parse(ob);
			view = ob.viewName;
		}
		catch (e) {
			console.log(e);
		}

		view = this.props.view.displayName;
		if (this.props.match == view) {
			return <span className="menu-item-current" />;
		}

		return null;
	}

});
