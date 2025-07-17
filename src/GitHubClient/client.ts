"use strict";

//load environment variables
import dotenv from "dotenv";
import octokit, { Octokit } from "octokit";
dotenv.config();

export default class GithubClient {
  private octokitClient: Octokit;

  constructor() {
    this.octokitClient = new Octokit({ auth: process.env.AUTH });
  }

  initializeWebhook() {
    console.log("hello world");
  }
}
