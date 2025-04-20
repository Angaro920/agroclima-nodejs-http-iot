/* import mongoose from "mongoose";
import dotenv from "dotenv"; */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error.message);
    process.exit(1); // Sale del proceso si falla
  }
};

module.exports = connectDB;