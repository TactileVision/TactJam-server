import Router from "koa-router";
import validator from "validator";
import koaBody from "koa-body";
import jwtAuth from "koa-jwt";

import permission from "../auth/permissionMiddleware.js";
import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";

import { generateHash, compareHash } from "../auth/password.js"; // compareHash
import { v4 as uuidv4 } from "uuid";
// import { sendEmailConfirmation } from "../mail/index.js";
import getTomorrow from "../helper/getTomorrow.js";

const router = new Router({ prefix: "/user" });

/**
 * @swagger
 * /user/{userId}:
 *    get:
 *      description: Get a users by his ID. Only admins are allowed to use this operation.
 *      summary: get user
 *      operationId: getUserById
 *      tags:
 *        - user
 *      parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: string
 *          format: uuid
 *        required: true
 *        description: Unique ID of the user
 *      produces:
 *        - application/json
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        200:
 *          description: >
 *            Returns the user, if there is a user with the id
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                    format: uuid
 *                  username:
 *                    type: string
 *                  name:
 *                    type: string
 *                  isAdmin:
 *                    type: boolean
 *                  banned:
 *                    type: boolean
 *                  teamId:
 *                    type: string
 *                    format: uuid
 *        400:
 *          description: No user found with that userId.
 *        401:
 *          description: Authentication Error
 */
router.get(
  "/:id",
  jwtAuth(jwtAuthOptions),
  permission({ admin: true }),
  async (ctx) => {
    // get user from db
    const response = await dbServer.get(`/users?id=eq.${ctx.params.id}`);

    // check if there is one user
    if (response.data.length !== 1) {
      ctx.throw(400, "No unique user found");
    }

    const user = response.data[0];

    // return the user
    ctx.body = {
      id: user.id,
      username: user.username,
      name: user.name,
      banned: user.banned,
      isAdmin: user.is_admin,
      teamId: user.team_id,
    };
  }
);

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

/**
 * @swagger
 * /user/{userId}:
 *    put:
 *      description: >
 *        Update user values.
 *        Only admins can edit others, but you can edit yourself.
 *      summary: update user
 *      operationId: updateUser
 *      tags:
 *        - user
 *      parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: string
 *          format: uuid
 *        required: true
 *        description: Unique ID of the user
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information to update
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
 *                  type: string
 *                  format: email
 *                  description: E-Mail needed for password reset.
 *                teamId:
 *                  type: string
 *                  format: uuid
 *                name:
 *                  type: string
 *                  minLength: 4
 *                  maxLength: 128
 *                  description: Alpha Numeric only! Visible name on the platform.
 *            example:
 *              username: username123456
 *              email: username123456@mail.com
 *              name: Miyako
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
router.put(
  "/:id",
  jwtAuth(jwtAuthOptions),
  permission(),
  koaBody(),
  async (ctx) => {
    const userId = ctx.params.id;
    if (userId == null) {
      ctx.throw(400, "missing id");
    }

    if (!validator.isUUID(userId)) {
      ctx.throw(400, "Invalid id");
    }

    // get user from db
    const response = await dbServer.get(`/users?id=eq.${userId}`);

    // check if there is one user
    if (response.data.length !== 1) {
      ctx.throw(400, "No unique user found");
    }
    const user = response.data[0];
    // check if the user got admin permissions or if the user is himself
    if (!ctx.state.user.admin && user.id !== ctx.state.user.id) {
      ctx.throw(401, "Authentication error");
    }

    // validate input
    const username = ctx.request.body.username;
    const email = ctx.request.body.email;
    const name = ctx.request.body.name;
    const teamId = ctx.request.body.teamId;

    // check username
    if (username != null) {
      if (
        !validator.isLength(username, { min: 4, max: 128 }) ||
        !validator.isAlphanumeric(username)
      ) {
        ctx.throw(400, "Invalid Username");
      }
    }

    // check email
    if (email != null) {
      if (!validator.isEmail(email)) {
        ctx.throw(400, "Invalid email");
      }
    }

    // check name
    if (name != null) {
      if (
        !validator.isLength(name, { min: 4, max: 128 }) ||
        !validator.isAlphanumeric(name)
      ) {
        ctx.throw(400, "Invalid name");
      }
    }

    // check if username/name/email is unique
    if (username != null || email != null) {
      const validation = await validateUniqueValues(ctx, username, email);
      if (!validation.valid) {
        ctx.throw(400, validation.msg);
      }
    }

    // check teamId
    if (teamId != null) {
      if (!validator.isUUID(teamId)) {
        ctx.throw(400, "Invalid TeamId");
      }
    }

    const teamIdResponse = dbServer.get(`/teams?id=eq.${teamId}`);
    if (teamIdResponse.data.length !== 1) {
      ctx.throw(400, "Invalid TeamId");
    }

    const patchObj = {
      username,
      name,
      teamId,
      updated_at: new Date(),
    };

    if (email != null) {
      // email confirmation
      const mailUuid = uuidv4();
      const mailUuidHash = await generateHash(mailUuid);
      const mailUuidHashString = mailUuidHash.toString("hex");

      const emailPayload = {
        user_id: user.id,
        old_email: user.email,
        new_email: email,
        token: mailUuidHashString,
        confirm_expiry_at: getTomorrow(),
        confirmed: true, // this is only for testing purposes, this should be false!
        current: true,
      };

      // save e-mail update
      await dbServer.post("/email_updates", emailPayload);

      console.log(email, user.name, mailUuid);

      // send mail to user
      // TODO EMAIL confirmation
      // await sendEmailConfirmation(email, user.name, mailUuid, false);

      patchObj.email = email; // this line should be deleted --> user needs to confirm mail
    }

    // update on db
    await dbServer.patch(`/users?id=eq.${user.id}`, patchObj);

    // return the user
    ctx.status = 200;
  }
);

/**
 * @swagger
 * /user/password:
 *    patch:
 *      description: >
 *        Updates your own password
 *      summary: update password
 *      operationId: updatePassword
 *      tags:
 *        - user
 *      parameters: []
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the information to update
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                oldPassword:
 *                  type: string
 *                  minLength: 8
 *                  maxLength: 128
 *                newPassword:
 *                  type: string
 *                  minLength: 8
 *                  maxLength: 128
 *                newPassword2:
 *                  type: string
 *                  minLength: 8
 *                  maxLength: 128
 *      security:
 *        - cookieAuth: []
 *      responses:
 *        200:
 *          description: Successfully updated.
 *        400:
 *          description: Invalid request
 *        401:
 *          description: Authentication Error
 */
router.patch(
  "/password",
  jwtAuth(jwtAuthOptions),
  permission({ password: true }),
  koaBody(),
  async (ctx) => {
    // validate input
    const oldPassword = ctx.request.body.oldPassword;
    let newPassword = ctx.request.body.newPassword;
    const newPassword2 = ctx.request.body.newPassword2;

    // check password
    if (newPassword == null || oldPassword == null || newPassword2 == null) {
      ctx.throw(400, "Password(s) missing");
    }

    if (newPassword !== newPassword2) {
      ctx.throw(400, "Passwords does not match");
    }

    // check old password
    const validPassword = await compareHash(
      oldPassword,
      ctx.state.user.password
    );

    if (!validPassword.valid) {
      // password/combination is not valid
      ctx.throw(401, "Invalid password");
    }

    // validate new password
    if (!validator.isLength(newPassword, { min: 8, max: 128 })) {
      ctx.throw(400, "New password is too long / short, see docs");
    }
    // generate new hash
    const hash = await generateHash(newPassword);
    const hashString = hash.toString("hex");
    newPassword = hashString;

    // update on db
    await dbServer.patch(`/users?id=eq.${ctx.state.user.id}`, {
      password: newPassword,
      updated_at: new Date(),
    });
    ctx.status = 200;
  }
);

/**
 * @swagger
 * /user/{userId}:
 *    delete:
 *      description: Use to delete an user. Only admins can delete users.
 *      summary: delete an user
 *      operationId: deleteUser
 *      tags:
 *        - user
 *      parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: string
 *          format: uuid
 *        required: true
 *        description: Unique ID of the user
 *      produces:
 *        - application/json
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
router.delete(
  "/:id",
  jwtAuth(jwtAuthOptions),
  permission({ admin: true }),
  async (ctx) => {
    const id = ctx.params.id;
    // check id
    if (id == null) {
      ctx.throw(400, "Id missing");
    }

    if (!validator.isUUID(id)) {
      ctx.throw(400, "Id is not an UUID");
    }

    // check if the user is himself
    if (id === ctx.state.user.id) {
      ctx.throw(400, "You can't delete yourself.");
    }

    // delete the user
    await dbServer.delete(`/users?id=eq.${ctx.params.id}`);
    ctx.status = 204;
  }
);

// TODO (low priority)
// confirm email
// check for Register & Update: confirmed: true --> Should be false

// export router object
export default router;

// ---- helper functions ----
// function to check if username and email is unique
async function validateUniqueValues(ctx, username, email) {
  let queryString = "/users?or=(";

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
