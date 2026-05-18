/////// app.js

const path = require("node:path");

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
//import { prisma } from "./lib/prisma.js";
const prisma = require("./lib/prisma.js");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // ms
    },
    secret: "cat",
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, //ms
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  }),
);
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) =>
  res.render("index", {
    title: "index",
    user: req.user,
  }),
);
app.get("/create-account", (req, res) =>
  res.render("create-account", {
    title: "create account",
  }),
);

app.post("/create-account", async (req, res, next) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: req.body.name,
        password: hashedPassword,
      },
    });
    res.redirect("/");
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.get("/log-in", (req, res) => {
  res.render("log-in", {
    title: "log-in",
  });
});
app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  }),
);

app.listen(3000, (error) => {
  if (error) {
    throw error;
  }
  console.log("app listening on port 3000!");
});

////// local strategy

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await prisma.user.findFirst({
        where: { id: 1 },
      });

      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        // passwords do not match!
        return done(null, false, { message: "Incorrect password" });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: 1 },
    });

    done(null, user);
  } catch (err) {
    done(err);
  }
});
