const prisma = require("../lib/prisma.js");
//const cloudinary = require("./userFileController.js");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dlgk9cm5z",
  secure: true,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function showFolder_GET(req, res) {
  let parentFolder = null;
  if (req.query.parentFolderId) {
    // subfolder
    parentFolder = { id: Number(req.query.parentFolderId) };
  } else {
    // root folder
    parentFolder = await prisma.folder.findFirst({
      where: {
        AND: {
          userId: req.user.id,
          parentFolderId: null,
        },
      },
      select: {
        id: true,
      },
    });
  }
  const currentFolder = await prisma.folder.findFirst({
    where: {
      AND: {
        userId: req.user.id,
        id: parentFolder.id,
      },
    },
    select: { id: true, name: true, parentFolderId: true },
  });
  const subFolders = await prisma.folder.findMany({
    where: {
      AND: {
        userId: req.user.id,
        parentFolderId: currentFolder.id,
      },
    },
    select: {
      id: true,
      name: true,
      parentFolderId: true,
    },
  });
  const files = await prisma.file.findMany({
    where: {
      folderId: currentFolder.id,
    },
    select: {
      id: true,
      originalName: true,
    },
  });

  res.render("show-folder", {
    title: currentFolder.name,
    currentFolder: currentFolder,
    subFolders: subFolders,
    files: files,
  });
}
async function createFolder_GET(req, res) {
  //console.log(user);
  res.render("create-folder", {
    title: "create folder form",
    parentFolderId: req.query.parentFolderId,
    currentUser: req.user,
  });
}
async function createFolder_POST(req, res) {
  const user = await prisma.user.findFirst({
    where: {
      id: req.user.id,
    },
  });
  const folder = await prisma.folder.create({
    data: {
      name: req.body.folderName,
      userId: user.id,
      parentFolderId: Number(req.body.parentFolderId),
    },
  });
  res.redirect(
    "/user/" + req.user.name + "/?parentFolderId=" + req.body.parentFolderId,
  );
}

async function findAllSubFolders(userId, id) {
  let folderId = Number(id);
  let allSubFoldersToVisited = [];
  let allSubFoldersFinded = [{ id: folderId }];

  let subFolders = await prisma.folder.findMany({
    where: {
      userId: userId,
      parentFolderId: folderId,
    },
    select: {
      id: true,
    },
  });
  allSubFoldersToVisited = allSubFoldersToVisited.concat(subFolders);
  allSubFoldersFinded = allSubFoldersFinded.concat(subFolders);
  //console.log(allSubFoldersToVisited);
  while (allSubFoldersToVisited.length != 0) {
    folderId = allSubFoldersToVisited.shift().id;
    //console.log(folderId);
    //console.log(allSubFoldersToVisited);

    const subFolders = await prisma.folder.findMany({
      where: {
        userId: userId,
        parentFolderId: folderId,
      },
      select: {
        id: true,
      },
    });
    //console.log(subFolders);
    if (subFolders.length != 0) {
      allSubFoldersFinded = allSubFoldersFinded.concat(subFolders);
      allSubFoldersToVisited = allSubFoldersToVisited.concat(subFolders);
      //console.log("\n");
    }
    //console.log(allSubFoldersToVisited);
  }
  //console.log(allSubFoldersFinded);
  let allSubFolders = [];
  allSubFoldersFinded.map((folder) => {
    allSubFolders.push(folder.id);
  });
  return allSubFolders;
}

async function deleteFolder_GET(req, res) {
  // find all the subfolders
  const allSubFoldersId = await findAllSubFolders(
    req.user.id,
    req.query.folderId,
  );
  console.log(allSubFoldersId);
  let allPublicIdFiles = [];
  //find all the public_id in the files for deleting in cluodinary

  for (let i = 0; i < allSubFoldersId.length; i++) {
    const file = await prisma.file.findMany({
      where: {
        folderId: allSubFoldersId[i],
      },
      select: {
        publicId: true,
      },
    });
    allPublicIdFiles = allPublicIdFiles.concat(file);
  }
  console.log("\n");
  console.log(allPublicIdFiles);

  //delete files on cluodinary
  for (let i = 0; i < allPublicIdFiles.length; i++) {
    console.log(allPublicIdFiles[i].publicId);
    const result = await cloudinary.uploader.destroy(
      allPublicIdFiles[i].publicId,
    );
    console.log(result);
  }

  // delete all the files and folders on the db
  const folderToDelete = await prisma.folder.delete({
    where: {
      id: Number(req.query.folderId),
    },
  });

  res.redirect(
    "/user/" +
      req.user.name +
      "/?parentFolderId=" +
      folderToDelete.parentFolderId,
  );
}

async function updateFolder_GET(req, res) {
  const currentFolder = await prisma.folder.findFirst({
    where: {
      id: Number(req.query.folderId),
    },
  });
  res.render("update-folder", {
    title: "update folder",
    currentFolder: currentFolder,
  });
}

async function updateFolder_POST(req, res) {
  const updateFolder = await prisma.folder.update({
    where: {
      id: Number(req.body.folderId),
    },
    data: {
      name: req.body.newName,
    },
  });
  res.redirect(
    "/user/" + req.user.name + "/?parentFolderId=" + updateFolder.id,
  );
}

module.exports = {
  showFolder_GET,
  createFolder_GET,
  createFolder_POST,
  deleteFolder_GET,
  updateFolder_GET,
  updateFolder_POST,
};
