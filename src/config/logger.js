import config from "./index.js";

const loggerConfig = {
  // Enable logging only in production and development env as default.
  enabled:
    process.env.LOG_ENABLED ||
    ["production", "development"].includes(config.env),
  // The name of the logger. When set adds a name field to every log.
  name: config.name,
  level:
    process.env.LOG_LEVEL || (config.env === "production" ? "info" : "debug"),
  // Supply paths to keys to redact sensitive information
  // see https://github.com/pinojs/pino/blob/master/docs/redaction.md
  redact: {
    paths: [],
    censor: "****",
  },
};

export default loggerConfig;
