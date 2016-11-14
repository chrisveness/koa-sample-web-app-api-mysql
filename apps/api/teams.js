/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  API handlers - Teams                                                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const Team = require('../../models/team.js');

const handler = module.exports = {};


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
 * @apiError   401/Unauthorized            Invalid basic auth credentials supplied.
 */
handler.getTeams = function*() {
    try {

        let sql = 'Select * From Team';
        // query-string filters?
        if (this.querystring) {
            const filter = Object.keys(this.query).map(function(q) { return q+' = :'+q; }).join(' and ');
            sql += ' Where '+filter;
        }
        sql +=  ' Order By Name';

        const [teams] = yield this.state.db.query(sql, this.query);

        if (teams.length == 0) this.throw(204); // No Content (preferred to returning 200 with empty list)

        // just id & uri attributes in list
        for (let m=0; m<teams.length; m++) {
            teams[m] = { _id: teams[m].TeamId, _uri: '/teams/'+teams[m].TeamId };
        }

        this.body = teams;
        this.body.root = 'Teams';

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': this.throw(403, 'Unrecognised Team field'); break;
            default: throw e;
        }
    }
};


/**
 * @api {get} /teams/:id Get details of team (including team memberships).
 * @apiName   GetTeamsId
 * @apiGroup  Teams
 *
 * @apiHeader  Authorization             Basic Access Authentication token.
 * @apiHeader  [Accept=application/json] application/json, application/xml, text/yaml, text/plain.
 * @apiSuccess (Success 2xx) 200/OK      Full details of specified team.
 * @apiError   401/Unauthorized          Invalid basic auth credentials supplied.
 * @apiError   404/NotFound              Team not found.
 */
handler.getTeamById = function*() {
    const team = yield Team.get(this.params.id);

    if (!team) this.throw(404, `No team ${this.params.id} found`); // Not Found

    // return id as attribute / underscore-field
    team._id = team.TeamId;

    // team membership
    const sql = 'Select MemberId As _id, concat("/members/",MemberId) As _uri From TeamMember Where TeamId = :id';
    const [members] = yield this.state.db.query(sql, { id: this.params.id });
    team.Members = members;

    this.body = team;
    this.body.root = 'Team';
};


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
 * @apiError   401/Unauthorized          Invalid basic auth credentials supplied.
 * @apiError   403/Forbidden             Admin auth required.
 */
handler.postTeams = function*() {
    if (this.state.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    const id = yield Team.insert(this.request.body);

    this.body = yield Team.get(id); // return created team details
    this.body.root = 'Team';
    this.set('Location', '/teams/'+id);
    this.status = 201; // Created
};


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
 * @apiError   401/Unauthorized          Invalid basic auth credentials supplied.
 * @apiError   403/Forbidden             Admin auth required.
 * @apiError   404/NotFound              Team not found.
 */
handler.patchTeamById = function*() {
    if (this.state.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    yield Team.update(this.params.id, this.request.body);

    // return updated team details
    this.body = yield Team.get(this.params.id);
    if (!this.body) this.throw(404, `No team ${this.params.id} found`); // Not Found

    this.body.root = 'Team';
};


/**
 * @api {delete} /teams/:id Delete team
 * @apiName      DeleteTeams
 * @apiGroup     Teams
 *
 * @apiHeader  Authorization        Basic Access Authentication token.
 * @apiSuccess (Success 2xx) 200/OK Full details of deleted team.
 * @apiError   401/Unauthorized     Invalid basic auth credentials supplied.
 * @apiError   403/Forbidden        Admin auth required.
 * @apiError   404/NotFound         Team not found.
 */
handler.deleteTeamById = function*() {
    if (this.state.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    // return deleted team details
    const team = yield Team.get(this.params.id);

    if (!team) this.throw(404, `No team ${this.params.id} found`); // Not Found

    yield Team.delete(this.params.id);

    this.body = team; // deleted team details
    this.body.root = 'Team';
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
