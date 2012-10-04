document.observe("dom:loaded", function()
{
	// If we have no configuration, do not do anything
	if (typeof PCNLAPI_CONFIG == 'undefined')
		return;

	if (typeof String.prototype.trim !== 'function')
	{
		String.prototype.trim = function()
		{
			return this.replace(/^\s+|\s+$/g, '');
		}
	}

	var PostcodeNl_Api = {
		/**
		 * Hide multiple field-rows in forms
		 */
		hideFields: function (fields)
		{
			fields.each(function (fieldId)
			{
				if ($(fieldId))
				{
					if ($(fieldId).up('li'))
					{
						$(fieldId).up('li').addClassName('pcnl-hidden-field');
					}
					else if ($(fieldId).up('tr'))
					{
						$(fieldId).up('tr').addClassName('pcnl-hidden-field');
					}
				}
			});
		},

		/**
		 * Un-hide multiple field-rows in forms
		 */
		showFields: function (fields)
		{
			fields.each(function (fieldId)
			{
				if ($(fieldId))
				{
					if ($(fieldId).up('li'))
					{
						$(fieldId).up('li').removeClassName('pcnl-hidden-field');
					}
					else if ($(fieldId).up('tr'))
					{
						$(fieldId).up('tr').removeClassName('pcnl-hidden-field');
					}
				}
			});
		},

		/**
		 * Remove all validation messages
		 */
		removeValidationMessages: function (prefix)
		{
			var advice = Validation.getAdvice('invalid-postcode', $(prefix +'postcode_housenumber'));
			if (advice)
			{
				Validation.hideAdvice($(prefix +'postcode_housenumber'), advice, 'invalid-postcode');
			}
			var advice = Validation.getAdvice('invalid-postcode', $(prefix +'postcode_input'));
			if (advice)
			{
				Validation.hideAdvice($(prefix +'postcode_input'), advice, 'invalid-postcode');
			}
			if ($(prefix +'postcode_housenumber_addition'))
			{
				var additionAdvice = Validation.getAdvice('invalid-addition', $(prefix +'postcode_housenumber_addition'));
				if (additionAdvice)
				{
					Validation.hideAdvice($(prefix +'postcode_housenumber_addition'), additionAdvice, 'invalid-addition');
				}
			}
		},

		/**
		 * Remove housenumber addition selectbox, and any related elements / classes.
		 */
		removeHousenumberAddition: function (prefix)
		{
			if ($(prefix +'postcode_housenumber_addition'))
			{
				Element.remove($(prefix +'postcode_housenumber_addition'));
				if ($(prefix +'postcode_housenumber_addition:wrapper'))
				{
					Element.remove($(prefix +'postcode_housenumber_addition:wrapper'));
				}
				if ($(prefix + 'postcode_housenumber').up('li'))
				{
					$(prefix + 'postcode_housenumber').up('li').removeClassName('pcnl-with-addition');
				}
			}
		},


		/**
		 * Toggle 'readonly' on multiple fields. Sets class, attribute.
		 */
		setFieldsReadonly: function (fields, readonly)
		{
			fields.each(function (fieldId)
			{
				if ($(fieldId))
				{
					if (readonly)
					{
						if ($(fieldId).nodeName == 'SELECT')
						{
							$(fieldId).disabled = true;
						}
						else
						{
							$(fieldId).setAttribute('readonly', true);
						}
						$(fieldId).addClassName('pcnl-readonly');
						if ($(fieldId).hasClassName('required-entry'))
						{
							$(fieldId).removeClassName('required-entry');
							$(fieldId).addClassName('pcnl-disabled-required-entry');
						}
					}
					else
					{
						if ($(fieldId).nodeName == 'SELECT')
						{
							$(fieldId).disabled = false;
						}
						else
						{
							$(fieldId).removeAttribute('readonly');
						}
						$(fieldId).removeClassName('pcnl-readonly');
						if ($(fieldId).hasClassName('pcnl-disabled-required-entry'))
						{
							$(fieldId).addClassName('required-entry');
							$(fieldId).removeClassName('pcnl-disabled-required-entry');
						}
					}
				}
			});
		},

		/**
		 * Look up the address for a form, validate & enrich target form.
		 */
		lookupPostcode: function (prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4, event)
		{
			var pcnlapi = this;
			if (!$(prefix + 'postcode_housenumber'))
			{
				return;
			}

			var postcode = $(prefix + 'postcode_input').getValue();

			postcode = postcode.replace(/\s+/, '');

			var housenumber_mixed = $(prefix + 'postcode_housenumber').getValue().trim();
			// Number, followed by non alphanumberic chars, and then additional number ("123 A", "123-rood", etc)
			// or: Number, followed directly by a letter and then alphanumeric/space charcters ("123b3", "123berk 23", etc)
			var housenumber_match = housenumber_mixed.match(/^([0-9]+)([^0-9a-zA-Z]+([0-9a-zA-Z ]+)|([a-zA-Z]([0-9a-zA-Z ]*)))?$/);
			var housenumber_addition_select = $(prefix +'postcode_housenumber_addition') ? $(prefix +'postcode_housenumber_addition').getValue() : null;

			var housenumber = housenumber_match ? housenumber_match[1].trim() : '';

			var housenumber_addition = '';

			if (!housenumber_match)
				housenumber_addition = '';
			else if (housenumber_match[3])
				housenumber_addition = housenumber_match[3].trim();
			else if (housenumber_match[4])
				housenumber_addition = housenumber_match[4].trim();

			if (housenumber_addition == '' && housenumber_addition_select != '__none__' && housenumber_addition_select != '__select__' && housenumber_addition_select != null)
				housenumber_addition = housenumber_addition_select;

			if ($(prefix + countryFieldId).getValue() != 'NL' || postcode == '' || housenumber_mixed == '')
				return;

			var url = PCNLAPI_CONFIG.baseUrl +'postcodenl/json/lookup?postcode=' + postcode + '&houseNumber=' + housenumber + '&houseNumberAddition=' + housenumber_addition;
			new Ajax.Request(url,
			{
				method: 'get',
				onComplete: function(transport)
				{
					var json = transport.responseText.evalJSON();

					if (PCNLAPI_CONFIG.showcase)
					{
						if ($(prefix +'showcase'))
							$(prefix +'showcase').remove();

						var info = '';
						for (var prop in json.showcaseResponse)
						{
							var name = prop.charAt(0).toUpperCase() + prop.slice(1);
							info += '<dt>'+ name.escapeHTML() +'</dt><dd>'+ String(json.showcaseResponse[prop] === null ? '- none -' : json.showcaseResponse[prop]).escapeHTML() +'</dd>';
						}

						var map = '';
						if (json.showcaseResponse.longitude && json.showcaseResponse.latitude)
						{
							map = '<iframe frameborder="0" scrolling="no" marginheight="0" marginwidth="0" class="map" src="http://maps.google.com/maps?t=h&amp;q='+ json.showcaseResponse.latitude +','+ json.showcaseResponse.longitude +'+(Location found)&amp;z=19&amp;output=embed&amp;iwloc=near"></iframe>';
						}

						if ($(prefix + countryFieldId).parentNode.tagName == 'TD')
						{
							// We're probably in the admin
							$(prefix + street1).up('tr').insert({before: '<tr id="' + prefix + 'showcase"><td class="label">'+ PCNLAPI_CONFIG.translations.apiShowcase.escapeHTML() +'</label></td><td class="value"><h4 class="pcnl-showcase">'+ PCNLAPI_CONFIG.translations.apiShowcase +'</h4><dl class="pcnl-showcase">'+ info + '</dl></td></tr>'});
						}
						else
						{
							$(prefix + street1).up('li').insert({before: '<li id="' + prefix +'showcase" class="wide"><div class="input-box"><h4 class="pcnl-showcase">'+ PCNLAPI_CONFIG.translations.apiShowcase.escapeHTML() +'</h4><dl class="pcnl-showcase">'+ map + info + '</dl></div></li>'});
						}
					}

					// Remove any existing error messages
					pcnlapi.removeValidationMessages(prefix);

					if (json.postcode != undefined)
					{
						// Set data from request on form fields
						$(prefix + postcodeFieldId).setValue(json.postcode);
						$(prefix + 'postcode_input').setValue(json.postcode);
						if (PCNLAPI_CONFIG.useStreet2AsHouseNumber && $(prefix + street2))
						{
							$(prefix + street1).setValue((json.street).trim());
							$(prefix + street2).setValue((json.houseNumber +' '+ (json.houseNumberAddition ? json.houseNumberAddition : housenumber_addition)).trim());
						}
						else
						{
							$(prefix + street1).setValue((json.street +' '+ json.houseNumber +' '+ (json.houseNumberAddition ? json.houseNumberAddition : housenumber_addition)).trim());
						}
						$(prefix +'city').setValue(json.city);
						$(prefix +'region').setValue(json.province);
						$(prefix +'postcode_housenumber').setValue(json.houseNumber);

						// Update address result text block
						if ($(prefix + 'postcode_output'))
						{
							pcnlapi.showFields([prefix +'postcode_output']);
							$(prefix + 'postcode_output').update((json.street +' '+ json.houseNumber +' '+ (json.houseNumberAddition ? json.houseNumberAddition : housenumber_addition)).trim() + "<br>" + json.postcode + " " + json.city);
						}

						// Handle all housenumber addition possiblities
						if (json.houseNumberAddition == null && (housenumber_addition_select == housenumber_addition || (housenumber_addition_select == '__none__' && housenumber_addition == '')))
						{
							// Selected housenumber addition is not known, and the select dropdown already contains that value

							var additionSelect = pcnlapi.createPostcodeHouseNumberAddition(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4, json.houseNumberAdditions, housenumber_addition_select);

							// Re-select value if it was selected through the selectbox
							if (event && event.element().id == prefix +'postcode_housenumber_addition')
								additionSelect.setValue(housenumber_addition_select);

							if (additionSelect.getValue() != housenumber_addition_select)
							{
								newAdvice = Validation.createAdvice('invalid-addition', $(prefix +'postcode_housenumber_addition'), false, (housenumber_addition != '' ? PCNLAPI_CONFIG.translations.houseNumberAdditionUnknown.replace('{addition}', housenumber_addition) : PCNLAPI_CONFIG.translations.houseNumberAdditionRequired));
								Validation.showAdvice($(prefix +'postcode_housenumber_addition'), newAdvice, 'invalid-addition');
							}
						}
						else if (json.houseNumberAddition == null)
						{
							// Selected housenumber addition is not known, and the select dropdown does not contain that value

							var additionSelect = pcnlapi.createPostcodeHouseNumberAddition(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4, json.houseNumberAdditions, housenumber_addition);

							newAdvice = Validation.createAdvice('invalid-addition', $(prefix +'postcode_housenumber_addition'), false, (housenumber_addition != '' ? PCNLAPI_CONFIG.translations.houseNumberAdditionUnknown.replace('{addition}', housenumber_addition) : PCNLAPI_CONFIG.translations.houseNumberAdditionRequired));
							Validation.showAdvice($(prefix +'postcode_housenumber_addition'), newAdvice, 'invalid-addition');
						}
						else if (json.houseNumberAdditions.length > 1 || (json.houseNumberAdditions.length == 1 && json.houseNumberAdditions[0] != ''))
						{
							// Address has multiple housenumber additions
							var additionSelect = pcnlapi.createPostcodeHouseNumberAddition(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4, json.houseNumberAdditions);
							additionSelect.setValue(json.houseNumberAddition);
						}
						else
						{
							// Address has only one valid addition, and it is the 'no addition' option
							pcnlapi.removeHousenumberAddition(prefix);
						}
					}
					else if (json.message != undefined)
					{
						// Address check returned an error

						newAdvice = Validation.createAdvice('invalid-postcode', $(prefix + (json.messageTarget == 'postcode' ? 'postcode_input' : 'postcode_housenumber')), false, json.message);
						Validation.showAdvice($(prefix +'postcode_housenumber'), newAdvice, 'invalid-postcode');

						pcnlapi.removeHousenumberAddition(prefix);
					}
					else
					{
						// Address check did not return an error or a postcode result (something else wrong)

						newAdvice = Validation.createAdvice('invalid-postcode', $(prefix + (json.messageTarget == 'postcode' ? 'postcode_input' : 'postcode_housenumber')), false, '');
						Validation.showAdvice($(prefix +'postcode_housenumber'), newAdvice, 'invalid-postcode');

						pcnlapi.removeHousenumberAddition(prefix);
					}

					$(prefix + postcodeFieldId).fire('postcode:updated');
				}
			});
		},

		/**
		 * Toggle country selection for a form. Only when the Netherlands is selected, add address enrichment.
		 */
		toggleCountryPostcode: function (prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4)
		{
			var pcnlapi = this;
			if ($(prefix + countryFieldId).getValue() == 'NL')
			{
				// The Netherlands is selected - add our own validated inputs.

				if (!$(prefix +'postcode_input:wrapper'))
				{
					if ($(prefix + postcodeFieldId).parentNode.tagName == 'TD')
					{
						// We're probably in the admin
						if (PCNLAPI_CONFIG.adminValidationDisabled)
						{
							return;
						}

						$(prefix + street1).up('tr').insert({before: '<tr id="' + prefix + 'postcode_input:wrapper"><td class="label"><label for="' + prefix + 'postcode_input">'+ PCNLAPI_CONFIG.translations.postcodeInputLabel +' <span class="required">*</span></label></td><td class="value"><input type="text" title="'+ PCNLAPI_CONFIG.translations.postcodeInputTitle +'" id="' + prefix + 'postcode_input" value="" class="input-text required-entry" /></td></tr><tr id="' + prefix + 'postcode_housenumber:wrapper"><td class="label"><label for="' + prefix + 'postcode_housenumber">'+ PCNLAPI_CONFIG.translations.houseNumberLabel +' <span class="required">*</span></label></td><td class="value"><input type="text" title="'+ PCNLAPI_CONFIG.translations.houseNumberTitle +'" name="billing[postcode_housenumber]" id="' + prefix + 'postcode_housenumber" value="" class="input-text pcnl-input-text-half required-entry" /></td></tr>'});
						$(prefix + street1).up('tr').insert({before: '<tr id="' + prefix + 'postcode_input:checkbox"><td class="label"><label for="' + prefix + 'postcode_input_checkbox"> '+ PCNLAPI_CONFIG.translations.manualInputLabel +' <span class="required">*</span></label></td><td class="value"><input type="checkbox" id="' + prefix + 'postcode_input_checkbox" value="" class="checkbox" /><label for="' + prefix + 'postcode_input_checkbox">'+ PCNLAPI_CONFIG.translations.manualInputText +'</label></td></tr>'});
						$(prefix +'postcode_input_checkbox').observe('click', function () { pcnlapi.toggleCountryPostcode(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4); });
					}
					else if ($(document.body).hasClassName('onestepcheckout-index-index'))
					{
						// Support for OneStepCheckout extension

						if (!$(prefix +'postcode_input:info'))
						{
							$(prefix + street1).up('li').insert({before: '<li id="' + prefix + 'postcode_input:info" class="clearfix"><div class="input-box"><label class="pcnl-info-label">'+ PCNLAPI_CONFIG.translations.infoLabel +'</label><div class="pcnl-info-text">'+ PCNLAPI_CONFIG.translations.infoText +'</div></div></li>'});
						}
						$(prefix + street1).up('li').insert({before: '<li id="' + prefix + 'postcode_input:wrapper" class="clearfix"><div class="field input-postcode"><label for="' + prefix + 'postcode_input" class="required">'+ PCNLAPI_CONFIG.translations.postcodeInputLabel +'<em class="required">*</em></label><div class="input-box"><input type="text" title="'+ PCNLAPI_CONFIG.translations.postcodeInputTitle +'" id="' + prefix + 'postcode_input" value="" class="input-text required-entry" /></div></div><div class="field input-postcode pcnl-input-housenumber"><label for="' + prefix + 'postcode_housenumber" class="required">'+ PCNLAPI_CONFIG.translations.houseNumberLabel +' <em class="required">*</em></label><div class="input-box"><input type="text" title="'+ PCNLAPI_CONFIG.translations.houseNumberTitle +'" name="billing[postcode_housenumber]" id="' + prefix + 'postcode_housenumber" value="" class="input-text pcnl-input-text-half required-entry" /></div></div></li>'});
						if (!$(prefix +'postcode_input:checkbox'))
						{
							$(prefix + street1).up('li').insert({before: '<li id="' + prefix + 'postcode_input:checkbox" class="clearfix"><div class="field"><div class="input-box"><input type="checkbox" title="'+ PCNLAPI_CONFIG.translations.postcodeInputTitle +'" id="' + prefix + 'postcode_input_checkbox" value="" class="checkbox" /><label for="' + prefix + 'postcode_input_checkbox">'+ PCNLAPI_CONFIG.translations.manualInputText +'</label></div></div></li>'});
							$(prefix +'postcode_input_checkbox').observe('click', function () { pcnlapi.toggleCountryPostcode(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4); });
						}
						$(prefix + street1).up('li').insert({before: '<li id="' + prefix + 'postcode_input:output" class="pcnl-hidden-field"><div class="input-box"><label>'+ PCNLAPI_CONFIG.translations.outputLabel +'</label><div id="' + prefix + 'postcode_output" class="pcnl-address-text"></div></li>'});

					}
					else
					{
						// Support for regular Magento 'one page' checkout

						if (!$(prefix +'postcode_input:info'))
						{
							$(prefix + street1).up('li').insert({before: '<li id="' + prefix + 'postcode_input:info" class="wide"><div class="input-box"><label class="pcnl-info-label">'+ PCNLAPI_CONFIG.translations.infoLabel +'</label><div class="pcnl-info-text">'+ PCNLAPI_CONFIG.translations.infoText +'</div></div></li>'});
						}
						$(prefix + street1).up('li').insert({before: '<li id="' + prefix + 'postcode_input:wrapper" class="fields"><div class="field"><label for="' + prefix + 'postcode_input" class="required"><em>*</em>'+ PCNLAPI_CONFIG.translations.postcodeInputLabel +'</label><div class="input-box"><input type="text" title="'+ PCNLAPI_CONFIG.translations.postcodeInputTitle +'" id="' + prefix + 'postcode_input" value="" class="input-text required-entry" /></div></div><div class="field"><label for="' + prefix + 'postcode_housenumber" class="required"><em>*</em>'+ PCNLAPI_CONFIG.translations.houseNumberLabel +'</label><div class="input-box"><input type="text" title="'+ PCNLAPI_CONFIG.translations.houseNumberTitle +'" name="billing[postcode_housenumber]" id="' + prefix + 'postcode_housenumber" value="" class="input-text pcnl-input-text-half required-entry" /></div></div></li>'});
						if (!$(prefix +'postcode_input:checkbox'))
						{
							$(prefix + street1).up('li').insert({before: '<li id="' + prefix + 'postcode_input:checkbox" class="wide"><div class="field"><div class="input-box"><label><input type="checkbox" title="'+ PCNLAPI_CONFIG.translations.postcodeInputTitle +'" id="' + prefix + 'postcode_input_checkbox" value="" class="checkbox" /> '+ PCNLAPI_CONFIG.translations.manualInputText +'</label></div></div></li>'});
							$(prefix +'postcode_input_checkbox').observe('click', function () { pcnlapi.toggleCountryPostcode(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4); });
						}
						$(prefix + street1).up('li').insert({before: '<li id="' + prefix + 'postcode_input:output" class="wide pcnl-hidden-field"><div class="input-box"><label>'+ PCNLAPI_CONFIG.translations.outputLabel +'</label><div id="' + prefix + 'postcode_output" class="pcnl-address-text"></div></li>'});
					}

					$(prefix +'postcode_input').observe('change', function(e) { pcnlapi.lookupPostcode(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4, e); });
					$(prefix +'postcode_housenumber').observe('change', function(e) { pcnlapi.lookupPostcode(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4, e); });
				}
				else
				{
					this.showFields([prefix +'postcode_input', prefix +'postcode_housenumber', prefix +'postcode_housenumber_addition'])
				}

				if (!$(prefix + 'postcode_input_checkbox').checked)
				{
					this.setFieldsReadonly([
						prefix + postcodeFieldId,
						prefix + street1,
						prefix + street2,
						prefix + street3,
						prefix + street4,
						prefix + 'city',
						prefix + 'region',
					], true);
					this.hideFields([
						prefix + postcodeFieldId,
						prefix + street1,
						prefix + street2,
						prefix + street3,
						prefix + street4,
						prefix + 'city',
						prefix + 'region',
						prefix + countryFieldId,
					]);

					// Set empty, will be corrected below
					$(prefix +'postcode_input').value = '';
					$(prefix +'postcode_housenumber').value = '';
					this.setFieldsReadonly([prefix +'postcode_input', prefix + 'postcode_housenumber', prefix + 'postcode_housenumber_addition'], false);
					if ($(prefix +'postcode_output') && $(prefix +'postcode_output').innerHTML != '')
					{
						this.showFields([prefix +'postcode_output']);
					}
				}
				else
				{
					this.removeValidationMessages(prefix);

					this.setFieldsReadonly([
						prefix + postcodeFieldId,
						prefix + street1,
						prefix + street2,
						prefix + street3,
						prefix + street4,
						prefix + 'city',
						prefix + 'region',
					], false);
					this.showFields([
						prefix + postcodeFieldId,
						prefix + street1,
						prefix + street2,
						prefix + street3,
						prefix + street4,
						prefix + 'city',
						prefix + 'region',
						prefix + countryFieldId,
					]);

					// Disable fields
					$(prefix +'postcode_input').setValue(PCNLAPI_CONFIG.translations.disabledText);
					$(prefix +'postcode_housenumber').setValue(PCNLAPI_CONFIG.translations.disabledText);
					this.setFieldsReadonly([prefix +'postcode_input', prefix + 'postcode_housenumber', prefix + 'postcode_housenumber_addition'], true);
					this.hideFields([prefix +'postcode_output']);
				}

				// We're in NL, checkbox is enabled
				$(prefix + 'postcode_input_checkbox').disabled = false;

				// Fill postcode validation input with data from manual data fields (postcode + street)
				if ($(prefix + postcodeFieldId).getValue() != '' && $(prefix +'postcode_input').getValue() == '')
				{
					$(prefix +'postcode_input').setValue($(prefix + postcodeFieldId).getValue());

					var housenumber_match;
					if (PCNLAPI_CONFIG.useStreet2AsHouseNumber && $(prefix + street2))
					{
						housenumber_match = $(prefix + street2).getValue().match(/([0-9]+)([^0-9a-zA-Z]+([0-9a-zA-Z ]+)|([a-zA-Z]([0-9a-zA-Z ]+)))?$/);
					}
					else
					{
						housenumber_match = $(prefix + street1).getValue().match(/([0-9]+)([^0-9a-zA-Z]+([0-9a-zA-Z ]+)|([a-zA-Z]([0-9a-zA-Z ]+)))?$/);
					}

					var housenumber = housenumber_match ? housenumber_match[1].trim() : '';

					var housenumber_addition = '';

					if (!housenumber_match)
						housenumber_addition = '';
					else if (housenumber_match[3])
						housenumber_addition = housenumber_match[3].trim();
					else if (housenumber_match[4])
						housenumber_addition = housenumber_match[4].trim();

					$(prefix +'postcode_housenumber').setValue((housenumber +' '+ housenumber_addition).trim());
					this.lookupPostcode(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4);
				}
			}
			else
			{
				// Address is not in the Netherlands

				if ($(prefix +'postcode_input_checkbox'))
				{
					$(prefix +'postcode_input_checkbox').checked = true;
					$(prefix +'postcode_input_checkbox').disabled = true;
				}

				this.setFieldsReadonly([
					prefix +'city',
					prefix +'region',
					prefix + postcodeFieldId,
					prefix + street1,
					prefix + street2,
					prefix + street3,
					prefix + street4,
				], false);

				this.setFieldsReadonly([prefix +'postcode_input', prefix +'postcode_housenumber', prefix +'postcode_housenumber_addition'], true);
				this.hideFields([prefix +'postcode_input', prefix +'postcode_housenumber', prefix +'postcode_housenumber_addition']);

				if ($(prefix +'showcase'))
					Element.remove($(prefix +'showcase'));
			}
		},

		/**
		 * (re)Create the postcode housenumber addition dropdown select box.
		 */
		createPostcodeHouseNumberAddition: function (prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4, values, custom)
		{
			var pcnlapi = this;
			if ($(prefix +'postcode_housenumber_addition:wrapper'))
				Element.remove($(prefix +'postcode_housenumber_addition:wrapper'));
			if ($(prefix +'postcode_housenumber_addition'))
				Element.remove($(prefix +'postcode_housenumber_addition'));

			var options = '';
			if (custom != null)
			{
				if (custom == '')
					custom = '__none__';

				options += '<option value="__select__">'+ PCNLAPI_CONFIG.translations.selectAddition +'</option>';
				options += '<option value="'+ custom.escapeHTML() +'">'+ (custom == '__none__' ? PCNLAPI_CONFIG.translations.noAdditionSelectCustom : PCNLAPI_CONFIG.translations.additionSelectCustom.replace('{addition}', custom.escapeHTML())) +'</option>';
			}
			else if (values.indexOf('') == -1)
			{
				options += '<option value="__none__">'+ PCNLAPI_CONFIG.translations.noAdditionSelectCustom.escapeHTML() +'</option>';
			}

			values.each(function(value)
			{
				options += '<option value="'+ value.escapeHTML() +'">'+ (value == '' ? PCNLAPI_CONFIG.translations.noAdditionSelect : value ).escapeHTML() +'</option>';
			});

			if ($(prefix + countryFieldId).parentNode.tagName == 'TD')
			{
				// We're probably in the admin
				$(prefix + 'postcode_housenumber').up('tr').insert({after: '<tr id="' + prefix +'postcode_housenumber_addition:wrapper"><td class="label"><label for="'+ prefix +'postcode_housenumber_addition">'+ PCNLAPI_CONFIG.translations.houseNumberAdditionLabel +' <span class="required">*</span></label></td><td class="value"><select title="'+ PCNLAPI_CONFIG.translations.houseNumberAdditionTitle +'" name="'+ prefix + 'postcode_housenumber_addition" id="' + prefix + 'postcode_housenumber_addition" class="select">'+ options +'</select></td></tr>'});
			}
			else
			{
				// We're probably in the frontend
				$(prefix + 'postcode_housenumber').insert({after: '<select title="'+ PCNLAPI_CONFIG.translations.houseNumberAdditionTitle +'" name="'+ prefix + 'postcode_housenumber_addition" id="' + prefix + 'postcode_housenumber_addition" class="validate-select pcnl-input-text-half">'+ options +'</select>'});
				$(prefix + 'postcode_housenumber').up('li').addClassName('pcnl-with-addition');
			}

			$(prefix +'postcode_housenumber_addition').observe('change', function(e) { pcnlapi.lookupPostcode(prefix, postcodeFieldId, countryFieldId, street1, street2, street3, street4, e); });

			return $(prefix +'postcode_housenumber_addition');
		},

		/**
		 * Inspect our current page, see where we are: configure & attach observers to input fields.
		 */
		addAddressCheckObservers: function ()
		{
			var pcnlapi = this;
			// Checkout page
			if ($('billing:postcode'))
			{
				$('billing:country_id').observe('change', function () { pcnlapi.toggleCountryPostcode('billing:', 'postcode', 'country_id', 'street1', 'street2', 'street3', 'street4'); });
				$('shipping:country_id').observe('change', function () { pcnlapi.toggleCountryPostcode('shipping:', 'postcode', 'country_id', 'street1', 'street2', 'street3', 'street4'); });

				if (!$('billing:country_id') || $('billing:country_id').getValue() == 'NL')
					this.toggleCountryPostcode('billing:', 'postcode', 'country_id', 'street1', 'street2', 'street3', 'street4');
				if (!$('shipping:country_id') || $('shipping:country_id').getValue() == 'NL')
					this.toggleCountryPostcode('shipping:', 'postcode', 'country_id', 'street1', 'street2', 'street3', 'street4');
			}

			// Misc. account address edits
			if ($('zip') && $('street_1'))
			{
				$('zip').observe('change', function(e)
				{
					pcnlapi.lookupPostcode('', 'zip', 'country', 'street_1', 'street_2', 'street_3', 'street_4', e);
				});

				$('country').observe('change', function () { pcnlapi.toggleCountryPostcode('', 'zip', 'country', 'street_1', 'street_2', 'street_3', 'street_4'); });

				if ($('country').getValue() == 'NL')
					this.toggleCountryPostcode('', 'zip', 'country', 'street_1', 'street_2', 'street_3', 'street_4');
			}

			// Default admin address edits
			if ($('postcode') && $('street0'))
			{
				$('postcode').observe('change', function(e)
				{
					pcnlapi.lookupPostcode('', 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3', e);
				});

				$('country_id').observe('change', function () { pcnlapi.toggleCountryPostcode('', 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3'); });

				if ($('country_id').getValue() == 'NL')
					this.toggleCountryPostcode('', 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3');
			}

			// User admin address edits
			if ($('address_form_container'))
			{
				this.observeAdminCustomerAddress();

				$('address_form_container').observe('DOMNodeInserted', function(e) { pcnlapi.observeAdminCustomerAddress(); });
			}

			// Admin 'create order' & 'edit order' address editting
			if ($('order-billing_address'))
			{
				this.observeBillingAddress();
				this.observeShippingAddress();

				// Re-observe blocks after they have been changed
				$('order-billing_address').observe('DOMNodeInserted', function(e) { pcnlapi.observeBillingAddress(); });
				$('order-shipping_address').observe('DOMNodeInserted', function(e) { pcnlapi.observeShippingAddress(); });
			}
		},
		observeAdminCustomerAddress: function ()
		{
			var pcnlapi = this;
			for (nr = 1; nr < 15; nr++)
			{
				if ($('_item'+ nr +'postcode') && !$('_item'+ nr +'postcode').observed)
				{
					$('_item'+ nr +'postcode').observe('change', function(e)
					{
						var localNr = nr;
						return function () { pcnlapi.lookupPostcode('_item'+ localNr, 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3', e);}
					}());

					$('_item'+ nr +'country_id').observe('change', function(e)
					{
						var localNr = nr;
						return function () { pcnlapi.toggleCountryPostcode('_item'+ localNr, 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3');}
					}());

					$('_item'+ nr +'postcode').observed = true;

					if ($('_item'+ nr +'country_id').getValue() == 'NL')
						this.toggleCountryPostcode('_item'+ nr, 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3');
				}
			}
		},
		observeBillingAddress: function ()
		{
			var pcnlapi = this;
			// Billing
			if ($('order-billing_address_postcode'))
			{
				$('order-billing_address_postcode').observe('change', function(e)
				{
					pcnlapi.lookupPostcode('order-billing_address_', 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3', e);
				});
				$('order-billing_address_country_id').observe('change', function ()
				{
					pcnlapi.toggleCountryPostcode('order-billing_address_', 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3');
				});
				if ($('order-billing_address_country_id').getValue() == 'NL')
					this.toggleCountryPostcode('order-billing_address_', 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3');
				$('order-billing_address_postcode').observe('postcode:updated', function(e)
				{
					// Custom poke Magento billing-to-shipping copy order logic.
					var event = {
						type: e.type,
						currentTarget: $('order-billing_address_street0'),
						target: $('order-billing_address_street0')
					};
					order.changeAddressField(event);
				});
			}
		},
		observeShippingAddress: function ()
		{
			var pcnlapi = this;
			// Shipping
			if (!$('order-shipping_same_as_billing').checked)
			{
				$('order-shipping_address_postcode').observe('change', function(e)
				{
					pcnlapi.lookupPostcode('order-shipping_address_', 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3', e);
				});
				$('order-shipping_address_country_id').observe('change', function () { pcnlapi.toggleCountryPostcode('order-shipping_address_', 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3'); });
				if ($('order-shipping_address_country_id').getValue() == 'NL')
					pcnlapi.toggleCountryPostcode('order-shipping_address_', 'postcode', 'country_id', 'street0', 'street1', 'street2', 'street3');
			}
		}
	};

	// Add observers to address fields on page
	PostcodeNl_Api.addAddressCheckObservers();
});