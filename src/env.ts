import dotenv from "dotenv";
dotenv.config();

export type Env = {
  mysql: {
    host: string;
    username: string;
    password: string;
    port: number;
    database: string;
  };
  reddit: {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    userAgent: string;
  };
  openAiApiKey: string;
};

export function parseEnv(): Env {
  return {
    mysql: {
      host: process.env.MYSQL_HOST || "",
      username: process.env.MYSQL_USERNAME || "",
      password: process.env.MYSQL_PASSWORD || "",
      port: parseInt(process.env.MYSQL_PORT || "3306"),
      database: process.env.MYSQL_DATABASE || "",
    },
    reddit: {
      clientId: process.env.REDDIT_CLIENT_ID || "",
      clientSecret: process.env.REDDIT_CLIENT_SECRET || "",
      username: process.env.REDDIT_USERNAME || "",
      password: process.env.REDDIT_PASSWORD || "",
      userAgent: process.env.REDDIT_USER_AGENT || "",
    },
    openAiApiKey: process.env.OPENAI_API_KEY || "",
  };
}
