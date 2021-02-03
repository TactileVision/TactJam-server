import Router from "koa-router";
import validator from "validator";
import koaBody from "koa-body";
import jwtAuth from "koa-jwt";

import permission from "../auth/permissionMiddleware.js";
import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";
import localServer from "../database/localServer.js";

const router = new Router({ prefix: "/motorPositions" });
const tableName = "motor_positions";

/**
 * @swagger
 * components:
 *   schemas:
 *     "motorPositionResponse":
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           format: int32
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
 *
 *
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
 *            Returns the an object with the tag name and id
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

  // check if there is one tag
  if (response.data.length !== 1) {
    ctx.throw(400, "No unique tag found");
  }

  // return to user
  ctx.body = response.data[0];
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
 *            Returns the an object with the tag name and id
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/motorPositionResponse"
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

  ctx.body = response.data;
});

/**
 * @swagger
 * /motorPositions:
 *    post:
 *      description: Create new set of motor positions to use it with tactons
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
 *              type: object
 *              properties:
 *                x:
 *                  type: array
 *                  items:
 *                    type: number
 *                    format: float
 *                y:
 *                  type: array
 *                  items:
 *                    type: number
 *                    format: float
 *                z:
 *                  type: array
 *                  items:
 *                    type: number
 *                    format: float
 *              required:
 *                - x
 *                - y
 *                - z
 *            example:
 *              x: [0.2, 0.33, 0.444, 0.555, 0.666, 0.77, 0.88, 0.999]
 *              y: [0.01, 0.02, 0.3, 0.4, 0.56, 0.78, 0.99, 3.2]
 *              z: [1.5, 2.6, 3.77, 4.78, 5.88, 6.99, 7.2, 8.2]
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
    const x = ctx.request.body.x;
    const y = ctx.request.body.y;
    const z = ctx.request.body.z;

    // check if we got x, y and z
    if (x == null || y == null || z == null) {
      ctx.throw(400, "Please provide x,y,z in query");
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
      `/motorPositions/position?x=${x.join()}&y=${y.join()}&z=${z.join()}`
    );

    // decide if we need to create a new one, or if we can just return the id
    if (validation.data.length === 1) {
      ctx.body = validation.data;
    } else {
      // push into database and return the data
      const payload = {
        x,
        y,
        z,
      };

      const newData = await dbServer.post(`/${tableName}`, payload);

      ctx.body = newData.data;
    }
  }
);

export default router;
