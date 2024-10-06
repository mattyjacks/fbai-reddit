import { AzureOpenAI } from "openai";
import { SocialMediaPost } from "./types";

export class Chatbot {
  /**
   * Class constructor.
   */
  constructor(
    private _config: {
      openAiApiKey: string;
    }
  ) {}

  /**
   * Determine if a reddit post is relevant to the business.
   */
  async isPostRelevant({ post }: { post: SocialMediaPost }) {
    const openai = this._getOpenAiClient();

    const response = await openai.chat.completions.create({
      model: "f2agpt4o", // custom azure deployment
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Is the following post relevant to the business? Reply with "yes" or "no".
Title: ${post.title}
Content: ${post.content}`,
        },
      ],
      temperature: 0,
      max_tokens: 1,
      top_p: 0,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const message = response.choices[0].message.content?.trim();

    return message?.toLowerCase() === "yes";
  }

  /**
   * Generate a reply to a social media post.
   */
  async generateReply({ post }: { post: SocialMediaPost }) {
    const openai = this._getOpenAiClient();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // custom azure deployment
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Reply to the following post. Don't put too much empahsis on the app to not sound like you work for them, but mention the name. Also try to keep it short
Title: ${post.title}
Content: ${post.content}`,
        },
      ],
      temperature: 0,
      max_tokens: 200,
      top_p: 0,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const message = response.choices[0].message.content?.trim();
    if (!message) {
      throw new Error("Failed to generate a reply");
    }

    return message;
  }

  /**
   * Get Open AI client.
   */
  private _getOpenAiClient() {
    const openai = new AzureOpenAI({
      apiKey: this._config.openAiApiKey,
      endpoint: "https://first2apply.openai.azure.com/",
      apiVersion: "2024-02-15-preview",
    });

    return openai;
  }
}

const SYSTEM_PROMPT = `You are a marketing assistant at a company that sells First 2 Apply. 
First2Apply is a job search automation tool that provides real-time job alerts from over 10 popular job boards like LinkedIn and Indeed. It features advanced matching, which analyzes job listings to match users with the most relevant opportunities based on their profiles. Additionally, users can customize alerts, apply filters, and manage their applications efficiently to ensure they are among the first to apply to suitable positions.
The ideal customer profile is job seekers looking for efficiency in their search, especially those applying to many positions across multiple platforms. It’s ideal for tech-savvy users who value time-saving and advanced filtering.
You are responsible for reviewing social media posts and provide helpful feedback as well as mentioning how the app can be useful to the user.
You need to pretend to have used the app and offer it as a solution to the user's problem.`;
