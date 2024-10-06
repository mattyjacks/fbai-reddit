import axios from "axios";
import urljoin from "url-join";

const REDDIT_API_BASE_URL = "https://www.reddit.com/api/v1";
const REDDIT_OAUTH_URL = "https://oauth.reddit.com/";

export type RedditApiConfig = {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
};

export type RedditPost = {
  id: string;
  title: string;
  content: string;
  url: string;
};

/**
 * Class used to interact with the Reddit API.
 */
export class RedditApiSdk {
  private _accessToken: string | null = null;

  /**
   * Class constructor.
   */
  constructor(private _config: RedditApiConfig) {}

  async getSubredditPosts({
    subreddit,
    limit = 100,
  }: {
    subreddit: string;
    limit?: number;
  }): Promise<RedditPost[]> {
    const accessToken = await this._getAccessToken();

    const resp = await this._apiCall<{
      data: {
        children: Array<{
          data: {
            title: string;
            selftext: string;
            url: string;
            name: string;
          };
        }>;
      };
    }>({
      baseUrl: REDDIT_OAUTH_URL,
      method: "get",
      path: `/r/${subreddit}/new`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": this._config.userAgent,
      },
      params: {
        limit: limit.toString(),
      },
    });

    // Return the list of posts
    return resp.data.children.map((post) => ({
      id: post.data.name,
      title: post.data.title,
      content: post.data.selftext,
      url: post.data.url,
    }));
  }

  async replyToPost({ postId, text }: { postId: string; text: string }) {
    const accessToken = await this._getAccessToken();

    this._apiCall<{}>({
      baseUrl: REDDIT_OAUTH_URL,
      method: "post",
      path: `/api/comment`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": this._config.userAgent,
      },
      body: new URLSearchParams({
        api_type: "json",
        thing_id: postId, // e.g., "t3_<post_id>"
        text,
      }).toString(),
    });
  }

  /**
   * Generic http api call.
   */
  private async _apiCall<T>({
    method = "get",
    baseUrl = REDDIT_API_BASE_URL,
    path,
    headers,
    body,
    params,
    auth,
  }: {
    method?: "get" | "post";
    baseUrl?: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, string>;
    auth?: {
      username: string;
      password: string;
    };
  }): Promise<T> {
    try {
      const url = urljoin(baseUrl, path);
      const res = await axios.request({
        method,
        url,
        headers,
        data: body,
        params,
        auth,
      });

      return res.data;
    } catch (error: any) {
      throw new Error(
        `Error calling Reddit API ${path}: ${JSON.stringify(error)}`
      );
    }
  }

  private async _getAccessToken() {
    if (!this._accessToken) {
      const baseUrl = `https://www.reddit.com/api/v1`;
      const resp = await this._apiCall<{
        access_token: string;
      }>({
        baseUrl,
        method: "post",
        path: "/access_token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": this._config.userAgent,
        },
        body: {
          grant_type: "password",
          username: this._config.username,
          password: this._config.password,
        },
        auth: {
          username: this._config.clientId,
          password: this._config.clientSecret,
        },
      });

      this._accessToken = resp.access_token;
    }

    return this._accessToken;
  }
}
