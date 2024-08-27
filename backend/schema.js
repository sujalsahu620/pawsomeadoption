// schema.js
const { gql } = require('apollo-server-express');
const User = require('./models/User');
const Pet = require('./models/Pet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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

  type User {
    id: ID!
    username: String!
    email: String!
    token: String
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
    listPets: [Pet]
    me: User
  }

  type Mutation {
    createPet(petInput: PetInput, images: [Upload!]!): Pet
    signUp(signUpInput: SignUpInput!): User
    signIn(signInInput: SignInInput!): User
    forgotPassword(email: String!): String
    resetPassword(token: String!, password: String!): String
  }
`;

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    getPet: async (_, { id }) => {
      return await Pet.findById(id);
    },
    listPets: async () => {
      return await Pet.find();
    },
    me: async (_, __, context) => {
      if (!context.user) throw new Error('Not authenticated');
      return await User.findById(context.user.id);
    },
  },
  Mutation: {
    createPet: async (_, { petInput, images }, context) => {
      if (!context.user) throw new Error('Not authenticated');

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

    signUp: async (_, { signUpInput }) => {
      const { username, email, password } = signUpInput;
      const userExists = await User.findOne({ email });

      if (userExists) {
        throw new Error('User already exists');
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
        throw new Error('User not found');
      }

      const isPasswordCorrect = await user.matchPassword(password);

      if (!isPasswordCorrect) {
        throw new Error('Invalid credentials');
      }

      const token = generateToken(user);

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        token,
      };
    },

    forgotPassword: async (_, { email }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User with that email does not exist');
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save();

      const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

      // Set up Nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587, // or 465 for SSL
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USERNAME, // Your Gmail address
          pass: process.env.EMAIL_PASSWORD, // Your Gmail app password
        },
      });

      // Email options
      const message = {
        to: user.email,
        from: process.env.EMAIL_FROM,
        subject: 'Password Reset Request',
        text: `You are receiving this email because you (or someone else) have requested the reset of a password.\n\n
        Please click on the following link, or paste this into your browser to complete the process within 10 minutes of receiving it:\n\n
        ${resetUrl}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
      };

      // Send the email
      try {
        await transporter.sendMail(message);
        return 'Password reset link sent to your email';
      } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('There was an error sending the email');
      }
    },

    resetPassword: async (_, { token, password }) => {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        throw new Error('Token is invalid or has expired');
      }

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      return 'Password reset successful';
    },
  },
};

module.exports = { typeDefs, resolvers };
