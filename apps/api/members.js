/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  API handlers - Members                                                                        */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Member = require('../../models/member.js');

const handler = module.exports = {};


/**
 * @api {get} /members List members
 * @apiName   GetMembers
 * @apiGroup  Members
 *
 * @apiDescription Summary list of members.
 *
 * @apiParam   -filter-field-              Field to be filtered on (eg /members?firstname=fred)
 * @apiHeader  Authorization               Basic Access Authentication token.
 * @apiHeader  [Accept=application/json]   application/json, application/xml, text/yaml, text/plain.
 * @apiSuccess (Success 2xx) 200/OK        List of members with id, uri attributes.
 * @apiSuccess (Success 2xx) 204/NoContent No matching members found.
 * @apiError   403/Forbidden               Unrecognised Member field in query.
 * @apiError   401/Unauthorized            Invalid basic auth credentials supplied.
 */
handler.getMembers = function*() {
    try {

        let sql = 'Select * From Member';
        // query-string filters?
        if (this.querystring) {
            const filter = Object.keys(this.query).map(function(q) { return q+' = :'+q; }).join(' and ');
            sql += ' Where '+filter;
        }
        sql +=  ' Order By Firstname, Lastname';

        const result = yield this.db.query({ sql: sql, namedPlaceholders: true }, this.query);
        const members = result[0];

        if (members.length == 0) this.throw(204); // No Content (preferred to returning 200 with empty list)

        // just id & uri attributes in list
        for (let m=0; m<members.length; m++) {
            members[m] = { _id: members[m].MemberId, _uri: '/members/'+members[m].MemberId };
        }

        this.body = members;
        this.body.root = 'Members';

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': this.throw(403, 'Unrecognised Member field'); break;
            default: this.throw(e.status||500, e.message);
        }
    }
};


/**
 * @api {get} /members/:id Get details of member (including team memberships).
 * @apiName   GetMembersId
 * @apiGroup  Members
 *
 * @apiHeader  Authorization            Basic Access Authentication token.
 * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
 * @apiSuccess (Success 2xx) 200/OK     Full details of specified member.
 * @apiError   401/Unauthorized         Invalid basic auth credentials supplied.
 * @apiError   404/NotFound             Member not found.
 */
handler.getMemberById = function*() {
    const member = yield Member.get(this.params.id);

    if (!member) this.throw(404); // Not Found

    // return id as attribute / underscore-field
    member._id = member.MemberId;

    // team membership
    const sql = `Select TeamId As _id, concat('/teams/',TeamId) As _uri From TeamMember Where MemberId = ?`;
    const result = yield this.db.query(sql, this.params.id);
    const teams = result[0];
    member.Teams = teams;

    this.body = member;
    this.body.root = 'Member';
};


/**
 * @api {post} /members Create new member
 * @apiName    PostMembers
 * @apiGroup   Members
 *
 * @apiParam   ...                       [as per get].
 * @apiHeader  Authorization             Basic Access Authentication token.
 * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
 * @apiHeader  Content-Type              application/x-www-form-urlencoded.
 * @apiSuccess (Success 2xx) 201/Created Details of newly created member.
 * @apiError   401/Unauthorized          Invalid basic auth credentials supplied.
 * @apiError   403/Forbidden             Admin auth required.
 */
handler.postMembers = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        const id = yield Member.insert(this.request.body);

        this.body = yield Member.get(id); // return created member details
        this.body.root = 'Member';
        this.set('Location', '/members/'+id);
        this.status = 201; // Created

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
};


/**
 * @api {patch} /members/:id Update member details
 * @apiName     PatchMembers
 * @apiGroup    Members
 *
 * @apiParam   ...                       [as per get].
 * @apiHeader  Authorization             Basic Access Authentication token.
 * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
 * @apiHeader  Content-Type              application/x-www-form-urlencoded.
 * @apiSuccess (Success 2xx) 200/OK      Updated member details.
 * @apiError   401/Unauthorized          Invalid basic auth credentials supplied.
 * @apiError   403/Forbidden             Admin auth required.
 * @apiError   404/NotFound              Member not found.
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
        this.throw(e.status||500, e.message);
    }
};


/**
 * @api {delete} /members/:id Delete member
 * @apiName      DeleteMembers
 * @apiGroup     Members
 *
 * @apiHeader  Authorization        Basic Access Authentication token.
 * @apiSuccess (Success 2xx) 200/OK Full details of deleted member.
 * @apiError   401/Unauthorized     Invalid basic auth credentials supplied.
 * @apiError   403/Forbidden        Admin auth required.
 * @apiError   404/NotFound         Member not found.
 */
handler.deleteMemberById = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        // return deleted member details
        const member = yield Member.get(this.params.id);

        if (!member) this.throw(404); // Not Found

        yield Member.delete(this.params.id);

        this.body = member; // deleted member details
        this.body.root = 'Member';

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
