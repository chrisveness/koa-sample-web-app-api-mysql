/* password-reset.js */

'use strict';

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#password').oninput = validatePwMatch;
    document.querySelector('#password-confirm').oninput = validatePwMatch;
});

function validatePwMatch() {
    if (this.setCustomValidity == undefined) return; // no constraint validation available
    const err = 'Passwords must match';
    const ok = this.form.password.value == this.form.passwordConfirm.value;
    this.form.password.setCustomValidity('');        // reset default
    this.form.passwordConfirm.setCustomValidity(''); // reset default
    this.setCustomValidity(ok ? '' : err);           // confirm match
    this.form.pwnedNotified.value = ''; // new p/w has not been notified
}
