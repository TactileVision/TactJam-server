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
 *            Returns an array with 20 tactons if there are 20. Newest ones will be listed first.
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
 *                description:
 *                  type: string
 *                libvtp:
 *                  type: string
 *                positions:
 *                  type: array
 *                  items:
 *                    $ref: "#/components/schemas/motorPositionRequestCombined"
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
 *                - tags
 *                - bodyTags
 *            example:
 *              title: "Example Tacton"
 *              description: "This is the example tacton"
 *              libvtp: "hex buffer here"
 *              positions:
 *                [
 *                {x: 0.2, y: 0.01, z: 1.5},
 *                {x: 0.33, y: 0.02, z: 2.6},
 *                {x: 0.444, y: 0.3, z: 3.77},
 *                {x: 0.555, y: 0.4, z:  4.78},
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
    const tags = [];
    const bodyTags = [];

    // check if we got the needed variables
    if (
      title == null ||
      description == null ||
      libvtpHexString == null ||
      motorPositionsArray == null ||
      tagsArray == null ||
      bodytagsArray == null
    ) {
      ctx.throw(400, "missing body parameters");
    }
    // trim spaces before and after
    title = validator.trim(title);
    description = validator.trim(description);

    // check input from those variables we dont check in other endpoints
    if (
      !validator.isLength(title, { min: 2, max: 128 }) ||
      !validator.isAlpha(title, "en-US", { ignore: "1234567890 -" })
    ) {
      ctx.throw(400, "Invalid title");
    }

    if (!Array.isArray(tagsArray)) {
      ctx.throw(400, "tags must be an array");
    }

    if (!Array.isArray(bodytagsArray)) {
      ctx.throw(400, "bodyTags must be an array");
    }

    // do request for the motorpositions
    await postMotorPositionsTypeValidation(ctx);
    const motorPositionObject = await postMotorPositions(ctx, true);

    // do request for each tag ---------------
    const tagsPromiseArray = [];
    tagsArray.forEach((element) => {
      tagsPromiseArray.push(tagsPost(ctx, true, element.name));
    });

    // resolve all; Will return array in array
    const responseArray = await Promise.all(tagsPromiseArray);

    // extract the object from the array
    responseArray.forEach((r) => tags.push(r[0]));

    console.log(tags);

    // do request for each bodytag ---------------
    const bodytagsPromisearray = [];
    bodytagsArray.forEach((element) => {
      bodytagsPromisearray.push(bodyTagsPost(ctx, true, element.name));
    });

    // resolve all; Will return array in array
    const bodytagsResponseArray = await Promise.all(bodytagsPromisearray);

    // extract the object from the array
    bodytagsResponseArray.forEach((r) => bodyTags.push(r[0]));
    console.log(bodyTags);

    // we have created the motor position, the tags and the bodytags
    // now we can send the tacton to the database
    try {
      console.log(motorPositionObject);
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

      // after adding the payload we need to add the link between tacton and tags / bodytags
      // start with tags
      const tagLinkPromiseArray = [];
      tags.forEach((x) =>
        tagLinkPromiseArray.push(
          dbServer.post("/tacton_tag_link", {
            tag_id: x.id,
            tacton_id: newTacton.id,
          })
        )
      );
      await Promise.all(tagLinkPromiseArray);

      // now add bodytags
      const bodytagLinkPromiseArray = [];
      bodyTags.forEach((x) =>
        bodytagLinkPromiseArray.push(
          dbServer.post("/tacton_bodytag_link", {
            bodytag_id: x.id,
            tacton_id: newTacton.id,
          })
        )
      );
      await Promise.all(bodytagLinkPromiseArray);

      // return the tacton to the user
      ctx.body = newTacton;
    } catch (e) {
      console.log(e);
    }
  }
);

export default router;

// ---- helper functions ----
function createResponseData(data) {
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
