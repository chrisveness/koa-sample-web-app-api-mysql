/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  API handlers - Teams                                                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import Team from '../models/team.js';
import Db   from '../lib/mysqldb.js';


class TeamsHandlers {

    /**
     * @api {get} /teams List teams
     * @apiName   GetTeams
     * @apiGroup  Teams
     *
     * @apiDescription Summary list of teams.
     *
     * @apiParam   -filter-field-              Field to be filtered on (eg /teams?name=brainiacs)
     * @apiHeader  Authorization               Basic Access Authentication token.
     * @apiHeader  [Accept=application/json]   application/json, application/xml, text/yaml, text/plain.
     * @apiSuccess (Success 2xx) 200/OK        List of teams with id, uri attributes.
     * @apiSuccess (Success 2xx) 204/NoContent No matching teams found.
     * @apiError   403/Forbidden               Unrecognised Team field in query.
     * @apiError   401/Unauthorized            Invalid JWT auth credentials supplied.
     */
    static async getTeams(ctx) {
        try {

            let sql = 'Select * From Team';
            // query-string filters?
            if (ctx.request.querystring) {
                const filter = Object.keys(ctx.request.query).map(function(q) { return q+' = :'+q; }).join(' and ');
                sql += ' Where '+filter;
            }
            sql +=  ' Order By Name';

            const [ teams ] = await Db.query(sql, ctx.request.query);

            if (teams.length == 0) { ctx.response.status = 204; return; } // No Content (preferred to returning 200 with empty list)

            // just id & uri attributes in list
            for (let m=0; m<teams.length; m++) {
                teams[m] = { _id: teams[m].TeamId, _uri: '/teams/'+teams[m].TeamId };
            }

            ctx.response.body = teams;
            ctx.response.body.root = 'Teams';

        } catch (e) {
            switch (e.code) {
                case 'ER_BAD_FIELD_ERROR': ctx.throw(403, 'Unrecognised Team field'); break;
                default: throw e;
            }
        }
    }


    /**
     * @api {get} /teams/:id Get details of team (including team memberships).
     * @apiName   GetTeamsId
     * @apiGroup  Teams
     *
     * @apiHeader  Authorization             Basic Access Authentication token.
     * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
     * @apiSuccess (Success 2xx) 200/OK      Full details of specified team.
     * @apiError   401/Unauthorized          Invalid JWT auth credentials supplied.
     * @apiError   404/NotFound              Team not found.
     */
    static async getTeamById(ctx) {
        const team = await Team.get(ctx.params.id);

        if (!team) ctx.throw(404, `No team ${ctx.params.id} found`); // Not Found

        // return id as attribute / underscore-field
        team._id = team.TeamId;

        // team membership
        const sql = 'Select MemberId As _id, concat("/members/",MemberId) As _uri From TeamMember Where TeamId = :id';
        const [ members ] = await Db.query(sql,  { id: ctx.params.id });
        team.Members = members;

        ctx.response.body = team;
        ctx.response.body.root = 'Team';
    }


    /**
     * @api {post} /teams Create new team
     * @apiName    PostTeams
     * @apiGroup   Teams
     *
     * @apiParam   ...                       [as per get].
     * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
     * @apiHeader  Authorization             Basic Access Authentication token.
     * @apiHeader  Content-Type              application/x-www-form-urlencoded.
     * @apiSuccess (Success 2xx) 201/Created Details of newly created team.
     * @apiError   401/Unauthorized          Invalid JWT auth credentials supplied.
     * @apiError   403/Forbidden             Admin auth required.
     */
    static async postTeams(ctx) {
        if (ctx.state.auth.Role != 'admin') ctx.throw(403, 'Admin auth required'); // Forbidden

        const id = await Team.insert(ctx.request.body);

        ctx.response.body = await Team.get(id); // return created team details
        ctx.response.body.root = 'Team';
        ctx.response.set('Location', '/teams/'+id);
        ctx.response.status = 201; // Created
    }


    /**
     * @api {patch} /teams/:id Update team details
     * @apiName     PatchTeams
     * @apiGroup    Teams
     *
     * @apiParam   ...                       [as per get].
     * @apiHeader  Authorization             Basic Access Authentication token.
     * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
     * @apiHeader  Content-Type              application/x-www-form-urlencoded.
     * @apiSuccess (Success 2xx) 200/OK      Updated team details.
     * @apiError   401/Unauthorized          Invalid JWT auth credentials supplied.
     * @apiError   403/Forbidden             Admin auth required.
     * @apiError   404/NotFound              Team not found.
     */
    static async patchTeamById(ctx) {
        if (ctx.state.auth.Role != 'admin') ctx.throw(403, 'Admin auth required'); // Forbidden

        await Team.update(ctx.params.id, ctx.request.body);

        // return updated team details
        ctx.response.body = await Team.get(ctx.params.id);
        if (!ctx.response.body) ctx.throw(404, `No team ${ctx.params.id} found`); // Not Found

        ctx.response.body.root = 'Team';
    }


    /**
     * @api {delete} /teams/:id Delete team
     * @apiName      DeleteTeams
     * @apiGroup     Teams
     *
     * @apiHeader  Authorization        Basic Access Authentication token.
     * @apiSuccess (Success 2xx) 200/OK Full details of deleted team.
     * @apiError   401/Unauthorized     Invalid JWT auth credentials supplied.
     * @apiError   403/Forbidden        Admin auth required.
     * @apiError   404/NotFound         Team not found.
     */
    static async deleteTeamById(ctx) {
        if (ctx.state.auth.Role != 'admin') ctx.throw(403, 'Admin auth required'); // Forbidden

        // return deleted team details
        const team = await Team.get(ctx.params.id);

        if (!team) ctx.throw(404, `No team ${ctx.params.id} found`); // Not Found

        await Team.delete(ctx.params.id);

        ctx.response.body = team; // deleted team details
        ctx.response.body.root = 'Team';
    }


}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export default TeamsHandlers;
