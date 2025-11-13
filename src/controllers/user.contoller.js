import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/ApiError.js";
import { APIResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

export { registerUser };
