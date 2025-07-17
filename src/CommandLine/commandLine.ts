"use strict";
import GithubClient from "../GitHubClient/client";
import Answer from "../Interfaces/IAnswer";
import readline from "node:readline";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

export default class CLIClient {
  private rl: readline.Interface; //main stream for receiving user answers

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private checkEnvFiles() {
    const envFilePath = path.resolve(".env");

    if (!fs.existsSync(envFilePath)) {
      throw new Error(`.env file not found at ${envFilePath}`);
    }

    const parsed = dotenv.parse(fs.readFileSync(envFilePath));
    const unsetEnvVars: string[] = [];
    for (const key of Object.keys(parsed)) {
      if (!process.env[key]) {
        unsetEnvVars.push(key);
      }
    }

    return unsetEnvVars.length === 0
      ? ""
      : `The following env vars are not set: ${unsetEnvVars.join(", ")}`;
  }

  //es6 way ts may autocast async if just returned from async func
  private askQuestionAsync(questionText: string): Promise<string> {
    return new Promise((resolve, _) =>
      this.rl.question(questionText, (answer) => resolve(answer.trim()))
    );
  }

  private async askQuestions(): Promise<Answer> {
    let repoOwner, repoName, workFlowFileName;

    while (!repoName || !repoOwner || !workFlowFileName) {
      repoOwner = await this.askQuestionAsync("Owner Name: ");
      repoName = await this.askQuestionAsync("Repository Name: ");
      workFlowFileName = await this.askQuestionAsync("YAML Workflow Name: ");
    }

    //close the readline interface and return baseUrl to caller
    this.rl.close();

    return {
      repoOwner: repoOwner,
      repoName: repoName,
      workFlowFileName: workFlowFileName,
    };
  }

  private async createActionYaml() {
    //TODO implement this function to create the yaml
  }

  private async createActionYamlWorkflow() {
    //open new readline
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let userResponse = "";
    while (!userResponse || (userResponse !== "y" && userResponse !== "n")) {
      userResponse = await this.askQuestionAsync(
        "Would you like to create an action on this repository? y/n"
      );
    }

    if (userResponse === "y") {
      this.createActionYaml();
    } else {
      this.rl.close(); // close buffer if it is not closed
      return; //end workflow
    }
  }

  async startClientWorkflow() {
    const missingFiles: string = this.checkEnvFiles();
    if (missingFiles) {
      console.log(missingFiles);
      this.rl.close(); // finicky but process does not end unless readline closes
      return; //maybe start the workflow again just check here
    }

    const answer: Answer = await this.askQuestions();
    const client = new GithubClient(answer);
    const actionYamlExists = client.checkActionExists();
    if (!actionYamlExists) {
      console.log("The yaml does not exist");
    }
  }
}
