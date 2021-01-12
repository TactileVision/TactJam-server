/**
 * This is the axios instance for our postgREST server.
 * The postgREST server uses an authenticated role which is used for database operations.
 * Importing this axios instance in other scrips for using web requests to the database server.
 */
import axios from "axios";

// create new axios instance with db connection
const dbServer = axios.create({
  baseURL: `${process.env.DB_SERVER_URL}:${process.env.DB_PORT}`,
});

// use authorized role -> pass JWT token
dbServer.defaults.headers.common.Authorization =
  "Bearer " + process.env.DB_TOKEN;

export default dbServer;
