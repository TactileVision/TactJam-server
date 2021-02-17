import config from "../config/index.js";
import { getExpirationDate } from "./expiration.js";

export function getCookeOptions(httpOnly = true) {
  const options = {
    signed: true, // signed cookie
    httpOnly: httpOnly, // use it only for requests (can't be used in javascript)
    expires: new Date(getExpirationDate()),
    sameSite: false, // this should be TRUE, but electron does have a bug where it doesnt accept it otherwise
    // enable secure cookie for production environment, as well as the domain name
    secure: config.env === "production", // https only - not for development
  };
  return options;
}
