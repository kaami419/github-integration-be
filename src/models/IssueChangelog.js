const mongoose = require("mongoose");

const changelogSchema = new mongoose.Schema({
  issueId: Number,
  comments: [Object],
  repo: String,
  org: String,
  integrationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Integration",
}
});

module.exports = mongoose.model("IssueChangelog", changelogSchema);
