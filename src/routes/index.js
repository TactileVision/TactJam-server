import docsRouter from "./docs.js";

function setupRoutes(app) {
  app.use(docsRouter.routes()).use(docsRouter.allowedMethods());
}

export default setupRoutes;
