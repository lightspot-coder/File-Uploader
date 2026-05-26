const { body, validationResult } = require("express-validator");

const validateFolder = [
  body("folderName")
    .trim()
    .notEmpty()
    .withMessage("folder name can not be empty")
    .isAlphanumeric("en-US", { ignore: "^[ \-_]+$" })
    .withMessage("folder name can contain: letters,numbers, - , _ and spaces"),
];

const validateForm = [
  validateFolder,
  (req, res, next) => {
    console.log("validating create folder form");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("create-folder", {
        title: "create folder error",
        parentFolderId: req.body.parentFolderId,
        currentUser: req.user,
        errors: errors.array(),
      });
    }
    next();
  },
];

module.exports = {
  validateForm,
};
