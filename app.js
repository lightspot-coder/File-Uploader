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
const multer = require("multer");
const upload = multer({ dest: "uploads/" }, { fileFilter: fileFilter });
const userRouter = require("./routes/userRouter.js");

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));

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

app.use((req, res, next) => {
  if (req.user) {
    res.locals.currentUser = req.user;
  }
  next();
});

app.get("/", (req, res) => {
  console.log("i am here");
  res.render("home", {
    title: "home",
  });
});
app.get("/create-account", userRouter);

app.post("/create-account", userRouter);

app.get("/log-in", (req, res) => {
  res.render("log-in", {
    title: "log-in",
    message: req.session.messages,
  });
  req.session.messages = undefined;
});
app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureMessage: true,
    failureRedirect: "/log-in",
  }),
);

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/user/:user/", userRouter);
app.get("/user/:user/create-folder", userRouter);
app.post("/user/:user/create-folder", userRouter);
app.get("/user/:user/delete-folder", userRouter);
app.get("/user/:user/update-folder", userRouter);
app.post("/user/:user/update-folder", userRouter);
app.get("/user/:user/upload-file", userRouter);
app.post("/user/:user/upload-file", upload.single("myfile"), userRouter);
app.get("/user/:user/file-info", userRouter);
app.get("/user/:user/delete-file", userRouter);
app.get("/user/:user/{*splat}", (req, res) => {
  res.render("error");
});

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
        where: { userName: username },
      });

      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        // passwords do not match!
        return done(null, false, { message: "Incorrect password" });
      }
      console.log("all good welcome ", user.userName);
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
      where: { id: id },
    });

    done(null, user);
  } catch (err) {
    done(err);
  }
});

function fileFilter(req, file, cb) {}
