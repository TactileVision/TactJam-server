import config from "../config/index.js";
import { getExpirationDate } from "./expiration.js";

export function getCookeOptions(httpOnly = true) {
  const options = {
    signed: true, // signed cookie
    httpOnly: httpOnly, // use it only for requests (can't be used in javascript)
    expires: new Date(getExpirationDate()),
    sameSite: true, // only same side
    secure: false, // https only - not for development
  };
  // enable secure cookie for production environment, as well as the domain name
  if (config.env === "production") {
    options.secure = true;
  }

  return options;
}
