import Router from "koa-router";
import koaBody from "koa-body";
import validator from "validator";
import jwt from "jsonwebtoken";
import jwtAuth from "koa-jwt";
import { v4 as uuidv4 } from "uuid";
import jwtAuthOptions from "../auth/jwtAuthOptions.js";
import dbServer from "../database/dbServer.js";
import { compareHash, generateHash } from "../auth/password.js";
import { getJwtOptions } from "../auth/jwtOptions.js";
import { getCookeOptions } from "../auth/cookieOptions.js";
import getTomorrow from "../helper/getTomorrow.js";
// import { sendPasswordReset } from "..."; // TODO
import { getExpirationDate } from "../auth/expiration.js";
import permission from "../auth/permissionMiddleware.js";

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
 *     "LoginData":
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         expires:
 *           type: string
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
 *          description: >
 *            Successfully authenticated.
 *            The JWT is returned in a signed and secure cookie called "jwt".
 *            A name and expires date is provided for setting a frontend cookie
 *          headers:
 *            Set-Cookie:
 *              schema:
 *                type: string
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/LoginData"
 */
router.post("/login", koaBody(), async (ctx) => {
  // validate login / password
  if (
    ctx.request.body.login == null ||
    ctx.request.body.password == null ||
    !validator.isLength(ctx.request.body.login, { min: 4, max: 128 }) ||
    !validator.isLength(ctx.request.body.password, { min: 8, max: 128 })
  ) {
    ctx.throw(400, "Invalid length of login or password");
  }

  // check if the login is a username or email
  const isMail = validator.isEmail(ctx.request.body.login);
  const queryParam = isMail ? "email" : "username";

  // search for the user in the database
  const response = await dbServer.get(
    "/users?" + queryParam + "=eq." + ctx.request.body.login.toLowerCase()
  );

  // we dont found a user in our database
  if (response.data.length < 1) {
    ctx.throw(401, "Invalid combination of login and password");
  }

  // we found at least one!
  const user = response.data[0];

  // check if the user is banned
  if (user.banned) {
    ctx.throw(401, "Account suspended");
  }

  // TODO future
  // check if the email is confirmed here

  // compare password
  const validPassword = await compareHash(
    ctx.request.body.password,
    user.password
  );

  // check is the password is valid
  if (!validPassword.valid) {
    // password/combination is not valid
    ctx.throw(401, "Invalid combination of login and password");
  }

  // password is valid, check if we need to update
  if (validPassword.newHash != null) {
    const hashString = validPassword.newHash.toString("hex");
    await dbServer.patch(`/users?id=eq.${user.id}`, {
      password: hashString,
    });
  }

  // update last login
  await updateLastLogin(user.id);

  // set jwt and cookie
  await setJwtAndCookie(ctx, user.id);

  const expiresDate = new Date(getExpirationDate());

  // return name and date for frontend
  ctx.body = { name: user.name, expires: expiresDate };
});

/**
 * @swagger
 * /auth/logout:
 *    post:
 *      description: Use to logout
 *      summary: Logs out and deletes signed cookie
 *      operationId: logout
 *      tags:
 *        - auth
 *      requestBody: []
 *      parameters: []
 *      security:
 *      - cookieAuth: []
 *      responses:
 *        200:
 *          description: >
 *            Successfully logged out.
 *            The cookie with the name "jwt" is deleted.
 *          headers:
 *            Set-Cookie:
 *              schema:
 *                type: string
 */
router.post("/logout", jwtAuth(jwtAuthOptions), async (ctx) => {
  // user logout means we gonna "clear" the cookies
  ctx.cookies.set("jwt", {}, { expires: new Date() });
  ctx.cookies.set("user", {}, { expires: new Date() });

  // give the user the response
  ctx.status = 200;
});

/**
 * @swagger
 * /auth/renew:
 *    post:
 *      description: Use to renew the cookie and jwt for user authentication
 *      summary: Generates a new cookie valid for 24h.
 *      operationId: renew
 *      tags:
 *        - auth
 *      requestBody: []
 *      parameters: []
 *      security:
 *      - cookieAuth: []
 *      responses:
 *        200:
 *          description: >
 *            Successfully extended duration of the cookie.
 *            The cookie with the name "jwt" is set.
 *            A frontend cookie called "user" is set for interaction, it only contains the name.
 *          headers:
 *            Set-Cookie:
 *              schema:
 *                type: string
 *          content:
 *            application/json:
 *              schema:
 *                $ref: "#/components/schemas/LoginData"
 */
router.post("/renew", jwtAuth(jwtAuthOptions), permission(), async (ctx) => {
  const id = ctx.state.user.id;
  // update last login
  await updateLastLogin(id);

  // set jwt and cookie
  await setJwtAndCookie(ctx, id);

  // set frontend cookie
  const expiresDate = new Date(getExpirationDate());

  // return name and new date to the user
  ctx.body = { name: ctx.state.user.name, expires: expiresDate };
});

/**
 * @swagger
 * /auth/forgot:
 *    post:
 *      description: >
 *        Reset your password by sending a token to your email.
 *        With this token you can change your password once.
 *      summary: Request password reset
 *      operationId: forgotPassword
 *      tags:
 *        - auth
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the login/email
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                login:
 *                  type: string
 *                  minLength: 4
 *                  maxLength: 128
 *      produces:
 *        - application/json
 *      parameters: []
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            An E-Mail was send to the provided user-email IF there is an user with the login/email.
 */
router.post("/forgot", koaBody(), async (ctx) => {
  const login = ctx.request.body.login;
  // validate login
  if (login == null || !validator.isLength(login, { min: 4, max: 128 })) {
    ctx.throw(400, "Login missing");
  }

  // check if its an email or a username
  const isMail = validator.isEmail(login);
  const queryParam = isMail ? "email" : "username";

  const checkQueryString =
    "/users?" + queryParam + "=eq." + login.toLowerCase();

  // search for the user in the database
  const dbResponse = await dbServer.get(checkQueryString);
  // we dont found a user in our database
  if (dbResponse.data.length < 1) {
    // provide fake information to the client
    ctx.status = 200;
    ctx.body =
      "An E-Mail was send to the provided user-email if there is an user with the login/email";
    return;
  }

  // we found at least one!
  const user = dbResponse.data[0];

  // get the current date, to check if we got already an active password reset ongoing
  const currentDate = new Date().toUTCString();

  const checkResetTableQueryString = `/password_resets?and=(user_id.eq.${user.id},expiry_at.gt."${currentDate}",used.is.false)`;

  // get the data for the user from the table password resets
  const passwordResetTableResponse = await dbServer.get(
    checkResetTableQueryString
  );

  // check if we have an entry already, and if we do, then we dont do anything since the request is still ongoing
  if (passwordResetTableResponse.data.length > 0) {
    ctx.status = 200;
    ctx.body =
      "An E-Mail was send to the provided user-email if there is an user with the login/email";
    return;
  }

  // create information for password reset
  const passwordUuid = uuidv4();
  const passwordUuidHash = await generateHash(passwordUuid);
  const passwordUuidHashString = passwordUuidHash.toString("hex");

  // save it in database
  await dbServer.post("/password_resets", {
    user_id: user.id,
    reset_token: passwordUuidHashString,
    expiry_at: getTomorrow(),
  });

  // TODO mail service? sending the text for confirmation
  // send mail for Password reset
  // await sendPasswordReset(user.email, user.name, passwordUuid);
  console.log(`user: ${user.email}, password-reset-uuid: ${passwordUuid}`);

  // respond to user
  ctx.status = 200;
});

/**
 * @swagger
 * /auth/set/password:
 *    post:
 *      description: >
 *        Assign new password with the token from the password reset via mail.
 *      summary: Set new password with email token
 *      operationId: setNewPassword
 *      tags:
 *        - auth
 *      requestBody:
 *        required: true
 *        description: A JSON object containing the login/email
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                token:
 *                  type: string
 *                  format: uuid
 *                email:
 *                  type: string
 *                  format: email
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
 *      produces:
 *        - application/json
 *      parameters: []
 *      security: []
 *      responses:
 *        200:
 *          description: >
 *            Password has been updated and can be used to login
 */
router.post("/set/password", koaBody(), async (ctx) => {
  const email = ctx.request.body.email;
  const token = ctx.request.body.token;
  const password = ctx.request.body.password;
  const password2 = ctx.request.body.password2;

  // check if request ist complete
  if (email == null || token == null || password == null || password2 == null) {
    ctx.throw(400, "missing body parameters");
  }

  // check input
  if (!validator.isEmail(email)) {
    ctx.throw(400, "Invalid email");
  }

  if (!validator.isLength(password, { min: 8, max: 128 })) {
    ctx.throw(400, "Too short/long password, please check docs");
  }

  if (password !== password2) {
    ctx.throw(400, "Passwords doesn't match");
  }

  // get user
  const dbResponse = await dbServer.get(`/users?email=eq.${email}`);
  if (dbResponse.data.length !== 1) {
    ctx.throw(400, "Invalid token or email");
  }
  const user = dbResponse.data[0];

  // we have an user, now search for the password reset table
  const currentDate = new Date().toUTCString();
  const passwordResetQueryString = `/password_resets?and=(user_id.eq.${user.id},expiry_at.gt."${currentDate}",used.is.false)`;
  const passwordResetTableResponse = await dbServer.get(
    passwordResetQueryString
  );

  // check if we got one result
  if (passwordResetTableResponse.data.length !== 1) {
    ctx.throw(400, "Invalid token or email");
  }
  const passwordResetRow = passwordResetTableResponse.data[0];

  // compare token
  const validToken = await compareHash(token, passwordResetRow.reset_token);

  // check is the token is valid
  if (!validToken.valid) {
    // token is not valid
    ctx.throw(400, "Invalid token or email");
  }

  // token is valid
  // hash password
  const hash = await generateHash(password);
  const hashString = hash.toString("hex");
  const payload = {
    password: hashString,
  };

  // update password
  await dbServer.patch(`/users?id=eq.${user.id}`, payload);

  // update entry in our password reset table
  await dbServer.patch(
    `/password_resets?and=(user_id.eq.${user.id},expiry_at.gt."${currentDate}",used.is.false)`,
    {
      used: true,
    }
  );

  // respond to user
  ctx.status = 200;
});

// ---- helper functions ----
async function updateLastLogin(userId) {
  await dbServer.patch(`/users?id=eq.${userId}`, {
    last_login_at: new Date(),
  });
}

async function setJwtAndCookie(ctx, userId) {
  // lets create our signed JWT, first the claims we save in the jwt
  const claims = {
    id: userId,
  };

  // now we create it
  const token = jwt.sign(claims, process.env.JWT_SECRET, getJwtOptions());

  // lets save it in a new signed cookie
  ctx.cookies.set("jwt", token, getCookeOptions());
}

export default router;
