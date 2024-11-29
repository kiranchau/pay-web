const {Locale} = RTBundle;

var FileUploader = React.createClass({

	getDefaultProps: function() {
		return {
			onUpload: $.noop,
			onError: $.noop,
			accept: '*',
			fieldName: 'file',
			maxUploadSize: 10 * Math.pow(1024, 2), // 10 MB
			label: Locale.getString('label.attachement-message', 'Click to Browse, or drag and drop files here.'),
			multiple: false,
			className: '',
			style: {},
			disabled: false,
		};
	},

	getInitialState: function() {
		return {
			hovered: false,
			uploadInput: null,
		}	
	},	

	setupUploader: function() {
	},	

	componentDidMount: function() {
		this.setupUploader();
	},

	handleDragEnter: function(e) {
		e.preventDefault();
		this.setState({
			hovered: true,
		}); 
	},	

	handleDragExit: function(e) {
		e.preventDefault();
		this.setState({
			hovered: false,
		}); 
	},

	performUpload: function(file) {
		if (file.size > this.props.maxUploadSize) {
			this.props.onError({
				message: Locale.getString('message.selected-file', 'The selected file') + ' (' + file.name + ') ' + Locale.getString('message.too-big', 'is too big. The maximum allow file size is') + ' ' + _.filesize(this.props.maxUploadSize) + '.',
			}); 
		}	
		else {
			this.props.onUpload(file);
		}
	},	

	handleDrop: function(e) {
		e.preventDefault();
		if (this.props.disabled) {
			return;
		}
		var files = e.nativeEvent.dataTransfer.files;

		this.setState({
			hovered: false,
		}); 

		if (files.length > 0) {
			if (this.props.multiple) {
				$.each(files, function(i, file) {
					this.performUpload(file);
				}.bind(this));
			}
			else {
				// single upload
				this.performUpload(files[0]);
			}
		}
	},

	handleDragOver: function(e) {
		e.preventDefault();
	},

	handleClick: function(e) {
		if (this.props.disabled) {
			return;
		}
		$(this.refs.uploadInput).click();
	},

	handleBrowse: function(e) {
		if (e.target.files.length > 0) {
			if (this.props.multiple === true) {
				e.persist();
				$.each(e.target.files, function(i, file) {
					this.performUpload(file);
				}.bind(this));
			}
			else {
				this.performUpload(e.target.files[0]);
			}
		}
	},

	render: function() {
		return (
			<div className={'comp-fileuploader' + (this.state.hovered ? ' entered' : '') + (this.props.className ? ' ' + this.props.className : '')} onClick={this.handleClick} onDragOver={this.handleDragOver} onDragEnter={this.handleDragEnter} onDragExit={this.handleDragExit} onDrop={this.handleDrop} style={this.props.style}>
				{this.props.label}
				<input type="file" name={this.props.fieldName} onChange={this.handleBrowse} accept={this.props.accept} ref="uploadInput" multiple={this.props.multiple} />
			</div>
		);
	}

});
