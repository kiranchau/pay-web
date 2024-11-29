const {Locale} = RTBundle;

var FileManager = React.createClass({

	getDefaultProps: function() {
		return {
			initialFiles: [],
			errorMessage: '',
			name: 'file',
			accept: '*',
			uploadUrl: '#',
			downloadUrl: '#',
			deleteUrl: '#',
			onChange: _.noop,
			maxUploadSize: 15, // size in MB
			canDelete: true,
			disabled: false,
		}
	},

	getInitialState: function() {
		return {
			files: _.map(this.props.initialFiles, function(file) { return file;}),
			uploading: false,
			hash: '',
			name: '',
		};
	},

	handleUpload: function(file, e) {
		var fd = new FormData();
		fd.append('file', file);

		this.setState({
			uploading: true,
		});

		var sessid = localStorage.getItem('sessid');
		if (sessid) {
			fd.append('_sessid', sessid);
		}

		$.ajax({
			url: _.endpoint(this.props.uploadUrl),
			method: 'POST',
			data: fd,
			processData: false,
			contentType: false,
			success: function(res) {
				this.setState({
					errorMessage: '',
				});
				if (res.status < 2) {
					var files = this.state.files;
					files.push(res.file)
					this.setState({
						files: files,
						uploading: false,
					});
					this.props.onChange(files);
				}
				else {
					if (res.error) {
						this.setState({
							errorMessage: res.error,
						});
					}
				}
			}.bind(this)
		});
	},

	handleUploadError: function(arg) {
		this.setState({
			errorMessage: arg.message,
		});
	},

	handleDelete: function(file, e) {
		e.preventDefault();
		if (!this.props.canDelete) {
			return;
		}
		var files = this.state.files;

		files = _.reject(this.state.files, function(item) {
			return item.hash == file.hash;
		});

		if (this.props.deleteUrl != '#') {
			jQuery['delete'](this.props.deleteUrl, file, function(res) {
			});
		}

		this.props.onChange(files);
		this.setState({
			files: files
		});
	},

	render: function() {
		return (
			<div className="comp-filemanager">
				<div>
					{$.map(this.state.files, function(file, index) {
						var json = JSON.stringify(file);
						var isImage = /^image/.test(file.mime);
						return (
							<div className={isImage ? 'image' : 'file'} key={index + '-' + file.hash}>
								<a href={_.endpoint(this.props.downloadUrl) + '/' + file.hash} target="_blank">{file.name}</a>
								{this.props.canDelete &&
								<a href="#!" style={{color: '#900', 'float': 'right', marginLeft: 10}} onClick={this.handleDelete.bind(null, file)}><i className="fa fa-trash-o"></i> {Locale.getString('button.delete', 'Delete')}</a>}
								<input name={this.props.name + '[' + index + ']'} type="hidden" value={json} />
								{isImage &&
								<div className="thumb" style={{backgroundImage: 'url(' + _.endpoint(this.props.downloadUrl + '/' + file.thumbnail) + ')'}}></div>}
							</div>
						);
					}.bind(this))}
				</div>
				<FileUploader disabled={this.props.disabled} maxUploadSize={this.props.maxUploadSize * Math.pow(1024, 2)} accept={this.props.accept} onError={this.handleUploadError} onUpload={this.handleUpload} />
				{this.state.errorMessage &&
				<p className="error">{this.state.errorMessage}</p>}
			</div>
		);
	}

});
