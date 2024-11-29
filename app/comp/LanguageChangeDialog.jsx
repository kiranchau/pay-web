const {Locale} = RTBundle;

var LanguageChangeDialog = React.createClass({

	getDefaultProps: function() {
		return {
			onClose: _.noop,
		};
	},

	getInitialState: function() {
		var locale = Locale.fetchLocale();

		return {
			locale,
			errors: {},
			dialog: null,
			languages: [],
			saved: false
		}
	},

 componentDidMount: function() {
	 	//Temporary for testing until server side routing is implemented to add languages.
	 	this.setState({
			languages: []
		})

		$.get(_.endpoint('/languages'), function(res) {
			this.setState({
				languages: res.records,
			});
		}.bind(this));
	},

	handleClose: function() {
		this.props.onClose();
	},

	handleChange: function(e) {
		this.setState({
			locale: e.target.value
		})
	},

	handleSave: function() {
		Locale.setLocale(this.state.locale);

		const postData = {lang: this.state.locale}

		$.post(_.endpoint('/update-language'), postData, function(res) {
			if (res.status < 2) {
				this.setState({saved: true});
			}
			else {
				this.setState({
					errors: res.errors,
				});
			}
		}.bind(this));
	},

	render: function() {
		const currentLang = Locale.fetchLocale();
		const currentEn = currentLang == 'en' || !currentLang;

		var buttons = [
			<button key="cancel" type="button" onClick={this.props.onClose}>{Locale.getString('button.cancel', 'Cancel')}{!currentEn ? ' (Cancel)': ''}</button>,
			<button key="save" type="button" onClick={this.handleSave} className="primary">{Locale.getString('button.save', 'Save')}{!currentEn ? ' (Save)': ''}</button>
		];
		var button = <button 
			key="okay" 
			type="button" 
			onClick={() => {
				this.props.onClose();
				window.location.reload();
			}}
		>
			{Locale.getString('label.okay', 'Okay')}
		</button>;

		if (this.state.saved === true) {
			return (
				<Dialog title={Locale.getString('title.language-saved', 'Language Preference Saved')} style={{textAlign: 'left'}} width={400} onClose={this.props.onClose} buttons={button}>
					<p>{Locale.getString('message.language-saved', 'Your language preference has been successfully saved.')}</p>
				</Dialog>
			);
		}

		return(
			<Dialog title={`${Locale.getString('label.language', 'Language')}${!currentEn ? ' (Language)': ''}`} style={{textAlign: 'left'}} onClose={this.props.onClose} buttons={buttons} width={400}>
				<div className="row form">
					<dl className="col-sm-12 form dialog">
						<dt>{`${Locale.getString('title.preferred-language', 'Preferred Language').toUpperCase()}${!currentEn ? ' (PREFERRED LANGUAGE)': ''}`}</dt>
						<dd>
							<select name="locale" value={this.state.locale} onChange={this.handleChange} >
								<option value="">{Locale.getString('option.select-language', 'Select language')} {!currentEn ? ' (Select language)': ''}...</option>
								{_.map(this.state.languages, function(language) {
									const key = language.code;
									return <option key={key} value={language.code}>{`${language.native} ${language.native != 'English' ? `(${language.name})` : ''}`}</option>;
								})}
							</select>
						</dd>
					</dl>   
				</div>
			</Dialog>
		);
	}

});
