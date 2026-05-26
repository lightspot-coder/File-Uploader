const { Router } = require("express");
const userFolderRouter = Router();
const userFolderController = require("../controllers/userFolderController");
const userFileController = require("../controllers/userFileController");
const createAccountController = require("../controllers/createAccountController");
const validateFolder = require("../controllers/validateFolderForm");

userFolderRouter.get("/create-account", (req, res) =>
  res.render("create-account", {
    title: "create account",
  }),
);
userFolderRouter.post("/create-account", createAccountController.validateForm);
userFolderRouter.post(
  "/create-account",
  createAccountController.createAccount_POST,
);
userFolderRouter.get("/user/:user/", userFolderController.showFolder_GET);
userFolderRouter.get(
  "/user/:user/create-folder",
  userFolderController.createFolder_GET,
);
userFolderRouter.post("/user/:user/create-folder", validateFolder.validateForm);
userFolderRouter.post(
  "/user/:user/create-folder",
  userFolderController.createFolder_POST,
);

userFolderRouter.get(
  "/user/:user/delete-folder",
  userFolderController.deleteFolder_GET,
);
userFolderRouter.get(
  "/user/:user/update-folder",
  userFolderController.updateFolder_GET,
);
userFolderRouter.post(
  "/user/:user/update-folder",
  userFolderController.updateFolder_POST,
);

userFolderRouter.get(
  "/user/:user/upload-file",
  userFileController.uploadFile_GET,
);
userFolderRouter.post(
  "/user/:user/upload-file",
  userFileController.uploadFile_POST,
);
userFolderRouter.get("/user/:user/file-info", userFileController.fileInfo_GET);

userFolderRouter.get(
  "/user/:user/delete-file",
  userFileController.deleteFile_GET,
);
module.exports = userFolderRouter;
