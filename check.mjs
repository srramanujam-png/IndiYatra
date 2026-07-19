import { parse } from "@babel/parser";
import fs from "fs";
const code = fs.readFileSync(process.argv[2], "utf8");
try {
  parse(code, { sourceType: "module", plugins: ["jsx"] });
  console.log("OK");
} catch (e) {
  console.log("ERROR:", e.message);
  console.log("loc:", JSON.stringify(e.loc));
}
