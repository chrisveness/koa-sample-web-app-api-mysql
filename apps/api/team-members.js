/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  API handlers - Teams                                                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const TeamMember = require('../../models/team-member.js');

const handler = module.exports = {};


/**
 * @api {get} /team-members/:id Get details of team-member.
 * @apiName   GetTeamMembersId
 * @apiGroup  TeamMembers
 *
 * @apiHeader  Authorization             Basic Access Authentication token.
 * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
 * @apiSuccess (Success 2xx) 200/OK      Full details of specified team.
 * @apiError   401/Unauthorized          Invalid basic auth credentials supplied.
 * @apiError   404/NotFound              Team-member not found.
 */
handler.getTeamMemberById = function*() {
    const teamMember = yield TeamMember.get(this.params.id);

    if (!teamMember) this.throw(404, `No team-member ${this.params.id} found`); // Not Found

    // return id as attribute / underscore-field
    teamMember._id = teamMember.TeamMemberId;

    this.body = teamMember;
    this.body.root = 'TeamMember';
};


/**
 * @api {post} /team-members Create new team-membership
 * @apiName    PostTeamMembers
 * @apiGroup   TeamMembers
 *
 * @apiParam   ...                       [as per get].
 * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
 * @apiHeader  Authorization             Basic Access Authentication token.
 * @apiHeader  Content-Type              application/x-www-form-urlencoded.
 * @apiSuccess (Success 2xx) 201/Created Details of newly created team-membership.
 * @apiError   401/Unauthorized          Invalid basic auth credentials supplied.
 * @apiError   403/Forbidden             Admin auth required.
 */
handler.postTeamMembers = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        const id = yield TeamMember.insert(this.request.body);

        this.body = yield TeamMember.get(id); // return created team-member details
        this.body.root = 'TeamMember';
        this.set('Location', '/team-members/'+id);
        this.status = 201; // Created

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
};


/**
 * @api {delete} /teams/:id Delete team-member
 * @apiName      DeleteTeamMembers
 * @apiGroup     TeamMembers
 *
 * @apiHeader  Authorization        Basic Access Authentication token.
 * @apiSuccess (Success 2xx) 200/OK Full details of deleted team-member.
 * @apiError   401/Unauthorized     Invalid basic auth credentials supplied.
 * @apiError   403/Forbidden        Admin auth required.
 * @apiError   404/NotFound         Team-member not found.
 */
handler.deleteTeamMemberById = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        // return deleted team-member details
        const teamMember = yield TeamMember.get(this.params.id);

        if (!teamMember) this.throw(404, `No team-member ${this.params.id} found`); // Not Found

        yield TeamMember.delete(this.params.id);

        this.body = teamMember; // deleted team-member details
        this.body.root = 'TeamMember';

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
