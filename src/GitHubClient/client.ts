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

  //can probably refactor this function
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

  private async uploadFileToRepo(
    expectedWritePath: string,
    content: any,
    message: string,
    expectedSha: string | undefined = undefined
  ) {
    await this.octokitClient.repos.createOrUpdateFileContents({
      owner: this.userAnswer.repoOwner,
      repo: this.userAnswer.repoName,
      path: expectedWritePath,
      message: message,
      content: Buffer.from(content).toString("base64"),
      committer: {
        name: process.env.COMMIT_AUTHOR_NAME!,
        email: process.env.COMMIT_AUTHOR_EMAIL!,
      },
      ...(expectedSha ? { sha: expectedSha } : {}), //only update sha if expected is present
    });
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
    //you may need to set this as a default file path
    const expectedWritePath = path.posix.join(
      ".github",
      "workflows",
      "proxyForward.yml"
    );

    const expectedSha = await this.getActionFileSha(expectedWritePath, false);
    const commitMessage = "inserted yml action file into repository";
    await this.uploadFileToRepo(
      expectedWritePath,
      ymlContent,
      commitMessage,
      expectedSha
    );
  }

  private async getRepoContentSafe(filePath: string): Promise<any | null> {
    try {
      const { data } = await this.octokitClient.repos.getContent({
        owner: this.userAnswer.repoOwner,
        repo: this.userAnswer.repoName,
        path: filePath,
      });
      return data;
    } catch (err: any) {
      console.log("data could not be retrieved");
      return null;
    }
  }

  //TODO create a function which allows parallel uploads
  //should take an array of file sizes
  async uploadNTestFilesParallel(...file: number[]) {}

  /*
  could be parallelized and sped up if we used UUID or another unique identifier
  */
  async uploadTestFilebyMbSizeToRepo(mbSize: number) {
    const data = await this.getRepoContentSafe(
      process.env.TEST_REPO_WRITE_PATH!
    );

    const megabyteConversion = 1048576;
    const byteSize = mbSize * megabyteConversion;
    const fileContentBuffer = Buffer.alloc(byteSize);
    const commitMessage = `inserted test file {} of size ${mbSize}`;
    const lastFileEntry = !data ? 1 : data.length + 1;

    if (data && !Array.isArray(data)) {
      console.log("path must be a directory");
      return;
    }

    const fileWritePath = path.posix.join(
      process.env.TEST_REPO_WRITE_PATH!,
      `testFile-${lastFileEntry + 1}`
    );

    await this.uploadFileToRepo(
      data ? fileWritePath : process.env.TEST_REPO_WRITE_PATH!,
      fileContentBuffer,
      commitMessage.replace("{}", lastFileEntry.toString())
    );

    console.log("file uploaded successfully");
  }
}
