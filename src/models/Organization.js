const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema({
  orgId: String,
  login: String,
  description: String,
  avatar_url: String,
  url: String,
  repos_url: String,
  integrationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Integration",
}
});

module.exports = mongoose.model("Organization", organizationSchema);
