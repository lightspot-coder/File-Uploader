const prisma = require("../lib/prisma.js");
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
    orderBy: {
      name: "asc",
    },
  });
  const files = await prisma.file.findMany({
    where: {
      folderId: currentFolder.id,
    },
    select: {
      id: true,
      originalName: true,
      type: true,
    },
    orderBy: {
      originalName: "asc",
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

  // check if the folder name already exist
  const folderExist = await prisma.folder.findFirst({
    where: {
      AND: {
        name: req.body.folderName,
        parentFolderId: Number(req.body.parentFolderId),
      },
    },
  });
  console.log(folderExist);
  if (folderExist == null) {
    // if folder doesn't exist, create
    const folder = await prisma.folder.create({
      data: {
        name: req.body.folderName,
        userId: user.id,
        parentFolderId: Number(req.body.parentFolderId),
      },
    });
    res.redirect(
      "/user/" +
        req.user.userName +
        "/?parentFolderId=" +
        req.body.parentFolderId,
    );
  } else {
    // if folder doesn't exist in the db, tell it to the user
    res.render("create-folder", {
      title: "error create folder",
      parentFolderId: req.body.parentFolderId,
      currentUser: req.user,
      errors: [
        {
          msg: `${req.body.folderName} already exist in this directory`,
        },
      ],
    });
  }
}

// function to find all the subfolders inside of a user's folder
// the result is an array of the id of all of the subfolders finded in the database

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
  while (allSubFoldersToVisited.length != 0) {
    folderId = allSubFoldersToVisited.shift().id;
    const subFolders = await prisma.folder.findMany({
      where: {
        userId: userId,
        parentFolderId: folderId,
      },
      select: {
        id: true,
      },
    });
    if (subFolders.length != 0) {
      allSubFoldersFinded = allSubFoldersFinded.concat(subFolders);
      allSubFoldersToVisited = allSubFoldersToVisited.concat(subFolders);
    }
  }
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
  let allPublicIdFiles = [];
  //find all the public_id in the files for deleting in cluodinary

  for (let i = 0; i < allSubFoldersId.length; i++) {
    const file = await prisma.file.findMany({
      where: {
        folderId: allSubFoldersId[i],
      },
      select: {
        publicId: true,
        type: true,
      },
    });
    allPublicIdFiles = allPublicIdFiles.concat(file);
  }
  console.log("files to be delete on cloudinary service :");
  console.log(allPublicIdFiles);

  //delete files on cluodinary
  for (let i = 0; i < allPublicIdFiles.length; i++) {
    console.log(allPublicIdFiles[i].publicId);
    const result = await cloudinary.uploader.destroy(
      allPublicIdFiles[i].publicId,
      {
        resource_type: allPublicIdFiles[i].type.split("/")[0],
      },
    );
    console.log("cloudinary result of deleting file : ");
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
      req.user.userName +
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
    "/user/" + req.user.userName + "/?parentFolderId=" + updateFolder.id,
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
