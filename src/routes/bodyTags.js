import Router from "koa-router";
import validator from "validator";
import koaBody from "koa-body";
import jwtAuth from "koa-jwt";

import permission from "../auth/permissionMiddleware.js";
import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";

const router = new Router({ prefix: "/bodyTags" });

/**
 * @swagger
 * components:
 *   schemas:
 *     "bodyTagsResponse":
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           id:
 *             type: number
 *             format: int32
 *           name:
 *             type: string
 *           creator_id:
 *             type: string
 *             format: uuid
 *
 *
 * /bodyTags:
 *    get:
 *      description: Get all bodyTags
 *      summary: get bodyTags
 *      operationId: getBodyTags
 *      tags:
 *        - bodyTags
 *      produces:
 *        - application/json
 *      parameters: []
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns an array with all bodyTags
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/bodyTagsResponse"
 */
router.get("/", async (ctx) => {
  // get data from db
  const response = await dbServer.get("/body_tags");

  // return to user
  ctx.body = response.data;
});

/**
 * @swagger
 * /bodyTags/search/id/{bodyTagId}:
 *    get:
 *      description: Get a single bodyTag name by id
 *      summary: get bodyTag name by id
 *      operationId: getBodyTagById
 *      tags:
 *        - bodyTags
 *      parameters:
 *      - in: path
 *        name: bodyTagId
 *        schema:
 *          type: number
 *          format: int32
 *        required: true
 *        description: Unique ID of the bodyTag
 *      produces:
 *        - application/json
 *      security: []
 *      responses:
 *        200:
 *          description: Returns an array with the object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/bodyTagsResponse"
 */
router.get("/search/id/:id", async (ctx) => {
  const bodyTagId = ctx.params.id;
  if (bodyTagId == null) {
    ctx.throw(400, "missing id");
  }
  if (!validator.isInt(bodyTagId)) {
    ctx.throw(400, "Invalid id");
  }
  // get data from db
  const response = await dbServer.get(`/body_tags?id=eq.${bodyTagId}`);
  // check if there is one bodyTag
  if (response.data.length !== 1) {
    ctx.throw(400, "No unique bodyTag found");
  }

  // return to user
  ctx.body = response.data;
});

/**
 * @swagger
 * /bodyTags/search/name/{bodyTagName}:
 *    get:
 *      description: Get a single bodyTag id by name
 *      summary: get bodyTag id by name
 *      operationId: getBodyTagIdByName
 *      tags:
 *        - bodyTags
 *      parameters:
 *      - in: path
 *        name: bodyTagName
 *        schema:
 *          type: string
 *        required: true
 *        description: Unique name of the bodyTag
 *      produces:
 *        - application/json
 *      security: []
 *      responses:
 *        200:
 *          description: Returns an array with the object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/bodyTagsResponse"
 */
router.get("/search/name/:name", async (ctx) => {
  let bodyTagName = ctx.params.name;
  if (bodyTagName == null) {
    ctx.throw(400, "missing bodyTag name");
  }

  // trim spaces before and after
  bodyTagName = validator.trim(bodyTagName);

  if (
    !validator.isLength(bodyTagName, { min: 2, max: 128 }) ||
    !validator.isAlpha(bodyTagName, "en-US", { ignore: "1234567890 -" })
  ) {
    ctx.throw(400, "Invalid name");
  }
  // get data from db
  const response = await dbServer.get(`/body_tags?name=eq.${bodyTagName}`);
  // check if there is one bodyTag
  if (response.data.length !== 1) {
    ctx.throw(400, "No bodyTag found");
  }

  // return to user
  ctx.body = response.data;
});

/**
 * @swagger
 * /bodyTags:
 *    post:
 *      description: Create new bodyTag
 *      summary: Create new bodyTag
 *      operationId: createBodyTag
 *      tags:
 *        - bodyTags
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information needed for the bodyTag
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
 *              name: ABodyTag
 *      produces:
 *        - application/json
 *      parameters: []
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        200:
 *          description: Returns an array with the created object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/bodyTagsResponse"
 *        400:
 *          description: Invalid request
 */
router.post(
  "/",
  jwtAuth(jwtAuthOptions),
  permission(),
  koaBody(),
  async (ctx) => {
    let name = ctx.request.body.name;

    // check if the name is there
    if (name == null) {
      ctx.throw(400, "missing body parameters");
    }

    // trim spaces before and after
    name = validator.trim(name);

    // check input
    if (
      !validator.isLength(name, { min: 2, max: 128 }) ||
      !validator.isAlpha(name, "en-US", { ignore: "1234567890 -" })
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

    // push into database and return the data
    const newData = await dbServer.post("/body_tags", payload);

    ctx.body = newData.data;
  }
);

/**
 * @swagger
 * /bodyTags/{bodyTagId}:
 *    patch:
 *      description: >
 *        Update a BodyTag name.
 *        You can only update your own bodyTag, which you created. Admins can edit all bodyTags.
 *      summary: update bodyTag name
 *      operationId: updateBodyTagName
 *      tags:
 *        - bodyTags
 *      parameters:
 *      - in: path
 *        name: bodyTagId
 *        schema:
 *          type: number
 *          format: int32
 *        required: true
 *        description: Unique id of the bodyTag
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
 *        200:
 *          description: Returns an array with the updated object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/bodyTagsResponse"
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
    const bodyTagId = ctx.params.id;
    let name = ctx.request.body.name;

    // bodyTag id first
    if (bodyTagId == null) {
      ctx.throw(400, "missing id");
    }
    if (!validator.isInt(bodyTagId)) {
      ctx.throw(400, "Invalid id");
    }

    // name next
    if (name == null) {
      ctx.throw(400, "missing body parameters");
    }

    // trim spaces before and after
    name = validator.trim(name);

    if (
      !validator.isLength(name, { min: 2, max: 128 }) ||
      !validator.isAlpha(name, "en-US", { ignore: "1234567890 -" })
    ) {
      ctx.throw(400, "Invalid name or length");
    }

    // find our entry
    const entryResponse = await dbServer.get(`/body_tags?id=eq.${bodyTagId}`);

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

    // update database
    const updatedResponse = await dbServer.patch(
      `/body_tags?id=eq.${data.id}`,
      payload
    );

    ctx.body = updatedResponse.data;
  }
);

/**
 * @swagger
 * /bodyTags/{bodyTagId}:
 *    delete:
 *      description: >
 *        Delete a bodyTag.
 *        You can only delete your own bodyTag, which you created. Admins can delete all bodyTags.
 *      summary: delete bodyTag
 *      operationId: deleteBodyTag
 *      tags:
 *        - bodyTags
 *      parameters:
 *      - in: path
 *        name: bodyTagId
 *        schema:
 *          type: number
 *          format: int32
 *        required: true
 *        description: Unique id of the bodyTag
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
  const bodyTagId = ctx.params.id;

  // bodyTag id first
  if (bodyTagId == null) {
    ctx.throw(400, "missing id");
  }
  if (!validator.isInt(bodyTagId)) {
    ctx.throw(400, "Invalid id");
  }

  // check if the user is not an admin
  if (!ctx.state.user.admin) {
    // find our entry
    const entryResponse = await dbServer.get(`/body_tags?id=eq.${bodyTagId}`);

    // check if we have an entry
    if (entryResponse.data.length !== 1) {
      ctx.throw(400, "Invalid id");
    }

    if (entryResponse.data[0].creator_id !== ctx.state.user.id) {
      ctx.throw(401, "Authentication Error");
    }
  }

  await dbServer.delete(`/body_tags?id=eq.${bodyTagId}`);

  ctx.status = 204;
});

export default router;

// ---- helper functions ----
// function to check if name is unique
async function validateUniqueName(name) {
  const queryString = `/body_tags?name=eq.${name}`;
  // database request to check for values
  const response = await dbServer.get(queryString);
  if (response.data.length > 0) {
    return { valid: false, msg: "Name already taken" };
  }
  return { valid: true };
}
