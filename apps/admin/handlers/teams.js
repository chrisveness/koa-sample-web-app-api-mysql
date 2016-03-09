/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Teams handlers (invoked by router to render templates)                                         */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Team       = require('../../../models/team.js');
const TeamMember = require('../../../models/team-member.js');

const teams = module.exports = {};


/**
 * GET /teams - render list-teams page
 *
 * Results can be filtered with URL query strings eg /teams?name=alpha.
 */
teams.list = function*() {
    // build sql query including any query-string filters; eg ?field1=val1&field2=val2 becomes
    // "Where field1 = :field1 And field2 = :field2"
    let sql = 'Select * From Team';
    if (this.querystring) {
        const filter = Object.keys(this.query).map(function(q) { return q+' = :'+q; }).join(' and ');
        sql += ' Where '+filter;
    }
    sql +=  ' Order By Name';

    try {

        const result = yield this.db.query({ sql: sql, namedPlaceholders: true }, this.query);
        const teams = result[0];

        const context = { teams: teams };
        yield this.render('templates/teams-list', context);

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': this.throw(403, 'Unrecognised Team field'); break;
            default: this.throw(e.status||500, e.message); break;
        }
    }
};


/**
 * GET /teams/:id - render view-team page
 */
teams.view = function*() {
    const team = yield Team.get(this.params.id);
    if (!team) this.throw(404, 'Team not found');

    // team members
    const sql = `Select TeamMemberId, MemberId, Firstname, Lastname
                 From Member Inner Join TeamMember Using (MemberId)
                 Where TeamId = ?`;
    const result = yield this.db.query(sql, this.params.id);
    const members = result[0];

    const context = team;
    context.members = members;
    yield this.render('templates/teams-view', context);
};


/**
 * GET /teams/add - render add-team page
 */
teams.add = function*() {
    const context = this.flash.formdata || {}; // failed validation? fill in previous values
    yield this.render('templates/teams-add', context);
};


/**
 * GET /teams/:id/edit - render edit-team page
 */
teams.edit = function*() {
    // team details
    let team = yield Team.get(this.params.id);
    if (!team) this.throw(404, 'Team not found');
    if (this.flash.formdata) team = this.flash.formdata; // failed validation? fill in previous values

    // team members
    const sqlT = `Select TeamMemberId, MemberId, Firstname, Lastname
                  From TeamMember Inner Join Member Using (MemberId)
                  Where TeamId = ?
                  Order By Firstname, Lastname`;
    const resultT = yield this.db.query(sqlT, this.params.id);
    team.teamMembers = resultT[0];

    // members not in this team (for add picklist)
    let members = team.teamMembers.map(function(m) { return m.MemberId; }); // array of id's
    if (members.length == 0) members = [0]; // dummy to satisfy sql 'in' syntax
    const sqlM = `Select MemberId, Firstname, Lastname
                  From Member
                  Where MemberId Not In (`+members.join(',')+`)
                  Order By Firstname, Lastname`;
    const resultM = yield this.db.query(sqlM, members);
    team.notTeamMembers = resultM[0];

    const context = team;
    yield this.render('templates/teams-edit', context);
};


/**
 * GET /teams/:id/delete - render delete-team page
 */
teams.delete = function*() {
    const team = yield Team.get(this.params.id);
    if (!team) this.throw(404, 'Team not found');

    const context = team;
    yield this.render('templates/teams-delete', context);
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


/**
 * POST /teams/:id - process add-team
 */
teams.processAdd = function*() {
    if (this.passport.user.Role != 'admin') return this.redirect('/login'+this.url);

    try {

        const id = yield Team.insert(this.request.body);
        this.set('X-Insert-Id', id); // for integration tests

        // return to list of members
        this.redirect('/teams');

    } catch (e) {
        // stay on same page to report error (with current filled fields)
        this.flash = { formdata: this.request.body, _error: e.message };
        this.redirect(this.url);
    }
};


/**
 * POST /teams/:id/edit - process edit-team
 */
teams.processEdit = function*() {
    if (this.passport.user.Role != 'admin') return this.redirect('/login'+this.url);

    // update team details
    if ('Name' in this.request.body) {
        try {

            yield Team.update(this.params.id, this.request.body);

            // return to list of members
            this.redirect('/teams');

        } catch (e) {
            // stay on same page to report error (with current filled fields)
            this.flash = { formdata: this.request.body, _error: e.message };
            this.redirect(this.url);
        }
    }

    // add member to team
    if ('add-member' in this.request.body) {
        const values = {
            TeamId:   this.params.id,
            MemberId: this.request.body['add-member'],
            JoinedOn: new Date().toISOString().replace('T', ' ').split('.')[0],
        };

        try {

            const id = yield TeamMember.insert(values);
            this.set('X-Insert-Id', id); // for integration tests

            // stay on same page showing new team member
            this.redirect(this.url);

        } catch (e) {
            // stay on same page to report error
            this.flash = { formdata: this.request.body, _error: e.message };
            this.redirect(this.url);
        }
    }

    // remove member from team
    if ('del-member' in this.request.body) {
        try {

            yield TeamMember.delete(this.request.body['del-member']);
            // stay on same page showing new members list
            this.redirect(this.url);

        } catch (e) {
            // stay on same page to report error
            this.flash = { _error: e.message };
            this.redirect(this.url);
        }
    }
};


/**
 * POST /teams/:id/delete - process delete-team
 */
teams.processDelete = function*() {
    if (this.passport.user.Role != 'admin') return this.redirect('/login'+this.url);

    try {

        yield Team.delete(this.params.id);

        // return to list of teams
        this.redirect('/teams');

    } catch (e) {
        // stay on same page to report error
        this.flash = { _error: e.message };
        this.redirect(this.url);
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
