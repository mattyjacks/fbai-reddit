import { ChatGptChatbot, IChatbot, OllamaChatbot } from "./chatbot";
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
  console.log(`Reddit API initialized using user ${env.reddit.username}`);
  // const chatbot = new ChatGptChatbot({
  //   openAiApiKey: env.openAiApiKey,
  // });
  const model = "llama3.2:latest";
  const chatbot = new OllamaChatbot({
    host: env.ollama.host,
    model,
  });
  console.log(`Ollama Chatbot initialized using model ${model}`);

  const run = async () => {
    try {
      console.log("Getting latest posts...");
      await getLatestPosts({ redditApi, socialMediaPostsRepo });
      console.log("Processing newest posts...");
      await processNewestPosts({ redditApi, socialMediaPostsRepo, chatbot });
    } catch (error) {
      console.error(`Error processing posts: ${error}`);
    }
  };

  // every hour get the latest posts and process them
  schedule("0 * * * *", run);

  // run once on startup
  await run();

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
  const subreddits = [
    "layoffs",
    "jobsearchhacks",
    // "cscareerquestions",
    "csMajors",
    "jobhunting",
    "remotework",
    "recruitinghell",
  ];
  // const subreddits = ["cscareerquestionsEU"];
  // const subreddits = ["jobs"];
  for (const subreddit of subreddits) {
    const posts = await redditApi.getSubredditPosts({
      subreddit,
      limit: 10,
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
  chatbot: IChatbot;
}) {
  const unprocessedPosts = await socialMediaPostsRepo.getAllUnprocessedPosts();
  console.log(`Found ${unprocessedPosts.length} unprocessed posts.`);

  // randomize the order of the posts
  unprocessedPosts.sort(() => Math.random() - 0.5);

  let remainingReplies = 10;
  for (const post of unprocessedPosts) {
    try {
      console.log(`Checking if post is relevant ...`);
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
        console.log(`Reply: ${reply}`);

        if (remainingReplies > 0) {
          await redditApi.replyToPost({
            postId: post.externalId,
            text: reply,
          });
          remainingReplies--;
          console.log(`Replied to post: ${post.externalId}`);
        } else {
          console.log(
            "Skipping replying to post because were out of quota for this run."
          );
        }
      }
    } catch (error) {
      console.error(`Error processing post: ${error}`);

      throw error; // temp stop if error
    } finally {
      await socialMediaPostsRepo.markPostAsProcessed({ postId: post.id });
    }
  }
}
