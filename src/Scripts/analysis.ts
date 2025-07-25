"use strict";
import dotenv from "dotenv";
import GithubClient from "../GitHubClient/client";
import fs from "fs";
dotenv.config({ path: "../../.env" }); // Adjust relative to this file

//END-TO_END TESTS==================================================================================================================================
const endDelayUrl = new URL(
  "webhooks/pushEvents/endDelay",
  process.env.BASE_PROXY_URL
);

const testRepoAnswer = {
  repoOwner: "mvelve",
  repoName: "TestRepoActions",
  workFlowFileName: "ForwardToProxy",
};

const gitClient = new GithubClient(testRepoAnswer);

//test Value
async function postStartTime(payload: {
  uploadStart: number;
  mbFileSize: number;
  origin: string;
}): Promise<Response> {
  const startPushTimeUrl = new URL(
    "webhooks/pushEvents/start",
    process.env.BASE_PROXY_URL
  );

  return fetch(startPushTimeUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

//post the start time then upload
async function triggerManualUploadNTimes(iterations: number) {
  try {
    for (let i = 0; i < iterations; i++) {
      await postStartTime({
        uploadStart: Date.now(),
        mbFileSize: 0,
        origin: "Manual",
      });
      await gitClient.triggerLastWorkflow();
    }
  } catch (err) {
    console.error(`an error occurred ${err}`);
  }
}

async function triggerMbSizeUploadNTimes(iterations: number, mbSize: number) {
  try {
    for (let i = 0; i < iterations; i++) {
      await postStartTime({
        uploadStart: Date.now(),
        mbFileSize: 0,
        origin: "Manual",
      });
      await gitClient.uploadTestFilebyMbSizeToRepo(mbSize);
    }
  } catch (err) {
    console.error(`an error occurred ${err}`);
  }
}

//polls to fix race condition timings
async function pollUntilEntryStall(
  entryIterations: number,
  stallBound: number = 10
): Promise<any> {
  let dataLength: number = 0;
  let data: any;

  //need to have a stall count strange timing issues happening
  let stallCount = 0;
  do {
    const res = await fetch(endDelayUrl);
    data = await res.json();
    const temp = data.length;
    if (temp === dataLength) {
      stallCount++;
    }
    if (stallCount === stallBound) {
      break;
    }
    dataLength = data.length;
  } while (dataLength != entryIterations);

  return data;
}

//testing workflow dispatch n is set to 120 because of concurrency issues in receiving a response from the get endpoint
//sample size will range between 108 to 110 but is specified in json
//uncomment to run and ensure express server is running and is bound to ngrok host

// (async function () {
//   const iterations = 120;
//   await triggerManualUploadNTimes(iterations);
//   const dataJson: any[] = await pollUntilEntryStall(iterations);

//   const averageDuration =
//     dataJson
//       .map((entry) => entry.durationInSeconds)
//       .reduce((acc, val) => acc + val, 0) / dataJson.length;

//   fs.writeFileSync(
//     "./reportJson",
//     JSON.stringify({
//       averageEndDelayTime: averageDuration,
//       datasetLength: dataJson.length,
//       ...dataJson,
//     })
//   );
//   console.log(`the average duration is ${averageDuration} seconds`);
// })();

// testing modest sized commit 0.2 as specified in functiom
(async function () {
  const iterations = 120;
  const commitMbSize = 0.2;
  await triggerMbSizeUploadNTimes(iterations, commitMbSize); //modest size mb upload
  const dataJson: any[] = await pollUntilEntryStall(iterations);

  const averageDuration =
    dataJson
      .map((entry) => entry.durationInSeconds)
      .reduce((acc, val) => acc + val, 0) / dataJson.length;

  fs.writeFileSync(
    "./reportJson",
    JSON.stringify({
      averageEndDelayTime: averageDuration,
      datasetLength: dataJson.length,
      ...dataJson,
    })
  );
  console.log(`the average duration is ${averageDuration} seconds`);
})();

//Concurrent Test Analysis=======================================================================================================================================
