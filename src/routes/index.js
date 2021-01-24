import docsRouter from "./docs.js";
import userRouter from "./user.js";
import authRouter from "./auth.js";

function setupRoutes(app) {
  // initialize docs router
  app.use(docsRouter.routes()).use(docsRouter.allowedMethods());

  // initialize user router
  app.use(userRouter.routes()).use(userRouter.allowedMethods());

  // initialize auth router
  app.use(authRouter.routes()).use(authRouter.allowedMethods());
}

export default setupRoutes;

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: jwt
 */
