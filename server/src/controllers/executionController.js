const { executeCode } = require("../services/executionService");
const Execution = require("../models/Execution");
const Room = require("../models/Room");

const runCode = async (req, res) => {
  const startTime = Date.now();

  try {
    const { code, language } = req.body;

    // -----------------------------------------------
    // VALIDATE CODE
    // -----------------------------------------------

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Code is required",
      });
    }

    // -----------------------------------------------
    // VALIDATE LANGUAGE
    // -----------------------------------------------

    const selectedLanguage =
      language || "javascript";

    const supportedLanguages = [
      "javascript",
      "python",
      "java",
      "cpp",
    ];

    if (
      !supportedLanguages.includes(
        selectedLanguage
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported programming language",
      });
    }

    // -----------------------------------------------
    // GET ROOM
    // -----------------------------------------------

    const roomId =
      req.body.roomId;

    let room = null;

    if (roomId) {
      room = await Room.findOne({
        roomId,
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      // ---------------------------------------------
      // CHECK ROOM MEMBERSHIP
      // ---------------------------------------------

      const userId =
        req.user._id.toString();

      const isMember =
        room.members.some(
          (member) =>
            member.toString() ===
            userId
        );

      const isOwner =
        room.owner.toString() ===
        userId;

      if (!isMember && !isOwner) {
        return res.status(403).json({
          success: false,
          message:
            "You are not a member of this room",
        });
      }
    }

    // -----------------------------------------------
    // EXECUTE CODE
    // -----------------------------------------------

    const result =
      await executeCode(
        code,
        selectedLanguage
      );

    // -----------------------------------------------
    // CALCULATE EXECUTION TIME
    // -----------------------------------------------

    const executionTime =
      Date.now() -
      startTime;

    // -----------------------------------------------
    // DETERMINE STATUS
    // -----------------------------------------------

    const status =
      result.success
        ? "success"
        : "error";

    // -----------------------------------------------
    // SAVE EXECUTION
    // -----------------------------------------------

    if (room) {
      await Execution.create({
        room: room._id,

        user: req.user._id,

        language:
          selectedLanguage,

        code,

        output:
          result.output || "",

        error:
          result.error || "",

        status,

        executionTime,
      });
    }

    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

    res.status(200).json({
      success: true,

      result,

      executionTime,
    });
  } catch (error) {
    console.error(
      "❌ Code execution error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Code execution failed",
    });
  }
};

const getExecutionHistory = async (
  req,
  res
) => {
  try {
    const { roomId } =
      req.params;

    // -----------------------------------------------
    // FIND ROOM
    // -----------------------------------------------

    const room =
      await Room.findOne({
        roomId,
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // -----------------------------------------------
    // CHECK MEMBERSHIP
    // -----------------------------------------------

    const userId =
      req.user._id.toString();

    const isMember =
      room.members.some(
        (member) =>
          member.toString() ===
          userId
      );

    const isOwner =
      room.owner.toString() ===
      userId;

    if (!isMember && !isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "You are not a member of this room",
      });
    }

    // -----------------------------------------------
    // FETCH EXECUTIONS
    // -----------------------------------------------

    const executions =
      await Execution.find({
        room: room._id,
      })
        .populate(
          "user",
          "name email"
        )
        .sort({
          createdAt: -1,
        })
        .limit(50);

    // -----------------------------------------------
    // RESPONSE
    // -----------------------------------------------

    res.status(200).json({
      success: true,
      executions,
    });
  } catch (error) {
    console.error(
      "❌ Execution history error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch execution history",
    });
  }
};

module.exports = {
  runCode,
  getExecutionHistory
};