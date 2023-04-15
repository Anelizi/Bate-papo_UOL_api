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
    name: Joi.string().required().min(1)
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
    time: dayjs().format().substring(11, 19),
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

  try{
    const participant = await db.collection('participants').find().toArray()
    res.send(participant);
  } catch (err){
    console.error(err);
    res.status(500).send('ocorreu um problema durante a execução');
  }

})

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
