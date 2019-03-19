/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Teams handlers (invoked by router to render templates)                                         */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Team             from '../../models/team.js';
import TeamMember       from '../../models/team-member.js';
import Db               from '../../lib/mysqldb.js';
import validationErrors from '../../lib/validation-errors.js';


class TeamsHandlers {

    /**
     * GET /teams - render list-teams page.
     *
     * Results can be filtered with URL query strings eg /teams?name=alpha.
     */
    static async list(ctx) {
        // build sql query including any query-string filters; eg ?field1=val1&field2=val2 becomes
        // "Where field1 = :field1 And field2 = :field2"
        let sql = 'Select * From Team';
        if (ctx.request.querystring) {
            const filter = Object.keys(ctx.request.query).map(q => `${q} = :${q}`).join(' and ');
            sql += ' Where '+filter;
        }
        sql +=  ' Order By Name';

        try {

            const [ teams ] = await Db.query(sql, ctx.request.query);

            await ctx.render('teams-list', { teams });

        } catch (e) {
            switch (e.code) {
                case 'ER_BAD_FIELD_ERROR': ctx.throw(403, 'Unrecognised Team field'); break;
                default: throw e;
            }
        }
    }


    /**
     * GET /teams/:id - render view-team page.
     */
    static async view(ctx) {
        // team details
        const team = await Team.get(ctx.params.id);
        if (!team) ctx.throw(404, 'Team not found');

        // team members
        const sql = `Select TeamMemberId, MemberId, Firstname, Lastname
                     From Member Inner Join Team Using (MemberId)
                     Where TeamId = :id`;
        const [ members ] = await Db.query(sql, { id: ctx.params.id });

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
     * GET /teams/:id/edit - render edit-team page.
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
        const [ teamMembers ] = await Db.query(sqlT, { id: ctx.params.id });
        team.teamMembers = teamMembers;

        // members not in this team (for add picklist)
        let members = team.teamMembers.map(function(m) { return m.MemberId; }); // array of id's
        if (members.length == 0) members = [ 0 ]; // dummy to satisfy sql 'in' syntax
        const sqlM = `Select MemberId, Firstname, Lastname
                      From Member
                      Where MemberId Not In (`+members.join(',')+`)
                      Order By Firstname, Lastname`;
        const [ notTeamMembers ] = await Db.query(sqlM, members);
        team.notTeamMembers = notTeamMembers;

        const context = team;
        await ctx.render('teams-edit', context);
    }


    /**
     * GET /teams/:id/delete - render delete-team page.
     */
    static async delete(ctx) {
        const team = await Team.get(ctx.params.id);
        if (!team) ctx.throw(404, 'Team not found');

        const context = team;
        await ctx.render('teams-delete', context);
    }


    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
    /* POST processing                                                                            */
    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


    /**
     * POST /teams/add - process add-team.
     */
    static async processAdd(ctx) {
        if (ctx.state.user.Role != 'admin') {
            ctx.flash = { _error: 'Team management requires admin privileges' };
            return ctx.response.redirect('/login'+ctx.request.url);
        }

        const body = ctx.request.body;

        try {

            const validation = { // back-end validation matching HTML5 validation
                Name: 'required',
            };

            if (validationErrors(body, validation)) {
                throw new Error(validationErrors(body, validation));
            }

            const id = await Team.insert(body);
            ctx.response.set('X-Insert-Id', id); // for integration tests

            // return to list of members
            ctx.response.redirect('/teams');

        } catch (e) {
            // stay on same page to report error (with current filled fields)
            ctx.flash = { formdata: body, _error: e.message };
            ctx.response.redirect(ctx.request.url);
        }
    }


    /**
     * POST /teams/:id/edit - process edit-team.
     */
    static async processEdit(ctx) {
        if (ctx.state.user.Role != 'admin') {
            ctx.flash = { _error: 'Team management requires admin privileges' };
            return ctx.response.redirect('/login'+ctx.request.url);
        }

        const body = ctx.request.body;

        // update team details
        if ('Name' in body) {
            try {

                const validation = { // back-end validation matching HTML5 validation
                    Name: 'required',
                };

                if (validationErrors(body, validation)) {
                    throw new Error(validationErrors(body, validation));
                }

                await Team.update(ctx.params.id, body);

                // return to list of members
                ctx.response.redirect('/teams');

            } catch (e) {
                // stay on same page to report error (with current filled fields)
                ctx.flash = { formdata: body, _error: e.message };
                ctx.response.redirect(ctx.request.url);
            }
        }

        // add member to team
        if ('add-member' in body) {
            const values = {
                TeamId:   ctx.params.id,
                MemberId: body['add-member'],
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
        if ('del-member' in body) {
            try {

                await TeamMember.delete(body['del-member']);
                // stay on same page showing new members list
                ctx.response.redirect(ctx.request.url);

            } catch (e) {
                // stay on same page to report error
                ctx.flash = { _error: e.message };
                ctx.response.redirect(ctx.request.url);
            }
        }
    }


    /**
     * POST /teams/:id/delete - process delete-team.
     */
    static async processDelete(ctx) {
        if (ctx.state.user.Role != 'admin') {
            ctx.flash = { _error: 'Team management requires admin privileges' };
            return ctx.response.redirect('/login'+ctx.request.url);
        }

        try {

            await Team.delete(ctx.params.id);

            // return to list of teams
            ctx.response.redirect('/teams');

        } catch (e) {
            // stay on same page to report error
            ctx.flash = { _error: e.message };
            ctx.response.redirect(ctx.request.url);
        }
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default TeamsHandlers;
