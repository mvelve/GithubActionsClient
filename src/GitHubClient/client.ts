"use strict";

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

  /*
await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: "",
            path: ".github/workflows/my-workflow.yml",
            message,
            committer: {
                name:owner,
                email:"assoulsidali@gmail.com",
            },
            content,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          })
          .catch(error => {
            console.error('Error creating workflow file:', error);
          });

  */

  initializeWebhook() {
    console.log("hello world");
  }
}
