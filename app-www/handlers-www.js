/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* WWW handlers (invoked by router to render templates)                                           */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const fs = require('fs-extra');      // fs with extra methods & promise interface
const md = require('markdown-it')(); // markdown parser


class Www {

    /**
     * GET / - render index page, including README.md.
     */
    static async index(ctx) {
        const readme = await fs.readFile('README.md', 'utf8');
        const content = md.render(readme);
        const context = { content: content };
        await ctx.render('index', context);
    }


    /**
     * GET /contact - render contact page, either with contact form or submitted message
     */
    static async contact(ctx) {
        await ctx.render('contact', ctx.flash);
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * POST /contact - process contact page
     */
    static async processContact(ctx) { // eslint-disable-line
        // just an illustration - a real app would log/notify the contact request
        ctx.flash = ctx.request.body;
        ctx.redirect('/contact');
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Www;
