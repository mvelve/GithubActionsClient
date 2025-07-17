"use strict";
import GithubClient from "./GitHubClient/client";
import readline from "node:readline";
import dotenv from "dotenv";
import Answer from "./IAnswer";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const checkEnvFiles = function () {
  const unsetEnvVars: string[] = [];
  for (const [key, val] of Object.entries(process.env)) {
    if (!val) {
      unsetEnvVars.push(key);
    }
  }

  return unsetEnvVars.length === 0
    ? ""
    : `The following env vars are not set ${unsetEnvVars.join(", ")}`;
};

//es6 way ts may autocast async if just returned from async func
const askQuestionAsync = function (questionText: string): Promise<string> {
  return new Promise((resolve, _) =>
    rl.question(questionText, (answer) => resolve(answer.trim()))
  );
};

const askQuestions = async function (): Promise<Answer> {
  let repoOwner, repoName, workFlowFileName;

  while (!repoName || !repoOwner || !workFlowFileName) {
    repoOwner = await askQuestionAsync("Owner Name: ");
    repoName = await askQuestionAsync("Repository Name: ");
    workFlowFileName = await askQuestionAsync("YAML Workflow Name: ");
  }

  //close the readline interface and return baseUrl to caller
  rl.close();

  return {
    repoOwner: repoOwner,
    repoName: repoName,
    workFlowFileName: workFlowFileName,
  };
};

const startClientWorkflow = async function () {
  const missingFiles: string = checkEnvFiles();
  if (missingFiles) {
    console.log(missingFiles);
    return; //maybe start the workflow again just check here
  }

  const answer: Answer = await askQuestions();
  const client = new GithubClient(answer);
};
