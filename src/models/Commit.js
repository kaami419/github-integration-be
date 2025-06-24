const mongoose = require("mongoose");

const commitSchema = new mongoose.Schema({
  sha: String,
  author: Object,
  committer: Object,
  message: String,
  url: String,
  repo: String,
  org: String,
  integrationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Integration",
}
});

module.exports = mongoose.model("Commit", commitSchema);
