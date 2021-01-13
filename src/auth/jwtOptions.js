import { getExpiresIn } from "./expiration.js";
import config from "../config/index.js";

export function getJwtOptions() {
  return {
    issuer: config.domain,
    expiresIn: getExpiresIn(),
    notBefore: 0, // not before the actual date
  };
}
