// schema.js
const { gql } = require('apollo-server-express');
const Pet = require('./models/pet');
const { GraphQLUpload } = require('graphql-upload');
const { uploadImage } = require('./s3');

const typeDefs = gql`
  scalar Upload

  type Pet {
    id: ID!
    name: String!
    age: Int!
    breed: String!
    ownerName: String!
    ownerContact: String!
    description: String!
    images: [String]!
    timestamp: String!
  }

  input PetInput {
    name: String!
    age: Int!
    breed: String!
    ownerName: String!
    ownerContact: String!
    description: String!
  }

  type Query {
    getPet(id: ID!): Pet
    listPets: [Pet]
  }

  type Mutation {
    createPet(petInput: PetInput, images: [Upload!]!): Pet
  }
`;

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    getPet: async (_, { id }) => {
      return await Pet.findById(id);
    },
    listPets: async () => {
      return await Pet.find();
    },
  },
  Mutation: {
    createPet: async (_, { petInput, images }) => {
      const imageUrls = [];
      for (let image of images) {
        const { createReadStream, filename, mimetype } = await image;
        const fileStream = createReadStream();
        const chunks = [];
        for await (const chunk of fileStream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const imageUrl = await uploadImage({ buffer, originalname: filename, mimetype });
        imageUrls.push(imageUrl);
      }
      const pet = new Pet({ ...petInput, images: imageUrls });
      return await pet.save();
    },
  },
};

module.exports = { typeDefs, resolvers };
