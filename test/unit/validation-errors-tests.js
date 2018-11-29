/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* ValidationErrors unit tests.                                                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* eslint no-shadow:off */

import { expect } from 'chai';       // BDD/TDD assertion library
import dateFormat from 'dateformat'; // Steven Levithan's dateFormat()

import validationErrors from '../../lib/validation-errors.js';

const test = it; // just an alias

const rules = {
    name:     'required',
    age:      'type=number required min=4 max=17',
    guardian: 'required minlength=6 maxlength=24',
    reported: 'type=date required min=2001-01-01 max='+dateFormat('yyyy-mm-dd'),
    fixed:    'type=datetime-local max='+dateFormat("yyyy-mm-dd'T'HH:MM"),
};
const body = {
    name:     'Adèle',
    age:      '16',
    guardian: 'Rochester',
    reported: '2001-01-01',
};

describe('Validation errors', function() {

    describe('example', function() {
        test('passing', function() {
            const errors = validationErrors(body, rules);
            expect(errors).to.be.false;
        });

        test('required', function() {
            const errors = validationErrors({}, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(4); // one for each field
        });

        test('number type', function() {
            const bad = Object.assign({}, body, { age: 'nine' });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“age” must be a number');
        });

        test('min number', function() {
            const bad = Object.assign({}, body, { age: '1' });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“age” must have a minimum value of 4');
        });
        test('max number', function() {
            const bad = Object.assign({}, body, { age: '18' });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“age” must have a maximum value of 17');
        });

        test('minlength', function() {
            const bad = Object.assign({}, body, { guardian: '–' });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“guardian” must have a minimum length of 6');
        });
        test('maxlength', function() {
            const bad = Object.assign({}, body, { guardian: '1234567890123456789012345' });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“guardian” must have a maximum length of 24');
        });

        test('min date', function() {
            const bad = Object.assign({}, body, { reported: '1999-01-01' });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“reported” must have a minimum value of 2001-01-01');
        });
        test('max date', function() {
            const bad = Object.assign({}, body, { reported: dateFormat(Date.now()+1000*60*60*24, 'yyyy-mm-dd') });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“reported” must have a maximum value of '+dateFormat('yyyy-mm-dd'));
        });
        test('bad date', function() {
            const bad = Object.assign({}, body, { reported: 'not a date!' });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“reported” must be a date');
        });

        test('datetime-local ok', function() {
            const bad = Object.assign({}, body, { fixed: dateFormat(Date.now()-1000*60*60, "yyyy-mm-dd'T'HH:MM") });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.false;
        });
        test('datetime-local bad 1', function() {
            const bad = Object.assign({}, body, { fixed: '2001-13-32T01:01' });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“fixed” must be a datetime-local');
        });
        test('datetime-local bad 2', function() {
            const bad = Object.assign({}, body, { fixed: 'not a date!' });
            const errors = validationErrors(bad, rules);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“fixed” must be a datetime-local');
        });
    });

    describe('individual tests', function() {
        test('time ok', function() {
            const rule = { fld: 'type=time' };
            const body = { fld: dateFormat('HH:MM') };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.false;
        });
        test('time bad', function() {
            const rule = { fld: 'type=time' };
            const body = { fld: '60:60' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“fld” must be a time');
        });

        test('month ok', function() {
            const rule = { fld: 'type=month' };
            const body = { fld: dateFormat('yyyy-mm') };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.false;
        });
        test('month bad', function() {
            const rule = { fld: 'type=month' };
            const body = { fld: '2001-13' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“fld” must be a month');
        });

        test('week ok', function() {
            const rule = { fld: 'type=week' };
            const body = { fld: dateFormat("yyyy-'W'")+dateFormat('W').padStart(2, '0') };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.false;
        });
        test('week bad', function() {
            const rule = { fld: 'type=week' };
            const body = { fld: '2001-W54' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“fld” must be a week');
        });

        test('email ok', function() {
            const rule = { fld: 'type=email' };
            const body = { fld: 'me@test.org' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.false;
        });
        test('email bad', function() {
            const rule = { fld: 'type=email' };
            const body = { fld: 'xxxx' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“fld” must be an email');
        });

        test('tel ok', function() {
            const rule = { fld: 'type=tel' };
            const body = { fld: '01223 123456' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.false;
        });
        // no failure for tel

        test('url ok', function() {
            const rule = { fld: 'type=url' };
            const body = { fld: 'http://www.test.org' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.false;
        });
        test('url bad', function() {
            const rule = { fld: 'type=url' };
            const body = { fld: 'xxxx' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“fld” must be a url');
        });

        test('color ok', function() {
            const rule = { fld: 'type=color' };
            const body = { fld: '#336699' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.false;
        });
        test('color bad', function() {
            const rule = { fld: 'type=color' };
            const body = { fld: 'xxxx' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“fld” must be a (hex) color');
        });

        test('pattern ok', function() {
            const rule = { fld: 'pattern=[a-zA-Z][a-zA-Z0-9-]*' };
            const body = { fld: 'user-1' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.false;
        });
        test('pattern bad', function() {
            const rule = { fld: 'pattern="[a-zA-Z][a-zA-Z0-9-]*"' };
            const body = { fld: '1user' };
            const errors = validationErrors(body, rule);
            expect(errors).to.be.an('array');
            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal('“fld” must match the pattern /[a-zA-Z][a-zA-Z0-9-]*/');
        });
    });

});
