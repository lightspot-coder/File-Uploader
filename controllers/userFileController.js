const prisma = require("../lib/prisma.js");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: "dlgk9cm5z",
  secure: true,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//module.exports = cloudinary;

function uploadFile_GET(req, res) {
  res.render("upload-file", {
    title: "upload-file",
    currentUser: req.user,
    currentFolderId: req.query.folderId,
  });
}

async function uploadFile_POST(req, res) {
  //console.log(req.file);

  if (req.file) {
    // upload the file to the clodinary service
    const result = await cloudinary.uploader.upload(req.file.path, {
      asset_folder: `/${req.user.name}`,
    });
    console.log(result);
    // delete file in the local storage
    fs.unlink(req.file.path, (err) => {
      if (err) console.log(err);
    });
    // create file in the db
    const url = await cloudinary.url(result.public_id, {
      flags: "attachment",
    });
    const file = await prisma.file.create({
      data: {
        publicId: result.public_id,
        folderId: Number(req.body.currentFolderId),
        originalName: req.file.originalname,
        uploadTime: Date(),
        url: url,
        size: Number(req.file.size),
        type: req.file.mimetype,
      },
    });
    res.redirect(
      "/user/" + req.user.name + "/?parentFolderId=" + file.folderId,
    );
  } else {
    res.redirect("error");
  }
}

async function fileInfo_GET(req, res) {
  const fileInfo = await prisma.file.findFirst({
    where: {
      id: Number(req.query.fileId),
    },
  });
  res.render("file-info", {
    currentUser: req.user,
    title: "file details",
    file: fileInfo,
  });
}

async function deleteFile_GET(req, res) {
  if (req.query.fileId) {
    // delete the fail in the db
    const deleteFile = await prisma.file.delete({
      where: {
        id: Number(req.query.fileId),
      },
    });
    // delete the fail in cloudinary
    const result = await cloudinary.uploader.destroy(deleteFile.publicId);
    console.log(result);
    res.redirect(
      "/user/" + req.user.name + "/?parentFolderId=" + deleteFile.folderId,
    );
  } else {
    console.log("wrong request query in delete file");
    res.redirect("/");
  }
}

module.exports = {
  uploadFile_GET,
  uploadFile_POST,
  fileInfo_GET,
  deleteFile_GET,
};
