"use strict";
import dotenv from "dotenv";
dotenv.config();

import express from "express"; //fix module not found error here do not know why
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port);
