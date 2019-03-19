/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Members handlers (invoked by router to render templates)                                       */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Member           from '../../models/member.js';
import TeamMember       from '../../models/team-member.js';
import Db               from '../../lib/mysqldb.js';
import validationErrors from '../../lib/validation-errors.js';


class MembersHandlers {

    /**
     * GET /members - render list-members page.
     *
     * Results can be filtered with URL query strings eg /members?firstname=alice.
     */
    static async list(ctx) {
        // build sql query including any query-string filters; eg ?field1=val1&field2=val2 becomes
        // "Where field1 = :field1 And field2 = :field2"
        let sql = 'Select * From Member';
        if (ctx.request.querystring) {
            const filter = Object.keys(ctx.request.query).map(q => `${q} = :${q}`).join(' and ');
            sql += ' Where ' + filter;
        }
        sql += ' Order By Firstname, Lastname';

        try {

            const [ members ] = await Db.query(sql, ctx.request.query);

            await ctx.render('members-list', { members });

        } catch (e) {
            switch (e.code) {
                case 'ER_BAD_FIELD_ERROR': ctx.throw(403, 'Unrecognised Member field'); break;
                default: throw e;
            }
        }
    }


    /**
     * GET /members/:id - render view-member page.
     */
    static async view(ctx) {
        // member details
        const member = await Member.get(ctx.params.id);
        if (!member) ctx.throw(404, 'Member not found');

        // team membership
        const sql = `Select TeamMemberId, TeamId, Name
                     From Team Inner Join TeamMember Using (TeamId)
                     Where MemberId = :id`;
        const [ teams ] = await Db.query(sql, { id: ctx.params.id });

        const context = member;
        context.teams = teams;
        await ctx.render('members-view', context);
    }


    /**
     * GET /members/add - render add-member page.
     */
    static async add(ctx) {
        const context = ctx.flash.formdata || {}; // failed validation? fill in previous values
        await ctx.render('members-add', context);
    }


    /**
     * GET /members/:id/edit - render edit-member page.
     */
    static async edit(ctx) {
        // member details
        const member = await Member.get(ctx.params.id);
        if (!member) ctx.throw(404, 'Member not found');
        if (ctx.flash.formdata) Object.assign(member, ctx.flash.formdata); // failed validation? fill in previous values

        // team membership
        const sqlT = `Select TeamMemberId, TeamId, Name
                      From TeamMember Inner Join Team Using (TeamId)
                      Where MemberId = :id
                      Order By Name`;
        const [ memberOfTeams ] = await Db.query(sqlT, { id: ctx.params.id });
        member.memberOfTeams = memberOfTeams;

        // teams this member is not a member of (for add picklist)
        let teams = member.memberOfTeams.map(function(t) { return t.TeamId; }); // array of id's
        if (teams.length == 0) teams = [ 0 ]; // dummy to satisfy sql 'in' syntax
        const sqlM = `Select TeamId, Name 
                      From Team 
                      Where TeamId Not In (${teams.join(',')}) 
                      Order By Name`;
        const [ notMemberOfTeams ] = await Db.query(sqlM, teams);
        member.notMemberOfTeams = notMemberOfTeams;

        const context = member;
        await ctx.render('members-edit', context);
    }


    /**
     * GET /members/:id/delete - render delete-member page.
     */
    static async delete(ctx) {
        const member = await Member.get(ctx.params.id);
        if (!member) ctx.throw(404, 'Member not found');

        const context = member;
        await ctx.render('members-delete', context);
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
    /* POST processing                                                                            */
    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * POST /members/add - process add-member.
     */
    static async processAdd(ctx) {
        if (ctx.state.user.Role != 'admin') {
            ctx.flash = { _error: 'User management requires admin privileges' };
            return ctx.response.redirect('/login'+ctx.request.url);
        }

        const body = ctx.request.body;

        try {

            const validation = { // back-end validation matching HTML5 validation
                Email: 'required type=email',
            };

            if (validationErrors(body, validation)) {
                throw new Error(validationErrors(body, validation));
            }

            body.Active = body.Active ? true : false; // field supplied in post only when checked

            const id = await Member.insert(body);
            ctx.response.set('X-Insert-Id', id); // for integration tests

            // return to list of members
            ctx.response.redirect('/members');

        } catch (e) {
            // stay on same page to report error (with current filled fields)
            ctx.flash = { formdata: body, _error: e.message };
            ctx.response.redirect(ctx.request.url);
        }
    }


    /**
     * POST /members/:id/edit - process edit-member.
     */
    static async processEdit(ctx) {
        if (ctx.state.user.Role != 'admin') {
            ctx.flash = { _error: 'User management requires admin privileges' };
            return ctx.response.redirect('/login'+ctx.request.url);
        }

        const body = ctx.request.body;

        // update member details
        if ('Firstname' in body) {
            try {

                const validation = { // back-end validation matching HTML5 validation
                    Email: 'required type=email',
                };

                if (validationErrors(body, validation)) {
                    throw new Error(validationErrors(body, validation));
                }

                body.Active = body.Active ? true : false; // field supplied in post only when checked

                await Member.update(ctx.params.id, body);

                // return to list of members
                ctx.response.redirect('/members');

            } catch (e) {
                // stay on same page to report error (with current filled fields)
                ctx.flash = { formdata: body, _error: e.message };
                ctx.response.redirect(ctx.request.url);
            }
        }

        // add member to team
        if ('add-team' in body) {
            const values = {
                MemberId: ctx.params.id,
                TeamId:   body['add-team'],
                JoinedOn: new Date().toISOString().replace('T', ' ').split('.')[0],
            };

            try {

                const id = await TeamMember.insert(values);
                ctx.response.set('X-Insert-Id', id); // for integration tests

                // stay on same page showing new team member
                ctx.response.redirect(ctx.request.url);

            } catch (e) {
                // stay on same page to report error
                ctx.flash = { formdata: body, _error: e.message };
                ctx.response.redirect(ctx.request.url);
            }
        }

        // remove member from team
        if ('del-team' in body) {
            try {

                await TeamMember.delete(body['del-team']);
                // stay on same page showing new teams list
                ctx.response.redirect(ctx.request.url);

            } catch (e) {
                // stay on same page to report error
                ctx.flash = { _error: e.message };
                ctx.response.redirect(ctx.request.url);
            }
        }
    }


    /**
     * POST /members/:id/delete - process delete-member.
     */
    static async processDelete(ctx) {
        if (ctx.state.user.Role != 'admin') {
            ctx.flash = { _error: 'User management requires admin privileges' };
            return ctx.response.redirect('/login'+ctx.request.url);
        }

        try {

            await Member.delete(ctx.params.id);

            // return to list of members
            ctx.response.redirect('/members');

        } catch (e) {
            // stay on same page to report error
            ctx.flash = { _error: e.message };
            ctx.response.redirect(ctx.request.url);
        }
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default MembersHandlers;
