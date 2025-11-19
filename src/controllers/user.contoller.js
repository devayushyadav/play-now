import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/ApiError.js";
import { APIResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

  if (!email || (email.trim() === "" && !username) || username.trim() === "") {
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

  const options = {
    httpOnly: true,
    secure: true,
    // sameSite: "Strict",
    // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
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

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new APIResponse(200, "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
