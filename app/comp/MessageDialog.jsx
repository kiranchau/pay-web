const {Locale} = RTBundle;

var MessageDialog = React.createClass({

	getDefaultProps: function() {
		return {
			onCancel: _.noop,
			onUpdate: _.noop,
			user: {},
		};
	},

	getInitialState: function() {
		return {
			messages: [],
			curMessage: {},
		};
	},

	componentDidMount: function() {
		this.loadMessages();
	},

	loadMessages: function() {
		if (!this.props.requestID) {
			return;
		}
		$.get(_.endpoint('/requests/messages/' + this.props.requestID), function(res) {
			this.setState({
				messages: res.records,
			}, function() {
				this.positionTimeout = setTimeout(function() {
					$(ReactDOM.findDOMNode(this.refs.messages)).scrollTop(1000000);
				}.bind(this));
			}.bind(this));
		}.bind(this));
	},

	componentWillUnmount: function() {
		if (this.positionTimeout) {
			clearTimeout(this.positionTimeout);
		}
	},

	handleSend: function() {
		if (_.isEmpty(this.state.curMessage) || this.processing) {
			return;
		}

		var data = _.extend({}, this.state.curMessage, {
			request_id: this.props.requestID,
		});
		this.processing = true;

		$.post(_.endpoint('/requests/messages'), data, function(res) {
			this.loadMessages();
			this.processing = false;
		}.bind(this));

		this.setState({
			curMessage: {},
		});
	},

	handleMessageChange: function(e) {
		var msg = this.state.curMessage;
		msg.message = e.target.value;
		this.setState({
			curMessage: msg,
		});
	},

	handleResolve: function() {
		this.processing = true;
		$.post(_.endpoint('/resolved/messages/' + this.props.requestID), function(res) {
			this.processing = false;
			this.loadMessages();
		}.bind(this));
		this.props.onUpdate();
	},

	render: function() {
		var msg = this.state.curMessage;
		var show = false;
		_.each(this.state.messages, function(message) {
			if(message.resolved == 0 && message._account_type == 'siteuser') {
				show = true;
			}
		});
		return (
			<Dialog {...this.props} width={600} bottom={20} onClose={this.props.onCancel}>
				<div style={{position: 'relative', height: '100%'}}>
					<div ref="messages" style={{overflowY: 'auto', position: 'absolute', top: 0, left: 0, right: 0, bottom: 152}}>
						{_.map(this.state.messages, function(msg) {
							return (
								<div key={msg.id} style={{padding: 5, marginTop: 8, backgroundColor: '#f5f5f5'}}>
									<p>{msg.message}</p>
									<div style={{lineHeight: 1, fontSize: '11px', color: '#444'}}>
										{msg.poster.firstname} {msg.poster.lastname} on {moment.utc(msg.date_added).local().format('DD/MMM/YYYY H:mm:ss A').toUpperCase()}
									</div>
								</div>
							);
						}, this)}
					</div>

					<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, borderTop: '1px solid #ddd', padding: 10}} className="form">
						<textarea rows="4" style={{width: '100%'}} value={msg.message || ''} onChange={this.handleMessageChange} />
						<button type="button" className="btn action" onClick={this.handleSend} disabled={!msg.message || msg.message == ''}>{Locale.getString('button.send-message', 'Send Message')}</button>
					{(this.props.user.type == 'user' && show) &&
					<button type="button" className="btn action" onClick={this.handleResolve} disabled={!this.props.user.type == 'user'}>{Locale.getString('button.mark-resolved', 'Mark as Resolved')}</button>}
					</div>
				</div>
			</Dialog>
		);
	}

});
