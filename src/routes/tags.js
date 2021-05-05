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
 *     "tagPostRequest":
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 128
 *           description: Alpha Numeric only!
 *
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
 *            Returns an array with all tags
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
 *          description: Returns an array with the object
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
 *          description: Returns an array with the object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/tagsResponse"
 */
router.get("/search/name/:name", async (ctx) => {
  let tagName = ctx.params.name;
  if (tagName == null) {
    ctx.throw(400, "missing tag name");
  }

  // trim spaces before and after
  tagName = validator.trim(tagName);

  if (
    !validator.isLength(tagName, { min: 2, max: 128 }) ||
    !validator.isAlpha(tagName, "en-US", { ignore: "1234567890 -" })
  ) {
    ctx.throw(400, "Invalid name");
  }
  // convert to lowercase
  tagName = tagName.toLowerCase();

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
 *              $ref: "#/components/schemas/tagPostRequest"
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
 *        200:
 *          description: >
 *            Returns an array with the created object.
 *            Will return the object if there is a tag with that name already.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/tagsResponse"
 *        400:
 *          description: Invalid request
 */
router.post(
  "/",
  jwtAuth(jwtAuthOptions),
  permission(),
  koaBody(),
  async (ctx) => {
    await tagsPost(ctx);
  }
);

// function to use on other endpoints as well
export async function tagsPost(ctx, returnsValue = false, n = "") {
  let name = ctx.request.body.name;

  // if we use the function with a return value, then we use the provided name
  if (returnsValue) {
    name = n;
  }

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

  // convert to lowercase
  name = name.toLowerCase();

  const validation = await validateUniqueName(name);
  if (!validation.valid) {
    // check if we found 1 entry, if yes, return it
    if (validation.msg === false) {
      if (!returnsValue) ctx.body = validation.data;
      else return validation.data;
      return;
    }
    ctx.throw(400, validation.msg);
  }

  const payload = {
    name: name,
    creator_id: ctx.state.user.id,
  };

  // push into database and return the data
  const newData = await dbServer.post("/tags", payload);

  if (!returnsValue) ctx.body = newData.data;
  else return newData.data;
}

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
 *        200:
 *          description: Returns an array with the updated object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/tagsResponse"
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
    let name = ctx.request.body.name;

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

    // trim spaces before and after
    name = validator.trim(name);

    if (
      !validator.isLength(name, { min: 2, max: 128 }) ||
      !validator.isAlpha(name, "en-US", { ignore: "1234567890 -" })
    ) {
      ctx.throw(400, "Invalid name or length");
    }

    // convert to lowercase
    name = name.toLowerCase();

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

    // update database
    const updatedResponse = await dbServer.patch(
      `/tags?id=eq.${data.id}`,
      payload
    );

    ctx.body = updatedResponse.data;
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
 *            Successfully deleted the tag with the provided Id.
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
  if (response.data.length === 1) {
    return { valid: false, msg: false, data: response.data };
  } else if (response.data.length > 0) {
    return { valid: false, msg: "Name already taken" };
  } else return { valid: true };
}
