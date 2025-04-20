/* import mongoose from "mongoose"; */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    documento: { type: String, required: true },
    userName: { type: String, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    grade: { type: String, required: true },
    age: { type: Number, required: true }, // ✅ O mejor cambia a Number si corresponde
    tag: { type: String, required: true }
  });
  

module.exports = mongoose.model("Users", userSchema)