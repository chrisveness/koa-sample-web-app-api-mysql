/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* WWW handlers (invoked by router to render templates)                                           */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import { promises as fs } from 'fs'; // nodejs.org/api/fs.html
import markdown from 'markdown-it';  // markdown parser

const md = markdown();


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
        ctx.response.redirect('/contact');
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default Www;
