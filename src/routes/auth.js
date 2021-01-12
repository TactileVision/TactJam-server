import Router from "koa-router";
const router = new Router({ prefix: "/auth" });

/**
 * @swagger
 * components:
 *   schemas:
 *     "LoginRequest":
 *       type: object
 *       properties:
 *         login:
 *           type: string
 *           minLength: 4
 *           maxLength: 128
 *         password:
 *           type: string
 *           minLength: 8
 *           maxLength: 128
 */

/**
 * @swagger
 * /auth/login:
 *    post:
 *      description: Use to login
 *      summary: Logs in and returns the authentication cookie
 *      operationId: login
 *      tags:
 *        - auth
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the login and password.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: "#/components/schemas/LoginRequest"
 *            example:
 *              login: username123456
 *              password: 1234567890abcdefg
 *      produces:
 *        - application/json
 *      parameters: []
 *      security: []
 *      responses:
 *        200:
 *          schema:
 *            type: object
 *            properties:
 *              expires:
 *                type: date
 *              name:
 *                type: name
 *          description: >
 *            Successfully authenticated.
 *            The JWT is returned in a signed and secure cookie called "jwt".
 *            A name and expires date is provided for setting a frontend cookie
 *          headers:
 *            Set-Cookie:
 *              schema:
 *                type: string
 */
router.post("/login", async (ctx) => {
  // todo
  ctx.body = { ok: "Success" };
});

export default router;
