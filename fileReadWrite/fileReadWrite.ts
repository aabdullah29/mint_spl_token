import { readFile, writeFile, access } from "fs/promises";

export const getFileData = async (path: string, key: string) => {
  let mintAddress = "";
  // const path = "spl/outputs/mintAddress.txt";
  // const key = "MINT_ADDRESS";
  try {
    const data: string = await readFile(path, "utf-8");
    if (data.includes(key)) {
      try {
        const json = JSON.parse(data);
        mintAddress = json[key];
      } catch (error) {
        console.error("Error parsing JSON: ", error);
        throw Error("JSON_Parse.");
      }
    } else {
      throw Error(`key "${key}"" not found.`);
    }
  } catch (error) {
    console.error("Error reading file:", error);
    throw Error("getMintAddress.");
  }

  return mintAddress;
};

export const writeFileData = async (
  path: string,
  key: string,
  data: string
) => {
  // const path = "spl/outputs/mintAddress.txt";
  // const key = "MINT_ADDRESS";
  // const data = "addresssssss"
  try {
    let jsonData;
    // Check if the file exists
    const fileExists = await access(path)
      .then(() => true)
      .catch(() => false);

    if (fileExists) {
      // Use 'a' flag for append if the file exists, and 'w' flag for write if it doesn't
      // const flag = fileExists ? "a" : "w";
      const existingData = await readFile(path, "utf-8");
      jsonData = JSON.parse(
        existingData || existingData.length >= 2 ? existingData : "{}"
      );
      jsonData[key] = data;
    }

    // Write data to the file
    await writeFile(
      path,
      JSON.stringify(jsonData, null, 2) ?? `{"${key}":"${data}"}`,
      {
        /*flag,*/ encoding: "utf-8",
      }
    );
    console.log(path, "<= success!");
  } catch (error) {
    console.error("Error writing file:", error);
    throw error;
  }
};

(async () => {
  const path = "spl/outputs/test.txt";
  const key = "MINT_ADDRESS" + 3;
  const data = "some new" + 3;
  await writeFileData(path, key, data);
  console.log("data: ", await getFileData(path, key));
})();
