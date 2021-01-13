import Router from "koa-router";
import validator from "validator";
import koaBody from "koa-body";
// import jwtAuth from "koa-jwt"

// import permission from "../auth/permissionMiddleware.js";
// import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";

import { generateHash } from "../auth/password.js"; // compareHash
import { v4 as uuidv4 } from "uuid";
// import { sendEmailConfirmation } from "../mail/index.js";
import getTomorrow from "../helper/getTomorrow.js";

const router = new Router({ prefix: "/user" });

/**
 * @swagger
 * /user/register:
 *    post:
 *      description: Use to register a new user
 *      summary: creates a new user
 *      operationId: registerUser
 *      tags:
 *        - user
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information needed for registration.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                username:
 *                  type: string
 *                  minLength: 4
 *                  maxLength: 128
 *                  description: Alpha Numeric only! For login purposes only, does not show anywhere.
 *                email:
 *                  type: email
 *                  description: E-Mail needed for password reset.
 *                password:
 *                  type: string
 *                  minLength: 8
 *                  maxLength: 128
 *                password2:
 *                  type: string
 *                  minLength: 8
 *                  maxLength: 128
 *                  description: need to be the same then password
 *                name:
 *                  type: string
 *                  minLength: 4
 *                  maxLength: 128
 *                  description: Alpha Numeric only! Visible name on the platform.
 *              required:
 *                - username
 *                - email
 *                - password
 *                - password2
 *                - name
 *            example:
 *              username: username123456
 *              email: username123456@mail.com
 *              password:
 *              password2:
 *              name: Miyako
 *      produces:
 *        - application/json
 *      parameters: []
 *      security: []
 *      responses:
 *        201:
 *          description: >
 *            Successfully registered.
 *            The user is now saved in the database.
 *            You can login with the registered information.
 *        400:
 *          description: Invalid request
 */
router.post("/register", koaBody(), async (ctx) => {
  const username = ctx.request.body.username;
  const email = ctx.request.body.email;
  const password = ctx.request.body.password;
  const password2 = ctx.request.body.password2;
  const name = ctx.request.body.name;

  // check if request is complete
  if (
    username == null ||
    email == null ||
    password == null ||
    password2 == null ||
    name == null
  ) {
    ctx.throw(400, "missing body parameters");
  }

  // check input
  if (
    !validator.isLength(username, { min: 4, max: 128 }) ||
    !validator.isAlphanumeric(username) ||
    !validator.isEmail(email) ||
    !validator.isLength(name, { min: 4, max: 128 }) ||
    !validator.isAlphanumeric(name) ||
    !validator.isLength(password, { min: 8, max: 128 }) ||
    !validator.isLength(password2, { min: 8, max: 128 })
  ) {
    ctx.throw(400, "Invalid body parameters");
  }

  // check if both passwords are the same
  if (password !== password2) {
    ctx.throw(400, "Passwords doesn't match");
  }

  // validate if username or email is already in use
  const validation = await validateUniqueValues(ctx, username, email);
  if (!validation.valid) {
    ctx.throw(400, validation.msg);
  }

  // hash password
  const hash = await generateHash(password);
  const hashString = hash.toString("hex");

  // generate new uuid for user
  const userUuid = uuidv4();

  // payload for database request
  const newDate = new Date();
  const payload = {
    id: userUuid,
    username: validator.trim(username).toLowerCase(),
    name: validator.trim(name),
    email: email,
    password: hashString,
    created_at: newDate,
    updated_at: newDate,
  };

  // save new user
  await dbServer.post("/users", payload);

  // email confirmation
  const mailUuid = uuidv4();
  const mailUuidHash = await generateHash(mailUuid);
  const mailUuidHashString = mailUuidHash.toString("hex");

  const emailPayload = {
    user_id: userUuid,
    old_email: null,
    new_email: email,
    token: mailUuidHashString,
    confirm_expiry_at: getTomorrow(),
    confirmed: true, // this is only for testing purposes, this should be false!
    current: true,
  };

  // save e-mail update
  try {
    await dbServer.post("/email_updates", emailPayload);
  } catch (e) {
    console.log(e);
  }

  ctx.status = 201;
});

export default router;

// ---- helper functions ----
// function to check if username and email is unique
async function validateUniqueValues(ctx, username, email) {
  let queryString = "/users?or(";

  if (username != null) {
    queryString += `username.eq.${username}`;
  }

  if (email != null) {
    if (username != null) {
      queryString += `,`;
    }
    queryString += `email.eq.${email}`;
  }

  queryString += `)`;

  // database request to check for values
  const response = await dbServer.get(queryString);
  const userArray = response.data;

  // create feedback
  if (userArray.length > 0) {
    let feedback = "These are already in use:";
    if (userArray.findIndex((x) => x.username === username) >= 0) {
      feedback += " username";
    }
    if (userArray.findIndex((x) => x.email === email) >= 0) {
      feedback += " email";
    }

    // there is an user already with email/username
    return { valid: false, msg: feedback };
  }
  // both values are not used
  return { valid: true };
}
