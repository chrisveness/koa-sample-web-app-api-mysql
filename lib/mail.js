/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Send out e-mail.                                                                               */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

const nodemailer = require('nodemailer');   // sends e-mails from Node.js
const handlebars = require('handlebars');   // logicless templating language
const jsdom      = require('jsdom');        // DOM Document interface in Node!
const htmlToText = require('html-to-text'); // converts html to beautiful text
const fs         = require('fs-extra');     // fs with extra functions & promise interface

// get SMTP connection details from SMTP_CONNECTION environment variable
const smtpKeyVal = process.env.SMTP_CONNECTION.split(';').map(v => v.trim().split('='));
const smtp = smtpKeyVal.reduce((config, v) => { config[v[0].toLowerCase()] = v[1]; return config; }, {});


class Mail {

    /**
     * Private getter to return SMTP transporter.
     */
    static get transporter() {
        const smtpConfig = {
            host:   smtp.host,
            port:   smtp.port,
            secure: false,
            auth:   {
                user: smtp.user,
                pass: smtp.pass,
            },
        };
        return nodemailer.createTransport(smtpConfig);
    }


    /**
     * Private getter for 'from' reply-to address.
     */
    static get from() {
        return 'noreply@movable-type.co.uk';
    }


    /**
     * Send e-mail using template.
     *
     * @param   {string} to - E-mail recipient(s).
     * @param   {string} template - Handlebars template for e-mail body.
     * @param   {string} context - Context for mail-merge into template.
     * @returns {Object} info from sendMail().
     */
    static async send(to, template, context) {
        // get password reset template, completed with generated token
        const templateHtml = await fs.readFile(`app-admin/templates/${template}.html`, 'utf8');
        const templateHbs = handlebars.compile(templateHtml);
        const html = templateHbs(context);

        // get e-mail subject from <title> element
        const document = new jsdom.JSDOM(html).window.document;
        const subject = document.querySelector('title').textContent;

        // prepare e-mail message
        const message = {
            to:      to,
            from:    Mail.from,
            subject: subject,
            html:    html,
            text:    htmlToText.fromString(html),
        };

        // send out e-mail
        //const info = await transporter.verify(); TODO: ??
        const info = await Mail.transporter.sendMail(message);

        return info;
    }


    /**
     * Send e-mail with supplied html.
     *
     * @param {string} to - E-mail recipient(s).
     * @param {string} subject - E-mail subject line.
     * @param {string} html - HTML content for e-mail body.
     */
    static async sendHtml(to, subject, html) {
        const message = {
            to:      to,
            from:    Mail.from,
            subject: subject,
            html:    html,
            text:    htmlToText.fromString(html),
        };

        // send out e-mail
        //const info = await transporter.verify(); TODO: ??
        const info = await Mail.transporter.sendMail(message);
        console.info('Mail.sendHtml info', info);
    }


    /**
     * Send e-mail with supplied (plain-) text.
     *
     * @param {string} to - E-mail recipient(s).
     * @param {string} subject - E-mail subject line.
     * @param {string} text - Text content for plain-text e-mail body.
     */
    static async sendText(to, subject, text) {
        const message = {
            to:      to,
            from:    Mail.from,
            subject: subject,
            text:    text,
        };

        // send out e-mail
        //const info = await transporter.verify(); TODO: ??
        const info = await Mail.transporter.sendMail(message);
        console.info('Mail.sendText info', info);
    }
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Mail;
