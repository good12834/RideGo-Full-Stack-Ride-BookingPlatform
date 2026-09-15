import jwt from "jsonwebtoken";

export function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || "ridego_local_dev_secret_2026",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "ridego_local_dev_secret_2026");
}
