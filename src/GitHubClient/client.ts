"use strict";
import path from "path";
import dotenv from "dotenv";
import { Octokit } from "@octokit/rest";
import { randomUUID } from "crypto";
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
  workflow_dispatch:
    inputs:
      trigger_reason:
        description: 'Reason for manual trigger'
        required: false
        default: 'Manual dispatch'

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

  private async allocateSizeBuffer(mbSize: number): Promise<Buffer> {
    const megabyteConversion = 1048576;
    const byteSize = mbSize * megabyteConversion;
    return Buffer.alloc(byteSize);
  }

  //uses UUID to avoid file name collisions and parllelizes entries
  //use for testing if needed
  async uploadNTestFilesParallel(fileSizes: number[]) {
    const uploadPromises = fileSizes.map(async (size) => {
      const uuid = randomUUID();
      return this.uploadFileToRepo(
        path.posix.join(
          process.env.PARALLEL_INSERT_WRITE_PATH!,
          `file-${uuid}`
        ),
        await this.allocateSizeBuffer(size),
        `inserted file-${uuid}`
      );
    });

    await Promise.all(uploadPromises);
    console.log(`${fileSizes.length} inserted in parallel`);
  }

  async triggerLastWorkflow() {
    const { repoOwner, repoName } = this.userAnswer;
    // const { data } = await this.octokitClient.rest.actions.listRepoWorkflows({
    //   owner: repoOwner,
    //   repo: repoName,
    // });

    // const lastWorkflowId = data.workflows.slice(-1)[0].id;

    await this.octokitClient.actions.createWorkflowDispatch({
      owner: repoOwner,
      repo: repoName,
      workflow_id: 176006606,
      ref: "main",
      inputs: {
        trigger_reason: "manual invocation of last workflow",
      },
    });
  }

  //sequentially inserts files into the test directory named one after another
  // not parallelizable but easy to test
  async uploadTestFilebyMbSizeToRepo(mbSize: number) {
    const data = await this.getRepoContentSafe(
      process.env.TEST_REPO_WRITE_PATH!
    );

    const fileContentBuffer = await this.allocateSizeBuffer(mbSize);
    const lastFileEntry = !data ? 1 : data.length + 1;
    const commitMessage = `inserted test file {} of size ${mbSize}`;

    //check that thing is an actual directory
    if (data && !Array.isArray(data)) {
      console.log("path must be a directory");
      return;
    }

    const fileWritePath = path.posix.join(
      process.env.TEST_REPO_WRITE_PATH!,
      `testFile-${lastFileEntry + 1}`
    );

    await this.uploadFileToRepo(
      fileWritePath,
      fileContentBuffer,
      commitMessage.replace("{}", lastFileEntry.toString())
    );

    console.log("file uploaded successfully");
  }
}
