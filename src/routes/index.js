import docsRouter from "./docs.js";
import userRouter from "./user.js";
import authRouter from "./auth.js";
import teamsRouter from "./teams.js";
import tagRouter from "./tags.js";
import bodyTagRouter from "./bodyTags.js";

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