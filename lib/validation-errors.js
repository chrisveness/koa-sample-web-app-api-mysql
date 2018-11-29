/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Server-side form validation to match browser html5 form validation                             */
/*                                                                                                */
/* Uses the same types and attributes as HTML5 form validation to make it easy for server-side    */
/* validation to match browser validation. Just basic reporting of errors, as intention is just   */
/* as a fallback if browser validation is not available or is subverted (i.e. no custom messages, */
/* input field highlighting, etc).                                                          .     */
/*                                                                                                */
/* The validation rules is an object with input names as properties and the inputs’ rules as      */
/* values, so the validationRules passed to validationErrors() will be rules for all inputs on    */
/* the page being validated.                                                                      */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import isEmail from 'isemail'; // email address validation library


/**
 * Validate request body against validation rules and return any validation errors, or false if
 * there are no errors.
 *
 * @param   {Object} body - Parsed request body, as with koa-body.
 * @param   {Object} validationRules - Rules to be applied to each input being validated.
 * @returns {String[]|false} Array of error messages, or false if there are no validation errors.
 *
 * @example (for Koa)
 *   const rules = {
 *       name:     'required',
 *       age:      'type=number required min=4 max=17',
 *       guardian: 'required minlength=6'
 *   };
 *   if (validationErrors(body, rules)) {
 *       ctx.flash = { validation: validationErrors(body, rules) };
 *       ctx.response.redirect(ctx.request.url); return;
 *   }
 */
function validationErrors(body, validationRules) {
    const reDate     = /^\d{4}-\d{2}-\d{2}$/; // plus Date.parse()
    const reTime     = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    const reMonth    = /^[0-9]{4}-(0[1-9]|1[012])$/;
    const reWeek     = /^[0-9]{4}-W(([0-4][0-9])|(5[0123]))$/;
    const reDatetime = /^\d{4}-\d{2}-\d{2}T[0-2][0-9]:[0-5][0-9]$/; // plus Date.parse()
    const reColor    = /^#[0-9a-f]{6}$/;
    const reUrl      = /^[a-z]+:/i; // !! - (almost) as applied in browsers - anything prefixed by protocol

    const rangeTypes = [ 'number', 'range', 'date', 'time', 'datetime-local', 'month', 'week' ];
    const textTypes  = [ 'text', 'email', 'search', 'password', 'tel', 'url' ];
    const numbTypes  = [ 'number', 'range' ];

    const rules = {};
    const errors = [];

    // convert each validation rule from string to attribute name/value tuples
    for (const input in validationRules) {
        // normalise space-separated rules into array of rules
        rules[input] = {};
        const inputRules = validationRules[input].split(' ');
        for (const rule of inputRules) {
            // split attribute name/value tuples on '=', and strip any enclosing quotes
            const [ attrName, attrValue ] = rule.split('=').map(s => s.replace(/^"|"$/g, '')).map(s => s.replace(/^'|'$/g, ''));
            rules[input][attrName] = attrValue;
        }
        // default type (for inputs with no type) is text
        if (rules[input].type === undefined) rules[input].type = 'text';
    }

    for (const input in validationRules) {
        const value = numbTypes.includes(rules[input].type) ? Number(body[input]) : body[input];

        // note we only want to report one error per input; firstly required, then type check, then others

        let error = null;

        // check for min / max / minlength / maxlength / pattern
        // (note may result in spurious errors subsequently overridden by type / required)
        for (const attrName in rules[input]) {
            const attrValue = rules[input][attrName];

            switch (attrName) {
                case 'min':
                    if (rangeTypes.includes(rules[input].type)
                        && value < attrValue) error = `“${input}” must have a minimum value of ${attrValue}`;
                    break;
                case 'max':
                    if (rangeTypes.includes(rules[input].type)
                        && value > attrValue) error = `“${input}” must have a maximum value of ${attrValue}`;
                    break;
                case 'minlength':
                    if (textTypes.includes(rules[input].type)
                        && typeof value == 'string'
                        && value.length < attrValue) error = `“${input}” must have a minimum length of ${attrValue}`;
                    break;
                case 'maxlength':
                    if (textTypes.includes(rules[input].type)
                        && typeof value == 'string'
                        && value.length > attrValue) error = `“${input}” must have a maximum length of ${attrValue}`;
                    break;
                case 'pattern':
                    if (textTypes.includes(rules[input].type)
                        && !value.match(new RegExp(`^${attrValue}$`))) error = `“${input}” must match the pattern /${attrValue}/`;
                    break;
            }
        }

        // check for type (may be overridden by required)
        if (!empty(value)) {
            const type = rules[input].type;
            switch (type) {
                case 'text': // no validation required
                    break;
                case 'number':
                case 'range':
                    if (isNaN(value)) error = `“${input}” must be a number`;
                    break;
                case 'date':
                    if (!value.match(reDate) || !Date.parse(value)) error = `“${input}” must be a date`;
                    break;
                case 'datetime-local':
                    if (!value.match(reDatetime) || !Date.parse(value)) error = `“${input}” must be a datetime-local`;
                    break;
                case 'time':
                    if (!value.match(reTime)) error = `“${input}” must be a time`;
                    break;
                case 'month':
                    if (!value.match(reMonth)) error = `“${input}” must be a month`;
                    break;
                case 'week':
                    if (!value.match(reWeek)) error = `“${input}” must be a week`;
                    break;
                case 'email':
                    if (!isEmail.validate(value)) error = `“${input}” must be an email`;
                    break;
                case 'tel': // no validation required
                    break;
                case 'url':
                    if (!value.match(reUrl)) error = `“${input}” must be a url`;
                    break;
                case 'color':
                    if (!value.match(reColor)) error = `“${input}” must be a (hex) color`;
                    break;
            }
        }

        // finally check for required
        if ('required' in rules[input] && empty(value)) error = `Please fill in ${input}`;

        if (error) errors.push(error);
    }

    return errors.length>0 ? errors : false;
}

function empty(value) { return value==='' || value===null || value===undefined; }

export default validationErrors;
