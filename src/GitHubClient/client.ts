"use strict";
import path from "path";

//load environment variables
import dotenv from "dotenv";
import { Octokit } from "@octokit/rest";
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
  async checkActionDirExists(): Promise<boolean> {
    try {
      await this.octokitClient.repos.getContent({
        owner: this.userAnswer.repoOwner,
        repo: this.userAnswer.repoName,
        path: `${this.userAnswer.workFlowFileName}.yml`,
      });
    } catch (err: any) {
      if (err.status === 404) {
        console.log("Workflow file not found.");
      } else {
        console.error("GitHub API error:", err.status, err.message);
      }
      return false;
    }

    return true;
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

    await this.octokitClient.repos.createOrUpdateFileContents({
      owner: this.userAnswer.repoOwner,
      repo: this.userAnswer.repoName,
      path: expectedWritePath,
      message: "inserted proxy action yml",
      content: Buffer.from(ymlContent).toString("base64"),
      committer: {
        name: process.env.COMMIT_AUTHOR_NAME!,
        email: process.env.COMMIT_AUTHOR_EMAIL!,
      },
    });
  }

  //retrieved from: https://gist.github.com/lucis/864849a7f3c347be86862a3a43994fe0
  //default branch in github is main
  //helper function to retrieve current commit on branch
  private async getCurrentCommit(branch = "main") {
    const { repoOwner, repoName } = this.userAnswer;

    const { data: refData } = await this.octokitClient.git.getRef({
      owner: repoOwner,
      repo: repoName,
      ref: `heads/${branch}`,
    });

    const commitSha = refData.object.sha;
    const { data: commitData } = await this.octokitClient.git.getCommit({
      owner: repoOwner,
      repo: repoName,
      commit_sha: commitSha,
    });

    return {
      commitSha,
      treeSha: commitData.tree.sha,
    };
  }
}
