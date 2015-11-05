/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* WWW handlers (invoked by router to render templates)                                           */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let fs = require('co-fs');         // co wrappers for Node core fs functions
let md = require('markdown-it')(); // markdown parser

let www = module.exports = {};


/**
 * GET / - render index page, including README.md.
 */
www.index = function*() {
    try {
        let readme = yield fs.readFile('README.md', 'utf8');
        let content = md.render(readme);
        let context = { content: content };
        yield this.render('templates/index', context);
    } catch (e) {
        this.throw(e);
    }
};


/**
 * GET /contact - render contact page, either with contact form or submitted message
 */
www.contact = function*() {
    yield this.render('templates/contact', this.flash);
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
