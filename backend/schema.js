const { gql } = require("apollo-server-express");
const User = require("./models/User");
const Pet = require("./models/Pet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const typeDefs = gql`
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
type AuthPayload {
  accessToken: String
  refreshToken: String
}
  type User {
    id: ID!
    username: String!
    email: String!
    token: String
    wishlist: [Pet]
  }

  input PetInput {
    name: String!
    age: Int!
    breed: String!
    ownerName: String!
    ownerContact: String!
    description: String!
  }

  input SignUpInput {
    username: String!
    email: String!
    password: String!
  }

  input SignInInput {
    email: String!
    password: String!
  }

  type Query {
    getPet(id: ID!): Pet
    listPets(first: Int, after: ID): [Pet!]!
    me: User
    listWishlist(first: Int, after: ID): [Pet!]!
  }

  type Mutation {
    refreshToken(token: String!): AuthPayload
    createPet(petInput: PetInput, images: [String!]!): Pet
    signUp(signUpInput: SignUpInput!): User
    signIn(signInInput: SignInInput!): User
    forgotPassword(email: String!): String
    resetPassword(token: String!, password: String!): String
    addToWishlist(petId: ID!): User
    removeFromWishlist(petId: ID!): User
  }
`;


const generateToken = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return accessToken; // Ensure you return the accessToken here
};
const resolvers = {
  Query: {
    getPet: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }
      return await Pet.findById(id);
    },

    listPets: async (_, { first = 10, after }, context) => {
      const query = after ? { _id: { $gt: after } } : {};

      const pets = await Pet.find(query)
        .limit(first + 1)
        .sort({ _id: 1 });

      const hasNextPage = pets.length > first;
      const edges = hasNextPage ? pets.slice(0, -1) : pets;
      const endCursor = edges.length > 0 ? edges[edges.length - 1]._id : null;

      return {
        edges: edges.map((pet) => ({
          cursor: pet._id.toString(),
          node: pet,
        })),
        pageInfo: {
          endCursor,
          hasNextPage,
        },
      };
    },

    me: async (_, __, context) => {
      if (!context.user) throw new Error("Not authenticated");
      return await User.findById(context.user.id).populate("wishlist");
    },

    listWishlist: async (_, { first = 10, after }, context) => {
      if (!context.user) throw new Error("Not authenticated");

      const user = await User.findById(context.user.id).populate("wishlist");
      let wishlist = user.wishlist;

      if (after) {
        wishlist = wishlist.filter((pet) => pet._id.toString() > after);
      }

      const paginatedPets = wishlist.slice(0, first + 1);

      const hasNextPage = paginatedPets.length > first;
      const edges = hasNextPage ? paginatedPets.slice(0, -1) : paginatedPets;
      const endCursor =
        edges.length > 0 ? edges[edges.length - 1]._id.toString() : null;

      return {
        edges: edges.map((pet) => ({
          cursor: pet._id.toString(),
          node: pet,
        })),
        pageInfo: {
          endCursor,
          hasNextPage,
        },
      };
    },
  },

  Mutation: {
    refreshToken: async (_, { token }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
          throw new Error('User not found');
        }
  
        const newTokens = generateToken(user);
        return {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
        };
      } catch (err) {
        throw new Error('Invalid token');
      }
    },
    createPet: async (_, { petInput, images }, context) => {
      if (!context.user) throw new Error("Not authenticated");

      const pet = new Pet({
        ...petInput,
        images,
        timestamp: new Date().toISOString(),
      });
      return await pet.save();
    },

    signUp: async (_, { signUpInput }) => {
      const { username, email, password } = signUpInput;
      const userExists = await User.findOne({ email });

      if (userExists) {
        throw new Error("User already exists");
      }

      const user = await User.create({
        username,
        email,
        password,
      });

      const token = generateToken(user);

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        token,
      };
    },

    signIn: async (_, { signInInput }) => {
      const { email, password } = signInInput;
      const user = await User.findOne({ email });
    
      if (!user) {
        throw new Error("User not found");
      }
    
      const isPasswordCorrect = await user.matchPassword(password);
    
      if (!isPasswordCorrect) {
        throw new Error("Invalid credentials");
      }
    
      const token = generateToken(user);
    
      return {
        id: user._id,
        username: user.username,
        email: user.email,
        token, // Ensure this token is properly generated and returned
      };
    },

    forgotPassword: async (_, { email }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("User with that email does not exist");
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save();

      const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const message = {
        to: user.email,
        from: process.env.EMAIL_FROM,
        subject: "Password Reset Request",
        text: `You are receiving this email because you (or someone else) have requested the reset of a password.\n\n
        Please click on the following link, or paste this into your browser to complete the process within 10 minutes of receiving it:\n\n
        ${resetUrl}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
      };

      try {
        await transporter.sendMail(message);
        return "Password reset link sent to your email";
      } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("There was an error sending the email");
      }
    },

    resetPassword: async (_, { token, password }) => {
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        throw new Error("Token is invalid or has expired");
      }

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      return "Password reset successful";
    },

    addToWishlist: async (_, { petId }, context) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const user = await User.findById(context.user.id);

      if (!user.wishlist.includes(petId)) {
        user.wishlist.push(petId);
        await user.save();
      }

      return user.populate("wishlist");
    },

    removeFromWishlist: async (_, { petId }, context) => {
      if (!context.user) {
        throw new Error("Not authenticated");
      }

      const user = await User.findById(context.user.id);
      user.wishlist = user.wishlist.filter((id) => id.toString() !== petId);
      await user.save();

      return user.populate("wishlist");
    },
  },
};

module.exports = { typeDefs, resolvers };
