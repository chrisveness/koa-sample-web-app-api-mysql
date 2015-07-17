/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  API handlers - Teams                                                                          */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

let Team = require('../../models/team.js');

let handler = module.exports = {};


/**
 * GET /teams - return list of teams
 *
 * args: fieldname=match to filter by fieldname eg /teams?name=brainiacs
 * returns: 200 OK, 204 No Content
 */
handler.getTeams = function*() {
    let sql = 'Select * From Team';
    // query-string filters?
    if (this.querystring) {
        let filter = Object.keys(this.query).map(function(q) { return q+' = :'+q; }).join(' and ');
        sql += ' Where '+filter;
    }
    sql +=  ' Order By Name';

    try {

        let result = yield this.db.query({ sql: sql, namedPlaceholders: true }, this.query);
        let teams = result[0];

        if (teams.length == 0) this.throw(204); // No Content (preferred to returning 200 with empty list)

        // just id & uri attributes in list
        for (let m=0; m<teams.length; m++) {
            teams[m] = { _id: teams[m].TeamId, _uri: '/teams/'+teams[m].TeamId };
        }

        this.body = teams;
        this.body.root = 'Teams';

    } catch (e) {
        switch (e.code) {
            case 'ER_BAD_FIELD_ERROR': this.throw(406, 'Unrecognised Team field'); break;
            default: this.throw(e.status||500, e.message);
        }
    }
};


/**
 * GET /teams/:id - return team details (including team memberships)
 *
 * returns: 200 OK, 404 Not Found
 */
handler.getTeamById = function*() {
    let team = yield Team.get(this.params.id);

    if (!team) this.throw(404); // Not Found

    // return id as attribute / underscore-field
    team._id = team.TeamId;

    // team membership
    let sql = `Select MemberId As _id, concat('/members/',MemberId) As _uri From TeamMember Where TeamId = ?`;
    let result = yield this.db.query(sql, this.params.id);
    let members = result[0];
    team.Members = members;

    this.body = team;
    this.body.root = 'Team';
};


/**
 * POST /teams - create new team
 *
 * returns: 201 OK, 403 Forbidden
 */
handler.postTeams = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        let id = yield Team.insert(this.request.body);

        this.body = yield Team.get(id); // return created team details
        this.body.root = 'Team';
        this.set('Location', '/teams/'+id);
        this.status = 201; // Created

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
};


/**
 * PATCH /teams - update team details
 *
 * returns: 200 OK, 403 Forbidden, 404 Not Found
 */
handler.patchTeamById = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        yield Team.update(this.params.id, this.request.body);

        // return updated team details
        this.body = yield Team.get(this.params.id);
        if (!this.body) this.throw(404); // Not Found

        this.body.root = 'Team';

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
};


/**
 * DELETE /teams - delete team
 *
 * returns: 200 OK, 403 Forbidden, 404 Not Found
 */
handler.deleteTeamById = function*() {
    if (this.auth.user.Role != 'admin') this.throw(403, 'Admin auth required'); // Forbidden

    try {

        // return deleted team details
        let team = yield Team.get(this.params.id);

        if (!team) this.throw(404); // Not Found

        yield Team.delete(this.params.id);

        this.body = team; // deleted team details
        this.body.root = 'Team';

    } catch (e) {
        this.throw(e.status||500, e.message);
    }
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
