const express = require("express");
const bcrypt = require("bcryptjs");
const cookieSession = require("cookie-session");
const app = express();
const PORT = 8080;
const users = {};
const { getUserByEmail } = require('./helpers');

app.set("view engine", "ejs");

const urlDatabase = {};

app.use(express.urlencoded({ extended: true }));

app.use(
  cookieSession({
    name: "session",
    keys: ["secret-key"],
  })
);

const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};




const urlsForUser = (id) => {
  const userURLs = {};
  for (const urlId in urlDatabase) {
    if (urlDatabase[urlId].userID === id) {
      userURLs[urlId] = urlDatabase[urlId];
    }
  }
  return userURLs;
};

const requireLogin = (req, res, next) => {
  const userId = req.session.user_id;
  if (userId && users[userId]) {
    next();
  } else {
    res.status(403).send("<html><body>Please log in to access this page.</body></html>");
  }
};

const requireOwnership = (req, res, next) => {
  const userId = req.session.user_id;
  const id = req.params.id;
  if (urlDatabase[id] && urlDatabase[id].userID === userId) {
    next();
  } else {
    res.status(403).send("<html><body>You do not have permission to access this URL.</body></html>");
  }
};

app.post("/urls", requireLogin, (req, res) => {
  const id = generateRandomString();
  const longURL = req.body.longURL;
  const userId = req.session.user_id;
  urlDatabase[id] = {
    longURL,
    userID: userId
  };
  console.log(urlDatabase);
  res.redirect(`/urls/${id}`);
});

app.post('/urls/:id/delete', requireLogin, requireOwnership, (req, res) => {
  const id = req.params.id;
  delete urlDatabase[id];
  res.redirect('/urls');
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = getUserByEmail(email, users);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(403).send("Invalid email or password");
    return;
  }

  req.session.user_id = user.id;

  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).send("Email and password cannot be empty.");
    return;
  }

  for (const userId in users) {
    if (users[userId].email === email) {
      res.status(400).send("Email already registered.");
      return;
    }
  }

  const userId = generateRandomString();
  const hashedPassword = bcrypt.hashSync(password, 10);

  const newUser = {
    id: userId,
    email,
    password: hashedPassword,
  };

  users[userId] = newUser;

  req.session.user_id = userId;

  res.redirect("/urls");
});

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];
  if (url && url.longURL) {
    res.redirect(url.longURL);
  } else {
    res.status(404).send("<html><body>Short URL not found</body></html>");
  }
});

app.get("/urls", requireLogin, (req, res) => {
  const userId = req.session.user_id;
  const userURLs = urlsForUser(userId);
  const templateVars = {
    urls: userURLs,
    user: users[userId],
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", requireLogin, (req, res) => {
  const templateVars = {
    user: users[req.session.user_id],
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", requireLogin, (req, res) => {
  const userId = req.session.user_id;
  const id = req.params.id;
  const url = urlDatabase[id];
  if (!url) {
    res.status(404).send("<html><body>URL not found</body></html>");
  } else if (url.userID !== userId) {
    res.status(403).send("<html><body>You do not have permission to view this URL.</body></html>");
  } else {
    const templateVars = {
      id: req.params.id,
      longURL: url.longURL,
      user: users[userId],
    };
    res.render("urls_show", templateVars);
  }
});

app.get("/register", (req, res) => {
  if (req.session.user_id && users[req.session.user_id]) {
    res.redirect("/urls");
    return;
  }

  res.render("register");
});

app.get("/login", (req, res) => {
  if (req.session.user_id && users[req.session.user_id]) {
    res.redirect("/urls");
    return;
  }

  res.render("login");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

