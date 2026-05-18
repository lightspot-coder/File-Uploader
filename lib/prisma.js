const { dotenv } = require("dotenv/config");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../generated/prisma/client");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");

// DATABASE_URL defined in env file included in prisma.config.js; see Prisma docs
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
