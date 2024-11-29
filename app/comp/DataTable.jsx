const {Locale} = RTBundle;

var DataTable = React.createClass({

	getDefaultProps: function() {
		return {
			identifier: 'id',
			localIdentifier: '_id',
			valueTransformers: {},
			searchTransformers: {},
			source: [],
			dataFilter: {},
			requestParams: {},
			horizontalScroll: false,
			minCellWidth: 0,
			controlHeaders: false,
			visibleColumns: {},
			perPage: 15,
			remotePaging: false,
			singlePage: false,
			batchSelection: false,
			sortable: true,
			showHeaders: true,
			inlineEditing: false,
			editOnRowClick: false,
			createTitle: '',
			onBatchUpdate: _.noop,
			onHeaderChange: _.noop,
			onLoaded: _.noop,
			onBeforeEdit: _.identity,
			onBeforeCancel: _.identity,
			onBeforeSave: _.identity,
			onCreateRecord: function() {
				return {};
			},
			onUpdate: _.noop,
			onDialogButtons: _.noop,
			onFilters: _.noop,
			onActionButtons: _.noop,
			splitButtonPanel: false,
			className: '',
			searchEnabled: true,
			emptyMessage: Locale.getString('message.no-records', 'No records.'),
			emptySearchMessage: Locale.getString('message.no-records-found', 'No records found.'),
			closeAfterSaving: true,
			defaultSortKey: '',
			defaultSortDir: 'asc',
			actionClassName: 'col-md-4',
			optionsClassName: 'col-md-6',
			optionsWithPagingClassName: null,
			additionalClassName: 'col-md-2',
			fields: {},
			addons: {
				main: [],
			},
			dialogClass: '',
			showXOnSave: true,
			saveMinDelay: 0,
			showBrandColorOnHover: false,
			passNewRecordToDialog: false,
			actionStyle: {},
			tableMaxHeight: 655,
			shouldEditRecord: function() {
				return true;
			},
		};
	},

	getInitialState: function() {
		return {
			page: 1,
			dataFilter: this.props.dataFilter,
			records: _.isString(this.props.source) ? [] : this.props.source,
			numPages: 1,
			searchTerms: '',
			batchItems: {},
			record: null,
			dialog: null,
			sortKey: this.props.defaultSortKey,
			sortDir: this.props.defaultSortDir,
			inlineTracker: {},
			loading: false,
			requests: {},
		};
	},

	componentDidMount: function() {
		this.handleUpdate();
	},

	componentWillUnmount: function() {
		this.removeRequests();
	},

	removeRequests: function(cb = _.noop) {
		const { requests } = this.state;

		_.each(requests, (req, key) => {
			if (req && _.isFunction(req.abort)) {req.abort();}	
			else if (req && req.req && _.isFunction(req.req.abort)) {req.req.abort();}	
			delete requests[key];
		});

		this.setState({requests}, cb);
	},

	pageChanger: function(delta) {
		return function(e) {
			e.preventDefault();
			if (delta === 0) {
				return;
			}
			this.setState({
				page: parseInt(this.state.page) + delta
			}, this.handleRemoteUpdate);
		}.bind(this);
	},

	handleSearch: function(e) {
		var records = [];
		var props = this.props;
		var terms = e.target.value;
		terms = terms.split(' ');
		terms = terms.filter(function(n) {
			return n !== '';
		});

		if (this.props.remotePaging === true) {
			this.setState({
				searchTerms: e.target.value,
				page: 1,
			}, this.handleRemoteUpdate);
			return;
		}

		if (terms.length === 0) {
			records = _.map(this.state.records, function(item) {
				item.__hidden = false;
				return item;
			});
		}
		else {
			records = $.map(this.state.records, function(record) {
				var tc = 0;
				record.__hidden = false;
				$.each(terms, function(j, term) {
					var mc = 0;
					$.each(record, function(key, val) {
						var field = props.fields[key];
						var origVal = val;

						if (typeof props.searchTransformers[key] === 'function') {
							val = props.searchTransformers[key](val);
						}
						else if (_.isObject(field) && _.isFunction(field.searchValue)) {
							val = field.searchValue.call(record, val);
						}
						else if (_.isObject(field) && _.isFunction(field.value)) {
							val = field.value.call(record, val);
							if (!_.isString(val)) {
								val = origVal;
							}
						}
						else if (val === null || val === undefined || typeof val === 'object') {
							return;
						}

						try {
							var sub = val.toString().toLowerCase();
						}
						catch (e) {
							return '';
						}
						if (sub.indexOf(term.toLowerCase()) > -1)
							mc++;
					});
					if (mc > 0)
						tc++;
				});
				if (terms.length == tc) {
					record.__hidden = false;
				}
				else {
					record.__hidden = true;
				}
				return record;
					//records.push(record);
			});
		}

		this.setState({
			records: records,
			page: 1,
			searchTerms: e.target.value,
		});
	},

	searchAdvanced: function(data) {
		var records = this.state.records;

		var fields = this.props.module.fields;
		var fieldMap = {};
		$.each(fields, function(i, field) {
			fieldMap[field.id] = field;
		});
		var getTerms = function(str) {
			var terms = str.toString().split(' ');
			terms = terms.filter(function(n) {
				return n !== '';
			});
			return terms;
		};

		$.each(this.state.records, function(i, record) {
			record.__hidden = false;

			$.each(record, function(key, val) {
				var isRange = !_.isUndefined(data.low[key]) || !_.isUndefined(data.high[key]);
				var fieldInfo = fieldMap[key];

				if (!_.isUndefined(fieldInfo) && fieldInfo.type == 'value-table') {
					return;
				}

				if (!isRange && (val === null || val === undefined || typeof val === 'object')) {
					// no further processing since this field is not a numeric range and won't
					// need to pass the string test
					return;
				}

				if (!_.isUndefined(fieldInfo) && fieldInfo.type == 'yes-no') {
					if (!_.isUndefined(data[key]) && data[key] > 0 && val > 0 && val != data[key]) {
						record.__hidden = true;
						return false;
					}
					return;
				}

				if (isRange) {
					val = parseFloat(val);
					var passed = true;
					if (!_.isUndefined(data.low[key])) {
						passed = val >= parseFloat(data.low[key]);
					}
					if (!_.isUndefined(data.high[key])) {
						passed = val <= parseFloat(data.high[key]);
					}
					if (!passed) {
						record.__hidden = true;
						return false;
					}
				}
				else if (!_.isUndefined(data[key])) {
					var terms = getTerms(data[key]);
					if (terms.length < 1) {
						return;
					}
					var tc = 0;
					$.each(terms, function(termIndex, term) {
						var mc = 0;
						var sub = val.toString().toLowerCase();
						term = term.toString().toLowerCase();
						if (sub.indexOf(term) > -1) {
							tc++;
						}
					});

					if (tc < terms.length) {
						record.__hidden = true;
						return false;
					}
				}
			});
		});

		this.setState({
			records: records,
		});
	},

	handleUpdate: function(cb) {
		var params = _.extend({}, this.props.requestParams, {
			page: this.state.page,
		});
		if (this.props.remotePaging === true) {
			params.limit = this.props.perPage;
			params.sortField = this.state.sortKey;
			params.sortDir = this.state.sortDir;
			params.search = this.state.searchTerms;
		}

		if (this.props.endpoint) {
			this.setState({
				loading: true,
			}, () => {
				this.removeRequests(() => {
					var req = $.get(_.endpoint(this.props.endpoint), params, function(res) {
						var merge = {};
						if (this.props.remotePaging === true) {
							merge.numPages = res.numPages;
						}
						this.setState(_.extend({
							records: res.records,
							_records: res.records,
							loading: false,
						}, merge));
						this.props.onLoaded.call(null, this, res.records);
					}.bind(this));
		
					this.setState({requests: {...this.state.requests, ...{[_.uuid()]: req}}})
				});
			});
		}
	},

	handleSort: function(key, e) {
		e.preventDefault();

		if (!this.props.sortable) {
			return;
		}

		var sortKey = this.state.sortKey;
		if (sortKey != key) {
			this.setState({
				sortKey: key,
				sortDir: 'asc',
				page: 1,
			}, this.handleRemoteUpdate);
		}
		else {
			this.setState({
				sortDir: this.state.sortDir == 'asc' ? 'desc' : 'asc',
				page: 1,
			}, this.handleRemoteUpdate);
		}
	},

	handleRemoteUpdate: function() {
		if (this.props.remotePaging === true) {
			this.handleUpdate();
		}
	},

	handlePageNumber: function(e) {
		this.setState({
			page: e.target.value,
		}, this.handleRemoteUpdate);
	},

	handleHeaderSelection: function(fields) {
		//console.log(fields);
	},

	handleSelection: function(id, e) {
		var batch = this.state.batchItems;
		if (e.target.checked)
			batch[id] = true;
		else
			delete batch[id];
		this.setState({
			batchItems: batch,
		});
	},

	handleSelectAll: function(e) {
		var batch = this.state.batchItems;
		var records = this.state.records;
		if (e.target.checked) {
			_.map(records, function(record) {
				batch[record.id] = true;
			});
		}
		else {
			_.map(records, function(record) {
				delete batch[record.id];
			});
		}
		this.setState({
			batchItems: batch,
		});
	},

	handleBatchDeletion: function(e) {
		e.preventDefault();
		$['delete'](_.endpoint(this.props.endpoint + '/batch'), {list: _.keys(this.state.batchItems)}, function(res) {
			this.handleUpdate();
		}.bind(this));
	},

	renderDialog: function(params) {
		var errors = params.errors || {};
		return (
			<Dialog {...this.props} className={this.props.dialogClass} modal="true" title={params.title || 'Edit'} onClose={this.handleCancelRecord}
				buttons={<div className="row">
					{this.props.splitButtonPanel &&
					<div className="col-sm-6 left">
						{this.props.onDialogButtons.call(this, 'left', params)}
					</div>}
					<div className={'col-sm-' + (this.props.splitButtonPanel ? '6' : '12') + ' right'}>
						<span>
							{!params.saving &&
							<button type="button" onClick={this.handleCancelRecord.bind(null, {})}>{Locale.getString('button.cancel', 'Cancel')}</button>}

							{params.saving &&
							<button type="button" className="primary" onClick={_.noop} style={{backgroundColor: _.primaryBrandColor()}}><i className="fa fa-spin fa-spinner" /> {Locale.getString('button.saving', 'Saving')}...</button>}

							{!params.saving &&
							<button type="button" className="primary" onClick={this.handleSaveRecord.bind(null, params)} style={{backgroundColor: _.primaryBrandColor()}}>{Locale.getString('button.save', 'Save')}</button>}

							{this.props.showXOnSave && !this.props.closeAfterSaving && params.saved &&
							<button type="button" className="primary" onClick={this.handleCloseDialog} style={{backgroundColor: _.primaryBrandColor()}}><i className="fa fa-times" /></button>}
						</span>
					</div>
				</div>}>
				{React.createElement(params.form || this.props.form, $.extend({}, this.props, {data: params.record, errors: errors, saving: params.saving, saved: params.saved}), '')}
			</Dialog>
		);
	},

	getIdentifier: function(record) {
		if (!_.isUndefined(record[this.props.identifier]))
			return record[this.props.identifier];

		if (!_.isUndefined(record[this.props.localIdentifier]))
			return record[this.props.localIdentifier];

		return undefined;
	},

	handleEditRecord: function(params, e) {
		if (!_.isUndefined(e) && _.isFunction(e.preventDefault)) {
			e.preventDefault();
			if (this.props.editOnRowClick) {
				e.stopPropagation();
			}
		}

		if (!this.props.shouldEditRecord(params.record)) {
			return;
		}

		var props = this.props;
		if (params.record) {
			params.record = _.extend({}, params.record);
		}

		params = this.props.onBeforeEdit(params);

		if (!this.props.inlineEditing && typeof props.form === 'undefined') {
			console.log('No form component present for this DataTable.');
			return;
		}

		if (_.isUndefined(this.getIdentifier(params.record)) && _.isFunction(this.props.onCreate)) {
			this.props.onCreate(this.props);
			return;
		}

		if (this.props.inlineEditing) {
			var records = this.state.records;
			var tracker = this.state.inlineTracker;

			if (_.isUndefined(params.record[this.props.identifier]) && _.isUndefined(params.record[this.props.localIdentifier])) {
				params.record[this.props.localIdentifier] = _.uuid();
				records.unshift(params.record);
			}

			tracker[this.getIdentifier(params.record)] = {
				editing: true,
				errors: {},
			};

			this.setState({
				records: records,
				inlineTracker: tracker,
			});
		}
		else {
			this.setState({
				saved: false,
				dialog: this.renderDialog(params),
			});
		}
	},

	handleShowDialog: function(params, e) {
		if (!_.isUndefined(e) && _.isFunction(e.preventDefault)) {
			e.preventDefault();
			if (this.props.editOnRowClick) {
				e.stopPropagation();
			}
		}
		this.setState({
			dialog: params.dialog,
		});
	},

	handleCloseDialog: function(e) {
		this.setState({
			dialog: null,
			saved: false,
		});
	},

	handleCancelRecord: function(params, e) {
		this.props.onBeforeCancel();

		if (this.props.inlineEditing) {
			var localIdent = this.props.localIdentifier;
			var records = this.state.records;
			if (params.record[localIdent]) {
				var idx = _.findIndex(records, function(rec) {
					return rec[localIdent] == params.record[localIdent];
				});
				records.splice(idx, 1);
				this.setState({
					records: records,
				});
			}

			var tracker = this.state.inlineTracker;
			delete tracker[this.getIdentifier(params.record)];
			this.setState({
				inlineTracker: tracker,
			});
		}
		else {
			this.setState({
				dialog: null,
			});
		}
	},

	handleSaveRecord: function(params, e) {
		if (this.props.endpoint || _.isString(this.props.source)) {
			var endpoint = _.isString(this.props.source) ? this.props.source : this.props.endpoint;

			if (_.isFunction(this.props.onBeforeSave)) {
				var result = this.props.onBeforeSave(this, params.record);
				if (result === false) {
					return;
				}
			}
			if (!this.props.inlineEditing) {
				this.setState({
					dialog: this.renderDialog(_.extend(params, {saving: true, saved: false})),
				});
			}
			$(window).delay(this.props.saveMinDelay).queue((next) => {
			$.post(_.endpoint(endpoint), params.record, function(res) {

				//global state upate
				$( "body").removeClass('avoid-clicks');
				//

				if (!_.isUndefined(res.status) && res.status < 2) {
					if (_.isFunction(this.props.onUpdate)) {
						this.props.onUpdate();
					}

					params = _.extend(params, {
						saved: true,
						saving: false,
						errors: {},
					});
					
					if(this.props.passNewRecordToDialog) {
						params.record = res.record;
					}

					if (this.props.inlineEditing) {
						var tracker = this.state.inlineTracker;
						delete tracker[this.getIdentifier(res.record)];
						this.setState({
							inlineTracker: tracker,
						});
					}
					else if (!this.props.closeAfterSaving) {
						params.record.id = res.record.id;
						this.setState({
							dialog: this.renderDialog(params),
						});
					}
					else {
						this.setState({
							dialog: null,
							});
						}
						this.handleUpdate();
					}
					else {
						if (res.errors) {
							if (this.props.inlineEditing) {
								var tracker = this.state.inlineTracker;
								tracker[this.getIdentifier(params.record)].errors = res.errors;
								this.setState({
									inlineTracking: tracker,
								});
							}
							else {
								this.setState({
									dialog: this.renderDialog(_.extend(params, {saved: false, saving: false, errors: res.errors})),
								});
							}
							return;
						}
					}
				}.bind(this));

				next();
			});
			
		}
		else {
			var records = this.state.records;
			if (_.isFunction(this.props.onValidateRecord)) {
				var errors = this.props.onValidateRecord(params.record);
				if (!_.isEmpty(errors)) {
					this.setState({
						dialog: this.renderDialog(_.extend(params, {errors: errors})),
					});
					console.log(errors);
					return;
				}
			}
			if (!params.record.id) {
				params.record.id = _.uuid();
				records.push(params.record);
			}
			else {
				var idx = _.findIndex(records, function(rec) {
					return rec.id == params.record.id;
				});
				records[idx] = params.record;
			}
			this.setState({
				records: records,
				dialog: null,
			});
			this.props.onUpdate(params.record);
		}
	},

	handleDeleteRecord: function(params, e) {
		if (!_.isUndefined(e) && _.isFunction(e.preventDefault)) {
			e.preventDefault();
			if (this.props.editOnRowClick) {
				e.stopPropagation();
			}
		}
		this.setState({
			dialog: (
				<ConfirmationDialog {...this.props} modal="true" title={params.title || Locale.getString('title.delete-confirmation', 'Delete Confirmation')} onCancel={this.handleCancelRecord.bind(null, {})} onConfirm={this.handleDeleteConfirmation.bind(null, params.record)}>
					{params.message}
				</ConfirmationDialog>
			)
		});
	},

	handleDeleteConfirmation: function(data, e) {
		if (!_.isUndefined(e) && _.isFunction(e.preventDefault)) {
			e.preventDefault();
		}

		if (this.props.endpoint) {
			var endpoint = this.props.deleteEndpoint ? this.props.deleteEndpoint : this.props.endpoint;
			$['delete'](_.endpoint(endpoint + '/' + data.id), function(res) {
				this.handleUpdate();
			}.bind(this));
		}
		else {
			var records = this.state.records;
			_.remove(records, function(rec) {
				return rec.id == data.id;
			});
			this.setState({
				records: records,
			});
		}
		this.setState({
			dialog: null,
		});
	},

	sortRecords: function(records) {
		var fields = this.props.fields;
		var sortKey = this.state.sortKey;
		if (_.isUndefined(fields[sortKey])) {
			return records;
		}

		var field = fields[sortKey];
		return _.sortByOrder(records, function(rec) {
			if (_.isObject(field)) {
				if (_.isFunction(field.sortValue)) {
					return field.sortValue.call(rec, rec[sortKey]);
				}
				else if (_.isFunction(field.value) && (_.isUndefined(field.sortWithValue) || field.sortWithValue === true)) {
					var val = field.value.call(rec, rec[sortKey]);
					if (_.isString(val)) {
						return val;
					}
				}
			}
			return rec[sortKey] || '';
		}, [this.state.sortDir]);
	},

	render: function() {
		const {ReactTableContainer} = RTBundle;

		var onEdit = _.isFunction(this.props.onEdit) ? this.props.onEdit : this.handleEditRecord;
		var onDelete = _.isFunction(this.props.onDelete) ? this.props.onDelete : this.handleDeleteRecord;
		var onCancel = _.isFunction(this.props.onCancel) ? this.props.onCancel : this.handleCancelRecord;

		try {
		var records = [];
		this.state.records.map(function(record) {
			if (_.isUndefined(record.__hidden) || record.__hidden === false) {
				records.push(record);
			}
		});

		if (_.isFunction(this.props.filterFunc)) {
			records = _.filter(records, this.props.filterFunc);
		}

		if (!this.props.remotePaging && this.props.sortable && this.state.sortKey) {
			records = this.sortRecords(records);
		}

		var fields = {};
		if (this.props.controlHeaders) {
			_.each(this.props.fields, function(val, fieldName) {
				if (this.props.visibleColumns[fieldName] === true) {
					fields[fieldName] = val;
				}
			}, this);
		} else {
			fields = this.props.fields;
		}

		var pageCount = this.props.remotePaging === true ? this.state.numPages : Math.ceil(records.length / this.props.perPage);
		if (this.props.remotePaging === true) {
			records = this.state.records;
		} else if (!this.props.singlePage) {
			var pageOffset = (this.state.page - 1) * this.props.perPage;
			if (pageCount > 1) {
				records = records.slice(pageOffset, pageOffset + this.props.perPage);
			}
		} 

		records = records.map(function(record) {
			if (_.isUndefined(record[this.props.identifier]) && _.isUndefined(record[this.props.localIdentifier])) {
				console.log('Record missing both local and foreign identifiers.');
			}

			var id = this.getIdentifier(record); //record[this.props.identifier] || record[this.props.localIdentifier];
			var tracking = this.state.inlineTracker[id];
			var editMode = this.props.inlineEditing && !_.isUndefined(tracking) && tracking.editing === true;

			return (
				<Record
					key={record[this.props.identifier] || record[this.props.localIdentifier]}
					{...this.props}
					data={record}
					checked={!_.isUndefined(this.state.batchItems[id]) && this.state.batchItems[id] === true}
					onSelected={this.handleSelection}
					onUpdate={this.handleUpdate}
					onEdit={onEdit}
					onDelete={onDelete}
					onCancel={onCancel}
					onShow={this.handleShowDialog}
					onSave={this.handleSaveRecord}
					editMode={editMode}
					errors={editMode && tracking.errors ? tracking.errors : {}}
				/>
			);
		}.bind(this));

		var min = this.props.minCellWidth;
		var headers = null;
		
		if (this.props.showHeaders) {
			headers = $.map(fields, function(value, key) {
				var heading = '?';
				var style = {};
				var columnSortable = this.props.sortable;

				if (_.isObject(value)) {
					if (_.isString(value.label)) {
						heading = value.label;
					}
					else if (_.isFunction(value.label)) {
						heading = value.label.call(this);
					}
					else if (!_.isUndefined(value.label)) {
						heading = value.label;
					}

					if (_.isObject(value.style)) {
						style = value.style;
					}

					if (value.width) {
						style = _.extend(style, {
							width: value.width
						});
					}

					if (value.align) {
						style = _.extend(style, {
							textAlign: value.align,
						});
					}

					if (value.sortable === false) {
						columnSortable = false;
					}
				}
				else if (_.isString(value)) {
					heading = value;
				}

				if (min > 0) {
					style.minWidth = min;
				}

				if (this.props.sortable && columnSortable) {
					var icon = key == this.state.sortKey ? <i className={'fa fa-sort-' + this.state.sortDir} /> : <i className="fa fa-sort" style={{visibility: 'hidden'}} />;
					heading = <a href="#!" onClick={this.handleSort.bind(null, key)}>{heading} {icon}</a>;
				}

				return <th key={key} style={style}>{heading}</th>;
			}.bind(this));
		}

		if (this.props.controlHeaders) {
			var headerList = $.map(this.props.fields, function(val, fieldName) {
				return {
					value: fieldName,
					label: _.isObject(val) ? val.label : val,
				};
			});

			headerList = _.sortBy(headerList, function(n) {
				return n.label;
			});
		}

		const body = () => {
			return (
				<table className="record-table" style={this.props.singlePage ? {border: 'unset'} : {}}>
					{this.props.showHeaders &&
					<thead>
						<tr>
							{this.props.batchSelection &&
							<th><input type="checkbox" onChange={this.handleSelectAll} /></th>}

							{headers}

							{this.props.controls &&
							<th></th>}
						</tr>
					</thead>}

					<tbody>
						{records}
					</tbody>
				</table>
			);
		}

		var actionButtons = this.props.onActionButtons.call(null, this);
		return (
			<div className={this.props.className + (this.props.controls ? ' has-controls ' : '') + (this.props.showBrandColorOnHover ? ' brand-color-hover ' : '')}>
				{this.state.dialog}

				<div className="row page-nav">
					{(!_.isEmpty(this.props.createButtonLabel) || !_.isEmpty(this.props.addons.main) || actionButtons) &&
					<div className={this.props.actionClassName + ""}>
						{this.props.createButtonLabel &&
						<a onClick={onEdit.bind(null, {record: this.props.onCreateRecord(), title: this.props.createTitle || this.props.createButtonLabel})}
							className="button action" href="#!" style={{ ...{backgroundColor: _.primaryBrandColor()}, ...this.props.actionStyle}}><i className="fa fa-plus"></i> {this.props.createButtonLabel}</a>}

						{!_.isEmpty(this.props.addons.main) &&
						this.props.addons.main}

						{actionButtons}
					</div>}

					<div className={pageCount > 1 ? (this.props.optionsWithPagingClassName || this.props.optionsClassName) + " form" : this.props.optionsClassName + " form"}>
						{this.props.searchEnabled &&
						<input type="text" onChange={this.handleSearch} className="" value={this.state.searchTerms} placeholder={`${Locale.getString('label.search', 'Search')}...`} />}
						{_.isFunction(this.props.onAdvancedSearch) &&
						<a href="#!" style={{marginLeft: 15}} onClick={this.props.onAdvancedSearch}>{Locale.getString('button.advanced', 'Advanced')}</a>}
						{this.props.onFilters.call(null)}
					</div>

					<div className={this.props.additionalClassName + " form"}>
						{this.state.loading &&
						<i className="fa fa-spin fa-spinner" />}

						{pageCount > 1 && !this.props.singlePage &&
						<span>
							<a href="#" onClick={this.pageChanger(this.state.page <= 1 ? 0 : -1)} className={['record-pager', this.state.page == 1 && ' disabled'].join(' ')}><i className="fa fa-chevron-left"></i></a>
							<select onChange={this.handlePageNumber} value={this.state.page}>
								{_.range(1, pageCount + 1).map(function(pg) {
									return <option key={pg}>{pg}</option>;
								})}
							</select>
							<a href="#" onClick={this.pageChanger(this.state.page >= pageCount ? 0 : 1)} className={'record-pager' + (this.state.page >= pageCount ? ' disabled' : '')}><i className="fa fa-chevron-right"></i></a>
						</span>}

						{_.keys(this.state.batchItems).length > 0 &&
						<a href="#!" title={Locale.getString('title.delete-selected-items', 'Delete all selected items.')} onClick={this.handleBatchDeletion} className="button control fa fa-trash-o"></a>}

						{this.props.controlHeaders &&
						<DropdownSelector className="datatable-header-selector"
							updateLabel={false}
							onSelect={this.props.onHeaderChange}
							width={40}
							initialSelectedItems={this.props.visibleColumns}
							multiple={true} onChange={this.handleHeaderSelection} items={headerList} defaultLabel={<i className="fa fa-gear" />}
						/>}
					</div>
				</div>

				<div style={this.props.horizontalScroll ? {overflowX: 'auto'} : {}}>
					{this.props.singlePage && 
					<ReactTableContainer width="100%" height="655px" className='record-table' style={{paddingRight: 6, height: 'unset', maxHeight: this.props.tableMaxHeight, backgroundColor: '#eee'}}>
						{body()}
					</ReactTableContainer>
					}

					{!this.props.singlePage && body()}
				</div>
			</div>
		);
		}
		catch (e) {
			console.log(e);
			return <span data-error={e.message}>{Locale.getString('message.render-failed', 'Could not render items.')}</span>
		}
	}
});

