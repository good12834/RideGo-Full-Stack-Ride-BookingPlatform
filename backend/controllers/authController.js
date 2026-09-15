import User from "../models/User.js";
import Driver from "../models/Driver.js";
import { generateToken } from "../utils/generateToken.js";

export async function register(req, res) {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || "",
      role: ["passenger", "driver"].includes(role) ? role : "passenger",
    });

    // Drivers start as PENDING until an admin approves them
    let driver = null;
    if (user.role === "driver") {
      driver = await Driver.create({
        userId: user._id,
        licenseNumber: req.body.licenseNumber || "PENDING",
        status: "PENDING",
      });
    }

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: user.toSafeJSON(),
      driver: driver ? { id: driver._id, status: driver.status } : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "This account has been suspended" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

export async function me(req, res) {
  let driver = null;
  if (req.user.role === "driver") {
    driver = await Driver.findOne({ userId: req.user._id });
  }
  res.json({ user: req.user, driver });
}

export async function updateMe(req, res) {
  try {
    const allowed = ["name", "phone", "avatar"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Array.isArray(req.body.trustedContacts)) {
      updates.trustedContacts = req.body.trustedContacts.slice(0, 5);
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
}

export async function logout(req, res) {
  // JWT is stateless; the client drops the token. Kept for API completeness.
  res.json({ message: "Logged out" });
}
