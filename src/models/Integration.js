const mongoose = require("mongoose");

const integrationSchema = new mongoose.Schema({
  githubId: String,
  username: String,
  name: String,
  avatarUrl: String,
  email: String,
  accessToken: String,
  connectedAt: Date,
  plan: Object,
});

module.exports = mongoose.model("Integration", integrationSchema);
