const express = require("express");
const fetch = require("node-fetch");
const app = express();
const port = 3000;


const redis = require("redis");

const client = redis.createClient("redis://redis_db:6379");


client.on("error", function (error) {
  console.error(error);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});


// Cache middleware
function cache(req, res, next) {
  const { username } = req.params;

  client.get(username, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      res.status(200).json({
        username: username,
        repos: data,
      });
    } else {
      next();
    }
  });
}

// Make request to Github for data
async function getRepos(req, res) {
  try {
    console.log("Fetching Data...");

    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);

    const data = await response.json();

    const repos = data.public_repos;

    // Set data to Redis
    client.setex(username, 3600, repos);

    res.status(200).json({
      username: username,
      repos: repos,
    });
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

app.get("/github/:username", cache, getRepos);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
