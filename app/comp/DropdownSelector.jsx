const {Locale} = RTBundle;

var DropdownSelector = React.createClass({

	closePopup: false,
	popupTimeout: null,

	getDefaultProps: function() {
		return {
			onSelect: _.noop,
			onChange: _.noop,
			items: [],
			itemValueFunc: function(item) {
				return item.value + '';
			},
			initialSelectedItem: 0,
			initialSelectedItems: {},
			defaultLabel: Locale.getString('option.select', 'Select') + ' ...',
			width: 200,
			searchable: false,
			searchPlaceholder: Locale.getString('label.search', 'Search') + ' ...',
			multiple: false,
			updateLabel: true,
			className: '',
			style: {},
		};
	},

	getInitialState: function() {
		return {
			selectedItem: this.props.initialSelectedItem,
			selectedItems: this.props.initialSelectedItems,
			open: false,
			keywords: '',
		};
	},

	componentDidMount: function() {
		$('body').on('click', this.handleBlur);
	},

	componentWillUnmount: function() {
		$('body').off('click', this.handleBlur);
	},

	handleBlur: function(e) {
		this.closePopup = true;
		this.popupTimeout = setTimeout(function() {
			if (this.closePopup === true && this.isMounted()) {
				this.setState({
					open: false,
				});
			}
		}.bind(this), 100);
	},

	handleFocus: function(e) {
		this.closePopup = false;
	},

	handleFocusClick: function(e) {
		this.closePopup = false;
	},

	handleOpen: function() {
		this.setState({
			open: !this.state.open,
		});
	},

	handleSelect: function(item, e) {
		var selectedItems = this.state.selectedItems;
		selectedItems[this.props.itemValueFunc(item)] = true;
		this.setState({
			selectedItem: this.props.itemValueFunc(item),
			selectedItems: selectedItems,
			open: false,
			keywords: '',
		});

		if (this.props.multiple) {
			this.props.onSelect(_.keys(selectedItems));
		}
		else {
			this.props.onSelect(item);
			if (this.state.selectedItem != item.value) {
				this.props.onChange(item);
			}
		}
	},

	findItem: function(val) {
		var item = _.find(this.props.items, function(item) {
			return item.value == val;
		});

		if (item !== null && typeof item !== 'undefined') {
			return item;
		}

		return {};
	},

	handleKeywords: function(e) {
		this.setState({
			keywords: e.target.value,
		});
	},

	handleMultipleChange: function(item, e) {
		var selectedItems = this.state.selectedItems;
		e.stopPropagation();

		if (e.target.checked) {
			selectedItems[this.props.itemValueFunc(item)] = true;
		}
		else {
			if (!_.isUndefined(selectedItems[this.props.itemValueFunc(item)])) {
				delete selectedItems[this.props.itemValueFunc(item)];
			}
		}

		this.setState({
			selectedItems: selectedItems,
		});

		this.props.onSelect(_.keys(this.state.selectedItems));
	},

	componentWillReceiveProps: function(props) {
		this.setState({
			selectedItems: props.initialSelectedItems,
		});
	},

	render: function() {
		var selectedItem = this.findItem(this.state.selectedItem);

		var items = this.props.items;
		if (this.state.keywords) {
			items = _.filter(items, function(item) {
				var val = _.isUndefined(item.searchValue) ? item.value + '' : item.searchValue;
				val = val.toLowerCase();
				return val.indexOf(this.state.keywords.toLowerCase()) > -1;
			}, this);
		}

		var style = $.extend({
			width: this.props.width,
		}, this.props.style);

		var currentLabel = this.props.defaultLabel;
		if (this.props.updateLabel) {
			if (this.props.multiple && !_.isEmpty(this.state.selectedItems)) {
				currentLabel = _.keys(this.state.selectedItems).length + ' item(s)';
			}
			else if (!this.props.multiple && this.state.selectedItem > 0) {
				currentLabel = this.props.updateLabel && (this.props.multiple && this.props.selectedItems.length > 0 || !this.props.multiple && this.state.selectedItem > 0) ? selectedItem.label : this.props.defaultLabel;
			}
		}

		return (
			<div className={'comp-dropdown-selector' + (this.props.className ? ' ' + this.props.className : '')} style={style} onMouseDown={this.handleFocus} onClick={this.handleFocusClick}>
				<div className="selector" onClick={this.handleOpen} title={currentLabel}>
					<div className="label">
						{currentLabel}
					</div>
					<div className="icon">
						<i className="fa fa-angle-down"></i>
					</div>
				</div>

				{this.state.open &&
				<div className="popup">
					{this.props.searchable &&
					<div className="search-input-container">
						<input type="text" value={this.state.keywords} onChange={this.handleKeywords} placeholder={this.props.searchPlaceholder} className="search-input" />
					</div>}
					{_.map(items, function(item) {
						return (
							<label key={this.props.itemValueFunc(item)} className="option" onClick={this.props.multiple ? _.noop : this.handleSelect.bind(null, item)}>
									{this.props.multiple &&
									<input type="checkbox" checked={!_.isUndefined(this.state.selectedItems[this.props.itemValueFunc(item)])} onChange={this.handleMultipleChange.bind(null, item)} style={{marginRight: 8, verticalAlign: 'middle'}} />}
									{item.label}
							</label>
						);
					}, this)}
				</div>}
			</div>
		);

	}

});
