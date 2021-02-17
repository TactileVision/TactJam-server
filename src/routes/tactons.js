import Router from "koa-router";
import validator from "validator";
import koaBody from "koa-body";
import jwtAuth from "koa-jwt";

import permission from "../auth/permissionMiddleware.js";
import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";

import mapOutput from "../helper/mapMotorPositionOutput.js";
import {
  postMotorPositions,
  postMotorPositionsTypeValidation,
} from "./motorPositions.js";
import { tagsPost } from "./tags.js";
import { bodyTagsPost } from "./bodyTags.js";

const router = new Router({ prefix: "/tactons" });

/**
 * @swagger
 * components:
 *   schemas:
 *     fullTactonResponse:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           id:
 *             type: string
 *             format: uuid
 *           user:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *           title:
 *             type: string
 *           description:
 *             type: string
 *           libvtp:
 *             type: string
 *           last_update_at:
 *             type: string
 *           motorPositions:
 *             $ref: "#/components/schemas/motorPositionResponse"
 *           tags:
 *             $ref: "#/components/schemas/tagsResponse"
 *           bodyTags:
 *             $ref: "#/components/schemas/bodyTagsResponse"
 *     tactonResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         libvtp:
 *           type: string
 *         motor_position_id:
 *           type: number
 *           format: int32
 *         last_update_at:
 *           type: string
 *
 * /tactons:
 *    get:
 *      description: Get latest 20 tactons
 *      summary: get latest tactons
 *      operationId: getTwentyTactons
 *      tags:
 *        - tactons
 *      produces:
 *        - application/json
 *      parameters: []
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns an array with 50 tactons if there are 50.
 *            Newest ones will be listed first.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/fullTactonResponse"
 */
router.get("/", async (ctx) => {
  // get data from db
  const response = await dbServer.get("/gettactons");
  // return to user
  ctx.body = await createResponseData(response.data);
});

/**
 * @swagger
 * /tactons/search/{term}:
 *    get:
 *      description: >
 *        Search tactons by a term.
 *        (body)tag names and the title are used for the search.
 *      summary: Search Tactons By Term
 *      operationId: searchTactonsByTerm
 *      tags:
 *        - tactons
 *      parameters:
 *      - in: path
 *        name: term
 *        schema:
 *          type: string
 *        required: true
 *        description: something you wanna search
 *      produces:
 *        - application/json
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns an array with max 50 tactons matching the term.
 *            Newest ones will be listed first.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/fullTactonResponse"
 */
router.get("/search/:term", async (ctx) => {
  // get data from db
  const response = await dbServer.get(
    `/rpc/searchTactons?term=${ctx.params.term}`
  );

  // return to user
  ctx.body = await createResponseData(response.data);
});

/**
 * @swagger
 * /tactons/own:
 *    get:
 *      description: Returns all own tactons
 *      summary: get own tactons
 *      operationId: getOwnTactons
 *      tags:
 *        - tactons
 *      produces:
 *        - application/json
 *      parameters: []
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        200:
 *          description: >
 *            Returns an array with all tactons from yourself. Newest ones will be listed first.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/fullTactonResponse"
 *        401:
 *          description: Authentication Error
 */
router.get("/own", jwtAuth(jwtAuthOptions), permission(), async (ctx) => {
  // get data from db
  const response = await dbServer.get(
    `/rpc/getTactonsById?requestid=${ctx.state.user.id}`
  );

  // return to user
  ctx.body = await createResponseData(response.data);
});

/**
 * @swagger
 * /tactons/combined:
 *    post:
 *      description: >
 *        Create new tacton with all information.
 *        This does include every tags, bodytags, motorpositions as well as
 *        every other needed information about the tacton.
 *      summary: Create new tacton with all information
 *      operationId: createFullTacton
 *      tags:
 *        - tactons
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information needed for the tag
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                title:
 *                  type: string
 *                  minLength: 2
 *                  maxLength: 128
 *                  description: Alpha Numeric only!
 *                description:
 *                  type: string
 *                libvtp:
 *                  type: string
 *                positions:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/motorPositionsCombined"
 *                tags:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/tagPostRequest"
 *                bodyTags:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/bodyTagsRequest"
 *              required:
 *                - title
 *                - libvtp
 *                - motorPositions
 *            example:
 *              title: "Example Tacton"
 *              description: "This is the example tacton"
 *              libvtp: "hex buffer here"
 *              positions:
 *                [
 *                {x: 0.12832197525978964, y: 0.7218214843059594, z: 0.048967545338785},
 *                {x: -0.08349932660499984, y: 1.0978059858427058, z: 0.06086872330418691},
 *                {x: -0.13681621172935493, y: 0.23134485484760914, z: -0.019713728212142456},
 *                {x: 0.12098834517427033, y: 1.4271336159515267, z: -0.012528946681072739},
 *                {x: 0.10007102144665972, y: 1.2197532723926738, z: 0.04885960456824545},
 *                {x: 0.10290538053234385, y: 0.9573107882659158, z: 0.04804622165800376},
 *                {x: -0.04950964600727065, y: 0.8984507847516034, z: 0.04869897543784063},
 *                {x: -0.021518675788634457, y: 1.364175508129114, z: 0.030336090576828845}
 *                ]
 *              tags:
 *                [
 *                {name: "Something"},
 *                {name: "exampleTag"},
 *                {name: "TestTag"}
 *                ]
 *              bodyTags:
 *                [
 *                {name: "Left Leg"},
 *                {name: "Right Leg"},
 *                {name: "Torso"}
 *                ]
 *      produces:
 *        - application/json
 *      parameters: []
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the base object of the tacton.
 *            Successful means that all tags/body tags as well as motorpositions have been successfully saved.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/tactonResponse"
 *        400:
 *          description: Invalid request
 */
router.post(
  "/combined",
  jwtAuth(jwtAuthOptions),
  permission(),
  koaBody(),
  async (ctx) => {
    // variables from request
    let title = ctx.request.body.title;
    let description = ctx.request.body.description;
    const libvtpHexString = ctx.request.body.libvtp;
    const motorPositionsArray = ctx.request.body.positions;
    const tagsArray = ctx.request.body.tags;
    const bodytagsArray = ctx.request.body.bodyTags;

    // variables for our database actions
    let tags = [];
    let bodyTags = [];

    // check if we got the needed variables
    if (
      title == null ||
      libvtpHexString == null ||
      motorPositionsArray == null
    ) {
      ctx.throw(400, "missing body parameters");
    }
    // trim spaces before and after
    title = validator.trim(title);

    if (description != null) {
      description = validator.trim(description);
    }

    // check input from those variables we dont check in other endpoints
    if (
      !validator.isLength(title, { min: 2, max: 128 }) ||
      !validator.isAlpha(title, "en-US", { ignore: "1234567890 -" })
    ) {
      ctx.throw(400, "Invalid title");
    }

    // do request for the motorpositions
    await postMotorPositionsTypeValidation(ctx);
    const motorPositionObject = await postMotorPositions(ctx, true);

    if (tagsArray != null) {
      if (!Array.isArray(tagsArray)) {
        ctx.throw(400, "tags must be an array");
      }
      // create tags
      tags = await createAndReturnTags(ctx, tagsArray);
    }

    if (bodytagsArray != null) {
      if (!Array.isArray(bodytagsArray)) {
        ctx.throw(400, "bodyTags must be an array");
      }
      // create bodytags
      bodyTags = await createAndReturnTags(ctx, bodytagsArray, true);
    }

    // we have created the motor position, the tags and the bodytags
    // now we can send the tacton to the database
    const payload = {
      user_id: ctx.state.user.id,
      title: title,
      description: description,
      libvtp: libvtpHexString,
      motor_positions_id: motorPositionObject.id,
      last_update_at: new Date(),
    };
    const tactonResponse = await dbServer.post("/tactons", payload);
    const newTacton = tactonResponse.data[0];

    if (tagsArray != null) {
      // after adding the payload we need to add the link between tacton and tags / bodytags
      // start with tags
      await linkTags(newTacton.id, tags);
    }

    if (bodytagsArray != null) {
      // now add bodytags
      await linkTags(newTacton.id, bodyTags, true);
    }

    // return the tacton to the user
    ctx.body = newTacton;
  }
);

/**
 * @swagger
 * /tactons/add/:
 *    post:
 *      description: >
 *        This endpoints adds new (body)tags to the provided tacton.
 *        Assigns one or multiple (body)tags at the same time.
 *        It does create the (body)tags if they're not available.
 *        You can only add (body)tags to your own tactons (except admins).
 *      summary: Add (body)tags to tacton
 *      operationId: addBodyTagsToTacton
 *      tags:
 *        - tactons
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information needed for the tag
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                  format: uuid
 *                tags:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/tagPostRequest"
 *                bodyTags:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/bodyTagsRequest"
 *              required:
 *                - id
 *            example:
 *              id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *              tags:
 *                [
 *                {name: "Something Else"},
 *                {name: "exampleTag 2"},
 *                {name: "TestTag 2"}
 *                ]
 *              bodyTags:
 *                [
 *                {name: "Left Hand"},
 *                {name: "Right Hand"},
 *                {name: "Torso"}
 *                ]
 *      produces:
 *        - application/json
 *      parameters: []
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        201:
 *          description: >
 *            Tags have been linked
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/tactonResponse"
 *        400:
 *          description: Invalid request
 */
router.post(
  "/add",
  jwtAuth(jwtAuthOptions),
  permission(),
  koaBody(),
  async (ctx) => {
    const id = ctx.request.body.id;
    const requestedTags = ctx.request.body.tags;
    const requestedBodytags = ctx.request.body.bodyTags;
    let tagsToAdd = [];
    let bodytagsToAdd = [];
    // check id
    if (id == null) {
      ctx.throw(400, "Id missing");
    }
    if (!validator.isUUID(id)) {
      ctx.throw(400, "Id is not an UUID");
    }

    // check if we got at least one array to work with
    if (requestedTags == null && requestedBodytags == null) {
      ctx.throw(400, "tags or bodytags needed");
    }

    if (!Array.isArray(requestedTags) && !Array.isArray(requestedBodytags)) {
      ctx.throw(400, "tags or bodytags need to be an array");
    }

    // get our tacton, to check if we have it
    const tactonResponse = await dbServer.get(`/tactons?id=eq.${id}`);
    if (tactonResponse.data.length !== 1) {
      ctx.throw(400, "invalid id; no unique tacton found");
    }
    const tacton = tactonResponse.data[0];

    // check if the user is not an admin
    if (!ctx.state.user.admin && tacton.user_id !== ctx.state.user.id) {
      ctx.throw(401, "Authentication Error");
    }

    // user has permission to do this, continue
    // create and or get the tags
    if (requestedTags.length > 0) {
      tagsToAdd = await createAndReturnTags(ctx, requestedTags);
      // start with tags
      await linkTags(tacton.id, tagsToAdd);
    }
    if (requestedBodytags.length > 0) {
      bodytagsToAdd = await createAndReturnTags(ctx, requestedBodytags, true);
      // now add bodytags
      await linkTags(tacton.id, bodytagsToAdd, true);
    }

    ctx.status = 201;
  }
);

/**
 * @swagger
 * /tactons/remove/:
 *    post:
 *      description: >
 *        This endpoints removes (body)tags from the provided tacton.
 *        Deletes the link of one or multiple (body)tags at the same time.
 *        You can only remove (body)tags from your own tactons (except admins).
 *      summary: Remove (body)tags from tacton
 *      operationId: removeBodyTagsFromTacton
 *      tags:
 *        - tactons
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information needed for the tag
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                  format: uuid
 *                tags:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/tagPostRequest"
 *                bodyTags:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/bodyTagsRequest"
 *              required:
 *                - id
 *            example:
 *              id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *              tags:
 *                [
 *                {name: "Something Else"},
 *                {name: "exampleTag 2"},
 *                {name: "TestTag 2"}
 *                ]
 *              bodyTags:
 *                [
 *                {name: "Left Hand"},
 *                {name: "Right Hand"},
 *                {name: "Torso"}
 *                ]
 *      produces:
 *        - application/json
 *      parameters: []
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        204:
 *          description: >
 *            Link of the (Body)tags have been removed.
 *        400:
 *          description: Invalid request
 */
router.post(
  "/remove",
  jwtAuth(jwtAuthOptions),
  permission(),
  koaBody(),
  async (ctx) => {
    const id = ctx.request.body.id;
    const requestedTags = ctx.request.body.tags;
    const requestedBodytags = ctx.request.body.bodyTags;
    // check id
    if (id == null) {
      ctx.throw(400, "Id missing");
    }
    if (!validator.isUUID(id)) {
      ctx.throw(400, "Id is not an UUID");
    }

    // check if we got at least one array to work with
    if (requestedTags == null && requestedBodytags == null) {
      ctx.throw(400, "tags or bodytags needed");
    }

    if (!Array.isArray(requestedTags) && !Array.isArray(requestedBodytags)) {
      ctx.throw(400, "tags or bodytags need to be an array");
    }

    // get our tacton, to check if we have it
    const tactonResponse = await dbServer.get(`/tactons?id=eq.${id}`);
    if (tactonResponse.data.length !== 1) {
      ctx.throw(400, "invalid id; no unique tacton found");
    }
    const tacton = tactonResponse.data[0];

    // check if the user is not an admin
    if (!ctx.state.user.admin && tacton.user_id !== ctx.state.user.id) {
      ctx.throw(401, "Authentication Error");
    }

    // user has permission to do this, continue
    // delete the link of the Tags
    if (requestedTags != null && Array.isArray(requestedTags)) {
      if (requestedTags.length > 0) {
        await getTagsByNameAndRemoveLink(requestedTags, tacton.id);
      }
    }

    if (requestedBodytags != null && Array.isArray(requestedBodytags)) {
      if (requestedBodytags.length > 0) {
        await getTagsByNameAndRemoveLink(requestedBodytags, tacton.id, true);
      }
    }

    ctx.status = 204;
  }
);

/**
 * @swagger
 * /tactons/{id}:
 *    patch:
 *      description: >
 *        Update a tacton.
 *        You can only update your own tacton, which you created. Admins can edit all tactons.
 *      summary: update tacton
 *      operationId: updateTacton
 *      tags:
 *        - tactons
 *      parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *          format: uuid
 *        required: true
 *        description: Unique id of the tacton
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information to update
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                title:
 *                  type: string
 *                  minLength: 2
 *                  maxLength: 128
 *                  description: Alpha Numeric only!
 *                description:
 *                  type: string
 *                libvtp:
 *                  type: string
 *                positions:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/motorPositionsCombined"
 *            example:
 *              title: "Example Tacton Update"
 *              description: "This is the updated example tacton"
 *              libvtp: "updated hex buffer here"
 *              positions:
 *                [
 *                {x: 0.12832197525978965, y: 0.7218214843059594, z: 0.048967545338785},
 *                {x: -0.08349932660499985, y: 1.0978059858427058, z: 0.06086872330418691},
 *                {x: -0.13681621172935495, y: 0.23134485484760914, z: -0.019713728212142456},
 *                {x: 0.12098834517427035, y: 1.4271336159515267, z: -0.012528946681072739},
 *                {x: 0.10007102144665975, y: 1.2197532723926738, z: 0.04885960456824545},
 *                {x: 0.10290538053234385, y: 0.9573107882659158, z: 0.04804622165800376},
 *                {x: -0.04950964600727065, y: 0.8984507847516034, z: 0.04869897543784063},
 *                {x: -0.021518675788634455, y: 1.364175508129114, z: 0.030336090576828845}
 *                ]
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        200:
 *          description: Returns an array with the updated object
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/tactonResponse"
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
    const id = ctx.params.id;
    let title = ctx.request.body.title;
    let description = ctx.request.body.description;
    const libvtpHexString = ctx.request.body.libvtp;
    const motorPositionsArray = ctx.request.body.positions;
    const payload = {};

    // check for the id first
    if (id == null) {
      ctx.throw(400, "Missing id");
    }

    // check if we got the needed variables
    if (
      title == null &&
      description == null &&
      libvtpHexString == null &&
      motorPositionsArray == null
    ) {
      ctx.throw(400, "missing body parameters");
    }

    // if we have an updated title, add it to the payload
    if (title != null) {
      // trim spaces before and after
      title = validator.trim(title);

      // check length/characters
      if (
        !validator.isLength(title, { min: 2, max: 128 }) ||
        !validator.isAlpha(title, "en-US", { ignore: "1234567890 -" })
      ) {
        ctx.throw(400, "Invalid title");
      }

      payload.title = title;
    } else {
      payload.title = false;
    }

    // if we have an updated description, add it to the payload
    if (description != null) {
      // trim spaces before and after
      description = validator.trim(description);
      payload.description = description;
    } else {
      payload.description = false;
    }

    // if we have an updated libvtp string, add it to the payload
    if (libvtpHexString != null) {
      payload.libvtp = libvtpHexString;
    } else {
      payload.libvtp = false;
    }

    // search for the tacton we wanna update
    const tactonResponse = await dbServer.get(`/tactons?id=eq.${id}`);
    if (tactonResponse.data.length !== 1) {
      ctx.throw(400, "Invalid id");
    }

    const oldTactonData = tactonResponse.data[0];

    // check if the tacton is from the user, or the user is an admin
    if (!ctx.state.user.admin && oldTactonData.user_id !== ctx.state.user.id) {
      ctx.throw(401, "Authentication Error");
    }

    // check if we need to update the motorPositions
    try {
      if (motorPositionsArray != null) {
        // do request for the motorpositions
        await postMotorPositionsTypeValidation(ctx);
        const motorPositionObject = await postMotorPositions(ctx, true);
        payload.motor_positions_id = motorPositionObject.id;
      } else {
        payload.motor_positions_id = false;
      }
    } catch (e) {
      console.log(e);
    }

    // create our new Payload based on the payload
    const newPayload = {
      title: payload.title === false ? oldTactonData.title : payload.title,
      description:
        payload.description === false
          ? oldTactonData.description
          : payload.description,
      libvtp: payload.libvtp === false ? oldTactonData.libvtp : payload.libvtp,
      motor_positions_id:
        payload.motor_positions_id === false
          ? oldTactonData.motor_positions_id
          : payload.motor_positions_id,
      last_update_at: new Date(),
    };

    // do the database request
    const updatedTactonResponse = await dbServer.patch(
      `/tactons?id=eq.${id}`,
      newPayload
    );
    ctx.body = updatedTactonResponse.data;
  }
);

/**
 * @swagger
 * /tactons/{tactonId}:
 *    delete:
 *      description: >
 *        Delete a tacton.
 *        You can only delete your own tacton, which you created. Admins can delete all tactons.
 *      summary: delete tacton
 *      operationId: deleteTacton
 *      tags:
 *        - tactons
 *      parameters:
 *      - in: path
 *        name: tactonId
 *        schema:
 *          type: string
 *          format: uuid
 *        required: true
 *        description: Unique id of the tacton
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        204:
 *          description: >
 *            Successfully deleted the tacton with the provided Id.
 *            Returns 204 even if nothing got deleted.
 *        400:
 *          description: Invalid request
 *        401:
 *          description: Authentication Error
 */
router.delete("/:id", jwtAuth(jwtAuthOptions), permission(), async (ctx) => {
  // validate the input
  const id = ctx.params.id;

  // tag id first
  if (id == null) {
    ctx.throw(400, "missing id");
  }
  if (!validator.isUUID(id)) {
    ctx.throw(400, "Invalid id");
  }

  // check if the user is not an admin
  if (!ctx.state.user.admin) {
    // find our entry
    const entryResponse = await dbServer.get(`/tactons?id=eq.${id}`);

    // check if we have an entry
    if (entryResponse.data.length !== 1) {
      ctx.throw(400, "Invalid id");
    }

    if (entryResponse.data[0].user_id !== ctx.state.user.id) {
      ctx.throw(401, "Authentication Error");
    }
  }

  // deleting a tacton will automatically delete the links (cascade deletion)
  await dbServer.delete(`/tactons?id=eq.${id}`);

  ctx.status = 204;
});

export default router;

// ---- helper functions ----
async function createResponseData(data) {
  return new Promise((resolve) => {
    // check if the length is null, if it is, then resolve with empty array
    if (data.length === 0) {
      resolve([]);
    }

    // remove duplicates, adjust motorposition output
    for (let i = 0; i < data.length; i++) {
      data[i].tags = filterArrayById(data[i].tags);
      data[i].bodytags = filterArrayById(data[i].bodytags);
      data[i].motorpositions = mapOutput(data[i].motorpositions);

      if (i === data.length - 1) {
        resolve(data);
      }
    }
  });
}

function filterArrayById(array) {
  return array.filter(
    (arr, index, self) => index === self.findIndex((t) => t.id === arr.id)
  );
}

async function createAndReturnTags(ctx, t, bodyTags = false) {
  // do request for each tag ---------------
  const tagsPromiseArray = [];
  const arrayToReturn = [];
  t.forEach((element) => {
    tagsPromiseArray.push(
      bodyTags
        ? bodyTagsPost(ctx, true, element.name)
        : tagsPost(ctx, true, element.name)
    );
  });

  // resolve all; Will return array in array
  const responseArray = await Promise.all(tagsPromiseArray);

  // extract the object from the array
  responseArray.forEach((r) => arrayToReturn.push(r[0]));

  return arrayToReturn;
}

async function getTagsByNameAndRemoveLink(t, id, bodyTags = false) {
  // do request for each tag, create an array of promises
  const tagsPromiseArray = [];
  t.forEach((element) => {
    tagsPromiseArray.push(
      bodyTags
        ? dbServer.get(`/body_tags?name=eq.${element.name}`)
        : dbServer.get(`/tags?name=eq.${element.name}`)
    );
  });

  // resolve all; Will return array in array
  const responseArray = await Promise.all(tagsPromiseArray);

  // create an array of promises to resolve
  const linkPromiseArray = [];
  responseArray.forEach((r) => {
    if (r.data.length === 1) {
      linkPromiseArray.push(
        bodyTags
          ? dbServer.delete(
              `/tacton_bodytag_link?and=(tacton_id.eq.${id},bodytag_id.eq.${r.data[0].id})`
            )
          : dbServer.delete(
              `/tacton_tag_link?and=(tacton_id.eq.${id},tag_id.eq.${r.data[0].id})`
            )
      );
    }
  });

  if (linkPromiseArray.length === 0) {
    return;
  }

  const deletedArray = await Promise.all(linkPromiseArray);

  return deletedArray;
}

async function linkTags(tactonId, tags, bodyTags = false) {
  const tagLinkPromiseArray = [];
  const url = bodyTags ? "/tacton_bodytag_link" : "/tacton_tag_link";
  const tagPropId = bodyTags ? "bodytag_id" : "tag_id";

  // create a string for the or operation
  let tagOrString = [];
  tags.forEach((tag) => tagOrString.push(`${tagPropId}.eq.${tag.id}`));
  tagOrString = tagOrString.join();

  // search first if we have something in our table already
  console.log(tagOrString);
  const r = await dbServer.get(
    `${url}?and=(tacton_id.eq.${tactonId},or(${tagOrString}))`
  );
  const rdata = r.data;

  // check if we found something
  if (rdata.length > 0) {
    // if yes, then we need to remove the tag from our array, so we dont try to add it again
    // iterate thru our elements
    rdata.forEach((element) => {
      // find the index in our tags
      const index = tags.findIndex((tag) => tag.id === element.id);
      if (!isNaN(index)) {
        // we found some, so remove this from our list!
        tags.splice(index, 1);
      }
    });
  }

  // create promise array
  tags.forEach((tag) =>
    tagLinkPromiseArray.push(
      dbServer.post(url, {
        [tagPropId]: tag.id,
        tacton_id: tactonId,
      })
    )
  );

  // execute and wait for all promises
  await Promise.all(tagLinkPromiseArray);
}
