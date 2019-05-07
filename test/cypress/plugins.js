/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Cypress plugins.                                                                               */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

require('dotenv').config(); // load environment variables from a .env file into process.env

module.exports = (on, config) => {
    // set Cypress environment variables from dotenv environment variables
    config.env.TESTUSER = process.env.TESTUSER; // must already exist in database
    config.env.TESTPASS = process.env.TESTPASS;

    return config;
};
