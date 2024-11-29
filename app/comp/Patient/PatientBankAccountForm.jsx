const {Locale} = RTBundle;

var PatientBankAccountForm = React.createClass({

	getDefaultProps: function() {
		return {
			onClose: _.noop,
			onChange: _.noop,
			defaultCountry: '',
			data: {},
			countries: {},
			defaultCurrency: {},
			primaryBrandColor: '#000',
		};
	},

	getInitialState: function() {
		return {
			data: _.extend({country: this.props.defaultCountry}, this.props.data),
			errors: {},
			currencies:{},
			processing: false,
		};
	},

	componentDidMount: function() {
		$.get(_.endpoint('/currencies'), {active: 1}, function(res) {
			this.setState({
				currencies: res.currencies,
			});
		}.bind(this));

		$.get(_.endpoint('/patients/bank-account/default-currency/' + this.state.data.country), function(res) {
			if (res.status < 2) {
				this.setState({
					defaultCurrency: res.record,
				});
			}
			var data = this.state.data;
			data.currency = this.state.defaultCurrency.code;
			this.setState({data: data,});
		}.bind(this));
	},

	handleChange: function(e) {
		var data = this.state.data;
		data[e.target.name] = e.target.value;
		this.setState({
			data: data,
		});

		if (e.target.name == 'country') {
			$.get(_.endpoint('/patients/bank-account/default-currency/' + this.state.data.country), function(res) {
				if (res.status < 2) {
					this.setState({
						defaultCurrency: res.record,
					});

					data.currency = this.state.defaultCurrency.code;
					this.setState({
						data: data,
						errors: res.errors,
					});
				}
				else {
					data.currency = "";
					this.setState({
						errors: res.errors,
						data: data,
					});
				}
			}.bind(this));
		}
	},

	handleBankAccountSave: function(e) {
		this.setState({
			errors: {},
			processing: true,
		});

		$.post(_.endpoint('/patients/bank-account'), _.extend({}, this.state.data, {patient_id: this.props.patientID}), function(res) {
			if (res.status < 2) {
				this.setState({
					errors: {},
				});
				this.props.onChange('bank_account', res.record);
				this.props.onChange('bank_account_id', res.record.id);
				this.props.onClose();
			}
			else {
				this.setState({
					errors: res.errors,
					processing: false,
				});
			}

		}.bind(this));
	},

	getFieldProps: function(field) {
		var props = {placeholder: Locale.getString('label.3-digit-bank-code', '3 digit bank code')};
		var country = this.state.data.country || this.props.defaultCountry;

		if (country == 'GB') {
			if (field == 'account_num') {
				if (this.state.data.currency == 'GBP') {
					props.placeholder = '8 digit IBAN number';
					props.maxLength = 8;				
				}
				else if (this.state.data.currency == 'EUR') {
					props.placeholder = ' 22 character IBAN (GB + 2 check digits + 4 capital letters + 14 digits)';
					props.maxLength = 22;
				}
			}
			else if (field == 'routing_num') {
				if (this.state.data.currency == 'EUR') {
					props.placeholder = '8 or 11 digit bank sorting code';
					props.maxLength = 11;
				}
				else if (this.state.data.currency == 'GBP') {
					props.placeholder = '6 digit bank sorting code';
					props.maxLength = 6;
				}
			}
		}
		else if (country == 'ES') {
			if (field == 'account_num') {
				props.placeholder = '24 character IBAN (ES + 22 digits)';
				props.maxLength = 24;
			}
			else if (field == 'routing_num') {
				props.placeholder = '8-11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'CA') {
			if (field == 'account_num') {
				props.placeholder = '12 digit IBAN number';
				props.maxLength = 12;
			}
			else if (field == 'routing_num') {
				props.placeholder = '5 digit transit number';
				props.maxLength = 5;
			}
		} else if (country == 'AU') {
			if (field == 'account_num') {
				props.placeholder = '9 digit account number';
				props.maxLength = 9;
			} else if (field == 'routing_num') {
				props.placeholder = '3 digit branch number';
				props.maxLength = 3;
			}
		}
		else if (country == 'IT') {
			if (field == 'account_num') {
				props.placeholder = `${country} + 2 check digits + 1 capital letter + 10 digits + 12 alphanumeric`;
				props.maxLength = 27;
			}
			else if (field == 'routing_num') {
				props.placeholder = 'SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'PT') {
			if (field == 'account_num') {
				props.placeholder = 'PT + 23 digits';
				props.maxLength = 25;
			}
			else if (field == 'routing_num') {
				props.placeholder = 'SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'CN') {
			if (field == 'account_num') {
				props.placeholder = '6 to 32 digit bank account number';
				props.maxLength = 32;
			}
			if (field == 'national_id') {
				props.placeholder = '15 to 18 digit nationa ID';
				props.maxLength = 18;
			}
		}
		else if (country == 'AR') {
			if (field == 'national_id') {
				props.placeholder = '11 digit CUL';
				props.maxLength = 11;
			}
			else if (field == 'account_num') {
				props.placeholder = '22 digit CBU';
				props.maxLength = 22;
			}
		}
		else if (country == 'SG') {
			if (field == 'account_num') {
				props.placeholder = '5 to 14 digit bank account number';
				props.maxLength = 14;
			}
			else if (field == 'bank_code') {
				props.placeholder = '4 digit bank code';
				props.maxLength = 4;
			}
			else if (field == 'routing_num') {
				props.placeholder = '3 digit branch code';
				props.maxLength = 3;
			}
		}
		else if (country == 'JP') {
			if (field == 'account_num') {
				props.placeholder = '6 to 7 digit bank account number';
				props.maxLength = 14;
			}
			else if (field == 'bank_code') {
				props.placeholder = '4 digit bank code';
				props.maxLength = 4;
			}
			else if (field == 'routing_num') {
				props.placeholder = '3 digit branch code';
				props.maxLength = 3;
			}
		}
		else if (country == 'AT') {
			if (field == 'account_num') {
				props.placeholder = '20 character IBAN (AT + 18 digits)';
				props.maxLength = 20;
			}
			else if (field == 'routing_num') {
				props.placeholder = '8 or 11 character SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'CH') {
			if (field == 'account_num') {
				props.placeholder = '21 character IBAN (CH + 2 check digits + 5 digits + 12 alphanumeric)';
				props.maxLength = 21;
			}
			else if (field == 'routing_num') {
				props.placeholder = '8 or 11 character SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'BE') {
			if (field == 'account_num') {
				props.placeholder = '16 character IBAN (BE + 14 digits)';
				props.maxLength = 20;
			}
			else if (field == 'routing_num') {
				props.placeholder = '8 or 11 character SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'BR') {
			if (field == 'account_num') {
				props.placeholder = '4 to 13 digit account number';
				props.maxLength = 20;
			}
			if (field == 'routing_num') {
				props.placeholder = 'Branch code';
			}
			if (field == 'national_id') {
				props.placeholder = '11 digit CPF';
				props.maxLength = 11;
			}
			else if (field == 'bank_code') {
				props.placeholder = '3 digit bank code';
				props.maxLength = 3;
			}
		}
		else if (country == 'CZ') {
			if (field == 'account_num') {
				props.placeholder = '24 character IBAN (CZ + 2 check digits + 20 digits)';
				props.maxLength = 24;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'DK') {
			if (field == 'routing_num') {
				props.placeholder = '4 digit registration number';
				props.maxLength = 24;
			}
			if (field == 'account_num') {
				props.placeholder = 'Bank account number';
			}
		}
		else if (country == 'FR') {
			if (field == 'account_num') {
				props.placeholder = '27 character IBAN (FR + 2 check digits + 10 digits + 11 alphanumeric + 2 digits)';
				props.maxLength = 27;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'DE') {
			if (field == 'account_num') {
				props.placeholder = '22 character IBAN (DE + 20 digits)';
				props.maxLength = 24;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'GR') {
			if (field == 'account_num') {
				props.placeholder = '27 character IBAN (GR + 2 check digits + 7 digits + 16 alphanumeric)';
				props.maxLength = 27;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'HU') {
			if (field == 'account_num') {
				props.placeholder = '28 character IBAN (HU + 2 check digits + 24 digits)';
				props.maxLength = 28;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'MX') {
			if (field == 'account_num') {
				props.placeholder = '18 digit CLABE number';
				props.maxLength = 18;
			}
		}
		else if (country == 'NL') {
			if (field == 'account_num') {
				props.placeholder = '18 character IBAN (NL + 2 check digits + 4 capital letters + 10 digits)';
				props.maxLength = 18;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'NO') {
			if (field == 'account_num') {
				props.placeholder = '15 character IBAN (NO + 2 check digits + 11 digits)';
				props.maxLength = 15;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'PL') {
			if (field == 'account_num') {
				props.placeholder = 'Poland	28 character IBAN (PL + 26 digits)';
				props.maxLength = 28;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'RO') {
			if (field == 'account_num') {
				props.placeholder = '24 character IBAN (RO + 2 check digits + 4 capital letters + 16 alphanumeric)';
				props.maxLength = 24;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'SE') {
			if (field == 'account_num') {
				props.placeholder = '24 character IBAN (SE + 2 check digits + 20 digits)';
				props.maxLength = 24;
			}
			if (field == 'routing_num') {
				props.placeholder = '8 or 11 digit SWIFT code';
				props.maxLength = 11;
			}
		}
		else if (country == 'CO') {
			if (field == 'routing_num') {
				props.placeholder = '3 digit bank code';
				props.maxLength = 3;
			}
			if (field == 'account_num') {
				props.placeholder = '3 to 25 digit bank account number';
				props.maxLength = 25;
			}
			if (field == 'national_id') {
				props.placeholder = 'Passport, National ID Card or ID for Foreigners number';
				props.maxLength = 10;
			}
		}
		else if (country == 'IL') {
			if (field == 'routing_num') {
				props.placeholder = '3 digit branch code';
				props.maxLength = 3;
			}
			if (field == 'account_num') {
				props.placeholder = 'Bank account number';
			}
			if (field == 'bank_code') {
				props.placeholder = '2 digit bank code';
				props.maxLength = 2;
			}
			if (field == 'national_id') {
				props.placeholder = '9 digit business registration number or government ID';
				props.maxLength = 9;
			}
		}
		else if (country == 'NZ') {
			if (field == 'routing_num') {
				props.placeholder = '4 digit branch code';
				props.maxLength = 4;
			}
			if (field == 'account_num') {
				props.placeholder = 'Bank account number';
			}
			if (field == 'bank_code') {
				props.placeholder = '2 digit bank code';
				props.maxLength = 2;
			}
		}
		else {
			// treat as SEPA
			if (field == 'account_num') {
				props.placeholder = '16-28 digit IBAN number';
				props.maxLength = 28;
			}
			else if (field == 'routing_num') {
				props.placeholder = 'BIC code';
			}
			else if (field == 'bank_code') {
				props.placeholder = '3 digit bank code';
				props.maxLength = 3;
			}
		}

		return props;
	},

	render: function() {
		const country = this.state.data.country || this.props.defaultCountry;
		var accountNumProps = this.getFieldProps('account_num');
		var routingNumProps = this.getFieldProps('routing_num');
		var bankNumProps = this.getFieldProps('bank_code');
		var nationalIdProps = this.getFieldProps('national_id');
		var buttons;

		if (this.state.processing) {
			buttons = <button type="button"><i className="fa fa-spin fa-spinner" />{Locale.getString('message.processing-please-wait', 'Processing, please wait')}...</button>;
		}
		else {
			buttons = (
				<span>
					<button type="button" onClick={this.props.onClose}>{Locale.getString('button.cancel', 'Cancel')}</button>
					<button type="button" onClick={this.handleBankAccountSave} style={{color: '#fff', backgroundColor: _.color(this.props.primaryBrandColor)}}>{Locale.getString('button.save', 'Save')}</button>
				</span>
			);
		}

		var sortingTitle = Locale.getString('label.routing-number', 'Routing Number');
		if (this.state.data.country == 'CA') {
			sortingTitle = Locale.getString('label.transit-number', 'Transit Number');
		} else if (this.state.data.country == 'AU') {
			sortingTitle = Locale.getString('label.bsb-number', 'Branch Number');
		}

		return (
			<Dialog title={Locale.getString('title.bank-account', 'Bank Account')} width="500" bottom="20" onClose={this.props.onClose} buttons={buttons}>
				<div className="row">
					<dl className="form dialog col-md-12">
						<dt>{Locale.getString('label.country', 'Country')}</dt>
						<dd>
							<select name="country" value={this.state.data.country} onChange={this.handleChange}>
								<option value="">{Locale.getString('title.select-country', 'Select Country')}</option>
								{_.map(this.props.countries, function(country) {
									return <option key={country.code} value={country.code}>{country.name}</option>;
								})}
							</select>
							<ErrorDisplay message={this.state.errors.country} />
						</dd>

						<dt>{Locale.getString('label.bank-name', 'Bank Name')}</dt>
						<dd>
							<input name="bank_name" type="text" onChange={this.handleChange} />
							<ErrorDisplay message={this.state.errors.bank_name} />
						</dd>

						{country == 'CO' && 
							<div>
								<dt>{Locale.getString('label.government-id-type', 'Government ID Type')}</dt>
								<dd>
									<select name="government_id_type" onChange={this.handleChange} value={this.state.data.government_id_type} >
										{_.map([{ id: 'NATIONAL_ID_CARD', name: 'National ID Card' }, { id: 'PASSPORT', name: 'Passport' }, { id: 'FOREIGNER_ID_CARD', name: 'Foreigner ID Card' }], function(type) {
											return <option key={type.id} value={type.id}>{type.name}</option>;
										})}
									</select>
								</dd>
							</div>
						}	

						{(country == 'BR' || country == 'AR' || country == 'CN' || country == 'CO' || country == 'IL') && 
							<div>
								<dt>{Locale.getString('label.government-id', 'Government ID')}</dt>
								<dd>
									<input name="national_id" type="text" onChange={this.handleChange} {...nationalIdProps}/>
									<ErrorDisplay message={this.state.errors.national_id} />
								</dd>
							</div>
						}

						{country == 'CN' && 
							<div>
								<dt>{Locale.getString('label.branch-name', 'Branch Name')}</dt>
								<dd>
									<input name="branch_name" type="text" onChange={this.handleChange} />
									<ErrorDisplay message={this.state.errors.branch_name} />
								</dd>

								<dt>{Locale.getString('label.branch-city', 'Branch City')}</dt>
								<dd>
									<input name="branch_city" type="text" onChange={this.handleChange} />
									<ErrorDisplay message={this.state.errors.branch_city} />
								</dd>

								<dt>{Locale.getString('label.branch-state-province', 'Branch State Province')}</dt>
								<dd>
									<input name="branch_state_province" type="text" onChange={this.handleChange} />
									<ErrorDisplay message={this.state.errors.branch_state_province} />
								</dd>
							</div>
						}

						<dt>{Locale.getString('label.account-number', 'Account Number')}</dt>
						<dd>
							<input {...accountNumProps} name="account_num" type="text" onChange={this.handleChange} />
							<ErrorDisplay message={this.state.errors.account_num} />
						</dd>

						<dt>{Locale.getString('title.retype-account-number', 'Re-Type Account Number')}</dt>
						<dd>
							<input name="_account_num" type="text" onChange={this.handleChange} />
							<ErrorDisplay message={this.state.errors._account_num} />
						</dd>

						{(country != 'CN' && country != 'MX' ) &&
						<div>
							<dt>{sortingTitle}</dt>
							<dd>
								<input {...routingNumProps} name="routing_num" type="text" onChange={this.handleChange} />
								<ErrorDisplay message={this.state.errors.routing_num} />
							</dd>
						</div>
						}

						{(country == 'CA' || country == 'AU' || country == 'SG' || country == 'IL' || country == 'NZ' || country == 'BR' || country == 'JP') &&
						<div>	
							<dt>{Locale.getString('label.bank-code', 'Bank Code')}</dt>
							<dd>
								<input {...bankNumProps} name="bank_code" type="text" onChange={this.handleChange} />
								<ErrorDisplay message={this.state.errors.bank_code} />
							</dd>
						</div>}

						<dt>{Locale.getString('label.bank-currency', 'Bank Currency')}</dt>
						<dd>
							<select name="currency" onChange={this.handleChange} value={this.state.data.currency} >
								<option value="">{Locale.getString('label.currency', 'Currency')}</option>
								{_.map(this.state.currencies, function(currency) {
									return <option key={currency.id} value={currency.code}>{currency.code} - {currency.name}</option>;
								})}
							</select>
							<ErrorDisplay message={this.state.errors.currency} />
							<ErrorDisplay message={this.state.errors.generic} />
						</dd>
					</dl>
				</div>
			</Dialog>
		)
	},
});
