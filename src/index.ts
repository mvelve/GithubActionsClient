"use strict";
import GithubClient from "./GitHubClient/client";

const reqClient = new GithubClient();
reqClient.initializeWebhook();
