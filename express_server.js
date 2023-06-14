const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const PORT = 8080;
const users = {};

app.set("view engine", "ejs");

const urlDatabase = {};

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Function to generate a random string for user ID
const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Function to get a user by email
const getUserByEmail = (email) => {
  for (const userId in users) {
    if (users[userId].email === email) {
      return users[userId];
    }
  }
  return null;
};

// Function to get URLs for a user
const urlsForUser = (id) => {
  const userURLs = {};
  for (const urlId in urlDatabase) {
    if (urlDatabase[urlId].userID === id) {
      userURLs[urlId] = urlDatabase[urlId];
    }
  }
  return userURLs;
};

// Middleware to check if the user is logged in
const requireLogin = (req, res, next) => {
  const userId = req.cookies.user_id;
  if (userId && users[userId]) {
    next();
  } else {
    res.status(403).send("<html><body>Please log in to access this page.</body></html>");
  }
};

// Middleware to check if the user owns the URL
const requireOwnership = (req, res, next) => {
  const userId = req.cookies.user_id;
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
  const userId = req.cookies.user_id;
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

  // Find user by email
  const user = getUserByEmail(email);

  // Check if user exists and passwords match
  if (!user || user.password !== password) {
    res.status(403).send("Invalid email or password");
    return;
  }

  // Set the user_id cookie with the matching user's ID
  res.cookie("user_id", user.id);

  // Redirect to the /urls page
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/login");
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;

  // Check if the email or password is empty
  if (!email || !password) {
    res.status(400).send("Email and password cannot be empty.");
    return;
  }

  // Check if the email already exists in the users object
  for (const userId in users) {
    if (users[userId].email === email) {
      res.status(400).send("Email already registered.");
      return;
    }
  }

  // Generate a random ID for the new user
  const userId = generateRandomString();

  // Create a new user object
  const newUser = {
    id: userId,
    email,
    password
  };

  // Save the new user object in the users data store
  users[userId] = newUser;

  console.log(users);

  // Set the user_id cookie with the new user's ID
  res.cookie("user_id", userId);

  // Redirect to the /urls page
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
  const userId = req.cookies.user_id;
  const userURLs = urlsForUser(userId);
  const templateVars = {
    urls: userURLs,
    user: users[userId]
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", requireLogin, (req, res) => {
  const templateVars = {
    user: users[req.cookies.user_id]
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", requireLogin, (req, res) => {
  const userId = req.cookies.user_id;
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
      user: users[userId]
    };
    res.render("urls_show", templateVars);
  }
});

app.get("/register", (req, res) => {
  // Check if the user is already logged in
  if (req.cookies.user_id && users[req.cookies.user_id]) {
    res.redirect("/urls");
    return;
  }

  res.render("register");
});

app.get("/login", (req, res) => {
  // Check if the user is already logged in
  if (req.cookies.user_id && users[req.cookies.user_id]) {
    res.redirect("/urls");
    return;
  }

  res.render("login");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});




