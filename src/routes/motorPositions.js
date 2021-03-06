import Router from "koa-router";
import validator from "validator";
import koaBody from "koa-body";
import jwtAuth from "koa-jwt";

import permission from "../auth/permissionMiddleware.js";
import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";
import localServer from "../database/localServer.js";

import mapOutput from "../helper/mapMotorPositionOutput.js";
import mapForDatabase from "../helper/mapMotorPositionForDatabase.js";

const router = new Router({ prefix: "/motorPositions" });
const tableName = "motor_positions";
const stateKey = "redirected";

/**
 * @swagger
 * components:
 *   schemas:
 *     motorPositionResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           format: int32
 *         positions:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/motorPositionsCombined"
 *     motorPositionRequest:
 *       type: object
 *       properties:
 *         x:
 *           type: array
 *           items:
 *             type: number
 *             format: float
 *         y:
 *           type: array
 *           items:
 *             type: number
 *             format: float
 *         z:
 *           type: array
 *           items:
 *             type: number
 *             format: float
 *       required:
 *         - x
 *         - y
 *         - z
 *       example:
 *         x:
 *           [
 *           0.12832197525978964,
 *           -0.08349932660499984,
 *           -0.13681621172935493,
 *           0.12098834517427033,
 *           0.10007102144665972,
 *           0.10290538053234385,
 *           -0.04950964600727065,
 *           -0.021518675788634457
 *           ]
 *         y:
 *           [
 *           0.7218214843059594,
 *           1.0978059858427058,
 *           0.23134485484760914,
 *           1.4271336159515267,
 *           1.2197532723926738,
 *           0.9573107882659158,
 *           0.8984507847516034,
 *           1.364175508129114
 *           ]
 *         z:
 *           [
 *           0.048967545338785,
 *           0.06086872330418691,
 *           -0.019713728212142456,
 *           -0.012528946681072739,
 *           0.04885960456824545,
 *           0.04804622165800376,
 *           0.04869897543784063,
 *           0.030336090576828845
 *           ]
 *     motorPositionRequestCombined:
 *       type: object
 *       properties:
 *         positions:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/motorPositionsCombined"
 *       required:
 *         - positions
 *         - X
 *         - y
 *         - z
 *       example:
 *         positions:
 *           [
 *           {x: 0.12832197525978964, y: 0.7218214843059594, z: 0.048967545338785},
 *           {x: -0.08349932660499984, y: 1.0978059858427058, z: 0.06086872330418691},
 *           {x: -0.13681621172935493, y: 0.23134485484760914, z: -0.019713728212142456},
 *           {x: 0.12098834517427033, y: 1.4271336159515267, z: -0.012528946681072739},
 *           {x: 0.10007102144665972, y: 1.2197532723926738, z: 0.04885960456824545},
 *           {x: 0.10290538053234385, y: 0.9573107882659158, z: 0.04804622165800376},
 *           {x: -0.04950964600727065, y: 0.8984507847516034, z: 0.04869897543784063},
 *           {x: -0.021518675788634457, y: 1.364175508129114, z: 0.030336090576828845}
 *           ]
 *     motorPositionsCombined:
 *       type: object
 *       properties:
 *         x:
 *           type: number
 *           format: float
 *         y:
 *           type: number
 *           format: float
 *         z:
 *           type: number
 *           format: float
 * /motorPositions/id/{id}:
 *    get:
 *      description: Get a motor position by the id
 *      summary: get motor positions by id
 *      operationId: getMotorPositionsById
 *      tags:
 *        - motorPositions
 *      parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: number
 *          format: int32
 *        required: true
 *        description: Unique ID of the motorPositions
 *      produces:
 *        - application/json
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the an object with information about the positions (see schema).
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/motorPositionResponse"
 *        400:
 *          description: >
 *            Invalid id or no entry found with that id
 */
router.get("/id/:id", async (ctx) => {
  const id = ctx.params.id;
  if (id == null) {
    ctx.throw(400, "missing id");
  }
  if (!validator.isInt(id)) {
    ctx.throw(400, "Invalid id");
  }

  // get data from db
  const response = await dbServer.get(`/${tableName}?id=eq.${id}`);

  // check if there is one entry
  if (response.data.length !== 1) {
    ctx.throw(400, "No unique entry found");
  }

  // return to user
  ctx.body = mapOutput(response.data[0]);
});

/**
 * @swagger
 * /motorPositions/position:
 *    get:
 *      description: Get the id with the motor positions
 *      summary: get motorPositionsId by motor positions
 *      operationId: getMotorPositionIdByMotorPositions
 *      tags:
 *        - motorPositions
 *      parameters:
 *        - in: query
 *          name: x
 *          style: form
 *          explode: false
 *          schema:
 *            type: array
 *            items:
 *              type: number
 *              format: float
 *          required: true
 *          description: array of x positions
 *        - in: query
 *          name: y
 *          style: form
 *          explode: false
 *          schema:
 *            type: array
 *            items:
 *              type: number
 *              format: float
 *          required: true
 *          description: array of y positions
 *        - in: query
 *          name: z
 *          style: form
 *          explode: false
 *          schema:
 *            type: array
 *            items:
 *              type: number
 *              format: float
 *          required: true
 *          description: array of z positions
 *      produces:
 *        - application/json
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the an object with information about the positions (see schema).
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/motorPositionResponse"
 *        204:
 *          description: There is no position with the provided coordinates
 *        400:
 *          description: Invalid request
 */
router.get("/position", async (ctx) => {
  let x = ctx.query.x;
  let y = ctx.query.y;
  let z = ctx.query.z;

  // check if we got x, y and z
  if (x == null || y == null || z == null) {
    ctx.throw(400, "Please provide x,y,z in query");
  }

  // create arrays (from x=1.1,2.2,3.3,4.4 to [1.1,2.2,3.3,4.4]
  x = x.split(",");
  y = y.split(",");
  z = z.split(",");

  // check if all got the same length
  if (x.length !== y.length && x.length !== z.length) {
    ctx.throw(400, "x,y,z should have the same length");
  }

  // check if all got float values
  for (let i = 0; i < x.length; i++) {
    if (isNaN(parseFloat(x)) || isNaN(parseFloat(y)) || isNaN(parseFloat(z))) {
      ctx.throw(400, "Invalid number");
    }
  }

  // get data from db
  const response = await dbServer.get(
    `/${tableName}?and=(x.eq.{${x}},y.eq.{${y}},z.eq.{${z}})`
  );
  // check if we got an entry, if not then return empty array
  if (response.data.length === 0) {
    ctx.status = 204;
  } else {
    ctx.body = mapOutput(response.data[0]);
  }
});

/**
 * @swagger
 * /motorPositions:
 *    post:
 *      description: >
 *        Create new set of motor positions to use it with tactons.
 *        This endpoint can handle different request schemas.
 *        providing the positions will automatically override the xyz arrays if provided.
 *      summary: Create new set of motor positions
 *      operationId: createMotorPositions
 *      tags:
 *        - motorPositions
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information needed for the tag
 *        content:
 *          application/json:
 *            schema:
 *              anyOf:
 *                - $ref: "#/components/schemas/motorPositionRequestCombined"
 *                - $ref: "#/components/schemas/motorPositionRequest"
 *      produces:
 *        - application/json
 *      parameters: []
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the an object with information about the positions (see schema).
 *        400:
 *          description: Invalid request
 */
router.post(
  "/",
  jwtAuth(jwtAuthOptions),
  permission(),
  koaBody(),
  async (ctx) => {
    await postMotorPositionsTypeValidation(ctx);
    await postMotorPositions(ctx);
  }
);

// function to use on other endpoints as well
export async function postMotorPositionsTypeValidation(ctx) {
  // middleware to check for the request scheme, since we can have two different ones
  // first we need to check which scheme it is
  const positions = ctx.request.body.positions;
  let x = ctx.request.body.x;
  let y = ctx.request.body.y;
  let z = ctx.request.body.z;

  // check if we got the positon and or XYZ
  if (positions == null && (x == null || y == null || z == null)) {
    ctx.throw(400, "please provide positions or xyz arrays");
  }

  // we got the positions, so we need to transform it
  if (positions != null) {
    // check if we got arrays
    if (!Array.isArray(positions)) {
      ctx.throw(400, "positions need to be an array");
    }
    const obj = mapForDatabase(positions);
    x = obj.x;
    y = obj.y;
    z = obj.z;
  }

  // we either have our xyz from the user or the translated scheme
  // save it in our ctx
  ctx.state[stateKey] = {
    x: x,
    y: y,
    z: z,
  };
}

export async function postMotorPositions(ctx, returnsValue = false) {
  const x = ctx.state[stateKey].x;
  const y = ctx.state[stateKey].y;
  const z = ctx.state[stateKey].z;

  // check if we got x, y and z
  if (x == null || y == null || z == null) {
    ctx.throw(400, "Please provide x,y,z");
  }

  // check if we got arrays
  if (!Array.isArray(x) || !Array.isArray(y) || !Array.isArray(z)) {
    ctx.throw(400, "x,y,z need to be an array");
  }

  // check if all got the same length
  if (x.length !== y.length && x.length !== z.length) {
    ctx.throw(400, "x,y,z should have the same length");
  }

  // validate if unique
  const validation = await localServer.get(
    `/motorPositions/position?x=${x}&y=${y}&z=${z}`
  );

  // decide if we need to create a new one, or if we can just return the id
  if (validation.status === 200) {
    if (!returnsValue) ctx.body = validation.data;
    else return validation.data;
  } else {
    // push into database and return the data
    const payload = {
      x,
      y,
      z,
    };

    const newData = await dbServer.post(`/${tableName}`, payload);

    if (!returnsValue) ctx.body = newData.data;
    else return newData.data[0];
  }
}

/**
 * @swagger
 * /motorPositions/{id}:
 *    delete:
 *      description: >
 *        Delete an entry of motorPositions
 *        Only admins can delete motorPositions.
 *      summary: delete motorPositions
 *      operationId: deleteMotorPositions
 *      tags:
 *        - motorPositions
 *      parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: number
 *          format: int32
 *        required: true
 *        description: Unique id of the entry of the motorPosition
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        204:
 *          description: >
 *            Successfully deleted the entry with the provided Id.
 *            Returns 204 even if nothing got deleted.
 *        400:
 *          description: Invalid request
 *        401:
 *          description: Authentication Error
 */
router.delete(
  "/:id",
  jwtAuth(jwtAuthOptions),
  permission({ admin: true }),
  async (ctx) => {
    // validate the input
    const id = ctx.params.id;

    // id first
    if (id == null) {
      ctx.throw(400, "missing id");
    }
    if (!validator.isInt(id)) {
      ctx.throw(400, "Invalid id");
    }

    // find our entry
    const entryResponse = await dbServer.get(`/${tableName}?id=eq.${id}`);

    // check if we have an entry
    if (entryResponse.data.length !== 1) {
      ctx.throw(400, "Invalid id");
    }

    // delete it
    await dbServer.delete(`/${tableName}?id=eq.${id}`);

    ctx.status = 204;
  }
);

export default router;
