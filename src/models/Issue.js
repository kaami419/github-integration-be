const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
  issueId: Number,
  title: String,
  state: String,
  user: Object,
  created_at: Date,
  comments_url: String,
  repo: String,
  org: String,
  integrationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Integration",
}
});

module.exports = mongoose.model("Issue", issueSchema);
