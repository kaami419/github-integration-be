const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const githubRoutes = require("./src/routes/githubRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.use("/api/github", githubRoutes);


mongoose.connect(process.env.MONGO_URI, {})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("MongoDB error:", err));

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
