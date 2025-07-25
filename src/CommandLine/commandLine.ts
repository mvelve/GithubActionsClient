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
      workFlowFileName = await this.askQuestionAsync("YML Workflow Name: "); //may need to remove this here
    }

    //close the readline interface and return baseUrl to caller (needs to be a better way of doing this)
    this.rl.close();

    return {
      repoOwner: repoOwner,
      repoName: repoName,
      workFlowFileName: workFlowFileName,
    };
  }

  private async repeatAskYesOrNoQuestion(question: string) {
    let userResponse = "";
    while (!userResponse || (userResponse !== "y" && userResponse !== "n")) {
      userResponse = await this.askQuestionAsync(`${question} y/n `);
    }

    return userResponse;
  }

  //pass the answer around recieved from the user
  private async createActionYmlWorkflow(
    client: GithubClient
  ): Promise<boolean> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const userResponse = await this.repeatAskYesOrNoQuestion(
      "Would you like to create an action on this repository?"
    );

    if (userResponse === "y") {
      try {
        await client.createCommitActionYml();
        console.log("Push action successfully added");
      } catch (err) {
        console.error(`file could not be uploaded because of ${err}`);
      }
    } else {
      console.log("Please upload file before continuing.");
      this.rl.close();
      return false;
    }

    return true;
  }

  //uploads file and returns megaByte size of upload
  private async promptCommitUploadSize(): Promise<number> {
    let mbFileSize: number | undefined;
    while (!Number.isFinite(mbFileSize)) {
      const userFileSize = await this.askQuestionAsync(
        "Specify file size in mb: "
      );
      mbFileSize = Number.parseFloat(userFileSize.trim());
    }

    return mbFileSize!;
  }

  private async postStartTime(payload: {
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

  private async uploadFileWorkFlow(gitClient: GithubClient) {
    const userResponse = await this.repeatAskYesOrNoQuestion(
      "Continue to upload a file?"
    );

    if (userResponse === "n") {
      console.log("workflow ended file not uploaded.");
      this.rl.close();
      return;
    }

    const uploadTime = Date.now();
    const userRes = await this.repeatAskYesOrNoQuestion(
      "Trigger echo commit action manually 0 mb? "
    );

    let echoServerRes: Response;

    if (userRes === "y") {
      echoServerRes = await this.postStartTime({
        uploadStart: uploadTime,
        mbFileSize: 0,
        origin: "Manual",
      });
      await gitClient.triggerLastWorkflow();
    } else {
      const mbFileSize = await this.promptCommitUploadSize();
      echoServerRes = await this.postStartTime({
        uploadStart: uploadTime,
        mbFileSize: mbFileSize,
        origin: "commit push",
      });

      await gitClient.uploadTestFilebyMbSizeToRepo(mbFileSize);
    }

    if (echoServerRes.status !== 200) {
      console.log("An error occurred sending the start time please try again.");
      this.rl.close();
      return;
    }

    const uploadAgainRes = await this.repeatAskYesOrNoQuestion(
      "would you like to upload another file? "
    );

    //recursively call to keep working
    if (uploadAgainRes == "y") {
      await this.uploadFileWorkFlow(gitClient);
    }

    //close once workflow is finished
    this.rl.close();
  }

  async startClientWorkflow() {
    const missingFiles: string = this.checkEnvFiles();
    if (missingFiles) {
      console.log(missingFiles);
      this.rl.close(); // finicky but process does not end unless readline closes
      return; //maybe start the workflow again just check here
    }

    const answer: Answer = await this.askQuestions();
    const gitClient = new GithubClient(answer);
    const userSpecifiedActionDir = `.github/workflows/${answer.workFlowFileName}.yml`;

    //first time saying it does not exist on creation
    const actionWorkFlowSha = await gitClient.getActionFileSha(
      userSpecifiedActionDir
    );

    if (!actionWorkFlowSha) {
      console.log("The specified yml dir does not exist");
      const isYmlCreated = await this.createActionYmlWorkflow(gitClient); //now you will want to create the action yaml
      if (!isYmlCreated) {
        console.log("yml not created");
        return false;
      }
    }

    //await the uploadFileWorkFlow
    await this.uploadFileWorkFlow(gitClient);
  }
}
