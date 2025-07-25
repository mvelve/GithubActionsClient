"use strict";
import dotenv from "dotenv";
import GithubClient from "../GitHubClient/client";
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

async function triggerManualUploadNTimes(iterations: number) {
  try {
    for (let i = 0; i < iterations; i++) {
      console.log(i);
      await gitClient.triggerLastWorkflow();
    }
  } catch (err) {
    console.error(`an error occurred ${err}`);
  }
}

async function pollUntilNEntries(entryIterations: number): Promise<any> {
  let dataLength: number = 0;
  let data: any;

  do {
    const res = await fetch(endDelayUrl);
    data = await res.json();
    console.log(data);
    dataLength = data.length;
  } while (dataLength != entryIterations);

  return data;
}

(async function () {
  const iterations = 100;
  await triggerManualUploadNTimes(iterations);
  const dataJson: any[] = await pollUntilNEntries(iterations);
  console.log("made it pass poll until n entries");

  const averageDuration =
    dataJson
      .map((entry) => entry.durationInSeconds)
      .reduce((acc, val) => acc + val, 0) / dataJson.length;

  console.log(`the average duration is ${averageDuration}`);
})();
