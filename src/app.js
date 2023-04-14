import express from "express";
import cors from "cors";
import { MongoClient, MongoClient } from "mongodb";
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
  const participant = req.body;
  const { name } = req.body;

  const newParticipants = { name, lastStatus: Date.now() };

  try {
    const nameParticipant = await db
      .collection("participants")
      .findOne({ name: name });
    if (nameParticipant) return res.status(409).send("esse nome já existe!");

    await db.collection("participants").insertOne(newParticipants);
    res.status(201).send("tudo ok");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
