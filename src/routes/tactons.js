import Router from "koa-router";
import jwtAuth from "koa-jwt";

import permission from "../auth/permissionMiddleware.js";
import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";

import mapOutput from "../helper/mapMotorPositionOutput.js";

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
 *           libvtp_path:
 *             type: string
 *           last_update_at:
 *             type: string
 *           motorPositions:
 *             $ref: "#/components/schemas/motorPositionResponse"
 *           tags:
 *             $ref: "#/components/schemas/tagsResponse"
 *           bodyTags:
 *             $ref: "#/components/schemas/bodyTagsResponse"
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
 *            Returns an array with 20 tactons if there are 20. Newest ones will be listed first.
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
