import { Generated } from "kysely";

export type Database = {
  social_media_posts: SocialMediaPostsTable;
  social_media_post_replies: SocialMediaPostRepliesTable;
};

export type SocialMediaPostsTable = {
  id: Generated<number>;
  external_id: string;
  title: string;
  content: string;
  url: string;
  processed: 0 | 1;
};

export type SocialMediaPostRepliesTable = {
  id: Generated<number>;
  post_id: number;
  text: string;
};
