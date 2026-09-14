const mongoose = require("mongoose");

const executionSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    language: {
      type: String,
      required: true,
      enum: [
        "javascript",
        "python",
        "java",
        "cpp",
      ],
    },

    code: {
      type: String,
      required: true,
    },

    output: {
      type: String,
      default: "",
    },

    error: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "success",
        "error",
      ],
      required: true,
    },

    executionTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model(
    "Execution",
    executionSchema
  );