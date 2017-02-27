/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Teams handlers (invoked by router to render templates)                                         */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Team       = require('../../models/team.js');
const TeamMember = require('../../models/team-member.js');


class TeamsHandlers {

    /**
     * GET /teams - render list-teams page
     *
     * Results can be filtered with URL query strings eg /teams?name=alpha.
     */
    static async list(ctx) {
        // build sql query including any query-string filters; eg ?field1=val1&field2=val2 becomes
        // "Where field1 = :field1 And field2 = :field2"
        let sql = 'Select * From Team';
        if (ctx.querystring) {
            const filter = Object.keys(ctx.query).map(function(q) { return q+' = :'+q; }).join(' and ');
            sql += ' Where '+filter;
        }
        sql +=  ' Order By Name';

        try {

            const [teams] = await ctx.state.db.query(sql, ctx.query);

            await ctx.render('teams-list', { teams });

        } catch (e) {
            switch (e.code) {
                case 'ER_BAD_FIELD_ERROR': ctx.throw(403, 'Unrecognised Team field'); break;
                default: throw e;
            }
        }
    }


    /**
     * GET /teams/:id - render view-team page
     */
    static async view(ctx) {
        const team = await Team.get(ctx.params.id);
        if (!team) ctx.throw(404, 'Team not found');

        // team members
        const sql = `Select TeamMemberId, MemberId, Firstname, Lastname
                 From Member Inner Join TeamMember Using (MemberId)
                 Where TeamId = :id`;
        const [members] = await ctx.state.db.query(sql, { id: ctx.params.id });

        const context = team;
        context.members = members;
        await ctx.render('teams-view', context);
    }


    /**
     * GET /teams/add - render add-team page
     */
    static async add(ctx) {
        const context = ctx.flash.formdata || {}; // failed validation? fill in previous values
        await ctx.render('teams-add', context);
    }


    /**
     * GET /teams/:id/edit - render edit-team page
     */
    static async edit(ctx) {
        // team details
        const team = await Team.get(ctx.params.id);
        if (!team) ctx.throw(404, 'Team not found');
        if (ctx.flash.formdata) Object.assign(team, ctx.flash.formdata); // failed validation? fill in previous values

        // team members
        const sqlT = `Select TeamMemberId, MemberId, Firstname, Lastname
                  From TeamMember Inner Join Member Using (MemberId)
                  Where TeamId = :id
                  Order By Firstname, Lastname`;
        const [teamMembers] = await ctx.state.db.query(sqlT, { id: ctx.params.id });
        team.teamMembers = teamMembers;

        // members not in this team (for add picklist)
        let members = team.teamMembers.map(function(m) { return m.MemberId; }); // array of id's
        if (members.length == 0) members = [0]; // dummy to satisfy sql 'in' syntax
        const sqlM = `Select MemberId, Firstname, Lastname
                  From Member
                  Where MemberId Not In (`+members.join(',')+`)
                  Order By Firstname, Lastname`;
        const [notTeamMembers] = await ctx.state.db.query(sqlM, members);
        team.notTeamMembers = notTeamMembers;

        const context = team;
        await ctx.render('teams-edit', context);
    }


    /**
     * GET /teams/:id/delete - render delete-team page
     */
    static async delete(ctx) {
        const team = await Team.get(ctx.params.id);
        if (!team) ctx.throw(404, 'Team not found');

        const context = team;
        await ctx.render('teams-delete', context);
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * POST /teams/:id - process add-team
     */
    static async processAdd(ctx) {
        if (ctx.state.user.Role != 'admin') return ctx.redirect('/login'+ctx.url);

        try {

            const id = await Team.insert(ctx.request.body);
            ctx.set('X-Insert-Id', id); // for integration tests

            // return to list of members
            ctx.redirect('/teams');

        } catch (e) {
            // stay on same page to report error (with current filled fields)
            ctx.flash = { formdata: ctx.request.body, _error: e.message };
            ctx.redirect(ctx.url);
        }
    }


    /**
     * POST /teams/:id/edit - process edit-team
     */
    static async processEdit(ctx) {
        if (ctx.state.user.Role != 'admin') return ctx.redirect('/login'+ctx.url);

        // update team details
        if ('Name' in ctx.request.body) {
            try {

                await Team.update(ctx.params.id, ctx.request.body);

                // return to list of members
                ctx.redirect('/teams');

            } catch (e) {
                // stay on same page to report error (with current filled fields)
                ctx.flash = { formdata: ctx.request.body, _error: e.message };
                ctx.redirect(ctx.url);
            }
        }

        // add member to team
        if ('add-member' in ctx.request.body) {
            const values = {
                TeamId:   ctx.params.id,
                MemberId: ctx.request.body['add-member'],
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
        if ('del-member' in ctx.request.body) {
            try {

                await TeamMember.delete(ctx.request.body['del-member']);
                // stay on same page showing new members list
                ctx.redirect(ctx.url);

            } catch (e) {
                // stay on same page to report error
                ctx.flash = { _error: e.message };
                ctx.redirect(ctx.url);
            }
        }
    }


    /**
     * POST /teams/:id/delete - process delete-team
     */
    static async processDelete(ctx) {
        if (ctx.state.user.Role != 'admin') return ctx.redirect('/login'+ctx.url);

        try {

            await Team.delete(ctx.params.id);

            // return to list of teams
            ctx.redirect('/teams');

        } catch (e) {
            // stay on same page to report error
            ctx.flash = { _error: e.message };
            ctx.redirect(ctx.url);
        }
    }


}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = TeamsHandlers;
