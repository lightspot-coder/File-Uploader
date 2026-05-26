const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma.js");
const bcrypt = require("bcryptjs");

const validateUser = [
  body("userName")
    .notEmpty()
    .withMessage("user name can not be empty")
    .isAlphanumeric()
    .withMessage("user name only contain letters and number"),
  body("password").notEmpty().withMessage("Password can not be empty"),
];

const validateForm = [
  validateUser,
  (req, res, next) => {
    console.log("validating create account form");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("create-account", {
        title: "sign up error",
        errors: errors.array(),
      });
    }
    next();
  },
];

async function createAccount_POST(req, res, next) {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    // create user with default root folder
    const user = await prisma.user.create({
      data: {
        userName: req.body.userName,
        password: hashedPassword,
        directoryTree: {
          create: [
            {
              name: "root",
            },
          ],
        },
      },
    });
    res.redirect("/");
  } catch (error) {
    console.log(error.code);
    if (error.code == "P2002") {
      console.log("error creating a new account");
      res.render("create-account", {
        title: "error creating a new account",
        errors: [{ msg: `${req.body.userName} already exist` }],
      });
    }
    /*
    else{
        next(error);
    } */
  }
}

module.exports = {
  validateForm,
  createAccount_POST,
};
