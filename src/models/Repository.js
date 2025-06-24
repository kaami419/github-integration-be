const mongoose = require("mongoose");

const repositorySchema = new mongoose.Schema({
  repoId: String,
  name: String,
  full_name: String,
  private: Boolean,
  html_url: String,
  description: String,
  url: String,
  commits_url: String,
  pulls_url: String,
  issues_url: String,
  owner: String,
  org: String,
  integrationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Integration",
}
});

module.exports = mongoose.model("Repository", repositorySchema);
