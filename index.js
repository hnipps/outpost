const express = require("express");
const {
  getCastsByUser,
  getUserDirectory,
  formatCasts,
  getFeed,
} = require("./lib/lib");
const app = express();
const port = 3000;

app.use(express.static("static"));

app.get("/", function (req, res) {
  res.send("Welcome.");
  return;
});

app.get("/user/:user", async function (req, res) {
  const username = req.params.user;
  try {
    const directory = await getUserDirectory(username);
    const castList = await getCastsByUser(username);
    const formattedCastList = formatCasts(castList);

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="/css/profile.css">
            <title>${username}'s Casts</title>
        </head>
        <body>
            <main class="profile">
                <div class="info">
                    <img class="avatar" src="${directory.body.avatarUrl}" />
                    <h1>${directory.body.displayName}</h1>
                    <h2>@${username}</h2>
                </div>
                <div>
                    ${formattedCastList
                      .map((cast) => {
                        return `
                        <div class="post">
                            <span class="datetime"><strong>${cast.datetime} |</strong></span>
                            <p class="content">${cast.text}</p>
                        </div>
                    `;
                      })
                      .join("")}
                </div>
            <main>
        </body>
        </html>
    `);
    return;
  } catch (error) {
    console.error(`Something went wrong while getting casts for ${username}`);
    console.error(error);
  }
});

app.get("/feed", async function (req, res) {
  const following = ["v", "jomessin", "jess"];
  try {
    const castList = await getFeed(following);
    console.log(castList);
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="/css/feed.css">
            <title>Feed</title>
        </head>
        <body>
            <main class="feed">
            ${castList
              .map((cast) => {
                return `
                <div class="cast">
                    <div class="info">
                        <img class="avatar" src="${cast.avatar}" />
                        <span>${cast.displayName}</span>
                        <span>@${cast.username}</span>
                    </div>
                    <div>
                        <p class="content">${cast.text}</p>
                        <span class="datetime"><strong>${cast.datetime} |</strong></span>
                    </div>
                </div>
                    `;
              })
              .join("")}
            <main>
        </body>
        </html>
    `);
    return;
  } catch (error) {
    console.error(`Something went wrong while getting feed`);
    console.error(error);
  }
});

app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
});
