import express from "express";
import url from "url";
import { sequelize, Program, Timerange, Op } from "./database";
const router = express.Router();

// Transform req & res to have the same API as express
// So we can use res.status() & res.json()
const app = express();
router.use(async (req, res, next) => {
  Object.setPrototypeOf(req, app.request);
  Object.setPrototypeOf(res, app.response);
  req.res = res;
  res.req = req;
  await connectDb();
  next();
});

function formatData(data) {
  let result = [];
  data.forEach((d) => {
    let program = {};
    let times = [];
    program.label = d.Name;
    d.Timeranges.forEach((t) => {
      let time = {
        color: "",
        label: "",
      };
      time.starting_time = t.Start.getTime();
      time.ending_time = t.End.getTime();
      times.push(time);
    });
    program.times = times;
    result.push(program);
  });
  return result;
}

async function getProgramElapsed(programId) {
  const programs = (
    await Program.findAll({
      attributes: ["Elapsed"],
      where: {
        ProgramId: programId,
      },
    })
  ).map((p) => p.dataValues);
  return programs[0].Elapsed;
}

async function getProgramNameFromId(programId) {
  const programs = (
    await Program.findAll({
      attributes: ["Name"],
      where: {
        ProgramId: programId,
      },
    })
  ).map((p) => p.dataValues);
  return programs[0].Name;
}

async function getProgramsFromUser(user) {
  const programs = (
    await Program.findAll({
      where: {
        User: user,
      },
    })
  ).map((p) => p.dataValues);
  return programs;
}

async function getAllPrograms() {
  const programs = (await Program.findAll()).map((p) => p.dataValues);
  return programs;
}

async function getAllProgramsFromUser(user) {
  const programs = (
    await Program.findAll({
      include: [
        {
          model: Timerange,
          require: true,
        },
      ],
      where: {
        User: user,
      },
    })
  ).map((p) => p.dataValues);
  programs.forEach((p) => {
    p.Timeranges = p.Timeranges.map((t) => t.dataValues);
  });
  return programs;
}

async function getAllProgramsFromUserTimerange(user, start, end) {
  const programs = (
    await Program.findAll({
      include: [
        {
          model: Timerange,
          require: true,
          where: {
            Start: {
              [Op.gt]: start,
              [Op.lt]: end,
            }
          },
        },
      ],
      where: {
        User: user,
      },
    })
  ).map((p) => p.dataValues);
  programs.forEach((p) => {
    p.Timeranges = p.Timeranges.map((t) => t.dataValues);
  });
  return programs;
}

async function getTimerangesFromProgramId(programId) {
  const timeranges = (
    await Timerange.findAll({
      where: {
        ProgramId: programId,
      },
    })
  ).map((t) => t.dataValues);
  return timeranges;
}

async function getAllTimerangesFromUser(user, start, end) {
  const timeranges = (
    await Timerange.findAll({
      include: [
        {
          model: Program,
          require: true,
          where: {
            User: user,
          },
        },
      ],
      where: {
        Start: {
          [Op.gt]: start,
          [Op.lt]: end,
        },
      },
    })
  ).map((t) => t.dataValues);
  return timeranges;
}

async function getAllTimeranges(start, end) {
  const timeranges = (
    await Timerange.findAll({
      include: [
        {
          model: Program,
          require: true,
        },
      ],
      where: {
        Start: {
          [Op.gt]: start,
          [Op.lt]: end,
        },
      },
    })
  ).map((t) => t.dataValues);
  return timeranges;
}

async function getUsers() {
  const users = await sequelize.query("SELECT DISTINCT User FROM Programs", null, {
    plain: false,
  });
  console.log(users);
  return users[0].map((u) => u.User);
}

async function connectDb() {
  console.log("Connecting to database...");
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

router.get("/test", async (req, res) => {
  const query = url.parse(req.url, true).query;
  console.log(query);
  try {
    const data = await getAllProgramsFromUserTimerange(
      query.user,
      new Date(query.start_time),
      new Date(query.end_time)
    );
    const formattedData = formatData(data);
    return res.json(formattedData);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/users", async (req, res) => {
  console.log("get users");
  try {
    const data = await getUsers();
    console.log(data);
    return res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default {
  handler: router,
  path: "/api",
};
