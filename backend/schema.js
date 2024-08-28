const { gql } = require("apollo-server-express");
const User = require("./models/User");
const Pet = require("./models/Pet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const fs = require("fs");
const { createWriteStream } = require("fs");
const path = require("path");

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
    createPet(petInput: PetInput!, file: Upload!): Pet
    signUp(signUpInput: SignUpInput!): User
    signIn(signInInput: SignInInput!): User
    forgotPassword(email: String!): String
    resetPassword(token: String!, password: String!): String
    addToWishlist(petId: ID!): User
    removeFromWishlist(petId: ID!): User
  }
`;

const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const resolvers = {
  Query: {
    getPet: async (_, { id }) => await Pet.findById(id),
    listPets: async () => await Pet.find(),
    me: async (_, __, { user }) => {
      if (!user) throw new Error("Not authenticated");
      return await User.findById(user.id).populate("wishlist");
    },
    listWishlist: async (_, __, { user }) => {
      if (!user) throw new Error("Not authenticated");
      const currentUser = await User.findById(user.id).populate("wishlist");
      return currentUser.wishlist;
    },
  },
  Mutation: {
    createPet: async (_, { petInput, file }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      if (!file) {
        throw new Error("No file uploaded");
      }

      const resolvedFile = await file;
      console.log("Resolved File Object:", resolvedFile);

      // Manually check the keys
      if (resolvedFile && resolvedFile.file) {
        console.log("Resolved Filename:", resolvedFile.file.filename);
        console.log("Resolved Mimetype:", resolvedFile.file.mimetype);
        console.log("Resolved Encoding:", resolvedFile.file.encoding);
      } else {
        throw new Error("File object is not structured as expected");
      }

      const { createReadStream, filename, mimetype, encoding } = resolvedFile.file || {};

      if (!filename) {
        throw new Error("File upload failed: filename is undefined");
      }

      const uploadPath = path.join(__dirname, "uploads", filename);

      await new Promise((resolve, reject) => {
        const stream = createReadStream();
        const out = createWriteStream(uploadPath);
        stream.pipe(out);
        out.on("finish", resolve);
        out.on("error", reject);
      });

      const pet = new Pet({
        ...petInput,
        images: [`/uploads/${filename}`],
        timestamp: new Date().toISOString(),
      });

      return await pet.save();
    },
    signUp: async (_, { signUpInput }) => {
      const { username, email, password } = signUpInput;
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({ username, email, password: hashedPassword });
      const token = generateToken(user);
      return { id: user._id, username: user.username, email: user.email, token };
    },
    signIn: async (_, { signInInput }) => {
      const { email, password } = signInInput;
      const user = await User.findOne({ email });
      if (!user) throw new Error("User not found");
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) throw new Error("Invalid credentials");
      const token = generateToken(user);
      return { id: user._id, username: user.username, email: user.email, token };
    },
    forgotPassword: async (_, { email }) => {
      const user = await User.findOne({ email });
      if (!user) throw new Error("User with that email does not exist");

      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes
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
        text: `You are receiving this email because you requested a password reset. Click the link below to reset your password: ${resetUrl}`,
      };

      await transporter.sendMail(message);

      return "Password reset link sent to your email";
    },
    resetPassword: async (_, { token, password }) => {
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user) throw new Error("Token is invalid or has expired");

      user.password = await bcrypt.hash(password, 12);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return "Password reset successful";
    },
    addToWishlist: async (_, { petId }, { user }) => {
      if (!user) throw new Error("Not authenticated");
      const currentUser = await User.findById(user.id);
      if (!currentUser.wishlist.includes(petId)) {
        currentUser.wishlist.push(petId);
        await currentUser.save();
      }
      return await currentUser.populate("wishlist").execPopulate();
    },
    removeFromWishlist: async (_, { petId }, { user }) => {
      if (!user) throw new Error("Not authenticated");
      const currentUser = await User.findById(user.id);
      currentUser.wishlist = currentUser.wishlist.filter((id) => id.toString() !== petId);
      await currentUser.save();
      return await currentUser.populate("wishlist").execPopulate();
    },
  },
};

module.exports = { typeDefs, resolvers };
