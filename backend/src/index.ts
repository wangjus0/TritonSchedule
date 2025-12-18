import { app } from "./api/app.js";
import { connectDB } from "./db/mongo.js";
import type { Class } from "./models/Class.js";
import { searchClass } from "./utils/searchClass.js";
import { searchSchool, searchProfessorsAtSchoolId } from "ratemyprofessor-api";

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});

async function main() {

  const db = await connectDB();
  const courses = db.collection<Class>("courses");
  const classes = await searchClass("cse11", "WI26");

  await courses.insertMany(classes);

  console.log("Item inserted");

}

// Testing rmp API here (save somewhere for reference)
async function testAPI(){

  const school = await searchSchool("University of California, San Diego");
  if (school !== undefined){
    const schoolId = school[0].node.id;
    const search = await searchProfessorsAtSchoolId(
      "Ben Ochoa",
      schoolId
    );
    console.log(search);
  }

}

testAPI();
