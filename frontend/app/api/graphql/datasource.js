import UserModel from "../models";
import { MongoDataSource } from "apollo-datasource-mongodb";

export default class Users extends MongoDataSource {
  async getAllUsers() {
    try {
      return await UserModel.find();
    } catch (error) {
      throw new Error("Failed to fetch users");
    }
  }

  async createUser({ input }) {
    try {
      return await UserModel.create({ ...input });
    } catch (error) {
      throw new Error("Failed to create user");
    }
  }
}
