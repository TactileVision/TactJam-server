import docsRouter from "./docs.js";
import userRouter from "./user.js";
import authRouter from "./auth.js";
import teamsRouter from "./teams.js";
import tagRouter from "./tags.js";
import bodyTagRouter from "./bodyTags.js";
import motorPositionsRouter from "./motorPositions.js";
import tactonsRouter from "./tactons.js";

function setupRoutes(app) {
  // initialize docs router
  app.use(docsRouter.routes()).use(docsRouter.allowedMethods());

  // initialize user router
  app.use(userRouter.routes()).use(userRouter.allowedMethods());

  // initialize auth router
  app.use(authRouter.routes()).use(authRouter.allowedMethods());

  // initialize teams router
  app.use(teamsRouter.routes()).use(teamsRouter.allowedMethods());

  // initialize tags router
  app.use(tagRouter.routes()).use(tagRouter.allowedMethods());

  // initialize bodytag router
  app.use(bodyTagRouter.routes()).use(bodyTagRouter.allowedMethods());

  // initialize motorPositions router
  app
    .use(motorPositionsRouter.routes())
    .use(motorPositionsRouter.allowedMethods());

  // initialize tacton router
  app.use(tactonsRouter.routes()).use(tactonsRouter.allowedMethods());
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
