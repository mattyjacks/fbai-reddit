export type SocialMediaPost = {
  id: number;
  externalId: string;
  title: string;
  content: string;
  url: string;
  processed: boolean;
};

export type SocialMediaPostReply = {
  id: number;
  postId: number;
  text: string;
};
