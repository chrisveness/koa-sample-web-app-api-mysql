/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* WWW handlers (invoked by router to render templates)                                           */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const fs = require('co-fs');         // co wrappers for Node core fs functions
const md = require('markdown-it')(); // markdown parser

const www = module.exports = {};


/**
 * GET / - render index page, including README.md.
 */
www.index = function*() {
    const readme = yield fs.readFile('README.md', 'utf8');
    const content = md.render(readme);
    const context = { content: content };
    yield this.render('index', context);
};


/**
 * GET /contact - render contact page, either with contact form or submitted message
 */
www.contact = function*() {
    yield this.render('contact', this.flash);
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


/**
 * POST /contact - process contact page
 */
www.processContact = function*() {
    // just an illustration - a real app would log/notify the contact request
    this.flash = this.request.body;
    this.redirect('/contact');
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
