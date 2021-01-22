import dbServer from "../database/dbServer.js";

/**
 * This middleware is for checking if the user is logged in.
 * Later this can be easily adjusted to check for permissions.
 */
export default (opts = {}) => {
  const { debug, admin = false, key = "user", password = false } = opts;

  return async function (ctx, next) {
    try {
      // check first if we have the user in our context, if not there the user is not logged in
      if (ctx.state[key] == null) {
        ctx.throw(401, "No user found");
      }

      // get user from database
      const response = await dbServer.get(`/users?id=eq.${ctx.state[key].id}`);

      // check if there is exactly one user
      // (otherwise something is wrong, since the id needs to be unique in database)
      if (response.data.length !== 1) {
        ctx.throw(401, "User authentication error");
      }

      // assign the user to a variable to work with it
      const user = response.data[0];

      // check if the account / user is banned
      if (user.banned) {
        ctx.throw(401, "User is banned");
      }

      // check if admin permission is needed
      if (!user.admin) {
        // user is not an admin, check if we need the permission level
        if (admin) {
          ctx.throw(401, "Insufficient permissions");
        }
      }

      // create object for the ctx to work with
      ctx.state[key] = {
        id: user.id,
        username: user.username,
        name: user.name,
      };

      // add password hash if needed (for example updating)
      if (password) {
        ctx.state[key].password = user.password;
      }
    } catch (e) {
      const msg = debug ? e.message : "Authentication Error";
      ctx.throw(401, msg);
    }

    return next();
  };
};
