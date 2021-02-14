import dotenv from "dotenv";

// load env files from .env file
dotenv.config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.APP_PORT || 8080,
  cookieSecret: process.env.COOKIE_SECRET,
  jwtSecret: process.env.JWT_SECRET,
  domain: "https://" + process.env.SERVER_DOMAIN,
};

export default config;
