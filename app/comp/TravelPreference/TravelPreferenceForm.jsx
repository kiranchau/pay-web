const {Locale} = RTBundle;

var TravelPreferenceForm = React.createClass({
    getDefaultProps: function() {
		return {
			data: {},
			errors: {},
			patientData: {},
			collapsibleContainerKey: 'travelPrefCollapsibleContainerKey-'
		};
	},

	getInitialState: function() {
		sectionData = [];
		sectionData[0] = true;
		for(let i = 1; i < 4; i++) {
			sectionData[i] = false;
		}

		return {
			countries: [],
			states: [],
			data: this.props.data,
			flight_time_pref: [],
			flight_seat_pref: [],
			sections: sectionData,
			defaultCountry: 'US',
		};
	},

	componentDidMount: function() {
		let data = {...this.state.data};
		if (!data.address_same_patient) {
			data.address_same_patient = 0;
		}

		if (!data.patient_id) {
			data.patient_id = this.props.patientData.id;
		}

		if (!data.country) {
			data.country = this.state.defaultCountry;
		}

		if (!data.car_pickup_country) {
			data.car_pickup_country = this.state.defaultCountry;
		}

		if (!data.car_dropoff_country) {
			data.car_dropoff_country = this.state.defaultCountry;
		}

		const key = `travel_pref_${data.patient_id}_sections`;
		let sectionData = JSON.parse(sessionStorage.getItem(key));
		if (!sectionData) {
			sectionData = this.state.sections;
			sessionStorage.setItem(key, JSON.stringify(sectionData));
		}
		this.setState({sections: sectionData, data}, () => {Object.assign(this.props.data, this.state.data);});

		$.get(_.endpoint('/settings?ver=2'), function(res) {
			const data = {...this.state.data};
			const enableOus = parseInt(res.enable_ous) === 1 ? true : false;
			if (!enableOus) {
				data.country = 'US';
			}
			this.setState({
				countries: res.countries,
				states: res.states,
				enable_ous: enableOus,
				data,
			}, () => {Object.assign(this.props.data, this.state.data)});
		}.bind(this));

		$.get(_.endpoint('/flight-time-pref'), function(res) {
			this.setState({
				flight_time_pref: res.records,
			});
		}.bind(this));

		$.get(_.endpoint('/flight-seat-pref'), function(res) {
			this.setState({
				flight_seat_pref: res.records,
			});
		}.bind(this));
	},

	componentWillReceiveProps(nextProps) {
		if(JSON.stringify(this.state.data) !== JSON.stringify(nextProps.data)){
			setTimeout(() => {
				this.setState({data: Object.assign({}, this.state.data, nextProps.data)});
			}, 50);
		}
	},

	setField: function(key, val) {
		let data = {...this.state.data};
		data[key] = val;
		this.setState({
			data,
		}, () => { Object.assign(this.props.data, this.state.data);}); //OUT property
	},

	handleChange: function(e) {
		this.setField(e.target.name, e.target.value);
	},

	handleChecked: function(e) {
		this.setField(e.target.name, e.target.checked ? 1 : 0);
	},

	handleSectionClick: function(section, e) {

		const key = `travel_pref_${this.state.data.patient_id}_sections`;
		const data = JSON.parse(sessionStorage.getItem(key));

		if (!data[section] == true) {
			const element = document.getElementById(`${this.props.collapsibleContainerKey}${section}`);
			_.defer(()=> {element.scrollIntoView()});
		}
		
		data[section] = !data[section];
		sessionStorage.setItem(key, JSON.stringify(data));
		this.setState({sections: data});
	},

	handleAddressSameAsPatient: function(e) {

		const isSame = e.target.checked;
	
		let data = {...this.state.data};
		data[e.target.name] = isSame ? 1 : 0	
		if (isSame) {
			const address = {
				country: this.state.defaultCountry,
				address: '', 
				address2: '',
				city: '',
				state: '',
				zipcode: ''
			}
	
			Object.assign(data, address);
		}
		
		this.setState({data}, () => { Object.assign(this.props.data, this.state.data);}); //OUT property
	},

	handlePDF: function() {

		if (!this.state.data.id) {
			return alert(Locale.getString('alert.save-before-downloading', 'Please save travel preference before downloading a pdf.'));
		} 

		window.open(_.endpoint(`/patients/${this.state.data.patient_id}/travelpreference/pdf`, '_blank'));
	},

	render: function() {

		const shouldShowProvince = (country) => {
			var country = _.find(this.state.countries, function(o) {
				return o.code == country;
			}, this);
			if (country && country.state_enabled == 0) {
				return false;
			}
			return true;
		} 

		const shouldShowPostalCode = (country) => {
			var country = _.find(this.state.countries, function(o) {
				return o.code == country;
			}, this);
			if (country && country.zipcode_enabled == 0) {
				return false;
			}
			return true;
		} 

		const defaultCountry = this.state.data.address_same_patient == 1 ? this.props.patientData.country : this.state.data.country;
		const showStateDropdown = defaultCountry && !_.isUndefined(this.state.states[defaultCountry]);

		const { 
			address, address2, city, state, zipcode,
			car_pickup_country, car_pickup_address, car_pickup_address2, car_pickup_city, car_pickup_state, car_pickup_zipcode,
			car_dropoff_country, car_dropoff_address, car_dropoff_address2, car_dropoff_city, car_dropoff_state, car_dropoff_zipcode} = this.state.data;
			
		const address_same_patient = this.state.data.address_same_patient == 1 ? true : false;

		const showPickUpStateDropdown = car_pickup_country && !_.isUndefined(this.state.states[car_pickup_country]);
		const showDropOffStateDropdown = car_dropoff_country && !_.isUndefined(this.state.states[car_dropoff_country]);

		let showProvince = true;
		let showPostalCode = true;		

		if (this.state.data.country) {
			showProvince = shouldShowProvince(this.state.data.country);
			showPostalCode = shouldShowPostalCode(this.state.data.country);
		}
		const locationAND = !([showProvince, showPostalCode].includes(false));

		let showCarPickupProvince = true;
		let showCarPickupPostalCode = true;
		if (car_pickup_country) {
			showCarPickupProvince = shouldShowProvince(car_pickup_country);
			showCarPickupPostalCode = shouldShowPostalCode(car_pickup_country);
		}
		const carPickupLocationAND = !([showCarPickupProvince, showCarPickupPostalCode].includes(false));

		let showCarDropffProvince = true;
		let showCarDropffPostalCode = true;
		if (car_dropoff_country) {
			showCarDropffProvince = shouldShowProvince(car_dropoff_country);
			showCarDropffPostalCode = shouldShowPostalCode(car_dropoff_country);
		}
		const carDropOffLocationAND = !([showCarDropffProvince, showCarDropffPostalCode].includes(false));

		const mapSectionToArrowClass = (index, position = 'left') => {
			const sections = this.state.sections
			return 'fa ' + (sections[index] ? 'fa-angle-down' : `fa-angle-${position}`);
		}

		const mapSectionToOpenCloseClass = (index) => {
			const sections = this.state.sections
			return sections[index] ? 'show' : 'hidden';
		}



		return (
			<div className='travel-preference'>
				<p style={{marginTop: 0}}><span style={{fontSize: 14, fontWeight: "bold"}}>{Locale.getString('title.travel-preferences', 'Travel Preferences')}</span> <span style={{cursor: 'pointer'}} onClick={this.handlePDF}><i style={{paddingLeft: 5, fontSize: 14}} className="fa fa-file-pdf-o"></i></span> </p> 

				{/* Caregiver Contact Information */}
				<div id={`${this.props.collapsibleContainerKey}${0}`}>
					<div className="collapsible" onClick={this.handleSectionClick.bind(null, 0)}>
						<i className={mapSectionToArrowClass(0, 'right')} style={{backgroundColor: _.primaryBrandColor()}}></i>
						<strong>{Locale.getString('title.travel-preferences', 'Travel Preferences')}</strong>
						<i className={mapSectionToArrowClass(0)} style={{float: 'right', backgroundColor: _.primaryBrandColor()}}></i>
					</div>
					<div className={"form dialog row " + mapSectionToOpenCloseClass(0)}>
					<div className='col-md-6' style={{marginTop: 10}}>
						<div className='row'>
							<div className='col-md-5'>
								<dt className='label'>{Locale.getString('label.first-name', 'First Name')}</dt>
								<dd>
									<input name="firstname" type="text" value={this.state.data.firstname} onChange={this.handleChange}/>
								</dd>
							</div>
							<div className='col-md-5'>
								<dt className='label'>{Locale.getString('label.middle-initial', 'MI')}</dt>
								<dd>
									<input name="middle" type="text" maxLength={1} value={this.state.data.middle} onChange={this.handleChange}/>
								</dd>
							</div>
							<div className='col-md-5'>
								<dt className='label'>{Locale.getString('label.last-name', 'Last Name')}</dt>
								<dd>
									<input name="lastname" type="text" value={this.state.data.lastname} onChange={this.handleChange}/>
								</dd>
							</div>
						</div>
						
						<div className='row'>
							<div className='col-md-5'>
								<dt>{Locale.getString('label.date-of-birth', 'Date of Birth')}</dt>
								<dd>
									<ClinicalDatePicker 
										dateFormatClinical={this.props.dateFormatClinical}
										value={this.state.data.dob && moment(this.state.data.dob).isValid() ? moment(this.state.data.dob).format('YYYY-MM-DD') : ''}
										maxDate={moment().subtract(13, 'year').format('YYYY-MM-DD')}
										changeYear={true}
										showPickerIcon={true}
										style={{width: '100%'}}
										yearRange="c-70:c+10"
										onChange={this.setField.bind(null, 'dob')}
										/>
								</dd>
							</div>
						</div>

						<dt>{Locale.getString('title.email', 'Email')}</dt>
						<dd>
							<input name="emailaddress" type="email" value={this.state.data.emailaddress} onChange={this.handleChange} />
							{this.props.errors.emailaddress &&
							<div className="error">{this.props.errors.emailaddress}</div>}
						</dd>
					
						<dt>{Locale.getString('label.mobile-phone', 'Mobile Phone Number')}</dt>
						<dd>
							<input name="phone_mobile" type="number" value={this.state.data.phone_mobile} onChange={this.handleChange} />
						</dd>
				
						<dt>{Locale.getString('label.home-phone', 'Home Phone Number')}</dt>
						<dd>
							<input name="phone_home" type="number" value={this.state.data.phone_home} onChange={this.handleChange} />
						</dd>
					</div>
					<div className='col-md-6 left-border--md' style={{marginTop: 10, marginBottom: 10}}>
						<div style={{height: 54}}>
						<label style={{cursor: 'pointer', marginTop: 20}}>
							<input name="address_same_patient" type="checkbox" value="1" onChange={this.handleAddressSameAsPatient} checked={parseInt(this.state.data.address_same_patient) == 1} />
								&nbsp;{Locale.getString('label.same-address-as-patient', 'Same Address as Patient')}:
						</label></div>
						
						{this.state.enable_ous &&
						<div>
							<dt>{Locale.getString('label.country', 'Country')}</dt>
							<dd>
								<select name="country" disabled={address_same_patient} value={address_same_patient ? this.props.patientData.country : this.state.data.country} onChange={this.handleChange}>
									<option value="">{Locale.getString('title.select-country', 'Select Country')}...</option>
									{_.map(this.state.countries, function(country) {
										return <option key={country.code} value={country.code}>{country.name}</option>;
									}, this)}
								</select>
							</dd>
						</div>}
						<dt>{Locale.getString('label.address', 'Address')} 1</dt>
						<dd>
							<input name="address" type="text" disabled={address_same_patient} value={address_same_patient ? this.props.patientData.address : address} onChange={this.handleChange} maxLength="100" />
						</dd>
						
						<dt>{Locale.getString('label.address', 'Address')} 2</dt>
						<dd>
							<input name="address2" type="text" disabled={address_same_patient} value={address_same_patient ? this.props.patientData.address2 : address2} onChange={this.handleChange} maxLength="100" />
						</dd>

						<dt>{Locale.getString('label.city', 'City')}</dt>
						<dd>
							<input name="city" type="text" disabled={address_same_patient} value={address_same_patient ? this.props.patientData.city : city} onChange={this.handleChange} maxLength="50" />
						</dd>

						<div className='row'>
							
							{showProvince &&
							<div className={ locationAND ? 'col-xs-6' : showProvince ? 'col-xs-12' : ''}>
								<dt>{Locale.getString('label.state-region-province', 'State / Region / Province')}</dt>
								<dd>
									{showStateDropdown &&
									<select name="state" disabled={address_same_patient} value={address_same_patient ? this.props.patientData.state : state} onChange={this.handleChange}>
										<option value="">{Locale.getString('option.select', 'Select')}...</option>
										{_.map(this.state.states[defaultCountry], function(name, abbr) {
											return <option key={abbr} value={abbr}>{name}</option>;
										})}
									</select>}

									{!showStateDropdown &&
									<input name="state" type="text" disabled={address_same_patient} value={address_same_patient ? this.props.patientData.state : state} onChange={this.handleChange} />}
								</dd>
							</div>
							}

							{showPostalCode &&
							<div className={ locationAND ? 'col-xs-6' : showPostalCode ? 'col-xs-12' : ''}>
								<dt>{Locale.getString('label.postal-code', 'Postal Code')}</dt>
								<dd>
									<input name="zipcode" type="text" disabled={address_same_patient} value={address_same_patient ? this.props.patientData.zipcode : zipcode} onChange={this.handleChange} />
								</dd>
							</div>
							}
						</div>


						
					</div>
				</div>
				</div>
				
				{/* Car Service */}
				<div id={`${this.props.collapsibleContainerKey}${1}`}>
					<div className="collapsible" onClick={this.handleSectionClick.bind(null, 1)}>
						<i className={mapSectionToArrowClass(1, 'right')} style={{backgroundColor: _.primaryBrandColor()}}></i>
						<strong>{Locale.getString('label.car-service', 'Car Service')}</strong>
						<i className={mapSectionToArrowClass(1)} style={{float: 'right', backgroundColor: _.primaryBrandColor()}}></i>
					</div>
					<div className={"form dialog row " + mapSectionToOpenCloseClass(1)} style={{paddingTop: 10}} >
						<div className='col-md-6'>
							<p style={{marginTop: 0, fontSize: 14, fontWeight: "bold"}}>{Locale.getString('label.pick-up-location', 'Pick up Location')}</p>
							{this.state.enable_ous &&
							<div>
								<dt>{Locale.getString('label.country', 'Country')}</dt>
								<dd>
									<select name="car_pickup_country" value={car_pickup_country} onChange={this.handleChange}>
										<option value="">{Locale.getString('title.select-country', 'Select Country')}...</option>
										{_.map(this.state.countries, function(country) {
											return <option key={country.code} value={country.code}>{country.name}</option>;
										}, this)}
									</select>
								</dd>
							</div>}
							<dt>{Locale.getString('label.company-address', 'Company Address')} 1</dt>
							<dd>
								<input name="car_pickup_address" type="text" value={car_pickup_address} onChange={this.handleChange} maxLength="100" />
							</dd>
							
							<dt>{Locale.getString('label.company-address', 'Company Address')} 2</dt>
							<dd>
								<input name="car_pickup_address2" type="text" value={car_pickup_address2} onChange={this.handleChange} maxLength="100" />
							</dd>
							<dt>{Locale.getString('label.city', 'City')}</dt>
							<dd>
								<input name="car_pickup_city" type="text" value={car_pickup_city} onChange={this.handleChange} maxLength="50" />
							</dd>
							<div className='row'>
								{showCarPickupProvince &&
								<div className={ carPickupLocationAND ? 'col-xs-6' : showCarPickupProvince ? 'col-xs-12' : ''}>
									<dt>{Locale.getString('label.state-region-province', 'State / Region / Province')}</dt>
									<dd>
										{showPickUpStateDropdown &&
										<select name="car_pickup_state" value={car_pickup_state} onChange={this.handleChange}>
											<option value="">{Locale.getString('option.select', 'Select')}...</option>
											{_.map(this.state.states[car_pickup_country], function(name, abbr) {
												return <option key={abbr} value={abbr}>{name}</option>;
											})}
										</select>}

										{!showPickUpStateDropdown &&
										<input name="car_pickup_state" type="text" value={car_pickup_state} onChange={this.handleChange} />}
									</dd>
								</div>
								}
								{showCarPickupPostalCode &&
								<div className={ carPickupLocationAND ? 'col-xs-6' : showCarPickupPostalCode ? 'col-xs-12' : '' }>
									<dt>{Locale.getString('label.postal-code', 'Postal Code')}</dt>
									<dd>
										<input name="car_pickup_zipcode" type="text" value={car_pickup_zipcode} onChange={this.handleChange} />
									</dd>
								</div>
							}
							</div>
							

							<dt>{Locale.getString('label.special-accommodations', 'Special Accommodations')}:</dt>
							<dd>
								<textarea rows='3' name="car_pickup_accommodations" type="text" value={this.state.data.car_pickup_accommodations} onChange={this.handleChange}/>
							</dd>

						</div>

						<div style={{width: 1, height: 385, background: '#d4d4d4', float: 'left'}} className='visible-md visible-lg'></div>

						<div className='col-md-6 width--md' style={{marginBottom: 10}}>
							<p style={{marginTop: 0, fontSize: 14, fontWeight: "bold"}}>{Locale.getString('label.drop-off-location', 'Drop off Location')}.</p>
							{this.state.enable_ous &&
							<div>
								<dt>{Locale.getString('label.country', 'Country')}</dt>
								<dd>
									<select name="car_dropoff_country" value={car_dropoff_country} onChange={this.handleChange}>
										<option value="">{Locale.getString('title.select-country', 'Select Country')}...</option>
										{_.map(this.state.countries, function(country) {
											return <option key={country.code} value={country.code}>{country.name}</option>;
										}, this)}
									</select>
								</dd>
							</div>}
							<dt>{Locale.getString('label.company-address', 'Company Address')} 1</dt>
							<dd>
								<input name="car_dropoff_address" type="text" value={car_dropoff_address} onChange={this.handleChange} maxLength="100" />
							</dd>
							
							<dt>{Locale.getString('label.company-address', 'Company Address')} 2</dt>
							<dd>
								<input name="car_dropoff_address2" type="text" value={car_dropoff_address2} onChange={this.handleChange} maxLength="100" />
							</dd>
							
							<dt>{Locale.getString('label.city', 'City')}</dt>
							<dd>
								<input name="car_dropoff_city" type="text" value={car_dropoff_city} onChange={this.handleChange} maxLength="50" />
							</dd>

							<div className='row'>
								{showCarDropffProvince &&
								<div className={ carDropOffLocationAND ? 'col-xs-6' : showCarDropffProvince ? 'col-xs-12' : '' }>
									<dt>{Locale.getString('label.state-region-province', 'State / Region / Province')}</dt>
									<dd>
										{showDropOffStateDropdown &&
										<select name="car_dropoff_state" value={car_dropoff_state} onChange={this.handleChange}>
											<option value="">{Locale.getString('option.select', 'Select')}...</option>
											{_.map(this.state.states[car_dropoff_country], function(name, abbr) {
												return <option key={abbr} value={abbr}>{name}</option>;
											})}
										</select>}

										{!showDropOffStateDropdown &&
										<input name="car_dropoff_state" type="text" value={car_dropoff_state} onChange={this.handleChange} />}
									</dd>
								</div>
								}
								{showCarDropffPostalCode &&
								<div className={ carDropOffLocationAND ? 'col-xs-6' : showCarDropffPostalCode ? 'col-xs-12' : '' }>
									<dt>{Locale.getString('label.postal-code', 'Postal Code')}</dt>
									<dd>
										<input name="car_dropoff_zipcode" type="text" value={car_dropoff_zipcode} onChange={this.handleChange} />
									</dd>
								</div>
								}
							</div>
							

							<dt>{Locale.getString('label.special-accommodations', 'Special Accommodations')}:</dt>
							<dd>
								<textarea rows='3' name="car_dropoff_accommodations" type="text" value={this.state.data.car_dropoff_accommodations} onChange={this.handleChange}/>
							</dd>

						</div>
						
					</div>
				</div>
				
				{/* Airline */}
				<div id={`${this.props.collapsibleContainerKey}${2}`}>
					<div className="collapsible" onClick={this.handleSectionClick.bind(null, 2)}>
						<i className={mapSectionToArrowClass(2, 'right')} style={{backgroundColor: _.primaryBrandColor()}}></i>
						<strong>{Locale.getString('label.airline-reservations', 'Airline Reservations')}</strong>
						<i className={mapSectionToArrowClass(2)} style={{float: 'right', backgroundColor: _.primaryBrandColor()}}></i>
					</div>
					<div className={"form dialog row " + mapSectionToOpenCloseClass(2)} style={{paddingTop: 10, marginBottom: 10}}>
					<p style={{marginTop: 0, fontSize: 14, fontWeight: "bold",paddingLeft: 16}}>{Locale.getString('title.flight-time-preference', 'Flight Time Preference')}:</p>
					<div className='col-md-4'>
						<dt>{Locale.getString('label.first-choice', '1st Choice')}:</dt>
						<dd>
							<select name="flight_time1" value={this.state.data.flight_time1} onChange={this.handleChange}>
								<option value="">{Locale.getString('option.select-time', 'Select Time')}...</option>
								{_.map(this.state.flight_time_pref, function(time) {
									if (time.id == this.state.data.flight_time2 || time.id == this.state.data.flight_time3) return;
									return <option key={time.id} value={time.id}>{time.name}</option>;
								}, this)}
							</select>
						</dd>
						<dt>{Locale.getString('label.second-choice', '2nd Choice')}:</dt>
						<dd>
							<select name="flight_time2" value={this.state.data.flight_time2} onChange={this.handleChange}>
								<option value="">{Locale.getString('option.select-time', 'Select Time')}...</option>
								{_.map(this.state.flight_time_pref, function(time) {
									if (time.id == this.state.data.flight_time1 || time.id == this.state.data.flight_time3) return;
									return <option key={time.id} value={time.id}>{time.name}</option>;
								}, this)}
							</select>
						</dd>
						<dt>{Locale.getString('label.third-choice', '3rd Choice')}:</dt>
						<dd>
							<select name="flight_time3" value={this.state.data.flight_time3} onChange={this.handleChange}>
								<option value="">{Locale.getString('option.select-time', 'Select Time')}...</option>
								{_.map(this.state.flight_time_pref, function(time) {
									if (time.id == this.state.data.flight_time1 || time.id == this.state.data.flight_time2) return;
									return <option key={time.id} value={time.id}>{time.name}</option>;
								}, this)}
							</select>
						</dd>
					</div>
					<div className='col-md-4 left-border--md right-border--md'>
						<div>

							<dt>{Locale.getString('label.airline-preference', 'Airline Preference')}:</dt>
								<dd>
									<input name="flight_airline" type="text" value={this.state.data.flight_airline} onChange={this.handleChange} />
								</dd>
							</div>
							<div className='col-xs-6' style={{paddingLeft: 0}}>
								
							<div className='col-xs-6' style={{paddingRight: 0}}>
								
							</div>
						</div>
						
						<dt>{Locale.getString('label.seating-preference', 'Seating Preference')}:</dt>
						<dd>
							<select name="flight_seat" value={this.state.data.flight_seat} onChange={this.handleChange}>
								<option value="0">{Locale.getString('option.select-seat', 'Select Seat')}...</option>
								{_.map(this.state.flight_seat_pref, function(seat) {
									return <option key={seat.id} value={seat.id}>{seat.name}</option>;
								}, this)}
							</select>
						</dd>
						
						<dt>{Locale.getString('label.airport-preference', 'Airport Preference')}:</dt>
						<dd>
							<input name="flight_airport" type="text" value={this.state.data.flight_airport} onChange={this.handleChange} />
						</dd>
					</div>
					<div className='col-md-4'>
						<dt>{Locale.getString('label.frequent-flyer', 'Frequent Flyer #')} {`(${Locale.getString('label.if-applicable', 'If Applicable')}):`}</dt>
						<dd>
							<input name="flight_frequent_flyer" type="text" value={this.state.data.flight_frequent_flyer} onChange={this.handleChange} />
						</dd>

						<dt>{Locale.getString('label.transportation-to-from-airport', 'Transportation to/from airport')}:</dt>
						<dd>
							<select name="flight_has_trans" value={this.state.data.flight_has_trans} onChange={this.handleChange}>
								<option value="0">{Locale.getString('option.select-transport', 'Select Transportation')}...</option>
								<option value="1">{Locale.getString('option.no', 'NO')}</option>
								<option value="2">{Locale.getString('option.yes', 'Yes')}</option>
							</select>
						</dd>
						<dt>{Locale.getString('label.special-accommodations', 'Special Accommodations')}:</dt>
						<dd>
							<textarea rows='3' name="flight_accommodations" type="text" value={this.state.data.flight_accommodations} onChange={this.handleChange}/>
						</dd>
					</div>
				</div>
				</div>
				
				{/* Hotel */}
				<div id={`${this.props.collapsibleContainerKey}${3}`}>
					<div className="collapsible" onClick={this.handleSectionClick.bind(null, 3)}>
						<i className={mapSectionToArrowClass(3, 'right')} style={{backgroundColor: _.primaryBrandColor()}}></i>
						<strong>{Locale.getString('label.hotel-reservations', 'Hotel Reservations')}</strong>
						<i className={mapSectionToArrowClass(3)} style={{float: 'right', backgroundColor: _.primaryBrandColor()}}></i>
					</div>
					<div className={"form dialog row " + mapSectionToOpenCloseClass(3)} style={{paddingTop: 10}}>
						<div className='col-md-6'>
							<dt>{Locale.getString('label.hotel-chain-preference', 'Hotel Chain Preference')}:</dt>
							<dd>
								<input name="hotel_chain" type="text" value={this.state.data.hotel_chain} onChange={this.handleChange}/>
							</dd>
						</div>

						<div className='col-md-6 left-border--md'>
							<dt>{Locale.getString('label.room-preference', 'Room Preference')}:</dt>
							<dd>
								<input name="hotel_room" type="text" value={this.state.data.hotel_room} onChange={this.handleChange}/>
							</dd>
						</div>

						<div className='col-md-12'>
						<dt>{Locale.getString('label.special-accommodations', 'Special Accommodations')}:</dt>
							<dd>
								<textarea rows='3' name="hotel_accommodations" type="text" value={this.state.data.hotel_accommodations} onChange={this.handleChange}/>
							</dd>
						</div>
					</div>
				</div>
		
			</div>
		)
	}
});