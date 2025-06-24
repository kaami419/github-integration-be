const mongoose = require("mongoose");

const pullSchema = new mongoose.Schema({
  pullId: Number,
  title: String,
  state: String,
  created_at: Date,
  merged_at: Date,
  user: Object,
  repo: String,
  org: String,
  integrationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Integration",
}
});

module.exports = mongoose.model("Pull", pullSchema);
