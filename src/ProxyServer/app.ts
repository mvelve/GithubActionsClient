"use strict";
import dotenv from "dotenv";
import validateCommitPayload from "./Controllers/commitResponseValidation";
import requestOriginValidation from "./Controllers/originValidation";
import express from "express"; //fix module not found error here do not know why
dotenv.config();

const app = express();
const port = 3000;

//adding middleware (validators not complete but not necessary)
app.use(express.json());
app.use(requestOriginValidation);
app.use(validateCommitPayload);

//bad practice but for testing we will keep these here for now
type throughputStartEntry = [number, number];
const finishTimes: number[] = [];
const startTimes: throughputStartEntry[] = [];

//this request endpoint works now as well
//an echo ednpoint
app.post("/webhooks/push", (req, res) => {
  finishTimes.push(Date.now());
  console.log("GitHub webhook received:", req.body);
  res.status(200).send("Webhook received");
});

app.post("/webhooks/pushEvents/start", (req, res) => {
  const { uploadStart, mbFileSize } = req.body;
  startTimes.push([uploadStart, mbFileSize]);
  res.status(200).send("start time reconrded");
});

app.get("/webhooks/pushEvents/throughputs", (_, res) => {
  const throughputData = finishTimes.map((endTime, idx) => {
    const [uploadStart, mbFileSize] = startTimes[idx];
    const durationInSeconds = (endTime - uploadStart) / 1000;
    const throughputMBps = mbFileSize / durationInSeconds;

    return {
      uploadStart,
      uploadEnd: endTime,
      mbFileSize,
      throughputMBps,
    };
  });

  res.json(throughputData);
});

app.listen(port);
