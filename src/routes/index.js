import docsRouter from "./docs.js";
import userRouter from "./user.js";

function setupRoutes(app) {
  // initialize docs router
  app.use(docsRouter.routes()).use(docsRouter.allowedMethods());

  // initialize user router
  app.use(userRouter.routes()).use(userRouter.allowedMethods());
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
