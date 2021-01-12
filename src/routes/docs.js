import Router from "koa-router";
import swaggerJsDoc from "swagger-jsdoc";
import { swaggerOptions } from "../config/swagger.js";

const swaggerSpec = swaggerJsDoc(swaggerOptions);
const router = new Router({ prefix: "/swagger" });

router.get("/", (ctx) => {
  ctx.body = swaggerSpec;
});

export default router;
