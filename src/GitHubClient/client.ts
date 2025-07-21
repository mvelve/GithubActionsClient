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
  async getActionFileSha(
    filePath: string,
    isLogsEnabled = true
  ): Promise<string | undefined> {
    let sha: string | undefined;
    try {
      const { data } = await this.octokitClient.repos.getContent({
        owner: this.userAnswer.repoOwner,
        repo: this.userAnswer.repoName,
        path: filePath,
      });

      //this checks that the file actually points to a directory
      //in operator checks for nesting within the object
      if (!Array.isArray(data) && "sha" in data) {
        sha = data.sha;
      }
    } catch (err: any) {
      if (isLogsEnabled) {
        if (err.status === 404) {
          console.log("Workflow file not found.");
        } else {
          console.error("GitHub API error:", err.status, err.message);
        }
      }
    }

    return sha;
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
      - name: Dump GitHub event payload
        env:
          EVENT_PAYLOAD: \${{ toJSON(github.event) }}
        run: |
          echo "===== github.event payload ====="
          echo "$EVENT_PAYLOAD"

      - name: Call Proxy API
        uses: fjogeleit/http-request-action@v1
        with:
          url: ${process.env.BASE_PROXY_URL}/webhooks/push
          method: 'POST'
          data: \${{ toJSON(github.event) }}`;

    //action runs on a ubuntu machine so posix paths must be used
    const expectedWritePath = path.posix.join(
      ".github",
      "workflows",
      "proxyForward.yml"
    );

    const expectedSha = await this.getActionFileSha(
      `${this.userAnswer.workFlowFileName}.yml`,
      false
    );

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
      ...(expectedSha ? { sha: expectedSha } : {}), //only update sha if expected is present
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
