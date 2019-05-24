/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  API handlers - Teams/Members                                                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import TeamMember from '../models/team-member.js';


class TeamsMembersHandlers {

    /**
     * @api {get} /team-members/:id Get details of team-member.
     * @apiName   GetTeamMembersId
     * @apiGroup  TeamMembers
     *
     * @apiHeader  Authorization             Basic Access Authentication token.
     * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
     * @apiSuccess (Success 2xx) 200/OK      Full details of specified team.
     * @apiError   401/Unauthorized          Invalid JWT auth credentials supplied.
     * @apiError   404/NotFound              Team-member not found.
     */
    static async getTeamMemberById(ctx) {
        const teamMember = await TeamMember.get(ctx.params.id);

        if (!teamMember) ctx.throw(404, `No team-member ${ctx.params.id} found`); // Not Found

        // return id as attribute / underscore-field
        teamMember._id = teamMember.TeamMemberId;

        ctx.response.body = teamMember;
        ctx.response.body.root = 'TeamMember';
    }


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
     * @apiError   401/Unauthorized          Invalid JWT auth credentials supplied.
     * @apiError   403/Forbidden             Admin auth required.
     */
    static async postTeamMembers(ctx) {
        if (ctx.state.auth.Role != 'admin') ctx.throw(403, 'Admin auth required'); // Forbidden

        const id = await TeamMember.insert(ctx.request.body);

        ctx.response.body = await TeamMember.get(id); // return created team-member details
        ctx.response.body.root = 'TeamMember';
        ctx.response.set('Location', '/team-members/'+id);
        ctx.response.status = 201; // Created
    }


    /**
     * @api {delete} /teams/:id Delete team-member
     * @apiName      DeleteTeamMembers
     * @apiGroup     TeamMembers
     *
     * @apiHeader  Authorization        Basic Access Authentication token.
     * @apiSuccess (Success 2xx) 200/OK Full details of deleted team-member.
     * @apiError   401/Unauthorized     Invalid JWT auth credentials supplied.
     * @apiError   403/Forbidden        Admin auth required.
     * @apiError   404/NotFound         Team-member not found.
     */
    static async deleteTeamMemberById(ctx) {
        if (ctx.state.auth.Role != 'admin') ctx.throw(403, 'Admin auth required'); // Forbidden

        // return deleted team-member details
        const teamMember = await TeamMember.get(ctx.params.id);

        if (!teamMember) ctx.throw(404, `No team-member ${ctx.params.id} found`); // Not Found

        await TeamMember.delete(ctx.params.id);

        ctx.response.body = teamMember; // deleted team-member details
        ctx.response.body.root = 'TeamMember';
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default TeamsMembersHandlers;
