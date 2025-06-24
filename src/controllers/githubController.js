const axios = require("axios");
const Integration = require("../models/Integration");
const Organization = require("../models/Organization");
const Repository = require("../models/Repository");
const Commit = require("../models/Commit");
const Pull = require("../models/Pull");
const Issue = require("../models/Issue");
const IssueChangelog = require("../models/IssueChangelog");
const GitHubUser = require("../models/User");

exports.redirectToGitHub = (req, res) => {
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=read:org,user,repo`;
  res.redirect(redirectUrl);
};

exports.handleGitHubCallback = async (req, res) => {
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  const code = req.query.code;

  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("🔍 Token scopes:", userRes.headers['x-oauth-scopes']);
    
    const user = userRes.data;
    console.log("🙋 Logged in GitHub user:", user.login);

    const existing = await Integration.findOne({ githubId: user.id });
    if (existing) {
      existing.accessToken = accessToken;
      existing.connectedAt = new Date();
      await existing.save();
      return res.redirect("http://localhost:4200");
    }

    // Save new integration
    const integration = new Integration({
      githubId: user.id,
      username: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      email: user.email,
      accessToken,
      connectedAt: new Date(),
      plan: user.plan,
    });

    await integration.save();

    // res.send("✅ GitHub integration successful!");
    res.redirect("http://localhost:4200");
  } catch (err) {
    console.error("GitHub OAuth Error:", err.message);
    res.status(500).send("GitHub OAuth failed.");
  }
};

exports.getIntegration = async (req, res) => {
  try {
    const integration = await Integration.findOne().sort({ connectedAt: -1 });
    if (!integration) {
      return res.status(404).json({ message: "No integration found" });
    }
    res.json(integration);
  } catch (err) {
    console.error("Error fetching integration:", err.message);
    res.status(500).send("Server error");
  }
};

// exports.deleteIntegration = async (req, res) => {
//   try {
//     await Integration.deleteMany(); // You could also filter if needed
//     res.send("❌ Integration removed");
//   } catch (err) {
//     console.error("Error deleting integration:", err.message);
//     res.status(500).send("Server error");
//   }
// };


exports.deleteIntegration = async (req, res) => {
  const githubId = req.params.githubId;

  if (!githubId) {
    return res.status(400).send("❌ Missing GitHub ID in params");
  }

  try {
    const deleted = await Integration.deleteOne({ githubId });

    if (deleted.deletedCount === 0) {
      return res.status(404).send("⚠️ No integration found for GitHub ID: " + githubId);
    }

    res.send("❌ Integration removed for GitHub ID: " + githubId);
  } catch (err) {
    console.error("Error deleting integration:", err.message);
    res.status(500).send("Server error");
  }
};



exports.fetchGithubData = async (req, res) => {
  try {
    console.log("📦 Starting GitHub data fetch...");

    const integration = await Integration.findOne().sort({ connectedAt: -1 });
    console.log("🔍 Integration found:", integration);
    ("🔍 Integration found:", integration);
    if (!integration) {
      console.log("❌ No integration found");
      return res.status(400).send("No GitHub integration found");
    }

    const accessToken = integration.accessToken;
    const headers = { Authorization: `Bearer ${accessToken}` };
    console.log("🔑 Access token:", accessToken);



    const orgsRes = await axios.get("https://api.github.com/user/orgs", { headers });
     console.log("📦 /user/orgs data:", orgsRes.data);
    const orgs = orgsRes.data;

    console.log(`📘 Found ${orgs.length} org(s)`);

    for (const org of orgs) {
      console.log(`🔍 Processing org: ${org.login}`);

      await Organization.findOneAndUpdate(
        { orgId: org.id , integrationId: integration._id },
        {
          integrationId: integration._id,  
          orgId: org.id,
          login: org.login,
          description: org.description,
          avatar_url: org.avatar_url,
          url: org.url,
          repos_url: org.repos_url,
        },
        { upsert: true, new: true }
      );

      const reposRes = await axios.get(`https://api.github.com/orgs/${org.login}/repos?per_page=100`, { headers });
      const repos = reposRes.data;

      console.log(`📁 Found ${repos.length} repos in ${org.login}`);

      for (const repo of repos) {
        console.log(`📄 Repo: ${repo.name}`);

        await Repository.findOneAndUpdate(
          { repoId: repo.id, integrationId: integration._id },
          {
            integrationId: integration._id,
            repoId: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
            html_url: repo.html_url,
            description: repo.description,
            url: repo.url,
            commits_url: repo.commits_url,
            pulls_url: repo.pulls_url,
            issues_url: repo.issues_url,
            owner: repo.owner.login,
            org: org.login,
          },
          { upsert: true, new: true }
        );

        try {
          const commitsRes = await axios.get(`https://api.github.com/repos/${org.login}/${repo.name}/commits?per_page=100`, { headers });
          const commits = commitsRes.data;
          console.log(`🧾 ${commits.length} commits`);
        //   await Commit.insertMany(
        //     commits.map((c) => ({
        //       integrationId: integration._id,
        //       sha: c.sha,
        //       author: c.commit.author,
        //       committer: c.commit.committer,
        //       message: c.commit.message,
        //       url: c.html_url,
        //       repo: repo.name,
        //       org: org.login,
        //     })),
        //     { ordered: false }
        //   );
          const commitOps = commits.map((c) => ({
  updateOne: {
    filter: { sha: c.sha, integrationId: integration._id },
    update: {
      $set: {
        author: c.commit.author,
        committer: c.commit.committer,
        message: c.commit.message,
        url: c.html_url,
        repo: repo.name,
        org: org.login
      }
    },
    upsert: true
  }
}));
await Commit.bulkWrite(commitOps);
        } catch (err) {
          console.error(`❌ Commits failed for ${repo.name}:`, err.message);
        }

        try {
          const pullsRes = await axios.get(`https://api.github.com/repos/${org.login}/${repo.name}/pulls?state=all&per_page=100`, { headers });
          const pulls = pullsRes.data;
          console.log(`🔁 ${pulls.length} pull requests`);
        //   await Pull.insertMany(
        //     pulls.map((p) => ({
        //       integrationId: integration._id,
        //       pullId: p.id,
        //       title: p.title,
        //       state: p.state,
        //       created_at: p.created_at,
        //       merged_at: p.merged_at,
        //       user: p.user,
        //       repo: repo.name,
        //       org: org.login,
        //     })),
        //     { ordered: false }
        //   );
        const pullOps = pulls.map((p) => ({
  updateOne: {
    filter: { pullId: p.id, integrationId: integration._id },
    update: {
      $set: {
        title: p.title,
        state: p.state,
        created_at: p.created_at,
        merged_at: p.merged_at,
        user: p.user,
        repo: repo.name,
        org: org.login
      }
    },
    upsert: true
  }
}));
await Pull.bulkWrite(pullOps);

        } catch (err) {
          console.error(`❌ Pulls failed for ${repo.name}:`, err.message);
        }

        try {
          const issuesRes = await axios.get(`https://api.github.com/repos/${org.login}/${repo.name}/issues?state=all&per_page=100`, { headers });
          const issues = issuesRes.data.filter((i) => !i.pull_request);
          console.log(`🐞 ${issues.length} issues`);
        //   await Issue.insertMany(
        //     issues.map((i) => ({
        //       integrationId: integration._id,  
        //       issueId: i.id,
        //       title: i.title,
        //       state: i.state,
        //       user: i.user,
        //       created_at: i.created_at,
        //       comments_url: i.comments_url,
        //       repo: repo.name,
        //       org: org.login,
        //     })),
        //     { ordered: false }
        //   );
        const issueOps = issues.map((i) => ({
  updateOne: {
    filter: { issueId: i.id, integrationId: integration._id },
    update: {
      $set: {
        title: i.title,
        state: i.state,
        user: i.user,
        created_at: i.created_at,
        comments_url: i.comments_url,
        repo: repo.name,
        org: org.login
      }
    },
    upsert: true
  }
}));
await Issue.bulkWrite(issueOps);


        //   for (const issue of issues) {
        //     const commentsRes = await axios.get(issue.comments_url, { headers });
        //     const comments = commentsRes.data;
        //     await IssueChangelog.create({
        //       integrationId: integration._id,
        //       issueId: issue.id,
        //       comments,
        //       repo: repo.name,
        //       org: org.login,
        //     });
        //   }
        for (const issue of issues) {
  const existing = await IssueChangelog.findOne({ integrationId: integration._id, issueId: issue.id });
  if (!existing) {
    const commentsRes = await axios.get(issue.comments_url, { headers });
    const comments = commentsRes.data;
    await IssueChangelog.create({
      integrationId: integration._id,
      issueId: issue.id,
      comments,
      repo: repo.name,
      org: org.login,
    });
  }
}

        } catch (err) {
          console.error(`❌ Issues failed for ${repo.name}:`, err.message);
        }
      }

      try {
        const usersRes = await axios.get(`https://api.github.com/orgs/${org.login}/members`, { headers });
        const users = usersRes.data;
        console.log(`👥 ${users.length} members in org`);
        // await GitHubUser.insertMany(
        //   users.map((u) => ({
        //     integrationId: integration._id,
        //     githubId: u.id,
        //     login: u.login,
        //     name: u.name || '',
        //     email: u.email || '',
        //     avatar_url: u.avatar_url,
        //     type: u.type,
        //     org: org.login,
        //   })),
        //   { ordered: false }
        // );

        const bulkOps = users.map((u) => ({
  updateOne: {
    filter: { githubId: u.id, integrationId: integration._id },
    update: {
      $set: {
        login: u.login,
        name: u.name || '',
        email: u.email || '',
        avatar_url: u.avatar_url,
        type: u.type,
        org: org.login,
      }
    },
    upsert: true
  }
}));

await GitHubUser.bulkWrite(bulkOps);

      } catch (err) {
        console.error(`❌ Users fetch failed for org: ${org.login}`, err.message);
      }
    }

    res.send("✅ GitHub data fetched and stored");
  } catch (err) {
    console.error("❌ Top-level fetch error:", err.message);
    res.status(500).send("Server error during GitHub fetch");
  }
};

exports.getOrgsByGithubId = async (req, res) => {
  try {
    const integration = await Integration.findOne({ githubId: req.params.githubId });

    if (!integration) return res.status(404).send("No integration found");

    const orgs = await Organization.find({ integrationId: integration._id });
    res.json(orgs);
  } catch (err) {
    console.error("Error fetching orgs:", err.message);
    res.status(500).send("Server error");
  }
};


exports.getReposByGithubId = async (req, res) => {
  try {
    const integration = await Integration.findOne({ githubId: req.params.githubId });

    if (!integration) return res.status(404).send("No integration found");

    const repos = await Repository.find({ integrationId: integration._id });
    res.json(repos);
  } catch (err) {
    console.error("Error fetching repos:", err.message);
    res.status(500).send("Server error");
  }
};


exports.getCommitsByGithubId = async (req, res) => {
  try {
    const integration = await Integration.findOne({ githubId: req.params.githubId });

    if (!integration) return res.status(404).send("No integration found");

    const commits = await Commit.find({ integrationId: integration._id });
    res.json(commits);
  } catch (err) {
    console.error("Error fetching commits:", err.message);
    res.status(500).send("Server error");
  }
};


exports.getPullsByGithubId = async (req, res) => {
  try {
    const integration = await Integration.findOne({ githubId: req.params.githubId });

    if (!integration) return res.status(404).send("No integration found");

    const pulls = await Pull.find({ integrationId: integration._id });
    res.json(pulls);
  } catch (err) {
    console.error("Error fetching pulls:", err.message);
    res.status(500).send("Server error");
  }
};

exports.getIssuesByGithubId = async (req, res) => {
  try {
    const integration = await Integration.findOne({ githubId: req.params.githubId });

    if (!integration) return res.status(404).send("No integration found");

    const Issues = await Issue.find({ integrationId: integration._id });
    res.json(Issues);
  } catch (err) {
    console.error("Error fetching issues:", err.message);
    res.status(500).send("Server error");
  }
};

exports.getUserByGithubId = async (req, res) => {
  try {
    const integration = await Integration.findOne({ githubId: req.params.githubId });

    if (!integration) return res.status(404).send("No integration found");

    const user = await GitHubUser.find({ integrationId: integration._id });
    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err.message);
    res.status(500).send("Server error");
  }
};

exports.getFullGithubSnapshot = async (req, res) => {
  try {
    const integration = await Integration.findOne({ githubId: req.params.githubId });
    if (!integration) return res.status(404).send("No integration found");

    const [orgs, repos, commits, pulls, issues, users] = await Promise.all([
      Organization.find({ integrationId: integration._id }),
      Repository.find({ integrationId: integration._id }),
      Commit.find({ integrationId: integration._id }),
      Pull.find({ integrationId: integration._id }),
      Issue.find({ integrationId: integration._id }),
      GitHubUser.find({ integrationId: integration._id })
    ]);

    res.json({ orgs, repos, commits, pulls, issues, users });
  } catch (err) {
    console.error("Snapshot error:", err.message);
    res.status(500).send("Server error");
  }
};

exports.getAllIntegrations = async (req, res) => {
  try {
    const integrations = await Integration.find().sort({ connectedAt: -1 });
    console.log("integrations are", integrations);
    if (!integrations) return res.status(404).send("No integrations found");
    res.json(integrations);
  } catch (err) {
    console.error("Error fetching all integrations:", err.message);
    res.status(500).send("Server error");
  }
};

exports.getIntegrationById = async (req, res) => {
  try {
    const integration = await Integration.findOne({ githubId: req.params.githubId });
    if (!integration) return res.status(404).send("No integration found");
    res.json(integration);
  } catch (err) {
    console.error("Error fetching integration by ID:", err.message);
    res.status(500).send("Server error");
  }
};

exports.getChangelogsByGithubId = async (req, res) => {
  try {
    const integration = await Integration.findOne({ githubId: req.params.githubId });
    if (!integration) return res.status(404).send("No integration found");

    const changelogs = await IssueChangelog.find({ integrationId: integration._id });
    res.json(changelogs);
  } catch (err) {
    console.error("Error fetching changelogs:", err.message);
    res.status(500).send("Server error");
  }
};