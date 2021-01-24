import Router from "koa-router";
import validator from "validator";
import koaBody from "koa-body";
import jwtAuth from "koa-jwt";

import permission from "../auth/permissionMiddleware.js";
import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";

const router = new Router({ prefix: "/teams" });

/**
 * @swagger
 * /teams:
 *    get:
 *      description: Get all teams
 *      summary: get teams
 *      operationId: getTeams
 *      tags:
 *        - teams
 *      produces:
 *        - application/json
 *      parameters: []
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the an array with all teams
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    id:
 *                      type: string
 *                      format: uuid
 *                    name:
 *                      type: string
 *                    creator_id:
 *                      type: string
 *                      format: uuid
 */
router.get("/", async (ctx) => {
  // get data from db
  const response = await dbServer.get("/teams");

  // return to user
  ctx.body = response.data;
});

/**
 * @swagger
 * /teams/search/id/{teamId}:
 *    get:
 *      description: Get a single team name by id
 *      summary: get team name by id
 *      operationId: getTeamById
 *      tags:
 *        - teams
 *      parameters:
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: string
 *          format: uuid
 *        required: true
 *        description: Unique ID of the team
 *      produces:
 *        - application/json
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the an object with the team name and id
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                    format: uuid
 *                  name:
 *                    type: string
 *                  creator_id:
 *                    type: string
 *                    format: uuid
 */
router.get("/search/id/:id", async (ctx) => {
  const teamId = ctx.params.id;
  if (teamId == null) {
    ctx.throw(400, "missing id");
  }
  if (!validator.isUUID(teamId)) {
    ctx.throw(400, "Invalid id");
  }
  // get data from db
  const response = await dbServer.get(`/teams?id=eq.${teamId}`);
  // check if there is one team
  if (response.data.length !== 1) {
    ctx.throw(400, "No unique team found");
  }

  // return to user
  ctx.body = response.data[0];
});

/**
 * @swagger
 * /teams/search/name/{teamName}:
 *    get:
 *      description: Get a single team id by name
 *      summary: get team id by name
 *      operationId: getTeamIdByName
 *      tags:
 *        - teams
 *      parameters:
 *      - in: path
 *        name: teamName
 *        schema:
 *          type: string
 *        required: true
 *        description: Unique name of the team
 *      produces:
 *        - application/json
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the an object with the team name and id
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                    format: uuid
 *                  name:
 *                    type: string
 *                  creator_id:
 *                    type: string
 *                    format: uuid
 */
router.get("/search/name/:name", async (ctx) => {
  const teamName = ctx.params.name;
  if (teamName == null) {
    ctx.throw(400, "missing team name");
  }
  if (
    !validator.isLength(teamName, { min: 2, max: 128 }) ||
    !validator.isAlphanumeric(teamName)
  ) {
    ctx.throw(400, "Invalid name");
  }
  // get data from db
  const response = await dbServer.get(`/teams?name=eq.${teamName}`);
  // check if there is one team
  if (response.data.length !== 1) {
    ctx.throw(400, "No team found");
  }

  // return to user
  ctx.body = response.data[0];
});

/**
 * @swagger
 * /teams:
 *    post:
 *      description: Create new team
 *      summary: Create new team
 *      operationId: createTeam
 *      tags:
 *        - teams
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information needed for the team
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                  minLength: 2
 *                  maxLength: 128
 *                  description: Alpha Numeric only!
 *              required:
 *                - name
 *            example:
 *              name: ATeam
 *      produces:
 *        - application/json
 *      parameters: []
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        201:
 *          description: >
 *            Returns the an object with the team name and id
 *        400:
 *          description: Invalid request
 */
router.post(
  "/",
  jwtAuth(jwtAuthOptions),
  permission(),
  koaBody(),
  async (ctx) => {
    const name = ctx.request.body.name;

    // check if the name is there
    if (name == null) {
      ctx.throw(400, "missing body parameters");
    }

    // check input
    if (
      !validator.isLength(name, { min: 2, max: 128 }) ||
      !validator.isAlphanumeric(name)
    ) {
      ctx.throw(400, "Invalid name or length");
    }

    const validation = await validateUniqueName(name);
    if (!validation.valid) {
      ctx.throw(400, validation.msg);
    }

    const payload = {
      name: name,
      creator_id: ctx.state.user.id,
    };

    await dbServer.post("/teams", payload);

    ctx.status = 201;
  }
);

/**
 * @swagger
 * /teams/{teamId}:
 *    patch:
 *      description: >
 *        Update a Team name.
 *        You can only update your own team, which you created. Admins can edit all teams.
 *      summary: update team name
 *      operationId: updateTeamName
 *      tags:
 *        - teams
 *      parameters:
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: string
 *        required: true
 *        description: Unique id of the team
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information to update
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                name:
 *                  type: string
 *                  minLength: 2
 *                  maxLength: 128
 *                  description: Alpha Numeric only!
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        204:
 *          description: Successfully updated.
 *        400:
 *          description: Invalid request
 *        401:
 *          description: Authentication Error
 */
router.patch(
  "/:id",
  jwtAuth(jwtAuthOptions),
  permission(),
  koaBody(),
  async (ctx) => {
    // validate the input
    const teamId = ctx.params.id;
    const name = ctx.request.body.name;

    // team id first
    if (teamId == null) {
      ctx.throw(400, "missing id");
    }
    if (!validator.isUUID(teamId)) {
      ctx.throw(400, "Invalid id");
    }

    // name next
    if (name == null) {
      ctx.throw(400, "missing body parameters");
    }
    if (
      !validator.isLength(name, { min: 2, max: 128 }) ||
      !validator.isAlphanumeric(name)
    ) {
      ctx.throw(400, "Invalid name or length");
    }

    // find our entry
    const entryResponse = await dbServer.get(`/teams?id=eq.${teamId}`);

    // check if we have an entry
    if (entryResponse.data.length !== 1) {
      ctx.throw(400, "Invalid id");
    }

    const data = entryResponse.data[0];
    const validation = await validateUniqueName(name);
    if (!validation.valid) {
      ctx.throw(400, validation.msg);
    }

    const payload = {
      name: name,
    };

    await dbServer.patch(`/teams?id=eq.${data.id}`, payload);

    ctx.status = 204;
  }
);

/**
 * @swagger
 * /teams/{teamId}:
 *    delete:
 *      description: >
 *        Delete a team.
 *        You can only delete your own team, which you created. Admins can delete all teams.
 *      summary: delete team
 *      operationId: deleteTeam
 *      tags:
 *        - teams
 *      parameters:
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: string
 *        required: true
 *        description: Unique id of the team
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        204:
 *          description: >
 *            Successfully deleted user with the provided ID.
 *            Returns 204 even if nothing got deleted.
 *        400:
 *          description: Invalid request
 *        401:
 *          description: Authentication Error
 */
router.delete("/:id", jwtAuth(jwtAuthOptions), permission(), async (ctx) => {
  // validate the input
  const teamId = ctx.params.id;

  // team id first
  if (teamId == null) {
    ctx.throw(400, "missing id");
  }
  if (!validator.isUUID(teamId)) {
    ctx.throw(400, "Invalid id");
  }

  // check if the user is not an admin
  if (!ctx.state.user.admin) {
    // find our entry
    const entryResponse = await dbServer.get(`/teams?id=eq.${teamId}`);

    // check if we have an entry
    if (entryResponse.data.length !== 1) {
      ctx.throw(400, "Invalid id");
    }

    if (entryResponse.data[0].creator_id !== ctx.state.user.id) {
      ctx.throw(401, "Authentication Error");
    }
  }

  await dbServer.delete(`/teams?id=eq.${teamId}`);

  ctx.status = 204;
});

export default router;

// ---- helper functions ----
// function to check if name is unique
async function validateUniqueName(name) {
  const queryString = `/teams?name=eq.${name}`;
  // database request to check for values
  const response = await dbServer.get(queryString);
  if (response.data.length > 0) {
    return { valid: false, msg: "Name already taken" };
  }
  return { valid: true };
}
