import { Chatbot } from "./chatbot";
import { parseEnv } from "./env";
import { RedditApiSdk } from "./redditApiSdk";
import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import { Database } from "./repositories/kyselyTypes";
import { SocialMediaPostsRepository } from "./repositories/socialMediaPostsRepository";
import { schedule } from "node-cron";

const env = parseEnv();

async function boostrap() {
  console.log("Starting...");

  const dialect = new MysqlDialect({
    pool: createPool({
      host: env.mysql.host,
      user: env.mysql.username,
      password: env.mysql.password,
      port: env.mysql.port,
      database: env.mysql.database,
      connectionLimit: 10,
    }),
  });
  const db = new Kysely<Database>({
    dialect,
  });

  const socialMediaPostsRepo = new SocialMediaPostsRepository(db);
  const redditApi = new RedditApiSdk({
    clientId: env.reddit.clientId,
    clientSecret: env.reddit.clientSecret,
    username: env.reddit.username,
    password: env.reddit.password,
    userAgent: env.reddit.userAgent,
  });
  const chatbot = new Chatbot({
    openAiApiKey: env.openAiApiKey,
  });

  // every hour get the latest posts and process them
  schedule("*/1 * * * *", async () => {
    try {
      console.log("Getting latest posts...");
      await getLatestPosts({ redditApi, socialMediaPostsRepo });
      console.log("Processing newest posts...");
      await processNewestPosts({ redditApi, socialMediaPostsRepo, chatbot });
    } catch (error) {
      console.error(`Error processing posts: ${error}`);
    }
  });

  console.log(`Done.`);
}

boostrap().catch(console.error);

async function getLatestPosts({
  redditApi,
  socialMediaPostsRepo,
}: {
  redditApi: RedditApiSdk;
  socialMediaPostsRepo: SocialMediaPostsRepository;
}) {
  // const subreddits = ["recruitinghell", "jobsearchhacks"];
  // const subreddits = ["cscareerquestionsEU"];
  const subreddits = ["jobs"];
  for (const subreddit of subreddits) {
    const posts = await redditApi.getSubredditPosts({
      subreddit,
      limit: 2,
    });

    await socialMediaPostsRepo.upsertPosts({
      posts: posts.map((post) => ({
        externalId: post.id,
        title: post.title,
        content: post.content,
        url: post.url,
      })),
    });
  }
}

async function processNewestPosts({
  redditApi,
  socialMediaPostsRepo,
  chatbot,
}: {
  redditApi: RedditApiSdk;
  socialMediaPostsRepo: SocialMediaPostsRepository;
  chatbot: Chatbot;
}) {
  const unprocessedPosts = await socialMediaPostsRepo.getAllUnprocessedPosts();
  console.log(`Found ${unprocessedPosts.length} unprocessed posts.`);
  for (const post of unprocessedPosts) {
    const isPostRelevant = await chatbot.isPostRelevant({ post });
    console.log(`${isPostRelevant} - ${post.title}`);
    if (isPostRelevant) {
      const reply = await chatbot.generateReply({ post });
      await socialMediaPostsRepo.saveReply({
        reply: {
          postId: post.id,
          text: reply,
        },
      });

      // await redditApi.replyToPost({
      //   postId: post.externalId,
      //   text: reply,
      // });
    }
    await socialMediaPostsRepo.markPostAsProcessed({ postId: post.id });
  }
}
