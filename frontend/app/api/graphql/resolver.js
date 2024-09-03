const resolvers = {
  Query: {
    users: async (_, __, context) => {
      try {
        return await context.dataSources.users.getAllUsers();
      } catch (error) {
        throw new Error("Failed to fetch users");
      }
    },
  },
  Mutation: {
    createUser: async (_, { input }, context) => {
      try {
        const newUser = await context.dataSources.users.createUser({ input });
        return newUser;
      } catch (error) {
        throw new Error("Failed to create user");
      }
    },
  },
};

module.exports = resolvers;
