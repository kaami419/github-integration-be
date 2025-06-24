const express = require("express");
const router = express.Router();
const githubController = require("../controllers/githubController");

router.get("/auth", githubController.redirectToGitHub);
router.get("/callback", githubController.handleGitHubCallback);
router.get("/integration", githubController.getIntegration);
router.get('/integrations', githubController.getAllIntegrations);
router.get('/integration/:githubId', githubController.getIntegrationById);
// router.delete("/integration", githubController.deleteIntegration);
router.delete("/integration/:githubId", githubController.deleteIntegration);
router.get("/fetch-data", githubController.fetchGithubData);
router.get("/orgs/:githubId", githubController.getOrgsByGithubId);
router.get("/repos/:githubId", githubController.getReposByGithubId);
router.get("/commits/:githubId", githubController.getCommitsByGithubId);
router.get("/pulls/:githubId", githubController.getPullsByGithubId);
router.get("/issues/:githubId", githubController.getIssuesByGithubId);
router.get("/users/:githubId", githubController.getUserByGithubId);
router.get("/full-snapshot/:githubId", githubController.getFullGithubSnapshot);
router.get("/changelogs/:githubId", githubController.getChangelogsByGithubId);



module.exports = router;
