import { User } from "../models/user.model";
import { APIError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded._id;

    const user = await User.findById(userId).select("-password -refreshToken");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch (err) {
    throw new APIError(401, "Unauthorized");
  }
});
