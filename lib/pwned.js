/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Check whether password has been seen in a breach.                                              */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import crypto from 'crypto';     // nodejs.org/api/crypto.html
import fetch  from 'node-fetch'; // window.fetch in node.js

class Pwned {

    /**
     * Return breach count for password.
     *
     * Uses api.pwnedpasswords.com: see www.troyhunt.com/ive-just-launched-pwned-passwords-version-2.
     *
     * K-anonymity methodology is used to obtain breach count without transmitting actual password.
     *
     * @param {string} pw - Password to be checked.
     * @returns {number} Number of breaches password has been seen in (not breached returns 0 ≣ false).
     */
    static async breachCount(pw) {
        if (typeof pw != 'string') throw new Error('Password is not a string');

        const hash = crypto.createHash('sha1').update(pw).digest('hex').toUpperCase();
        const prefix = hash.slice(0, 5);
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (!response.ok) throw new Error(`Pwned.breachCount failed (status ${response.status})`);
        const respText = await response.text();
        const suffixes = await respText.split('\r\n');
        const match = suffixes.filter(s => `${prefix}${s.split(':')[0]}` == hash)[0];

        if (!match) return 0;
        return match.split(':')[1];
    }
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Pwned;
