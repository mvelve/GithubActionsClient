"use strict";
import path from "path";

//load environment variables
import dotenv from "dotenv";
import { Octokit } from "octokit"; //may need octokit wait on this
import Answer from "../Interfaces/IAnswer";
dotenv.config();

export default class GithubClient {
  private userAnswer: Answer;
  private octokitClient: Octokit;

  constructor(userAnswer: Answer) {
    this.userAnswer = userAnswer;
    this.octokitClient = new Octokit({ auth: process.env.GITHUB_API_TOKEN });
  }

  //isolate functionality within this class
  async checkActionExists(): Promise<boolean> {
    try {
      await this.octokitClient.repos.getContent({
        owner: this.userAnswer.repoOwner,
        repo: this.userAnswer.repoName,
        path: `${this.userAnswer.workFlowFileName}.yml`,
      });
      return true;
    } catch (err: any) {
      if (err.status === 404) {
        console.log("Workflow file not found.");
      } else {
        console.error("GitHub API error:", err.status, err.message);
      }
      return false;
    }
  }

  async createCommitActionYml() {
    const ymlContent = `name: ForwardToProxy
  on:
    push:
      branches: [ "main" ]
      
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - name: Call Proxy API
          uses: fjogeleit/http-request-action@v1
          with:
            url: 'insertAPIURl.com'
            method: 'POST'
            file: \${{ github.event_path }}`;

    const expectedWritePath = path.join(".github", "workflows", "proxyForward");
    const response = await this.octokitClient.repos.createOrUpdateFileContents({
      owner: this.userAnswer.repoOwner,
      repo: this.userAnswer.repoName,
      path: expectedWritePath,
      content: Buffer.from(ymlContent).toString("base64"), //the api requires the string to be encoded in base 64
    });
  }
}
