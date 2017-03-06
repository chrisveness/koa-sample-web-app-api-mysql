/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Members handlers (invoked by router to render templates)                                       */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Member     = require('../../models/member.js');
const TeamMember = require('../../models/team-member.js');


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
        if (ctx.querystring) {
            const filter = Object.keys(ctx.query).map(q => `${q} = :${q}`).join(' and ');
            sql += ' Where ' + filter;
        }
        sql += ' Order By Firstname, Lastname';

        try {

            const [members] = await ctx.state.db.query(sql, ctx.query);

            await ctx.render('members-list', { members });

        } catch (e) {
            switch (e.code) {
                case 'ER_BAD_FIELD_ERROR': ctx.throw(403, 'Unrecognised Member field'); break;
                default: throw e;
            }
        }
    }


    /**
     * GET /members/:id - render view-member page
     */
    static async view(ctx) {
        // member details
        const member = await Member.get(ctx.params.id);
        if (!member) ctx.throw(404, 'Member not found');

        // team membership
        const sql = `Select TeamMemberId, TeamId, Name
                     From TeamMember Inner Join Team Using (TeamId)
                     Where MemberId = :id`;
        const [teams] = await ctx.state.db.query(sql, { id: ctx.params.id });

        const context = member;
        context.teams = teams;
        await ctx.render('members-view', context);
    }


    /**
     * GET /members/add - render add-member page
     */
    static async add(ctx) {
        const context = ctx.flash.formdata || {}; // failed validation? fill in previous values
        await ctx.render('members-add', context);
    }


    /**
     * GET /members/:id/edit - render edit-member page
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
        const [memberOfTeams] = await ctx.state.db.query(sqlT, { id: ctx.params.id });
        member.memberOfTeams = memberOfTeams;

        // teams this member is not a member of (for add picklist)
        let teams = member.memberOfTeams.map(function(t) { return t.TeamId; }); // array of id's
        if (teams.length == 0) teams = [0]; // dummy to satisfy sql 'in' syntax
        const sqlM = `Select TeamId, Name From Team Where TeamId Not In (${teams.join(',')}) Order By Name`;
        const [notMemberOfTeams] = await ctx.state.db.query(sqlM, teams);
        member.notMemberOfTeams = notMemberOfTeams;

        const context = member;
        await ctx.render('members-edit', context);
    }


    /**
     * GET /members/:id/delete - render delete-member page
     */
    static async delete(ctx) {
        const member = await Member.get(ctx.params.id);
        if (!member) ctx.throw(404, 'Member not found');

        const context = member;
        await ctx.render('members-delete', context);
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * POST /members/add - process add-member
     */
    static async processAdd(ctx) {
        if (ctx.state.user.Role != 'admin') return ctx.redirect('/login'+ctx.url);

        try {

            ctx.request.body.Active = ctx.request.body.Active ? true : false;

            const id = await Member.insert(ctx.request.body);
            ctx.set('X-Insert-Id', id); // for integration tests

            // return to list of members
            ctx.redirect('/members');

        } catch (e) {
            // stay on same page to report error (with current filled fields)
            ctx.flash = { formdata: ctx.request.body, _error: e.message };
            ctx.redirect(ctx.url);
        }
    }


    /**
     * POST /members/:id/edit - process edit-member
     */
    static async processEdit(ctx) {
        if (ctx.state.user.Role != 'admin') return ctx.redirect('/login'+ctx.url);

        // update member details
        if ('Firstname' in ctx.request.body) {
            try {

                ctx.request.body.Active = ctx.request.body.Active ? true : false;

                await Member.update(ctx.params.id, ctx.request.body);

                // return to list of members
                ctx.redirect('/members');

            } catch (e) {
                // stay on same page to report error (with current filled fields)
                ctx.flash = { formdata: ctx.request.body, _error: e.message };
                ctx.redirect(ctx.url);
            }
        }

        // add member to team
        if ('add-team' in ctx.request.body) {
            const values = {
                MemberId: ctx.params.id,
                TeamId:   ctx.request.body['add-team'],
                JoinedOn: new Date().toISOString().replace('T', ' ').split('.')[0],
            };

            try {

                const id = await TeamMember.insert(values);
                ctx.set('X-Insert-Id', id); // for integration tests

                // stay on same page showing new team member
                ctx.redirect(ctx.url);

            } catch (e) {
                // stay on same page to report error
                ctx.flash = { formdata: ctx.request.body, _error: e.message };
                ctx.redirect(ctx.url);
            }
        }

        // remove member from team
        if ('del-team' in ctx.request.body) {
            try {

                await TeamMember.delete(ctx.request.body['del-team']);
                // stay on same page showing new teams list
                ctx.redirect(ctx.url);

            } catch (e) {
                // stay on same page to report error
                ctx.flash = { _error: e.message };
                ctx.redirect(ctx.url);
            }
        }
    }


    /**
     * POST /members/:id/delete - process delete member
     */
    static async processDelete(ctx) {
        if (ctx.state.user.Role != 'admin') return ctx.redirect('/login'+ctx.url);

        try {

            await Member.delete(ctx.params.id);

            // return to list of members
            ctx.redirect('/members');

        } catch (e) {
            // stay on same page to report error
            ctx.flash = { _error: e.message };
            ctx.redirect(ctx.url);
        }
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = MembersHandlers;
