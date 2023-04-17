import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Joi from "joi";

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
  await mongoClient.connect();
  console.log("MongoDB conectado");
} catch (err) {
  console.log(err.message);
}
const db = mongoClient.db();

app.post("/participants", async (req, res) => {
  const collection = req.body;

  const participantSchema = Joi.object({
    name: Joi.string().required().min(1),
  });

  const validation = participantSchema.validate(collection);

  if (validation.error) {
    const errors = validation.error.details.map((details) => details.message);
    return res.status(422).send(errors);
  }

  const newParticipants = { name: collection.name, lastStatus: Date.now() };

  const message = {
    from: req.body.name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  };

  try {
    const nameParticipant = await db
      .collection("participants")
      .findOne({ name: collection.name });
    if (nameParticipant) return res.status(409).send("Esse nome já existe!");

    await db.collection("participants").insertOne(newParticipants);
    await db.collection("messages").insertOne(message);
    res.status(201).send("Sucesso");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participant = await db.collection("participants").find().toArray();
    res.send(participant);
  } catch (err) {
    console.error(err);
    res.status(500).send("ocorreu um problema durante a execução");
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  console.log(user);

  const messagesSchema = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().valid("message", "private_message").required(),
  });

  const validation = messagesSchema.validate(
    { to, text, type },
    { abortEarly: false }
  );

  const message = {
    to,
    text,
    type,
    from: user,
    time: dayjs().format("HH:mm:ss"),
  };

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  const participant = await db
    .collection("participants")
    .findOne({ name: user });

  if (participant === 0) {
    return res.status(422).send("participante não existente");
  }

  try {
    await db.collection("messages").insertOne(message);
    res.status(201).send("Sucesso");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/messages", async (req, res) => {
  const { user } = req.headers;
  const { query } = req;

  const message = await db.collection("messages").find().toArray();

  let messageFilter = message.filter(
    (m) =>
      m.to === user ||
      m.type === "message" ||
      m.from === user ||
      m.type == "status"
  );

  try {
    if (query.limit) {
      const limit = parseFloat(query.limit);
      if (isNaN(limit) || limit < 1)
        return res.status(422).send(messageFilter.reverse().splice(0, limit));
    }
    res.status(200).send(messageFilter).reverse();
  } catch (err) {
    res.status(500).send("Erro ao buscar mensagens.");
  }
});

app.post("/status", async (req, res) => {
  const { user } = req.headers;

  try {
    const participant = await db
      .collection("participants")
      .findOne({ name: user });

    if (participant) {
      await db
        .collection("participants")
        .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
      return res.status(200).send("Sucesso");
    } else {
      res.status(404).send("participante não conste na lista de participantes");
    }
  } catch (error) {
    res.status(500).send("Erro ao buscar mensagens.");
  }
});

setInterval(async () => {
  try {
    const participant = await db
      .collection("participants")
      .find({ lastStatus: { $lt: Date.now() - 10000 } })
      .toArray();

    if (participant.length !== 0) {
      participant.forEach(async (p) => {
        await db.collection("messages").insertOne({
          from: p.name,
          to: "Todos",
          text: "sai da sala...",
          time: dayjs().format("HH:mm:ss"),
        });
        db.collection("participants").deleteOne({ name: p.name });
      });
    }
  } catch (error) {
    res.status(500).send("Erro");
  }
}, 15000);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
