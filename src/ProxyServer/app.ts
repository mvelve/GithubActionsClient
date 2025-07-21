"use strict";
import dotenv from "dotenv";
import validateCommitPayload from "./Controllers/commitResponseValidation";
import requestOriginValidation from "./Controllers/originValidation";
import express from "express"; //fix module not found error here do not know why
dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(requestOriginValidation);
app.use(validateCommitPayload);

//this route works well and is hosted when ngrok is used
app.get("/", (req, res) => {
  res.send("hello world");
});

//this request endpoint works now as well
app.post("/webhooks/push", (req, res) => {
  console.log("GitHub webhook received:", req.body);
  res.status(200).send("Webhook received");
});

app.listen(port);
