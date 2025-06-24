const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  githubId: String,
  login: String,
  name: String,
  email: String,
  avatar_url: String,
  type: String,
  org: String,
  integrationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Integration",
}
});

module.exports = mongoose.model("GitHubUser", userSchema);
