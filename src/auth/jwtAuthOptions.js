import config from "../config/index.js";

const jwtAuthOptions = {
  cookie: "jwt",
  secret: process.env.JWT_SECRET,
  issuer: config.domain,
};

export default jwtAuthOptions;
