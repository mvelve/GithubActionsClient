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
type ThroughputLog = {
  uploadStart: number;
  uploadEnd?: number;
  mbFileSize: number;
};

const uploadLogs: ThroughputLog[] = [];

//this request endpoint works now as well
//an echo ednpoint
app.post("/webhooks/push", (req, res) => {
  let log: ThroughputLog | undefined;
  for (let i = uploadLogs.length - 1; i >= 0; i--) {
    if (uploadLogs[i].uploadEnd === undefined) {
      log = uploadLogs[i];
      break;
    }
  }

  if (!log) {
    return res.status(400).send("No matching uploadStart found");
  }

  log.uploadEnd = Date.now();
  console.log("GitHub webhook received:", req.body);
  res.status(200).send("Webhook received");
});

app.post("/webhooks/manualTriggers/start", (req, res) => {
  const { uploadStart } = req.body;
});

app.post("/webhooks/pushEvents/start", (req, res) => {
  const { uploadStart, mbFileSize } = req.body;

  if (
    typeof uploadStart !== "number" ||
    typeof mbFileSize !== "number" ||
    isNaN(uploadStart) ||
    isNaN(mbFileSize)
  ) {
    return res.status(400).send("Invalid input");
  }

  uploadLogs.push({ uploadStart, mbFileSize });
  res.status(200).send("start time recorded");
});

app.get("/webhooks/pushEvents/throughputs", (_, res) => {
  const throughputData = uploadLogs
    .filter((entry) => entry.uploadEnd !== undefined)
    .map(({ uploadStart, uploadEnd, mbFileSize }) => {
      if (!uploadEnd || uploadEnd < uploadStart) return null;

      const durationInSeconds = (uploadEnd - uploadStart) / 1000;
      const throughputMBps = mbFileSize / durationInSeconds;

      return {
        uploadStart,
        uploadEnd,
        mbFileSize,
        throughputMBps,
      };
    })
    .filter((entry): entry is Exclude<typeof entry, null> => entry !== null);

  res.json(throughputData);
});

app.listen(port);
