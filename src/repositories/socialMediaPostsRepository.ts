import { Kysely, Selectable, sql } from "kysely";
import { Database, SocialMediaPostsTable } from "./kyselyTypes";
import { SocialMediaPost, SocialMediaPostReply } from "../types";

export class SocialMediaPostsRepository {
  constructor(private _db: Kysely<Database>) {}

  async upsertPosts({
    posts,
  }: {
    posts: Omit<SocialMediaPost, "id" | "processed">[];
  }) {
    await this._db
      .insertInto("social_media_posts")
      .values(
        posts.map((post) => ({
          external_id: post.externalId,
          title: post.title,
          content: post.content,
          url: post.url,
          processed: 0,
        }))
      )
      .onDuplicateKeyUpdate({
        title: sql`VALUES(title)`,
        content: sql`VALUES(content)`,
      })
      .execute();
  }

  async getAllUnprocessedPosts(): Promise<SocialMediaPost[]> {
    const rows = await this._db
      .selectFrom("social_media_posts")
      .where("processed", "=", 0)
      .selectAll()
      .execute();

    return rows.map((row) => this._mapRowToPost(row));
  }

  markPostAsProcessed({ postId }: { postId: number }) {
    return this._db
      .updateTable("social_media_posts")
      .set({
        processed: 1,
      })
      .where("id", "=", postId)
      .execute();
  }

  async saveReply({ reply }: { reply: Omit<SocialMediaPostReply, "id"> }) {
    await this._db
      .insertInto("social_media_post_replies")
      .values({
        post_id: reply.postId,
        text: reply.text,
      })
      .execute();
  }

  private _mapRowToPost(
    row: Selectable<SocialMediaPostsTable>
  ): SocialMediaPost {
    return {
      id: row.id,
      externalId: row.external_id,
      title: row.title,
      content: row.content,
      url: row.url,
      processed: row.processed === 1,
    };
  }
}
