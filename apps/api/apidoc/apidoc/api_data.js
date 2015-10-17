define({ "api": [
  {
    "type": "get",
    "url": "/auth",
    "title": "Get authentication token for subsequent API requests",
    "name": "GetAuth",
    "group": "Auth",
    "description": "<p>Subsequent requests are made with basic auth username = id, password = token.</p> <p>Note validation for /auth is by email+pw using bcrypt.compare which is slow, so auth is done once and token is retained temporarily by client; subsequent requests have a fast check of the token.</p> <p>The token has a 24-hour limited lifetime.</p> ",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication {email, password}</p> "
          },
          {
            "group": "Header",
            "optional": true,
            "field": "Accept",
            "defaultValue": "application/xml",
            "description": "<p>application/json, application/xml.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "optional": false,
            "field": "id",
            "description": "<p>Id to be used for subsequent Authorization header ‘username’</p> "
          },
          {
            "group": "Success 200",
            "optional": false,
            "field": "token",
            "description": "<p>Token to be used for subsequent Authorization header ‘password’</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/routes-auth.js",
    "groupTitle": "Auth"
  },
  {
    "type": "delete",
    "url": "/members/:id",
    "title": "Delete member",
    "name": "DeleteMember",
    "group": "Members",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "200/OK",
            "description": "<p>Full details of deleted member.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403/Forbidden",
            "description": "<p>Admin auth required.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404/NotFound",
            "description": "<p>Member not found.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-members.js",
    "groupTitle": "Members"
  },
  {
    "type": "get",
    "url": "/members",
    "title": "List members",
    "name": "GetMembers",
    "group": "Members",
    "description": "<p>Summary list of members.</p> ",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "optional": false,
            "field": "-filter-field-",
            "description": "<p>Field to be filtered on (eg /members?firstname=fred)</p> "
          }
        ]
      }
    },
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          },
          {
            "group": "Header",
            "optional": true,
            "field": "Accept",
            "defaultValue": "application/json",
            "description": "<p>application/json, application/xml, text/yaml, text/plain.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "200/OK",
            "description": "<p>List of members with id, uri attributes.</p> "
          },
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "204/NoContent",
            "description": "<p>No matching members found.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403/Forbidden",
            "description": "<p>Unrecognised Member field in query.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-members.js",
    "groupTitle": "Members"
  },
  {
    "type": "get",
    "url": "/members/:id",
    "title": "Get details of member (including team memberships).",
    "name": "GetMembersId",
    "group": "Members",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          },
          {
            "group": "Header",
            "optional": true,
            "field": "Accept",
            "defaultValue": "application/json",
            "description": "<p>application/json, application/xml, text/yaml, text/plain.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "200/OK",
            "description": "<p>Full details of specified member.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404/NotFound",
            "description": "<p>Member not found.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-members.js",
    "groupTitle": "Members"
  },
  {
    "type": "patch",
    "url": "/members/:id",
    "title": "Update member details",
    "name": "PatchMembers",
    "group": "Members",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          },
          {
            "group": "Header",
            "optional": true,
            "field": "Accept",
            "defaultValue": "application/json",
            "description": "<p>application/json, application/xml, text/yaml, text/plain.</p> "
          },
          {
            "group": "Header",
            "optional": false,
            "field": "Content-Type",
            "description": "<p>application/x-www-form-urlencoded.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "200/OK",
            "description": "<p>Updated member details.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403/Forbidden",
            "description": "<p>Admin auth required.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404/NotFound",
            "description": "<p>Member not found.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-members.js",
    "groupTitle": "Members"
  },
  {
    "type": "post",
    "url": "/members",
    "title": "Create new member",
    "name": "PostMembers",
    "group": "Members",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "optional": false,
            "field": "...",
            "description": "<p>[as per get].</p> "
          }
        ]
      }
    },
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": true,
            "field": "Accept",
            "defaultValue": "application/json",
            "description": "<p>application/json, application/xml, text/yaml, text/plain.</p> "
          },
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          },
          {
            "group": "Header",
            "optional": false,
            "field": "Content-Type",
            "description": "<p>application/x-www-form-urlencoded.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "201/Created",
            "description": "<p>Details of newly created member.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403/Forbidden",
            "description": "<p>Admin auth required.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404/NotFound",
            "description": "<p>Member not found.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-members.js",
    "groupTitle": "Members"
  },
  {
    "type": "delete",
    "url": "/teams/:id",
    "title": "Delete team",
    "name": "DeleteTeam",
    "group": "Teams",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "200/OK",
            "description": "<p>Full details of deleted team.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403/Forbidden",
            "description": "<p>Admin auth required.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404/NotFound",
            "description": "<p>Team not found.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-teams.js",
    "groupTitle": "Teams"
  },
  {
    "type": "get",
    "url": "/teams",
    "title": "List teams",
    "name": "GetTeams",
    "group": "Teams",
    "description": "<p>Summary list of teams.</p> ",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "optional": false,
            "field": "-filter-field-",
            "description": "<p>Field to be filtered on (eg /teams?name=brainiacs)</p> "
          }
        ]
      }
    },
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          },
          {
            "group": "Header",
            "optional": true,
            "field": "Accept",
            "defaultValue": "application/xml",
            "description": "<p>application/json, application/xml.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "200/OK",
            "description": "<p>List of teams with id, uri attributes.</p> "
          },
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "204/NoContent",
            "description": "<p>No matching teams found.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403/Forbidden",
            "description": "<p>Unrecognised Team field in query.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-teams.js",
    "groupTitle": "Teams"
  },
  {
    "type": "get",
    "url": "/teams/:id",
    "title": "Get details of team (including team memberships).",
    "name": "GetTeamsId",
    "group": "Teams",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          },
          {
            "group": "Header",
            "optional": true,
            "field": "Accept",
            "defaultValue": "application/xml",
            "description": "<p>application/json, application/xml.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "200/OK",
            "description": "<p>Full details of specified team.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404/NotFound",
            "description": "<p>Team not found.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-teams.js",
    "groupTitle": "Teams"
  },
  {
    "type": "patch",
    "url": "/teams/:id",
    "title": "Update team details",
    "name": "PatchTeams",
    "group": "Teams",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          },
          {
            "group": "Header",
            "optional": true,
            "field": "Accept",
            "defaultValue": "application/xml",
            "description": "<p>application/json, application/xml.</p> "
          },
          {
            "group": "Header",
            "optional": false,
            "field": "Content-Type",
            "description": "<p>application/x-www-form-urlencoded.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "200/OK",
            "description": "<p>Updated team details.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403/Forbidden",
            "description": "<p>Admin auth required.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404/NotFound",
            "description": "<p>Team not found.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-teams.js",
    "groupTitle": "Teams"
  },
  {
    "type": "post",
    "url": "/teams",
    "title": "Create new team",
    "name": "PostTeams",
    "group": "Teams",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "optional": false,
            "field": "...",
            "description": "<p>[as per get].</p> "
          }
        ]
      }
    },
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": true,
            "field": "Accept",
            "defaultValue": "application/xml",
            "description": "<p>application/json, application/xml.</p> "
          },
          {
            "group": "Header",
            "optional": false,
            "field": "Authorization",
            "description": "<p>Basic Access Authentication token.</p> "
          },
          {
            "group": "Header",
            "optional": false,
            "field": "Content-Type",
            "description": "<p>application/x-www-form-urlencoded.</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 2xx": [
          {
            "group": "Success 2xx",
            "optional": false,
            "field": "201/Created",
            "description": "<p>Details of newly created team.</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "401/Unauthorized",
            "description": "<p>Invalid basic auth credentials supplied.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403/Forbidden",
            "description": "<p>Admin auth required.</p> "
          },
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "404/NotFound",
            "description": "<p>Team not found.</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "apps/api/handlers-teams.js",
    "groupTitle": "Teams"
  },
  {
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "optional": false,
            "field": "varname1",
            "description": "<p>No type.</p> "
          },
          {
            "group": "Success 200",
            "type": "<p>String</p> ",
            "optional": false,
            "field": "varname2",
            "description": "<p>With type.</p> "
          }
        ]
      }
    },
    "type": "",
    "url": "",
    "version": "0.0.0",
    "filename": "apps/api/apidoc/apidoc/main.js",
    "group": "_home_movable_type_Documents_node_js_test_koa_mysql_crud_apps_api_apidoc_apidoc_main_js",
    "groupTitle": "_home_movable_type_Documents_node_js_test_koa_mysql_crud_apps_api_apidoc_apidoc_main_js",
    "name": ""
  }
] });