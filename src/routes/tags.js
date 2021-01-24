import Router from "koa-router";
import validator from "validator";
import koaBody from "koa-body";
import jwtAuth from "koa-jwt";

import permission from "../auth/permissionMiddleware.js";
import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";

const router = new Router({ prefix: "/tags" });

/**
 * @swagger
 * components:
 *   schemas:
 *     "tagsResponse":
 *       type: array
 *         items:
 *         type: object
 *           properties:
 *             id:
 *               type: number
 *               format: int32
 *             name:
 *               type: string
 *             creator_id:
 *               type: string
 *               format: uuid

/**
 * @swagger
 * /tags:
 *    get:
 *      description: Get all tags
 *      summary: get tags
 *      operationId: getTags
 *      tags:
 *        - tags
 *      produces:
 *        - application/json
 *      parameters: []
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the an array with all tags
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/tagsResponse"
 */
router.get("/", async (ctx) => {
  // get data from db
  const response = await dbServer.get("/tags");

  // return to user
  ctx.body = response.data;
});

/**
 * @swagger
 * /tags/search/id/{tagId}:
 *    get:
 *      description: Get a single tag name by id
 *      summary: get tag name by id
 *      operationId: getTagById
 *      tags:
 *        - tags
 *      parameters:
 *      - in: path
 *        name: tagId
 *        schema:
 *          type: number
 *          format: int32
 *        required: true
 *        description: Unique ID of the tag
 *      produces:
 *        - application/json
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the an object with the tag name and id
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/tagsResponse"
 */
router.get("/search/id/:id", async (ctx) => {
  const tagId = ctx.params.id;
  if (tagId == null) {
    ctx.throw(400, "missing id");
  }
  if (!validator.isInt(tagId)) {
    ctx.throw(400, "Invalid id");
  }
  // get data from db
  const response = await dbServer.get(`/tags?id=eq.${tagId}`);
  // check if there is one tag
  if (response.data.length !== 1) {
    ctx.throw(400, "No unique tag found");
  }

  // return to user
  ctx.body = response.data[0];
});

/**
 * @swagger
 * /tags/search/name/{tagName}:
 *    get:
 *      description: Get a single tag id by name
 *      summary: get tag id by name
 *      operationId: getTagIdByName
 *      tags:
 *        - tags
 *      parameters:
 *      - in: path
 *        name: tagName
 *        schema:
 *          type: string
 *        required: true
 *        description: Unique name of the tag
 *      produces:
 *        - application/json
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the an object with the tag name and id
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/tagsResponse"
 */
router.get("/search/name/:name", async (ctx) => {
  const tagName = ctx.params.name;
  if (tagName == null) {
    ctx.throw(400, "missing tag name");
  }
  if (
    !validator.isLength(tagName, { min: 2, max: 128 }) ||
    !validator.isAlphanumeric(tagName)
  ) {
    ctx.throw(400, "Invalid name");
  }
  // get data from db
  const response = await dbServer.get(`/tags?name=eq.${tagName}`);
  // check if there is one tag
  if (response.data.length !== 1) {
    ctx.throw(400, "No tag found");
  }

  // return to user
  ctx.body = response.data[0];
});

/**
 * @swagger
 * /tags:
 *    post:
 *      description: Create new tag
 *      summary: Create new tag
 *      operationId: createTag
 *      tags:
 *        - tags
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information needed for the tag
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
 *              name: ATag
 *      produces:
 *        - application/json
 *      parameters: []
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        201:
 *          description: >
 *            Returns the an object with the tag name and id
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

    await dbServer.post("/tags", payload);

    ctx.status = 201;
  }
);

/**
 * @swagger
 * /tags/{tagId}:
 *    patch:
 *      description: >
 *        Update a Tag name.
 *        You can only update your own tag, which you created. Admins can edit all tags.
 *      summary: update tag name
 *      operationId: updateTagName
 *      tags:
 *        - tags
 *      parameters:
 *      - in: path
 *        name: tagId
 *        schema:
 *          type: number
 *          format: int32
 *        required: true
 *        description: Unique id of the tag
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
    const tagId = ctx.params.id;
    const name = ctx.request.body.name;

    // tag id first
    if (tagId == null) {
      ctx.throw(400, "missing id");
    }
    if (!validator.isInt(tagId)) {
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
    const entryResponse = await dbServer.get(`/tags?id=eq.${tagId}`);

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

    await dbServer.patch(`/tags?id=eq.${data.id}`, payload);

    ctx.status = 204;
  }
);

/**
 * @swagger
 * /tags/{tagId}:
 *    delete:
 *      description: >
 *        Delete a tag.
 *        You can only delete your own tag, which you created. Admins can delete all tags.
 *      summary: delete tag
 *      operationId: deleteTag
 *      tags:
 *        - tags
 *      parameters:
 *      - in: path
 *        name: tagId
 *        schema:
 *          type: number
 *          format: int32
 *        required: true
 *        description: Unique id of the tag
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
  const tagId = ctx.params.id;

  // tag id first
  if (tagId == null) {
    ctx.throw(400, "missing id");
  }
  if (!validator.isInt(tagId)) {
    ctx.throw(400, "Invalid id");
  }

  // check if the user is not an admin
  if (!ctx.state.user.admin) {
    // find our entry
    const entryResponse = await dbServer.get(`/tags?id=eq.${tagId}`);

    // check if we have an entry
    if (entryResponse.data.length !== 1) {
      ctx.throw(400, "Invalid id");
    }

    if (entryResponse.data[0].creator_id !== ctx.state.user.id) {
      ctx.throw(401, "Authentication Error");
    }
  }

  await dbServer.delete(`/tags?id=eq.${tagId}`);

  ctx.status = 204;
});

export default router;

// ---- helper functions ----
// function to check if name is unique
async function validateUniqueName(name) {
  const queryString = `/tags?name=eq.${name}`;
  // database request to check for values
  const response = await dbServer.get(queryString);
  if (response.data.length > 0) {
    return { valid: false, msg: "Name already taken" };
  }
  return { valid: true };
}