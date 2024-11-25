import "dotenv/config";
import { cleanEnv, json, num, port } from "envalid";

const env = cleanEnv(process.env, {
  ALLOWED_EMAILS: json<string[]>({ desc: "JSON array of allowed emails" }),
  PORT: port({ desc: "Listening port" }),
  WEEKS_TO_PULL: num({ desc: "How many weeks to pull from now" }),
});

export const config = {
  ...env,
};
