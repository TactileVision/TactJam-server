/* Main JS file */
import Koa from "koa";
import cors from "@koa/cors";
import logger from "koa-pino-logger";
import config from "./config/index.js";
import loggerConfig from "./config/logger.js";
import swaggerOptions from "./config/swagger.js";
import { koaSwagger } from "koa2-swagger-ui";
import setupRoutes from "./routes/index.js";

// setup koa
const app = new Koa();

// setup proxy
app.proxy = true;

// disable console.errors (except in dev mode)
app.silent = config.env !== "development";

// setup cookie secrets
app.keys = [config.cookieSecret];

// use logger
app.use(logger(loggerConfig));

// setup cors
app.use(
  cors({
    origin:
      config.env === "development" ? `http://localhost:8080` : config.domain,
    credentials: true,
  })
);

// enable all routes
setupRoutes(app);

// setup swagger
app.use(koaSwagger(swaggerOptions));

// start server
app.listen(config.port);
console.info(`Listening on port ${config.port}`);
