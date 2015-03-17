/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  API handlers - Members                                                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let Member = require('../../models/member.js');

let handler = module.exports = {};


/**
 * GET /members - return list of members.
 *
 * args: fieldname=match to filter by field name eg /members?email=fred@bloggs.com
 * returns: 200 OK, 204 No Content
 */
handler.getMembers = function*() {
    let sql = 'Select * From Member';
    // query-string filters?
    if (this.querystring) {
        let filter = Object.keys(this.query).map(function(q) { return q+' = :'+q; }).join(' and ');
        sql += ' Where '+filter;
    }
    sql +=  ' Order By Firstname, Lastname';

    try {

        let result = yield this.db.query({ sql: sql, namedPlaceholders: true }, this.query);
        let members = result[0];

        if (!members) this.throw(204); // No Content

        // just id & uri attributes in list
        for (let m=0; m<members.length; m++) {
            members[m] = { _id: members[m].MemberId, _uri: '/members/'+members[m].MemberId };
        }

        this.body = members;
        this.body.root = 'Members';

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': this.throw(406, 'Unrecognised search term'); break;
            default: throw e;
        }
    }
};


/**
 * GET /members/:id - return member details (including team memberships).
 *
 * returns: 200 OK, 404 Not Found
 */
handler.getMemberById = function*() {
    let member = yield Member.get(this.params.id);

    if (!member) this.throw(404); // Not Found

    // return id as attribute / underscore-field
    member._id = member.MemberId;

    // team membership
    let sql = `Select TeamId As _id, concat('/teams/',TeamId) As _uri From TeamMember Where MemberId = ?`;
    let result = yield this.db.query(sql, this.params.id);
    let teams = result[0];
    member.Teams = teams;

    this.body = member;
    this.body.root = 'Member';
};


/**
 * POST /members - create new member
 *
 * returns: 201 OK, 403 Forbidden
 */
handler.postMembers = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        let id = yield Member.insert(this.request.body);

        this.body = yield Member.get(id); // return created member details
        this.body.root = 'Member';
        this.set('Location', '/members/'+id);
        this.status = 201; // Created

    } catch (e) {
        this.body = { error: e.message };
        this.status = e.status;
    }
};


/**
 * PATCH /members - update member details
 *
 * returns: 200 OK, 403 Forbidden, 404 Not Found
 */
handler.patchMemberById = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        yield Member.update(this.params.id, this.request.body);

        // return updated member details
        this.body = yield Member.get(this.params.id);
        if (!this.body) this.throw(404); // Not Found

        this.body.root = 'Member';

    } catch (e) {
        this.body = { error: e.message };
        this.status = e.status;
    }
};


/**
 * DELETE /members - delete member
 *
 * returns: 200 OK, 403 Forbidden, 404 Not Found
 */
handler.deleteMemberById = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        // return deleted member details
        let member = yield Member.get(this.params.id);

        if (!member) this.throw(404); // Not Found

        yield Member.delete(this.params.id);

        this.body = member; // deleted member details
        this.body.root = 'Member';

    } catch (e) {
        this.body = { error: e.message };
        this.status = e.status;
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
