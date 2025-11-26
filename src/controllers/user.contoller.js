import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/ApiError.js";
import { APIResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { COOKIE_OPTIONS } from "../constants.js";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);
    if (!user) {
      throw new APIError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new APIError(500, "Token generation failed");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;

  if (!fullname || fullname.trim() === "") {
    throw new APIError(400, "Fullname is required");
  }

  // Better approach
  if (
    [fullname, username, email, password].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new APIError(400, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (existingUser) {
    throw new APIError(409, "User with given email or username already exists");
  }

  const avatarLocationPath = req.files?.avatar[0]?.path;
  const coverImagerLocationPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocationPath) {
    throw new APIError(400, "Avatar is required");
  }

  const avatarImageUpload = await uploadOnCloudinary(avatarLocationPath);
  let coverImageUpload = null;
  if (coverImagerLocationPath) {
    coverImageUpload = await uploadOnCloudinary(coverImagerLocationPath);
  }

  if (!avatarImageUpload) {
    throw new APIError(500, "Failed to upload avatar image");
  }

  const newUser = await User.create({
    fullname,
    avatar: avatarImageUpload.url,
    coverImage: coverImageUpload?.url || "",
    email: email.toLowerCase(),
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new APIError(500, "Failed to create user");
  }

  res
    .status(201)
    .json(new APIResponse(201, "User registered successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (
    (!email || email.trim() === "") &&
    (!username || username.trim() === "")
  ) {
    throw new APIError(400, "Email or username is required");
  }

  if (!password || password.trim() === "") {
    throw new APIError(400, "Password is required");
  }
  const user = await User.findOne({
    $or: [
      { email: email?.toLowerCase() },
      { username: username?.toLowerCase() },
    ],
  });

  if (!user) {
    throw new APIError(401, "Invalid credentials");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new APIError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const userData = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
    .cookie("accessToken", accessToken, COOKIE_OPTIONS)
    .json(
      new APIResponse(200, "User logged in successfully", {
        user: userData,
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new APIError(400, "Refresh token not found");
  }

  await User.findOneAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("refreshToken", COOKIE_OPTIONS)
    .clearCookie("accessToken", COOKIE_OPTIONS)
    .json(new APIResponse(200, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const { refreshToken: incomingRefreshToken } = req.cookies;
    if (!incomingRefreshToken) {
      throw new APIError(400, "Refresh token not found");
    }

    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const userId = decoded._id;

    const user = await User.findById(userId).select("-password -refreshToken");

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (user.refreshToken !== incomingRefreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .cookie("accessToken", accessToken, COOKIE_OPTIONS)
      .json(
        new APIResponse(200, "Access token refreshed", {
          accessToken,
          refreshToken,
        })
      );
  } catch (error) {
    throw new APIError(401, "Invalid refresh token");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new APIError(400, "Current and new passwords are required");
  }
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new APIError(404, "User not found");
  }

  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new APIError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new APIResponse(200, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new APIResponse(200, "Current user fetched successfully", req.user));
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { username, email, fullname } = req.body;

  if (
    [fullname, username, email].some((field) => !field || field.trim() === "")
  ) {
    throw new APIError(400, "All fields are required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new APIError(404, "User not found");
  }

  if (username) user.username = username.toLowerCase();
  if (email) user.email = email.toLowerCase();
  if (fullname) user.fullname = fullname;

  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(
      new APIResponse(200, "User profile updated successfully", updatedUser)
    );
});

const updateUserProfileImage = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar image is required");
  }

  const avatarImageUpload = await uploadOnCloudinary(avatarLocalPath);

  if (!avatarImageUpload) {
    throw new APIError(500, "Failed to upload avatar image");
  }

  // Updates ONLY the avatar field (Mongoose internally uses $set even without explicitly writing it)
  // const updatedUser = await User.findByIdAndUpdate(
  //   req.user._id,
  //   { avatar: avatarImageUpload.url },
  //   { new: true, select: "-password -refreshToken" }
  // );

  // Explicitly updates only the avatar field using $set (recommended for clarity)
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatarImageUpload.url,
      },
    },
    {
      new: true,
      select: "-password -refreshToken",
    }
  );

  if (!updatedUser) {
    throw new APIError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new APIResponse(200, "User avatar updated successfully", updatedUser)
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;

  if (!coverLocalPath) {
    throw new APIError(400, "Cover image is required");
  }

  const coverImageUpload = await uploadOnCloudinary(coverLocalPath);

  if (!coverImageUpload) {
    throw new APIError(500, "Failed to upload cover image");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { coverImage: coverImageUpload.url },
    { new: true, select: "-password -refreshToken" }
  );

  if (!updatedUser) {
    throw new APIError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new APIResponse(200, "User cover image updated successfully", updatedUser)
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new APIError(400, "Username is required");
  }

  const channel = await User.aggregate([
    {
      $match: { username: username.toLowerCase() },
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
      $lookup: {
        from: "subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedChannels",
      },
      $addFields: {
        subscriberCount: { $size: "$subscribers" },
        subscribedChannelCount: { $size: "$subscribedChannels" },
        isSubscribed: {
          $in: [req.user._id, "$subscribers.subscriber"],
          // $cond: { $in: [req.user._id, "$subscribers.subscriber"], then: true, else: false}
        },
      },
      $project: {
        fullname: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        subscribedChannelCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!channel || channel.length === 0) {
    throw new APIError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new APIResponse(200, "Channel profile fetched successfully", channel[0])
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: { _id: new mongoose.types.objectId(req.user._id) },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistoryVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                // $arrayElemAt: ["$owner", 0],
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (!user || user.length === 0) {
    throw new APIError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        "Watch history fetched successfully",
        user[0].watchHistoryVideos
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateUserProfile,
  updateUserProfileImage,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
