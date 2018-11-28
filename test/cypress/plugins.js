/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Cypress plugins.                                                                               */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

require('dotenv').config();

module.exports = (on, config) => {
    // set Cypress environment variables from dotenv environment variables
    config.env.TESTUSER = process.env.TESTUSER;
    config.env.TESTPASS = process.env.TESTPASS;

    return config;
};
