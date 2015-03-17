/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Members handlers (invoked by router to render templates)                                       */
/*                                                                                                */
/* All functions here either render or redirect, or throw.                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let Member     = require('../../../models/member.js');
let TeamMember = require('../../../models/team-member.js');

let members = module.exports = {};


/**
 * GET /members - render list-members page.
 *
 * Results can be filtered with URL query strings eg /members?firstname=alice.
 */
members.list = function*() {
    // build sql query including any query-string filters; eg ?field1=val1&field2=val2 becomes
    // "Where field1 = :field1 And field2 = :field2"
    let sql = 'Select * From Member';
    if (this.querystring) {
        let filter = Object.keys(this.query).map(function(q) { return q+' = :'+q; }).join(' and ');
        sql += ' Where '+filter;
    }
    sql +=  ' Order By Firstname, Lastname';

    try {

        let result = yield this.db.query({ sql: sql, namedPlaceholders: true }, this.query);
        let members = result[0];

        let context = { members: members };
        yield this.render('members/templates/members-list', context);

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': this.throw(406, 'Unrecognised search term'); break;
            default: throw e;
        }
    }
};


/**
 * GET /members/:id - render view-member page
 */
members.view = function*() {
    let member = yield Member.get(this.params.id);
    if (!member) this.throw(404, 'Member not found');

    // team membership
    let sql = `Select TeamMemberId, TeamId, Name
               From TeamMember Inner Join Team Using (TeamId)
               Where MemberId = ?`;
    let result = yield this.db.query(sql, this.params.id);
    let teams = result[0];

    let context = member;
    context.teams = teams;
    yield this.render('members/templates/members-view', context);
};


/**
 * GET /members/add - render add-member page
 */
members.add = function*() {
    let context = this.flash.formdata || {}; // failed validation? fill in previous values
    yield this.render('members/templates/members-add.html', context);
};


/**
 * GET /members/:id/edit - render edit-member page
 */
members.edit = function*() {
    let sql = null, result = null;

    // member details
    let member = yield Member.get(this.params.id);
    if (!member) this.throw(404, 'Member not found');
    if (this.flash.formdata) member = this.flash.formdata; // failed validation? fill in previous values

    // team membership
    sql = `Select TeamMemberId, TeamId, Name
           From TeamMember Inner Join Team Using (TeamId)
           Where MemberId = ?`;
    result = yield this.db.query(sql, this.params.id);
    member.memberOfTeams = result[0];

    // teams this member is not a member of (for add picklist)
    let teams = member.memberOfTeams.map(function(t) { return t.TeamId; }); // array of id's
    if (teams.length == 0) teams = [0]; // dummy to satisfy sql 'in' syntax
    sql = `Select TeamId, Name From Team Where TeamId Not In (`+teams.join(',')+`) Order By Name`;
    result = yield this.db.query(sql, teams);
    member.notMemberOfTeams = result[0];

    let context = member;
    yield this.render('members/templates/members-edit', context);
};


/**
 * GET /members/:id/delete - render delete-member page
 */
members.delete = function*() {
    let member = yield Member.get(this.params.id);
    if (!member) this.throw(404, 'Member not found');

    let context = member;
    yield this.render('members/templates/members-delete', context);
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


/**
 * POST /members - process add-member
 */
members.processAdd = function*() {
    if (this.passport.user.Role != 'admin') return this.redirect('/login'+this.url);

	try {

        let id = yield Member.insert(this.request.body);
        this.set('X-Insert-Id', id); // for integration tests

        // return to list of members
        this.redirect('/members');

    } catch (e) {
        // stay on same page to report error (with current filled fields)
        this.flash = { formdata: this.request.body, _error: e.message };
        this.redirect('/members/add');
    }
};


/**
 * POST /members/:id/edit - process edit-member
 */
members.processEdit = function*() {
    if (this.passport.user.Role != 'admin') return this.redirect('/login'+this.url);

    // update member details
    if ('Firstname' in this.request.body) {
        try {

            yield Member.update(this.params.id, this.request.body);

            // return to list of members
            this.redirect('/members');

        } catch (e) {
            // stay on same page to report error (with current filled fields)
            this.flash = { formdata: this.request.body, _error: e.message };
            this.redirect(this.url);
        }
    }

    // add member to team
    if ('add-team' in this.request.body) {
        let values = {
            MemberId: this.params.id,
            TeamId:   this.request.body['add-team'],
            JoinedOn: new Date().toISOString().replace('T', ' ').split('.')[0],
        };

        try {

            let id = yield TeamMember.insert(values);
            this.set('X-Insert-Id', id); // for integration tests

            // stay on same page showing new team member
            this.redirect(this.url);

        } catch (e) {
            // stay on same page to report error
            this.flash = { _error: e.message };
            this.redirect(this.url);
        }
    }

    // remove member from team
    if ('del-team' in this.request.body) {
        try {

            yield TeamMember.delete(this.request.body['del-team']);
            // stay on same page showing new teams list
            this.redirect(this.url);

        } catch (e) {
            // stay on same page to report error
            this.flash = { _error: e.message };
            this.redirect(this.url);
        }
    }
};


/**
 * POST /members/:id/delete - process delete member
 */
members.processDelete = function*() {
    if (this.passport.user.Role != 'admin') return this.redirect('/login'+this.url);

    try {

        yield Member.delete(this.params.id);

        // return to list of members
        this.redirect('/members');

    } catch (e) {
        // stay on same page to report error
        this.flash = { _error: e.message };
        this.redirect(this.url);
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
