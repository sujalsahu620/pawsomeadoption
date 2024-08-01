import { ObjectId } from 'mongodb';
import clientPromise from '../lib/mongodb';

export const resolvers = {
          Query: {
                    async getPosts() {
                              const client = await clientPromise;
                              const db = client.db('your-database-name');
                              return await db.collection('posts').find({}).toArray();
                    },
                    async getPost(_, { id }) {
                              const client = await clientPromise;
                              const db = client.db('your-database-name');
                              return await db.collection('posts').findOne({ _id: new ObjectId(id) });
                    },
          },
          Mutation: {
                    async addPost(_, { title, content }) {
                              const client = await clientPromise;
                              const db = client.db('your-database-name');
                              const result = await db.collection('posts').insertOne({ title, content });
                              return result.ops[0];
                    },
                    async updatePost(_, { id, title, content }) {
                              const client = await clientPromise;
                              const db = client.db('your-database-name');
                              await db.collection('posts').updateOne(
                                        { _id: new ObjectId(id) },
                                        { $set: { title, content } }
                              );
                              return await db.collection('posts').findOne({ _id: new ObjectId(id) });
                    },
                    async deletePost(_, { id }) {
                              const client = await clientPromise;
                              const db = client.db('your-database-name');
                              const post = await db.collection('posts').findOne({ _id: new ObjectId(id) });
                              await db.collection('posts').deleteOne({ _id: new ObjectId(id) });
                              return post;
                    },
          },
};
