/**
 * This is the axios instance for our local server.
 * We use this instance to speak with other endpoints
 */
import axios from "axios";

// create new axios instance with db connection
const localServer = axios.create({
  baseURL: `http://localhost:${process.env.APP_PORT}`,
});

export default localServer;
